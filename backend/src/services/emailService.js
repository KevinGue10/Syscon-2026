const { buildRegistrationConfirmationTemplate, buildPaperRegistrationTemplate, buildPendingPaymentReminderTemplate } = require('../templates/emails/notificationTemplates');
const nodemailer = require('nodemailer');
const env = require('../config/env');
const { EmailLog } = require('../models');
const { EMAIL_LOG_STATUSES } = require('../constants/enums');
const { buildPasswordResetTemplate } = require('../templates/emails/passwordResetTemplate');
const { buildPaymentApprovedTemplate } = require('../templates/emails/paymentApprovedTemplate');
const { buildPayPhoneLinkTemplate } = require('../templates/emails/payPhoneLinkTemplate');
const { buildWelcomeTemplate } = require('../templates/emails/welcomeTemplate');

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
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
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
    ...buildWelcomeTemplate({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      city: user.city,
      affiliation: user.affiliation,
      role: user.role,
      appBaseUrl: env.app.baseUrl,
      logoUrl: env.app.emailLogoUrl,
    }),
    templateName: 'welcome',
    userId: user.id,
  });

const sendRegistrationConfirmationEmail = (user, registration) =>
  sendEmail({
    to: user.email,
    ...buildRegistrationConfirmationTemplate({ firstName: user.firstName, registration, appBaseUrl: env.app.baseUrl, logoUrl: env.app.emailLogoUrl }),
    templateName: 'registration_confirmation',
    userId: user.id,
    registrationId: registration.id,
  });

const sendPaperRegistrationEmail = (user, paper) =>
  sendEmail({
    to: user.email,
    ...buildPaperRegistrationTemplate({ firstName: user.firstName, paper, appBaseUrl: env.app.baseUrl, logoUrl: env.app.emailLogoUrl }),
    templateName: 'paper_registration_confirmation',
    userId: user.id,
    registrationId: paper.registrationId,
  });

const sendPaymentConfirmationEmail = (user, payment) =>
  sendEmail({
    to: user.email,
    ...buildPaymentApprovedTemplate({
      firstName: user.firstName,
      amountUsd: payment.amountUsd,
      transactionReference: payment.transactionReference || payment.providerPaymentId,
      paymentMethod: payment.paymentMethod,
      appBaseUrl: env.app.baseUrl,
      logoUrl: env.app.emailLogoUrl,
    }),
    templateName: 'payment_confirmation',
    userId: user.id,
    registrationId: payment.registrationId,
  });

const sendPendingPaymentReminderEmail = (user, registration) =>
  sendEmail({
    to: user.email,
    ...buildPendingPaymentReminderTemplate({ firstName: user.firstName, registration, appBaseUrl: env.app.baseUrl, logoUrl: env.app.emailLogoUrl }),
    templateName: 'pending_payment_reminder',
    userId: user.id,
    registrationId: registration.id,
  });

const sendPasswordResetEmail = ({ user, provisionalPassword }) =>
  sendEmail({
    to: user.email,
    ...buildPasswordResetTemplate({
      firstName: user.firstName,
      provisionalPassword,
      appBaseUrl: env.app.baseUrl,
      logoUrl: env.app.emailLogoUrl,
    }),
    templateName: 'password_reset',
    userId: user.id,
  });

const sendPayPhoneLinkEmail = ({ user, payment, paymentLink }) =>
  sendEmail({
    to: user.email,
    ...buildPayPhoneLinkTemplate({
      firstName: user.firstName,
      amountUsd: payment.amountUsd,
      paymentLink,
      appBaseUrl: env.app.baseUrl,
      logoUrl: env.app.emailLogoUrl,
    }),
    templateName: 'payphone_link',
    userId: user.id,
    registrationId: payment.registrationId,
  });

module.exports = {
  sendWelcomeEmail,
  sendRegistrationConfirmationEmail,
  sendPaperRegistrationEmail,
  sendPaymentConfirmationEmail,
  sendPendingPaymentReminderEmail,
  sendPasswordResetEmail,
  sendPayPhoneLinkEmail,
};
