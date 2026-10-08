const sequelize = require('../config/database');
const { initModels } = require('../models');
const { fetchDollarRate, updateDollarRate } = require('../services/dollarRateService');

(async () => {
  try {
    if (process.argv.includes('--dry-run')) {
      console.log(JSON.stringify(await fetchDollarRate(), null, 2));
      return;
    }
    initModels();
    await sequelize.authenticate();
    await updateDollarRate();
  } catch (error) {
    console.error(`[TRM] ${error.message}`);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
})();
