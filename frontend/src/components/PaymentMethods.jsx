import { useState } from 'react';
import { Card } from './Card';
import { Button } from './Button';
import { Alert } from './Alert';
import { paymentService } from '../services/paymentService';
import { translatePaymentStatus } from '../utils/translations';

export function PaymentMethods({ registrationId, pendingAmount, requiresInvoice, payments = [], couponApplied, onUpdated, disabled }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [createdPayment, setCreatedPayment] = useState(null);
  const pending = payments.find(p => (p.provider === 'cobru' || p.paymentMethod === 'cobru') && ['pending_link','pending_payment','pending'].includes(p.status));
  const updatedPayment = createdPayment && payments.find(p => String(p.id) === String(createdPayment.id));
  const payment = pending || updatedPayment || createdPayment;
  const checkoutUrl = /^https:\/\//i.test(payment?.paymentUrl || '') ? payment.paymentUrl : '';
  async function run(refresh) {
    if (busy || disabled) return;
    setBusy(true); setError(''); setMessage('');
    try {
      const response = refresh
        ? await paymentService.refreshCobruPayment(payment.id)
        : await paymentService.createCobruPayment({ registrationId, requiresInvoice });
      if (!response.payment?.id) throw new Error("Payment information was not received.");
      setCreatedPayment(response.payment);
      setMessage(response.payment.status === 'approved' ? "Payment confirmed. Your balance will be updated on the platform." : refresh ? "Status checked. If the payment is still pending, check again in a few moments." : "Your link is ready. Review the amount and continue to Cobru.");
      try { await onUpdated(response.payment.id); } catch { setError("The payment was processed, but we could not update the summary. Reload the page to check your balance."); }
    } catch (err) {
      setError(err?.response?.data?.message || err.message || "Unable to contact Cobru.");
      // Recover a reservation after an ambiguous creation; do not retry automatically.
      try { await onUpdated(); } catch { /* Keep the original error visible. */ }
    } finally { setBusy(false); }
  }
  const active = payment && ['pending_link','pending_payment','pending'].includes(payment.status);
  return <Card className="rounded-xl p-8">
    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">Option 2 · Online payment</p>
    <h2 className="mt-3 text-2xl font-semibold text-slate-950">Pay with Cobru</h2>
    <p className="mt-4 text-sm leading-7 text-slate-600">Pay your registration balance through Cobru checkout. You will be charged in Colombian pesos using the exchange rate recorded on the platform.</p>
    <div className="mt-5 rounded-xl border border-brand-100 bg-brand-50 p-5 text-sm leading-7 text-brand-900">Generate the link, review the amount and complete your payment. When you return, select “Check payment” to confirm its status.</div>
    {error && <div className="mt-5"><Alert title="Unable to complete the request" description={error} variant="danger" /></div>}
    {message && <div className="mt-5"><Alert title="Cobru payment" description={message} variant="info" /></div>}
    {couponApplied && !active && <p className="mt-5 text-sm text-slate-600">Cobru checkout currently charges the full balance and does not apply the selected coupon. To use this discount, pay by bank transfer.</p>}
    {payment && <div className="mt-5 rounded-xl border border-slate-200 p-5"><p className="text-sm font-semibold">Payment #{payment.id} · {translatePaymentStatus(payment.status)}</p>{payment.amountCop != null && <p className="mt-2 text-2xl font-semibold text-brand-900">{new Intl.NumberFormat('en-US',{style:'currency',currency:'COP',maximumFractionDigits:2}).format(Number(payment.amountCop))} COP</p>}<p className="mt-2 text-sm text-slate-600">Amount confirmed by the platform.</p></div>}
    <div className="mt-6 flex flex-wrap gap-3">
      {active && checkoutUrl && <a href={checkoutUrl} target="_blank" rel="noopener noreferrer" className="rounded-lg bg-accent-600 px-5 py-3 text-sm font-semibold text-white hover:bg-accent-700">Continue to Cobru ↗</a>}
      {active && <Button variant="secondary" disabled={busy || disabled} onClick={() => run(true)}>{busy ? "Checking…" : "Check payment"}</Button>}
      {!active && <Button disabled={busy || disabled || pendingAmount <= 0 || Boolean(couponApplied)} onClick={() => run(false)}>{busy ? "Generating link…" : pendingAmount <= 0 ? "No outstanding balance" : "Generate payment link"}</Button>}
    </div>
    {active && !checkoutUrl && <p className="mt-4 text-sm text-slate-600">The link is not available yet. Check the status; if it remains unavailable, contact the organizing team before starting another payment.</p>}
    <p className="mt-5 text-xs leading-6 text-slate-500">Cobru processes the full balance. To make a partial payment, use a direct bank transfer. You do not need to upload a receipt for online payments.</p>
  </Card>;
}
