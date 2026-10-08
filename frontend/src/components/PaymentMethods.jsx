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
      if (!response.payment?.id) throw new Error('No se recibió la información del pago.');
      setCreatedPayment(response.payment);
      setMessage(response.payment.status === 'approved' ? 'Pago confirmado. Tu saldo se actualizará en la plataforma.' : refresh ? 'Estado consultado. Si el pago sigue pendiente, vuelve a verificar en unos momentos.' : 'Tu enlace está listo. Revisa el valor y continúa en Cobru.');
      try { await onUpdated(response.payment.id); } catch { setError('El pago fue procesado, pero no pudimos actualizar el resumen. Recarga la página para consultar tu saldo.'); }
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'No fue posible consultar Cobru.');
      // Recover a reservation after an ambiguous creation; do not retry automatically.
      try { await onUpdated(); } catch { /* Keep the original error visible. */ }
    } finally { setBusy(false); }
  }
  const active = payment && ['pending_link','pending_payment','pending'].includes(payment.status);
  return <Card className="rounded-xl p-8">
    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">Opción 2 · Pago en línea</p>
    <h2 className="mt-3 text-2xl font-semibold text-slate-950">Paga con Cobru</h2>
    <p className="mt-4 text-sm leading-7 text-slate-600">Completa el saldo de tu inscripción en el checkout de Cobru. El cobro se realiza en pesos colombianos con la tasa de cambio registrada en la plataforma.</p>
    <div className="mt-5 rounded-xl border border-brand-100 bg-brand-50 p-5 text-sm leading-7 text-brand-900">Genera el enlace, revisa el importe y continúa con el pago. Al regresar, selecciona “Verificar pago” para consultar la confirmación.</div>
    {error && <div className="mt-5"><Alert title="No pudimos completar la consulta" description={error} variant="danger" /></div>}
    {message && <div className="mt-5"><Alert title="Pago Cobru" description={message} variant="info" /></div>}
    {couponApplied && !active && <p className="mt-5 text-sm text-slate-600">El checkout actual de Cobru cobra el saldo completo y no aplica el cupón seleccionado. Para usar ese descuento, continúa por transferencia.</p>}
    {payment && <div className="mt-5 rounded-xl border border-slate-200 p-5"><p className="text-sm font-semibold">Pago #{payment.id} · {translatePaymentStatus(payment.status)}</p>{payment.amountCop != null && <p className="mt-2 text-2xl font-semibold text-brand-900">{new Intl.NumberFormat('es-CO',{style:'currency',currency:'COP',maximumFractionDigits:2}).format(Number(payment.amountCop))} COP</p>}<p className="mt-2 text-sm text-slate-600">Valor confirmado por la plataforma.</p></div>}
    <div className="mt-6 flex flex-wrap gap-3">
      {active && checkoutUrl && <a href={checkoutUrl} target="_blank" rel="noopener noreferrer" className="rounded-lg bg-accent-600 px-5 py-3 text-sm font-semibold text-white hover:bg-accent-700">Continuar en Cobru ↗</a>}
      {active && <Button variant="secondary" disabled={busy || disabled} onClick={() => run(true)}>{busy ? 'Consultando…' : 'Verificar pago'}</Button>}
      {!active && <Button disabled={busy || disabled || pendingAmount <= 0 || Boolean(couponApplied)} onClick={() => run(false)}>{busy ? 'Generando enlace…' : pendingAmount <= 0 ? 'Sin saldo pendiente' : 'Generar enlace de pago'}</Button>}
    </div>
    {active && !checkoutUrl && <p className="mt-4 text-sm text-slate-600">El enlace todavía no está disponible. Verifica el estado; si continúa así, contacta al equipo organizador antes de iniciar otro pago.</p>}
    <p className="mt-5 text-xs leading-6 text-slate-500">Cobru procesa el saldo completo. Para registrar un abono parcial, utiliza transferencia directa. No necesitas adjuntar comprobantes para el pago en línea.</p>
  </Card>;
}
