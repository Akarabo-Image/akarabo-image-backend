import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class ExpandCustomerNotes1797600000000 implements MigrationInterface {
  name = 'ExpandCustomerNotes1797600000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('customers');
    const column = table?.findColumnByName('notes');
    if (column && column.length !== '1200') {
      await queryRunner.changeColumn(
        'customers',
        column,
        new TableColumn({ ...column, length: '1200' }),
      );
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('customers');
    const column = table?.findColumnByName('notes');
    if (column && column.length !== '500') {
      await queryRunner.changeColumn(
        'customers',
        column,
        new TableColumn({ ...column, length: '500' }),
      );
    }
  }
}
