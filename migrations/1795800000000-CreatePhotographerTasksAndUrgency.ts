import { MigrationInterface, QueryRunner, Table, TableColumn, TableForeignKey, TableIndex } from 'typeorm';

export class CreatePhotographerTasksAndUrgency1795800000000 implements MigrationInterface {
  name = 'CreatePhotographerTasksAndUrgency1795800000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    const postgres = queryRunner.connection.options.type === 'postgres';
    const uuid = postgres ? 'uuid' : 'varchar';
    const timestamp = postgres ? 'timestamptz' : 'datetime';
    await queryRunner.addColumn('studio_services', new TableColumn({ name: 'needsUrgentService', type: 'boolean', isNullable: false, default: postgres ? 'false' : '0' }));

    await queryRunner.createTable(new Table({ name: 'photographer_tasks', columns: [
      { name: 'id', type: uuid, isPrimary: true, ...(postgres ? { default: 'gen_random_uuid()' } : {}) },
      { name: 'studioServiceId', type: uuid },
      { name: 'photographerUserId', type: uuid },
      { name: 'taskDate', type: 'varchar', length: '10' },
      { name: 'photosToEdit', type: 'int' },
      { name: 'editedPhotos', type: 'int', isNullable: true },
      { name: 'status', type: 'varchar', length: '20', default: "'ASSIGNED'" },
      { name: 'notes', type: 'varchar', length: '500', isNullable: true },
      { name: 'assignedByUserId', type: uuid },
      { name: 'readAt', type: timestamp, isNullable: true },
      { name: 'completedAt', type: timestamp, isNullable: true },
      { name: 'createdAt', type: timestamp, default: 'CURRENT_TIMESTAMP' },
      { name: 'updatedAt', type: timestamp, default: 'CURRENT_TIMESTAMP' },
    ] }), true);
    await queryRunner.createForeignKey('photographer_tasks', new TableForeignKey({ columnNames: ['studioServiceId'], referencedTableName: 'studio_services', referencedColumnNames: ['id'], onDelete: 'RESTRICT' }));
    await queryRunner.createForeignKey('photographer_tasks', new TableForeignKey({ columnNames: ['photographerUserId'], referencedTableName: 'users', referencedColumnNames: ['id'], onDelete: 'RESTRICT' }));
    await queryRunner.createForeignKey('photographer_tasks', new TableForeignKey({ columnNames: ['assignedByUserId'], referencedTableName: 'users', referencedColumnNames: ['id'], onDelete: 'RESTRICT' }));
    await queryRunner.createIndex('photographer_tasks', new TableIndex({ name: 'IDX_photographer_tasks_assignee_day', columnNames: ['photographerUserId', 'taskDate'] }));
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('photographer_tasks');
    await queryRunner.dropColumn('studio_services', 'needsUrgentService');
  }
}
