const dotenv = require('dotenv');

dotenv.config();

const env = {
  port: Number(process.env.PORT) || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    name: process.env.DB_NAME || 'ieee_conference',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    syncOnStart:
      process.env.DB_SYNC_ON_START !== undefined
        ? process.env.DB_SYNC_ON_START === 'true'
        : (process.env.NODE_ENV || 'development') === 'development',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'change_this_secret',
    expiresIn: process.env.JWT_EXPIRES_IN || '1d',
  },
  smtp: {
    host: process.env.SMTP_HOST || '',
    port: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : null,
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || '',
  },
  bankTransfer: {
    bankName: process.env.BANK_TRANSFER_BANK_NAME || '',
    accountHolder: process.env.BANK_TRANSFER_ACCOUNT_HOLDER || '',
    accountType: process.env.BANK_TRANSFER_ACCOUNT_TYPE || '',
    accountNumber: process.env.BANK_TRANSFER_ACCOUNT_NUMBER || '',
    swiftCode: process.env.BANK_TRANSFER_SWIFT_CODE || '',
    routingNumber: process.env.BANK_TRANSFER_ROUTING_NUMBER || '',
    taxId: process.env.BANK_TRANSFER_TAX_ID || '',
    email: process.env.BANK_TRANSFER_EMAIL || '',
    instructions: process.env.BANK_TRANSFER_INSTRUCTIONS || '',
  },
  app: {
    baseUrl: process.env.APP_BASE_URL || 'http://localhost:5000',
  },
  paypal: {
    clientId: process.env.PAYPAL_CLIENT_ID || '',
    clientSecret: process.env.PAYPAL_CLIENT_SECRET || '',
    baseUrl: process.env.PAYPAL_BASE_URL || 'https://api-m.sandbox.paypal.com',
    webhookId: process.env.PAYPAL_WEBHOOK_ID || '',
    returnUrl: process.env.PAYPAL_RETURN_URL || '',
    cancelUrl: process.env.PAYPAL_CANCEL_URL || '',
    brandName: process.env.PAYPAL_BRAND_NAME || 'IEEE Conference Platform',
  },
  payphone: {
    baseUrl: process.env.PAYPHONE_BASE_URL || 'https://pay.payphonetodoesposible.com/api',
    token: process.env.PAYPHONE_TOKEN || '',
    storeId: process.env.PAYPHONE_STORE_ID || '',
    callbackUrl: process.env.PAYPHONE_CALLBACK_URL || '',
    cancelUrl: process.env.PAYPHONE_CANCEL_URL || '',
    currency: process.env.PAYPHONE_CURRENCY || 'USD',
    callbackToken: process.env.PAYPHONE_CALLBACK_TOKEN || '',
  },
};

module.exports = env;
