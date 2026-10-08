// Generate DDL from the initialized Sequelize models without connecting to MySQL.
const fs = require('fs');
const path = require('path');
const sequelize = require('../config/database');
const { initModels } = require('../models');

initModels();
const generator = sequelize.getQueryInterface().queryGenerator;
const models = sequelize.modelManager.getModelsTopoSortedByForeignKey();
if (!models) throw new Error('Circular foreign keys: cannot order tables.');
const statements = [
  '-- Generated from backend models. MySQL; run only against a new database.',
  '-- CREATE IF NOT EXISTS does not migrate existing tables.',
  'CREATE DATABASE IF NOT EXISTS `syscon2026` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;',
  'USE `syscon2026`;',
  "SET time_zone = '+00:00';",
];
for (const model of [...models].reverse()) {
  const attributes = Object.fromEntries(
    Object.values(model.rawAttributes)
      .filter((attribute) => attribute.type.key !== 'VIRTUAL')
      .map((attribute) => [attribute.field, attribute])
  );
  const sqlAttributes = generator.attributesToSQL(attributes, {
    table: model.getTableName(), context: 'createTable',
  });
  const ddl = generator.createTableQuery(model.getTableName(), sqlAttributes, {
    ...model.options, charset: 'utf8mb4', collate: 'utf8mb4_unicode_ci',
  });
  statements.push(ddl.replace(/, /g, ',\n  '));
}
const output = path.resolve(__dirname, '../../sql/01-create-syscon2026.sql');
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, `${statements.join('\n\n')}\n`);
console.log(`Generated ${models.length} tables: ${output}`);
