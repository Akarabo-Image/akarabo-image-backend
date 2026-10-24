import { MigrationInterface, QueryRunner, Table, TableColumn, TableForeignKey, TableIndex } from 'typeorm';

export class CreateStudioReporting1795200000000 implements MigrationInterface {
  name = 'CreateStudioReporting1795200000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    const postgres = queryRunner.connection.options.type === 'postgres';
    const uuid = postgres ? 'uuid' : 'varchar';
    const timestamp = postgres ? 'timestamptz' : 'datetime';
    await queryRunner.createTable(new Table({ name: 'studio_services', columns: [
      { name: 'id', type: uuid, isPrimary: true, ...(postgres ? { default: 'gen_random_uuid()' } : {}) },
      { name: 'customerId', type: uuid },
      { name: 'serviceDate', type: 'varchar', length: '10' },
      { name: 'photosTaken', type: 'int', default: 0 },
      { name: 'softPhotos', type: 'int', default: 0 },
      { name: 'hardPhotos', type: 'int', default: 0 },
      { name: 'totalAmount', type: 'numeric', precision: 12, scale: 2, default: 0 },
      { name: 'status', type: 'varchar', length: '20', default: "'IN_PROGRESS'" },
      { name: 'recordedByUserId', type: uuid },
      { name: 'createdAt', type: timestamp, default: 'CURRENT_TIMESTAMP' },
      { name: 'updatedAt', type: timestamp, default: 'CURRENT_TIMESTAMP' },
    ] }), true);
    await queryRunner.createForeignKey('studio_services', new TableForeignKey({ columnNames: ['customerId'], referencedTableName: 'customers', referencedColumnNames: ['id'], onDelete: 'RESTRICT' }));
    await queryRunner.createForeignKey('studio_services', new TableForeignKey({ columnNames: ['recordedByUserId'], referencedTableName: 'users', referencedColumnNames: ['id'], onDelete: 'RESTRICT' }));
    await queryRunner.createIndex('studio_services', new TableIndex({ name: 'IDX_studio_services_day', columnNames: ['serviceDate'] }));

    await queryRunner.createTable(new Table({ name: 'photographer_daily_work', columns: [
      { name: 'id', type: uuid, isPrimary: true, ...(postgres ? { default: 'gen_random_uuid()' } : {}) },
      { name: 'photographerUserId', type: uuid },
      { name: 'workDate', type: 'varchar', length: '10' },
      { name: 'editedPhotos', type: 'int', default: 0 },
      { name: 'notes', type: 'varchar', length: '500', isNullable: true },
      { name: 'createdAt', type: timestamp, default: 'CURRENT_TIMESTAMP' },
      { name: 'updatedAt', type: timestamp, default: 'CURRENT_TIMESTAMP' },
    ] }), true);
    await queryRunner.createForeignKey('photographer_daily_work', new TableForeignKey({ columnNames: ['photographerUserId'], referencedTableName: 'users', referencedColumnNames: ['id'], onDelete: 'RESTRICT' }));
    await queryRunner.createIndex('photographer_daily_work', new TableIndex({ name: 'IDX_photographer_daily_work_day', columnNames: ['workDate'] }));

    await queryRunner.addColumn('payments', new TableColumn({ name: 'studioServiceId', type: uuid, isNullable: true }));
    await queryRunner.createForeignKey('payments', new TableForeignKey({ columnNames: ['studioServiceId'], referencedTableName: 'studio_services', referencedColumnNames: ['id'], onDelete: 'RESTRICT' }));
    await queryRunner.createIndex('payments', new TableIndex({ name: 'IDX_payments_studio_service', columnNames: ['studioServiceId'] }));
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const payment = await queryRunner.getTable('payments');
    const serviceFk = payment?.foreignKeys.find((key) => key.columnNames.includes('studioServiceId'));
    if (serviceFk) await queryRunner.dropForeignKey('payments', serviceFk);
    await queryRunner.dropIndex('payments', 'IDX_payments_studio_service');
    await queryRunner.dropColumn('payments', 'studioServiceId');
    await queryRunner.dropTable('photographer_daily_work');
    await queryRunner.dropTable('studio_services');
  }
}
