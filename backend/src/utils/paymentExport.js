const { isCouponPayment } = require('./paymentAccounting');

function priority(payment) {
  if (['paid', 'approved', 'accepted'].includes(payment.status)) return 0;
  if (payment.status === 'pending_validation') return 1;
  if (['pending', 'pending_link', 'pending_payment'].includes(payment.status)) return 2;
  return 3;
}

// Prefer successful payments, then receipts awaiting review, then other pending
// payments, then other recorded states.
// Within each group use creation time and ID, never validation time.
function selectExportPayment(payments) {
  return payments.filter(payment => !isCouponPayment(payment)).sort((a, b) =>
    priority(a) - priority(b) ||
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime() ||
    Number(b.id) - Number(a.id)
  )[0] || null;
}

module.exports = { selectExportPayment };
