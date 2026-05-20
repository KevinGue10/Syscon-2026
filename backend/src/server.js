const app = require('./app');
const sequelize = require('./config/database');
const env = require('./config/env');
const { initModels } = require('./models');

const getErrorLocation = (error) => {
  if (!error || !error.stack) {
    return null;
  }

  const lines = String(error.stack)
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('at '));

  const usefulLine = lines.find(
    (line) =>
      !line.includes('node_modules') &&
      (line.includes('\\src\\') || line.includes('/src/'))
  );

  return usefulLine || lines[0] || null;
};

const wait = (ms) => new Promise((resolve) => {
  setTimeout(resolve, ms);
});

const normalizeLegacyNulls = async () => {
  const cleanupStatements = [
    'UPDATE `pricing_rules` SET `is_tems` = false WHERE `is_tems` IS NULL',
    'UPDATE `pricing_rules` SET `is_ieee_member` = false WHERE `is_ieee_member` IS NULL',
    'UPDATE `pricing_rules` SET `is_active` = true WHERE `is_active` IS NULL',
    'UPDATE `registrations` SET `is_tems_member` = false WHERE `is_tems_member` IS NULL',
    'UPDATE `registrations` SET `is_ieee_member` = false WHERE `is_ieee_member` IS NULL',
  ];

  for (const statement of cleanupStatements) {
    try {
      await sequelize.query(statement);
    } catch (error) {
      // Ignore missing tables/columns during first boot; sync will create them.
      if (
        error?.original?.code !== 'ER_NO_SUCH_TABLE' &&
        error?.original?.code !== 'ER_BAD_FIELD_ERROR'
      ) {
        throw error;
      }
    }
  }
};

const syncDatabaseWithRetries = async (maxAttempts = 3) => {
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await sequelize.sync({ alter: true });
      return;
    } catch (error) {
      const isDeadlock = error?.original?.code === 'ER_LOCK_DEADLOCK';
      const isLastAttempt = attempt === maxAttempts;

      if (!isDeadlock || isLastAttempt) {
        throw error;
      }

      const retryDelayMs = attempt * 1500;
      console.warn(
        `[DB SYNC] Deadlock detected during schema sync. Retrying in ${retryDelayMs}ms (attempt ${attempt + 1}/${maxAttempts}).`
      );
      await wait(retryDelayMs);
    }
  }
};

const startServer = async () => {
  try {
    initModels();
    await sequelize.authenticate();
    if (env.db.syncOnStart) {
      console.warn('[DB SYNC] Automatic schema sync is enabled. Use it only for disposable local databases.');
      await normalizeLegacyNulls();
      await syncDatabaseWithRetries();
    }

    app.listen(env.port, () => {
      console.log(`Server running on port ${env.port}`);
    });
  } catch (error) {
    console.error('[STARTUP ERROR]', {
      message: error.message,
      name: error.name,
      location: getErrorLocation(error),
      original: error.original || null,
    });
    process.exit(1);
  }
};

startServer();
