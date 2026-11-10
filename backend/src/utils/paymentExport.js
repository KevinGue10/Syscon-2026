function priority(payment) {
  if (['paid', 'approved', 'accepted'].includes(payment.status)) return 0;
  if (['pending', 'pending_link', 'pending_payment', 'pending_validation'].includes(payment.status)) return 1;
  return 2;
}

// Prefer successful payments, then pending payments, then other recorded states.
// Within each group use creation time and ID, never validation time.
function selectExportPayment(payments) {
  return [...payments].sort((a, b) =>
    priority(a) - priority(b) ||
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime() ||
    Number(b.id) - Number(a.id)
  )[0] || null;
}

module.exports = { selectExportPayment };
