export function getPaymentReviewAmounts(payment, registration, enteredAmount, currency = 'USD') {
  const originalUsd = Number(payment?.amountUsd || 0);
  const originalCop = Number(payment?.amountCop);
  const rate = originalUsd > 0 && Number.isFinite(originalCop) && originalCop > 0 ? originalCop / originalUsd : null;
  const pendingUsd = Number(registration?.paymentSummary?.pendingAmount ?? registration?.pendingAmount ?? 0);
  const input = enteredAmount === '' ? NaN : Number(enteredAmount);
  const verifiedUsd = currency === 'COP' ? (rate ? Math.round(input / rate * 100) / 100 : NaN) : Math.round(input * 100) / 100;
  const valid = Number.isFinite(input) && input > 0 && Number.isFinite(verifiedUsd) && verifiedUsd > 0 && verifiedUsd <= originalUsd + 0.005;
  return { originalUsd, originalCop:rate ? originalCop : null, rate, pendingUsd, verifiedUsd,
    verifiedCop:rate ? Math.round(verifiedUsd * rate * 100) / 100 : null,
    remainingUsd:valid ? Math.max(0,Math.round((pendingUsd - verifiedUsd)*100)/100) : pendingUsd,
    valid,
  };
}
export function formatReviewMoney(usd, rate) {
  const dollars = new Intl.NumberFormat('es-CO',{style:'currency',currency:'USD',minimumFractionDigits:2}).format(usd) + ' USD';
  return dollars + (rate ? ' / ' + new Intl.NumberFormat('es-CO',{style:'currency',currency:'COP',minimumFractionDigits:2}).format(usd * rate) + ' COP' : ' / COP no disponible');
}
