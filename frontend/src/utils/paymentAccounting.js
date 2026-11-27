export const isCouponPayment = payment => payment?.provider === 'coupon' || payment?.paymentMethod === 'coupon';

export function paymentAccounting(payments = []) {
  let cashCents = 0, discountCents = 0, cashCopCents = 0, missingCopCount = 0;
  for (const payment of payments) {
    if (payment.status !== 'approved') continue;
    if (isCouponPayment(payment)) discountCents += Math.round(Number(payment.amountUsd || 0) * 100);
    else {
      cashCents += Math.round(Number(payment.amountUsd || 0) * 100);
      if (payment.amountCop == null || payment.amountCop === '' || !Number.isFinite(Number(payment.amountCop))) missingCopCount++;
      else cashCopCents += Math.round(Number(payment.amountCop) * 100);
    }
  }
  return { cashPaidUsd: cashCents / 100, discountUsd: discountCents / 100,
    cashPaidCop: missingCopCount ? null : cashCopCents / 100, missingCopCount };
}

export function formatApprovedMoneyReceived(payments) {
  const totals = paymentAccounting(payments);
  const format = (value, currency) => new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 2 }).format(value);
  return `${format(totals.cashPaidUsd, 'USD')} USD / ${totals.cashPaidCop == null ? 'COP unavailable (a payment is missing its COP amount)' : `${format(totals.cashPaidCop, 'COP')} COP`}`;
}
