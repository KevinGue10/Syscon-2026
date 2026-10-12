const { buildSysconEmail } = require('./sysconEmailLayout');
const statusLabels = { draft:"Draft", submitted:"Submitted", confirmed:"Confirmed", cancelled:"Cancelled", pending:"Pending" };
function buildRegistrationConfirmationTemplate({ firstName, registration, appBaseUrl, logoUrl }) {
  return buildSysconEmail({ title:"We received your registration",name:firstName,intro:"Your IEEE SYSCON LATAM 2026 registration has been recorded. Sign in to review your details and continue the process.",details:[{label:"Registration",value:`#${registration.id}`},{label:"Status",value:statusLabels[registration.status] || registration.status}],note:"Creating a registration does not confirm payment. Check your participation status on the platform.",actionLabel:"View my registration",actionUrl:appBaseUrl,appBaseUrl,logoUrl });
}
function buildPaperRegistrationTemplate({ firstName, paper, appBaseUrl, logoUrl }) {
  return buildSysconEmail({title:"Your paper has been registered",name:firstName,intro:"Your paper information has been saved on the SYSCON LATAM 2026 platform.",details:[{label:"Title",value:paper.title},{label:"Paper code",value:paper.paperCode}],note:"This message confirms paper registration on the platform. Academic acceptance is communicated through the corresponding review process.",actionLabel:"View my papers",actionUrl:appBaseUrl,appBaseUrl,logoUrl});
}
function buildPendingPaymentReminderTemplate({ firstName, registration, appBaseUrl, logoUrl }) {
  return buildSysconEmail({title:"You have an outstanding balance",name:firstName,intro:"Your registration has an outstanding balance. Review the available payment methods on the platform to continue.",details:[{label:"Registration",value:`#${registration.id}`},{label:"Outstanding balance",value:`$${Number(registration.pendingAmount || 0).toFixed(2)} USD`}],note:"If you have already paid, check the payment status and upload your receipt when applicable.",actionLabel:"View my payments",actionUrl:appBaseUrl,appBaseUrl,logoUrl});
}
module.exports = {buildRegistrationConfirmationTemplate,buildPaperRegistrationTemplate,buildPendingPaymentReminderTemplate};
