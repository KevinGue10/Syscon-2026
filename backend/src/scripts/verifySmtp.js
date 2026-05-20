const dotenv = require('dotenv');
const nodemailer = require('nodemailer');

dotenv.config();

const requiredKeys = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'SMTP_FROM'];
const missingKeys = requiredKeys.filter((key) => !process.env[key]);

if (missingKeys.length) {
  console.error(`Missing SMTP config: ${missingKeys.join(', ')}`);
  process.exit(1);
}

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: Number(process.env.SMTP_PORT) === 465,
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 15000,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const recipient = process.argv[2] || process.env.SMTP_TEST_TO || '';

const run = async () => {
  await transporter.verify();
  console.log('SMTP authentication OK.');

  if (!recipient) {
    console.log('No test recipient provided. Verification finished without sending an email.');
    return;
  }

  const info = await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: recipient,
    subject: 'SMTP test - IEEE Platform',
    text: 'This is a test email sent by the IEEE Platform backend SMTP verification script.',
    html: '<p>This is a test email sent by the IEEE Platform backend SMTP verification script.</p>',
  });

  console.log(`Test email sent. Message ID: ${info.messageId}`);
};

run()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('SMTP verification failed.');
    console.error(error && error.message ? error.message : error);
    process.exit(1);
  });
