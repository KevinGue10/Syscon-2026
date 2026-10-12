const { buildSysconEmail } = require('./sysconEmailLayout');
const buildPayPhoneLinkTemplate = ({ firstName, amountUsd, paymentLink, appBaseUrl, logoUrl }) => buildSysconEmail({
  title:"Your payment link is ready",name:firstName,
  intro:"The administration team has enabled the link to complete your SYSCON LATAM 2026 registration payment by card.",
  details:[{label:"Amount",value:`$${Number(amountUsd || 0).toFixed(2)} USD`},{label:"Method",value:'PayPhone'}],
  note:"Complete your payment using the link and keep the receipt or confirmation provided by the payment gateway.",
  actionLabel:"Open payment link",actionUrl:paymentLink,appBaseUrl,logoUrl,
});
module.exports = { buildPayPhoneLinkTemplate };
