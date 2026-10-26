import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddClientInquiryPhone1797000000000 implements MigrationInterface {
  name = 'AddClientInquiryPhone1797000000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('client_inquiries');
    if (!table?.findColumnByName('phone')) {
      await queryRunner.addColumn(
        'client_inquiries',
        new TableColumn({
          name: 'phone',
          type: 'varchar',
          length: '30',
          isNullable: true,
        }),
      );
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('client_inquiries');
    if (table?.findColumnByName('phone')) {
      await queryRunner.dropColumn('client_inquiries', 'phone');
    }
  }
}
