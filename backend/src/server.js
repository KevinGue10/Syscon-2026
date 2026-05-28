const app = require('./app');
const { Op } = require('sequelize');
const sequelize = require('./config/database');
const env = require('./config/env');
const { initModels, Registration, Payment } = require('./models');
const { PAYMENT_STATUSES } = require('./constants/enums');
const { calculateRegistrationTotals } = require('./services/pricingService');

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

const ensurePaymentStatusEnums = async () => {
  const enumValues = [
    'pending_link',
    'pending_payment',
    'pending_validation',
    'pending',
    'approved',
    'rejected',
    'cancelled',
    'refunded',
  ];
  const enumDefinition = enumValues.map((value) => `'${value}'`).join(', ');
  const alterStatements = [
    `ALTER TABLE \`payments\` MODIFY \`status\` ENUM(${enumDefinition}) NOT NULL DEFAULT 'pending'`,
    `ALTER TABLE \`payment_status_history\` MODIFY \`previous_status\` ENUM(${enumDefinition}) NULL`,
    `ALTER TABLE \`payment_status_history\` MODIFY \`new_status\` ENUM(${enumDefinition}) NOT NULL`,
  ];

  for (const statement of alterStatements) {
    try {
      await sequelize.query(statement);
    } catch (error) {
      if (error?.original?.code !== 'ER_NO_SUCH_TABLE' && error?.original?.code !== 'ER_BAD_FIELD_ERROR') {
        throw error;
      }
    }
  }
};

const ensureRegistrationPaymentOptionColumns = async () => {
  const alterStatements = [
    "ALTER TABLE `registrations` ADD COLUMN `includes_tour` TINYINT(1) NOT NULL DEFAULT 0 AFTER `membership_number`",
    "ALTER TABLE `registrations` ADD COLUMN `requires_invoice` TINYINT(1) NOT NULL DEFAULT 0 AFTER `includes_tour`",
  ];

  for (const statement of alterStatements) {
    try {
      await sequelize.query(statement);
    } catch (error) {
      if (error?.original?.code !== 'ER_DUP_FIELDNAME' && error?.original?.code !== 'ER_NO_SUCH_TABLE') {
        throw error;
      }
    }
  }
};

const reconcileRegistrationPaymentOptions = async () => {
  const registrations = await Registration.findAll({
    include: [
      {
        association: 'payments',
        required: false,
        where: {
          status: {
            [Op.notIn]: [PAYMENT_STATUSES.REJECTED, PAYMENT_STATUSES.CANCELLED],
          },
        },
      },
    ],
  });

  for (const registration of registrations) {
    const payments = registration.payments || [];
    if (!payments.length) {
      continue;
    }

    const baseTotal = Number(registration.totalAmount || 0);
    const highestPaymentAmount = payments.reduce(
      (max, payment) => Math.max(max, Number(payment.amountUsd || 0)),
      0
    );
    const includesTour = registration.includesTour || payments.some((payment) => Boolean(payment.includesTour));
    const expectedWithTour = baseTotal + (includesTour ? 10 : 0);
    const expectedWithInvoiceAndTour = expectedWithTour + Number((baseTotal * 0.15).toFixed(2));
    const requiresInvoice =
      registration.requiresInvoice ||
      Math.abs(highestPaymentAmount - expectedWithInvoiceAndTour) <= 0.02;

    if (
      Boolean(registration.includesTour) !== Boolean(includesTour) ||
      Boolean(registration.requiresInvoice) !== Boolean(requiresInvoice)
    ) {
      await registration.update({
        includesTour: Boolean(includesTour),
        requiresInvoice: Boolean(requiresInvoice),
      });
      await calculateRegistrationTotals(registration.id, {
        allowMissingPricingRule: true,
      });
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
    await ensurePaymentStatusEnums();
    await ensureRegistrationPaymentOptionColumns();
    await reconcileRegistrationPaymentOptions();
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
