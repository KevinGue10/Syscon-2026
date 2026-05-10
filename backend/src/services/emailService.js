const nodemailer = require('nodemailer');
const env = require('../config/env');
const { EmailLog } = require('../models');
const { EMAIL_LOG_STATUSES } = require('../constants/enums');

let transporter;

const hasSmtpConfig = () =>
  Boolean(env.smtp.host && env.smtp.port && env.smtp.user && env.smtp.pass && env.smtp.from);

const getTransporter = () => {
  if (!hasSmtpConfig()) {
    return null;
  }

  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: Number(env.smtp.port) === 465,
      auth: {
        user: env.smtp.user,
        pass: env.smtp.pass,
      },
    });
  }

  return transporter;
};

const createEmailLog = async ({ userId = null, registrationId = null, subject, templateName, status }) => {
  try {
    await EmailLog.create({
      userId,
      registrationId,
      subject,
      templateName,
      status,
    });
  } catch (error) {
    console.error('Email log creation failed:', error.message);
  }
};

const sendEmail = async ({ to, subject, text, html, templateName, userId = null, registrationId = null }) => {
  try {
    const smtpTransporter = getTransporter();

    if (!smtpTransporter) {
      console.warn(`SMTP not configured. Email skipped: ${subject}`);
      await createEmailLog({ userId, registrationId, subject, templateName, status: EMAIL_LOG_STATUSES.FAILED });
      return { skipped: true };
    }

    await smtpTransporter.sendMail({
      from: env.smtp.from,
      to,
      subject,
      text,
      html,
    });

    await createEmailLog({ userId, registrationId, subject, templateName, status: EMAIL_LOG_STATUSES.SENT });
    return { skipped: false };
  } catch (error) {
    console.error('Email sending failed:', error.message);
    await createEmailLog({ userId, registrationId, subject, templateName, status: EMAIL_LOG_STATUSES.FAILED });
    return { skipped: false, error: error.message };
  }
};

const sendWelcomeEmail = (user) =>
  sendEmail({
    to: user.email,
    subject: 'IEEE platform account created',
    text: `Hello ${user.firstName}, your account has been created successfully.`,
    templateName: 'welcome',
    userId: user.id,
  });

const sendRegistrationConfirmationEmail = (user, registration) =>
  sendEmail({
    to: user.email,
    subject: 'Conference registration created',
    text: `Your registration #${registration.id} has been created with status ${registration.status}.`,
    templateName: 'registration_confirmation',
    userId: user.id,
    registrationId: registration.id,
  });

const sendPaperRegistrationEmail = (user, paper) =>
  sendEmail({
    to: user.email,
    subject: 'Paper registered successfully',
    text: `Your paper "${paper.title}" with code ${paper.paperCode} has been registered.`,
    templateName: 'paper_registration_confirmation',
    userId: user.id,
    registrationId: paper.registrationId,
  });

const sendPaymentConfirmationEmail = (user, payment) =>
  sendEmail({
    to: user.email,
    subject: 'Payment approved',
    text: `Your payment ${payment.transactionReference || payment.providerPaymentId || payment.id} for ${payment.amountUsd} USD was approved.`,
    templateName: 'payment_confirmation',
    userId: user.id,
    registrationId: payment.registrationId,
  });

const sendPendingPaymentReminderEmail = (user, registration) =>
  sendEmail({
    to: user.email,
    subject: 'Pending conference balance reminder',
    text: `Your registration #${registration.id} still has a pending balance of ${registration.pendingAmount}.`,
    templateName: 'pending_payment_reminder',
    userId: user.id,
    registrationId: registration.id,
  });

module.exports = {
  sendWelcomeEmail,
  sendRegistrationConfirmationEmail,
  sendPaperRegistrationEmail,
  sendPaymentConfirmationEmail,
  sendPendingPaymentReminderEmail,
};
