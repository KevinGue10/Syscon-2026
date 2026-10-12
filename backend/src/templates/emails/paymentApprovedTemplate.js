const { buildSysconEmail } = require('./sysconEmailLayout');
const buildPaymentApprovedTemplate = ({ firstName, amountUsd, transactionReference, paymentMethod, appBaseUrl, logoUrl }) => buildSysconEmail({
  title:"Your payment has been confirmed", name:firstName,
  intro:"The approved amount has been applied to your registration. You can check your updated payment status on the platform.",
  details:[{label:"Confirmed amount",value:`$${Number(amountUsd || 0).toFixed(2)} USD`},{label:"Reference",value:transactionReference || "Not provided"},{label:"Method",value:({bank_transfer:"Bank transfer",payphone:'PayPhone',cobru:'Cobru'})[String(paymentMethod || '').toLowerCase()] || paymentMethod || "Not specified"}],
  note:"This email confirms the payment shown above. Check your registration to see whether an outstanding balance remains.",
  actionLabel:"View my registration",actionUrl:appBaseUrl,appBaseUrl,logoUrl,
});
module.exports = { buildPaymentApprovedTemplate };
