const { Op } = require('sequelize');

const isCouponPayment = payment => payment?.provider === 'coupon' || payment?.paymentMethod === 'coupon';

// Preserve legacy cash payments with NULL provider/method; exclude either coupon marker.
const cashPaymentWhere = (where = {}) => ({ ...where, [Op.and]: [
  { [Op.or]: [{ provider: { [Op.ne]: 'coupon' } }, { provider: null }] },
  { [Op.or]: [{ paymentMethod: { [Op.ne]: 'coupon' } }, { paymentMethod: null }] },
] });

const approvedPaymentAccounting = (payments = []) => {
  let cashCents = 0, discountCents = 0;
  for (const payment of payments) {
    if (payment.status !== 'approved') continue;
    if (isCouponPayment(payment)) discountCents += Math.round(Number(payment.amountUsd || 0) * 100);
    else cashCents += Math.round(Number(payment.amountUsd || 0) * 100);
  }
  return { cashPaidUsd: cashCents / 100, discountUsd: discountCents / 100 };
};

module.exports = { isCouponPayment, cashPaymentWhere, approvedPaymentAccounting };
