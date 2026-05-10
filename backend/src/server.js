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

const startServer = async () => {
  try {
    initModels();
    await sequelize.authenticate();
    if (env.db.syncOnStart) {
      await sequelize.sync({ alter: true });
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
