const dotenv = require('dotenv');

dotenv.config();

const env = {
  port: Number(process.env.PORT) || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    name: process.env.DB_NAME || 'syscon2026',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    syncOnStart:
      process.env.DB_SYNC_ON_START !== undefined
        ? process.env.DB_SYNC_ON_START === 'true'
        : false,
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'change_this_secret',
    expiresIn: process.env.JWT_EXPIRES_IN || '1d',
  },
  dollarRate: {
    enabled: process.env.DOLLAR_RATE_JOB_ENABLED !== 'false',
    runOnStart: process.env.DOLLAR_RATE_RUN_ON_START !== 'false',
    timeoutMs: Number(process.env.DOLLAR_RATE_TIMEOUT_MS) || 15000,
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
    ruc: process.env.BANK_TRANSFER_RUC || process.env.BANK_TRANSFER_TAX_ID || '',
    email: process.env.BANK_TRANSFER_EMAIL || '',
    instructions: process.env.BANK_TRANSFER_INSTRUCTIONS || '',
  },
  app: {
    baseUrl: process.env.APP_BASE_URL || 'http://localhost:5000',
    emailLogoUrl: process.env.EMAIL_LOGO_URL || '',
  },
  storage: {
    endpoint: process.env.OBJECT_STORAGE_ENDPOINT || '',
    bucket: process.env.OBJECT_STORAGE_BUCKET || '',
    region: process.env.OBJECT_STORAGE_REGION || 'auto',
    accessKeyId: process.env.OBJECT_STORAGE_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.OBJECT_STORAGE_SECRET_ACCESS_KEY || '',
    publicBaseUrl: process.env.OBJECT_STORAGE_PUBLIC_BASE_URL || '',
    paymentProofsPrefix: process.env.OBJECT_STORAGE_PAYMENT_PROOFS_PREFIX || 'payment-proofs',
    signedUrlExpiresInSeconds: Number(process.env.OBJECT_STORAGE_SIGNED_URL_EXPIRES_IN || 900),
  },
  cobru: {
    localTestMode: process.env.COBRU_LOCAL_TEST_MODE === 'true',
    baseUrl: process.env.COBRU_BASE_URL || 'https://dev.cobru.co',
    apiKey: process.env.COBRU_API_KEY || '',
    refreshToken: process.env.COBRU_REFRESH_TOKEN || '',
    callbackToken: process.env.COBRU_CALLBACK_TOKEN || '',
    callbackUrl: process.env.COBRU_CALLBACK_URL || '',
    returnUrl: process.env.COBRU_RETURN_URL || '',
    expirationDays: Number(process.env.COBRU_EXPIRATION_DAYS || 1),
    timeoutMs: Number(process.env.COBRU_TIMEOUT_MS || 15000),
    paymentMethods: { breb: true, pse: true, NEQUI: true, credit_card: true },
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
