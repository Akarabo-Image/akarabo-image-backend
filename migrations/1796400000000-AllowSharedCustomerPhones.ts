import { MigrationInterface, QueryRunner, TableIndex } from 'typeorm';

/** Customer phone numbers are contact details, not unique identifiers. */
export class AllowSharedCustomerPhones1796400000000 implements MigrationInterface {
  name = 'AllowSharedCustomerPhones1796400000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('customers');
    const phoneIndex = table?.indices.find(
      (index) => index.name === 'UQ_customers_phone',
    );
    if (phoneIndex) {
      await queryRunner.dropIndex('customers', phoneIndex);
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createIndex(
      'customers',
      new TableIndex({
        name: 'UQ_customers_phone',
        columnNames: ['phone'],
        isUnique: true,
      }),
    );
  }
}
