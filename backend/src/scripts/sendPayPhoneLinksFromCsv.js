const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const nodemailer = require('nodemailer');

const env = require('../config/env');
const { buildPayPhoneLinkTemplate } = require('../templates/emails/payPhoneLinkTemplate');

dotenv.config();

const REQUIRED_ENV_KEYS = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'SMTP_FROM'];

const validateEnv = () => {
  const missingKeys = REQUIRED_ENV_KEYS.filter((key) => !process.env[key]);
  if (missingKeys.length) {
    throw new Error(`Missing SMTP config: ${missingKeys.join(', ')}`);
  }
};

const detectDelimiter = (headerLine) => {
  const candidates = [',', ';', '\t'];
  let bestDelimiter = ',';
  let bestScore = -1;

  for (const delimiter of candidates) {
    const score = headerLine.split(delimiter).length;
    if (score > bestScore) {
      bestScore = score;
      bestDelimiter = delimiter;
    }
  }

  return bestDelimiter;
};

const parseDelimitedLine = (line, delimiter) => {
  const values = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const nextChar = line[index + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === delimiter && !inQuotes) {
      values.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  values.push(current.trim());
  return values;
};

const parseCsv = (filePath) => {
  const rawContent = fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '');
  const lines = rawContent
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    throw new Error('CSV must include a header row and at least one data row.');
  }

  const delimiter = detectDelimiter(lines[0]);
  const headers = parseDelimitedLine(lines[0], delimiter).map((header) =>
    header
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[^\w]/g, '')
  );

  return lines.slice(1).map((line, index) => {
    const values = parseDelimitedLine(line, delimiter);
    return headers.reduce(
      (row, header, valueIndex) => {
        row[header] = values[valueIndex] || '';
        return row;
      },
      {
        __lineNumber: index + 2,
        __rawLine: line,
      }
    );
  });
};

const normalizeRow = (row) => {
  const firstName = row.first_name || row.firstname || row.firstName || '';
  const lastName = row.last_name || row.lastname || row.lastName || '';
  const email = row.email || '';
  const paymentLink = row.payment_url || row.paymenturl || row.payment_link || row.paymentlink || '';
  const amountUsd = row.amount_usd || row.amountusd || row.amount || row.monto || '0';

  if (!email || !paymentLink) {
    throw new Error(
      `Row ${row.__lineNumber || '?'} is missing required data. Email: "${email}", paymentLink: "${paymentLink}". Raw: ${row.__rawLine || 'n/a'}`
    );
  }

  return {
    firstName: [firstName, lastName].filter(Boolean).join(' ') || firstName || 'participante',
    email,
    paymentLink,
    amountUsd,
  };
};

const createTransporter = () =>
  nodemailer.createTransport({
    host: env.smtp.host,
    port: env.smtp.port,
    secure: Number(env.smtp.port) === 465,
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
    auth: {
      user: env.smtp.user,
      pass: env.smtp.pass,
    },
  });

const main = async () => {
  validateEnv();

  const csvArg = process.argv[2];
  if (!csvArg) {
    throw new Error('Usage: npm run send:payphone-links -- <path-to-csv>');
  }

  const csvPath = path.resolve(process.cwd(), csvArg);
  if (!fs.existsSync(csvPath)) {
    throw new Error(`CSV file not found: ${csvPath}`);
  }

  const rows = parseCsv(csvPath).map(normalizeRow);
  const transporter = createTransporter();

  console.log(`Sending ${rows.length} PayPhone link email(s) using ${csvPath}`);

  for (const row of rows) {
    const { subject, text, html } = buildPayPhoneLinkTemplate({
      firstName: row.firstName,
      amountUsd: row.amountUsd,
      paymentLink: row.paymentLink,
      appBaseUrl: env.app.baseUrl,
      logoUrl: env.app.emailLogoUrl,
    });

    await transporter.sendMail({
      from: env.smtp.from,
      to: row.email,
      subject,
      text,
      html,
    });

    console.log(`Sent: ${row.email}`);
  }

  console.log('Finished sending PayPhone link emails.');
};

main().catch((error) => {
  console.error('Failed to send PayPhone link emails.');
  console.error(error.message || error);
  process.exit(1);
});
