import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

/**
 * Creates the `payments` and `expenses` tables — the cashier's records.
 *
 * Financial rows are never deleted: an error is corrected by setting
 * status/reversedByUserId/reversalReason on the original row, so the books
 * always reconcile against what physically happened in the studio.
 *
 * Column types are chosen adaptively so the same migration runs on both the
 * PostgreSQL server (development/production) and the embedded sqljs fallback.
 */
export class CreatePaymentsAndExpenses1793145600000 implements MigrationInterface {
  name = 'CreatePaymentsAndExpenses1793145600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const isPostgres = queryRunner.connection.options.type === 'postgres';
    const uuid = isPostgres ? 'uuid' : 'varchar';
    const timestamp = isPostgres ? 'timestamptz' : 'datetime';
    const now = () => 'CURRENT_TIMESTAMP';
    const amountColumns = [
      { name: 'amount', type: 'numeric', precision: 12, scale: 2 },
    ];
    const bookkeepingColumns = [
      {
        name: 'status',
        type: 'varchar',
        length: '20',
        isNullable: false,
      },
      { name: 'recordedByUserId', type: uuid, isNullable: false },
      { name: 'reversedAt', type: timestamp, isNullable: true },
      { name: 'reversedByUserId', type: uuid, isNullable: true },
      {
        name: 'reversalReason',
        type: 'varchar',
        length: '500',
        isNullable: true,
      },
    ];
    const reversalForeignKeys = [
      new TableForeignKey({
        name: 'FK_payments_reversed_by',
        columnNames: ['reversedByUserId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      }),
    ];

    await queryRunner.createTable(
      new Table({
        name: 'payments',
        columns: [
          {
            name: 'id',
            type: uuid,
            isPrimary: true,
            // PostgreSQL relies on a DB-side default for generated uuid PKs;
            // sqljs generates uuids client-side, so no default is needed there.
            ...(isPostgres ? { default: 'gen_random_uuid()' } : {}),
          },
          // Nullable until the Booking module ships and adds the foreign key.
          { name: 'bookingId', type: uuid, isNullable: true },
          { ...amountColumns[0], isNullable: false },
          {
            name: 'currency',
            type: 'varchar',
            length: '3',
            isNullable: false,
            default: "'RWF'",
          },
          { name: 'method', type: 'varchar', length: '20', isNullable: false },
          {
            name: 'reference',
            type: 'varchar',
            length: '120',
            isNullable: true,
          },
          { name: 'notes', type: 'varchar', length: '500', isNullable: true },
          {
            // Set the default on the status column of the shared block below.
            ...bookkeepingColumns[0],
            default: "'COMPLETED'",
          },
          ...bookkeepingColumns.slice(1),
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
          // Duplicate protection for external receipts / mobile-money ids.
          // NULL references are allowed repeatedly (both engines treat NULLs
          // as distinct in unique indexes).
          new TableIndex({
            name: 'UQ_payments_reference',
            columnNames: ['reference'],
            isUnique: true,
          }),
        ],
        foreignKeys: [
          new TableForeignKey({
            name: 'FK_payments_recorded_by',
            columnNames: ['recordedByUserId'],
            referencedColumnNames: ['id'],
            referencedTableName: 'users',
            onDelete: 'RESTRICT',
            onUpdate: 'CASCADE',
          }),
          reversalForeignKeys[0],
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'expenses',
        columns: [
          {
            name: 'id',
            type: uuid,
            isPrimary: true,
            ...(isPostgres ? { default: 'gen_random_uuid()' } : {}),
          },
          {
            name: 'category',
            type: 'varchar',
            length: '30',
            isNullable: false,
          },
          { ...amountColumns[0], isNullable: false },
          {
            name: 'currency',
            type: 'varchar',
            length: '3',
            isNullable: false,
            default: "'RWF'",
          },
          {
            name: 'description',
            type: 'varchar',
            length: '500',
            isNullable: false,
          },
          { name: 'expenseDate', type: timestamp, isNullable: false },
          {
            ...bookkeepingColumns[0],
            default: "'RECORDED'",
          },
          ...bookkeepingColumns.slice(1),
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
            name: 'FK_expenses_recorded_by',
            columnNames: ['recordedByUserId'],
            referencedColumnNames: ['id'],
            referencedTableName: 'users',
            onDelete: 'RESTRICT',
            onUpdate: 'CASCADE',
          }),
          new TableForeignKey({
            name: 'FK_expenses_reversed_by',
            columnNames: ['reversedByUserId'],
            referencedColumnNames: ['id'],
            referencedTableName: 'users',
            onDelete: 'SET NULL',
            onUpdate: 'CASCADE',
          }),
        ],
      }),
      true,
    );

    // Defense in depth against bad money data. The sqljs fallback cannot
    // render table-level CHECKs through TypeORM, so the constraint is added
    // on PostgreSQL only — the service layer validates the amount on every
    // engine.
    if (isPostgres) {
      await queryRunner.query(
        `ALTER TABLE "payments" ADD CONSTRAINT "CK_payments_amount_positive" CHECK ("amount" > 0)`,
      );
      await queryRunner.query(
        `ALTER TABLE "expenses" ADD CONSTRAINT "CK_expenses_amount_positive" CHECK ("amount" > 0)`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop children first.
    await queryRunner.dropTable('expenses');
    await queryRunner.dropTable('payments');
  }
}
