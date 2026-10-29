import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class CreatePushDeviceTokens1798000000000 implements MigrationInterface {
  name = 'CreatePushDeviceTokens1798000000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    const isPostgres = queryRunner.connection.options.type === 'postgres';
    const uuid = isPostgres ? 'uuid' : 'varchar';
    const timestamp = isPostgres ? 'timestamptz' : 'datetime';
    await queryRunner.createTable(new Table({
      name: 'push_device_tokens',
      columns: [
        { name: 'id', type: uuid, isPrimary: true, ...(isPostgres ? { default: 'gen_random_uuid()' } : {}) },
        { name: 'userId', type: uuid, isNullable: false },
        { name: 'token', type: 'text', isNullable: false },
        { name: 'createdAt', type: timestamp, isNullable: false, default: 'CURRENT_TIMESTAMP' },
        { name: 'updatedAt', type: timestamp, isNullable: false, default: 'CURRENT_TIMESTAMP' },
      ],
      indices: [
        new TableIndex({ name: 'UQ_push_device_tokens_token', columnNames: ['token'], isUnique: true }),
        new TableIndex({ name: 'IDX_push_device_tokens_user_id', columnNames: ['userId'] }),
      ],
      foreignKeys: [new TableForeignKey({
        name: 'FK_push_device_tokens_user',
        columnNames: ['userId'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      })],
    }), true);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('push_device_tokens', true);
  }
}
