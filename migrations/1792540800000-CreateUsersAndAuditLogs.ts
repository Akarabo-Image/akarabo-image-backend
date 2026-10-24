import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

/**
 * Creates the `users` and `audit_logs` tables.
 *
 * Column types are chosen adaptively so the same migration runs on both the
 * PostgreSQL server (development/production) and the embedded sqljs fallback
 * used on machines without PostgreSQL.
 */
export class CreateUsersAndAuditLogs1792540800000 implements MigrationInterface {
  name = 'CreateUsersAndAuditLogs1792540800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const isPostgres = queryRunner.connection.options.type === 'postgres';
    const uuid = isPostgres ? 'uuid' : 'varchar';
    const timestamp = isPostgres ? 'timestamptz' : 'datetime';
    const now = () => 'CURRENT_TIMESTAMP';

    await queryRunner.createTable(
      new Table({
        name: 'users',
        columns: [
          {
            name: 'id',
            type: uuid,
            isPrimary: true,
            // PostgreSQL relies on a DB-side default for generated uuid PKs;
            // sqljs generates uuids client-side, so no default is needed there.
            // Note: Table column defaults are rendered as raw SQL strings.
            ...(isPostgres ? { default: 'gen_random_uuid()' } : {}),
          },
          {
            name: 'fullName',
            type: 'varchar',
            length: '120',
            isNullable: false,
          },
          { name: 'email', type: 'varchar', length: '255', isNullable: false },
          { name: 'phone', type: 'varchar', length: '30', isNullable: true },
          {
            name: 'passwordHash',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          { name: 'role', type: 'varchar', length: '20', isNullable: false },
          {
            name: 'isActive',
            type: 'boolean',
            isNullable: false,
            default: true,
          },
          { name: 'lastLoginAt', type: timestamp, isNullable: true },
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
          new TableIndex({
            name: 'UQ_users_email',
            columnNames: ['email'],
            isUnique: true,
          }),
          new TableIndex({
            name: 'UQ_users_phone',
            columnNames: ['phone'],
            isUnique: true,
          }),
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'audit_logs',
        columns: [
          {
            name: 'id',
            type: uuid,
            isPrimary: true,
            ...(isPostgres ? { default: 'gen_random_uuid()' } : {}),
          },
          { name: 'userId', type: uuid, isNullable: true },
          { name: 'action', type: 'varchar', length: '50', isNullable: false },
          { name: 'entity', type: 'varchar', length: '100', isNullable: false },
          { name: 'entityId', type: 'varchar', length: '36', isNullable: true },
          { name: 'changes', type: 'text', isNullable: true },
          {
            name: 'ipAddress',
            type: 'varchar',
            length: '45',
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
            name: 'FK_audit_logs_user',
            columnNames: ['userId'],
            referencedColumnNames: ['id'],
            referencedTableName: 'users',
            onDelete: 'SET NULL',
            onUpdate: 'CASCADE',
          }),
        ],
      }),
      true,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop children first.
    await queryRunner.dropTable('audit_logs');
    await queryRunner.dropTable('users');
  }
}
