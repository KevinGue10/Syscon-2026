import { useState } from 'react';
import { Alert } from './Alert';
import { Button } from './Button';
import { InputField } from './InputField';
import api from '../services/api';

const usd = amount => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(amount);

export function IvaAdjustmentPanel({ registration, onAdded }) {
  const [quote, setQuote] = useState(null);
  const [reason, setReason] = useState('Participant requested an invoice after paying the registration without IVA.');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  if (!registration) return null;
  if (registration.ivaAdjustment) return <Alert title="Additional IVA recorded"
    description={`Original base: ${usd(registration.ivaAdjustment.baseAmount)}. Additional IVA (19%): ${usd(registration.ivaAdjustment.taxAmount)}. The original payment is preserved.`} variant="info" />;
  if (registration.requiresInvoice || Number(registration.pendingAmount) > 0 || Number(registration.totalAmount) <= 0) return null;
  async function submit(confirm) {
    setBusy(true); setError('');
    try {
      const path = `/registrations/${registration.id}/iva-adjustment`;
      const { data } = await api.post(confirm ? path : `${path}/preview`, confirm ? {
        expectedBaseAmount: quote.baseAmount, expectedTaxAmount: quote.taxAmount, reason,
      } : {});
      if (confirm) { setQuote(null); await onAdded(); }
      else setQuote(data.data.quote);
    } catch (e) { setError(e.response?.data?.message || e.message); }
    finally { setBusy(false); }
  }
  return <div className="rounded-xl border border-brand-200 bg-white p-5 space-y-4">
    <p className="font-semibold">Add IVA after registration payment</p>
    <p className="text-sm text-slate-600">Add a separate 19% charge using the original paid registration amount. This does not charge the participant automatically.</p>
    {error && <Alert title="Unable to add IVA" description={error} variant="danger" />}
    {quote && <>
      <p className="text-sm">Original base: <strong>{usd(quote.baseAmount)}</strong> · Additional IVA: <strong>{usd(quote.taxAmount)}</strong> · New registration total: <strong>{usd(quote.totalAmount)}</strong></p>
      <InputField label="Reason for the adjustment" value={reason} maxLength={500} onChange={e => setReason(e.target.value)} />
      <p className="text-sm text-slate-600">Confirm only with the participant's agreement. The charge and original pricing will be fixed; papers and pricing options will be locked. The participant will pay the new balance separately.</p>
    </>}
    <div className="flex gap-3">
      <Button disabled={busy || Boolean(quote && !reason.trim())} onClick={() => submit(Boolean(quote))}>
        {busy ? 'Processing...' : quote ? 'Confirm additional IVA charge' : 'Preview additional IVA'}
      </Button>
      {quote && <Button disabled={busy} onClick={() => setQuote(null)}>Back</Button>}
    </div>
  </div>;
}
