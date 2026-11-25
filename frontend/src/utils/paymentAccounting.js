export const isCouponPayment = payment => payment?.provider === 'coupon' || payment?.paymentMethod === 'coupon';

export function paymentAccounting(payments = []) {
  let cashCents = 0, discountCents = 0;
  for (const payment of payments) {
    if (payment.status !== 'approved') continue;
    if (isCouponPayment(payment)) discountCents += Math.round(Number(payment.amountUsd || 0) * 100);
    else cashCents += Math.round(Number(payment.amountUsd || 0) * 100);
  }
  return { cashPaidUsd: cashCents / 100, discountUsd: discountCents / 100 };
}
