import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateClientInquiries1794600000000 implements MigrationInterface {
  name = 'CreateClientInquiries1794600000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    const isPostgres = queryRunner.connection.options.type === 'postgres';
    const uuid = isPostgres ? 'uuid' : 'varchar';
    const timestamp = isPostgres ? 'timestamptz' : 'datetime';
    await queryRunner.createTable(new Table({
      name: 'client_inquiries',
      columns: [
        { name: 'id', type: uuid, isPrimary: true, ...(isPostgres ? { default: 'gen_random_uuid()' } : {}) },
        { name: 'name', type: 'varchar', length: '200', isNullable: false },
        { name: 'email', type: 'varchar', length: '200', isNullable: false },
        { name: 'service', type: 'varchar', length: '40', isNullable: false },
        { name: 'preferredDate', type: 'varchar', length: '10', isNullable: true },
        { name: 'message', type: 'varchar', length: '1000', isNullable: true },
        { name: 'isRead', type: 'boolean', isNullable: false, default: isPostgres ? 'false' : '0' },
        { name: 'readByUserId', type: uuid, isNullable: true },
        { name: 'readAt', type: timestamp, isNullable: true },
        { name: 'createdAt', type: timestamp, isNullable: false, default: 'CURRENT_TIMESTAMP' },
        { name: 'updatedAt', type: timestamp, isNullable: false, default: 'CURRENT_TIMESTAMP' },
      ],
    }), true);
    await queryRunner.createIndex('client_inquiries', new TableIndex({ name: 'IDX_client_inquiries_created_at', columnNames: ['createdAt'] }));
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('client_inquiries');
  }
}
