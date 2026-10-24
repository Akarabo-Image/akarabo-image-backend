import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

/**
 * Creates the `customers` and `bookings` tables and wires the long-planned
 * payments → bookings foreign key.
 *
 * Bookings are never deleted: a called-off event keeps its row with status
 * CANCELLED, a reason and the user who called it off, so the studio's
 * schedule always reflects what really happened.
 *
 * One customer can hold at most one *active* (non-cancelled) booking per
 * calendar day — enforced by a partial unique index, which both PostgreSQL
 * and the embedded sqljs fallback support.
 *
 * Column types are chosen adaptively so the same migration runs on both the
 * PostgreSQL server (development/production) and the embedded sqljs fallback.
 */
export class CreateCustomersAndBookings1794000000000 implements MigrationInterface {
  name = 'CreateCustomersAndBookings1794000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const isPostgres = queryRunner.connection.options.type === 'postgres';
    const uuid = isPostgres ? 'uuid' : 'varchar';
    const timestamp = isPostgres ? 'timestamptz' : 'datetime';
    const now = () => 'CURRENT_TIMESTAMP';

    await queryRunner.createTable(
      new Table({
        name: 'customers',
        columns: [
          {
            name: 'id',
            type: uuid,
            isPrimary: true,
            // PostgreSQL relies on a DB-side default for generated uuid PKs;
            // sqljs generates uuids client-side, so no default is needed there.
            ...(isPostgres ? { default: 'gen_random_uuid()' } : {}),
          },
          { name: 'name', type: 'varchar', length: '200', isNullable: false },
          { name: 'phone', type: 'varchar', length: '30', isNullable: false },
          {
            name: 'email',
            type: 'varchar',
            length: '200',
            isNullable: true,
          },
          {
            name: 'address',
            type: 'varchar',
            length: '300',
            isNullable: true,
          },
          { name: 'notes', type: 'varchar', length: '500', isNullable: true },
          {
            name: 'isActive',
            type: 'boolean',
            isNullable: false,
            default: isPostgres ? 'true' : '1',
          },
          { name: 'createdByUserId', type: uuid, isNullable: false },
          {
            name: 'createdAt',
            type: timestamp,
            isNullable: false,
            default: now(),
          },
          {
            name: 'updatedAt',
            type: timestamp,
            isNullable: false,
            default: now(),
          },
        ],
        indices: [
          // One phone number identifies one customer — duplicates are rejected
          // by the database, on top of the service-level check.
          new TableIndex({
            name: 'UQ_customers_phone',
            columnNames: ['phone'],
            isUnique: true,
          }),
        ],
        foreignKeys: [
          new TableForeignKey({
            name: 'FK_customers_created_by',
            columnNames: ['createdByUserId'],
            referencedColumnNames: ['id'],
            referencedTableName: 'users',
            onDelete: 'RESTRICT',
            onUpdate: 'CASCADE',
          }),
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'bookings',
        columns: [
          {
            name: 'id',
            type: uuid,
            isPrimary: true,
            ...(isPostgres ? { default: 'gen_random_uuid()' } : {}),
          },
          { name: 'customerId', type: uuid, isNullable: false },
          {
            name: 'serviceType',
            type: 'varchar',
            length: '20',
            isNullable: false,
          },
          // ISO calendar day (yyyy-mm-dd) as text — same order on every
          // driver, unlike native DATE types.
          {
            name: 'eventDate',
            type: 'varchar',
            length: '10',
            isNullable: false,
          },
          {
            name: 'startTime',
            type: 'varchar',
            length: '5',
            isNullable: true,
          },
          { name: 'venue', type: 'varchar', length: '300', isNullable: false },
          {
            name: 'expectedGuests',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'priceAmount',
            type: 'numeric',
            precision: 12,
            scale: 2,
            isNullable: false,
          },
          {
            name: 'priceCurrency',
            type: 'varchar',
            length: '3',
            isNullable: false,
            default: "'RWF'",
          },
          { name: 'notes', type: 'varchar', length: '500', isNullable: true },
          {
            name: 'status',
            type: 'varchar',
            length: '20',
            isNullable: false,
            default: "'PENDING'",
          },
          { name: 'createdByUserId', type: uuid, isNullable: false },
          {
            name: 'confirmedAt',
            type: timestamp,
            isNullable: true,
          },
          {
            name: 'completedAt',
            type: timestamp,
            isNullable: true,
          },
          {
            name: 'cancelledAt',
            type: timestamp,
            isNullable: true,
          },
          { name: 'cancelledByUserId', type: uuid, isNullable: true },
          {
            name: 'cancellationReason',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: timestamp,
            isNullable: false,
            default: now(),
          },
          {
            name: 'updatedAt',
            type: timestamp,
            isNullable: false,
            default: now(),
          },
        ],
        foreignKeys: [
          new TableForeignKey({
            name: 'FK_bookings_customer',
            columnNames: ['customerId'],
            referencedColumnNames: ['id'],
            referencedTableName: 'customers',
            onDelete: 'RESTRICT',
            onUpdate: 'CASCADE',
          }),
          new TableForeignKey({
            name: 'FK_bookings_created_by',
            columnNames: ['createdByUserId'],
            referencedColumnNames: ['id'],
            referencedTableName: 'users',
            onDelete: 'RESTRICT',
            onUpdate: 'CASCADE',
          }),
          new TableForeignKey({
            name: 'FK_bookings_cancelled_by',
            columnNames: ['cancelledByUserId'],
            referencedColumnNames: ['id'],
            referencedTableName: 'users',
            onDelete: 'SET NULL',
            onUpdate: 'CASCADE',
          }),
        ],
      }),
      true,
    );

    // One active (non-cancelled) booking per customer per day. Partial
    // indexes are valid on both engines, so this runs everywhere.
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_bookings_customer_active_date"` +
        ` ON "bookings" ("customerId", "eventDate") WHERE "status" <> 'CANCELLED'`,
    );

    // Defense in depth: the service layer validates every price, the
    // database re-checks on PostgreSQL (sqljs cannot render table-level
    // CHECKs through TypeORM).
    if (isPostgres) {
      await queryRunner.query(
        `ALTER TABLE "bookings" ADD CONSTRAINT "CK_bookings_price_positive" CHECK ("priceAmount" > 0)`,
      );
      // payments.bookingId finally becomes a real foreign key. SQLite cannot
      // ALTER TABLE ADD CONSTRAINT, so this runs on PostgreSQL only — the
      // in-memory fallback is for tests, which validate through the service.
      await queryRunner.query(
        `ALTER TABLE "payments" ADD CONSTRAINT "FK_payments_booking"` +
          ` FOREIGN KEY ("bookingId") REFERENCES "bookings"("id")` +
          ` ON DELETE RESTRICT ON UPDATE CASCADE`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const isPostgres = queryRunner.connection.options.type === 'postgres';

    if (isPostgres) {
      await queryRunner.query(
        `ALTER TABLE "payments" DROP CONSTRAINT IF EXISTS "FK_payments_booking"`,
      );
    }

    // Drop children first.
    await queryRunner.dropTable('bookings');
    await queryRunner.dropTable('customers');
  }
}
