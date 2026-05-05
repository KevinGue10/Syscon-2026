const app = require('./app');
const sequelize = require('./config/database');
const env = require('./config/env');
const { initModels } = require('./models');

const startServer = async () => {
  try {
    initModels();
    await sequelize.authenticate();
    await sequelize.sync();

    app.listen(env.port, () => {
      console.log(`Server running on port ${env.port}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
