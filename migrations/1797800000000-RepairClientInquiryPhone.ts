import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

/** Repairs databases where the inquiry phone migration was recorded without its column. */
export class RepairClientInquiryPhone1797800000000 implements MigrationInterface {
  name = 'RepairClientInquiryPhone1797800000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('client_inquiries');
    if (!table) {
      throw new Error('The client_inquiries table must exist before adding its phone column.');
    }
    if (!table.findColumnByName('phone')) {
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
