import { InputField } from './InputField';
import { formatCurrency } from '../utils/currency';

export function PaymentSummaryCard({
  registrationTotal,
  paidAmount,
  pendingAmount,
  paymentAmount,
  baseAmount,
  onPaymentAmountChange,
  includeTaxes,
  onIncludeTaxesChange,
  taxesAmount,
  totalToCharge,
}) {
  return (
    <div
      className="rounded-[2rem] p-8 text-white shadow-[0_30px_80px_rgba(19,37,61,0.22)]"
      style={{
        background: 'linear-gradient(135deg, #13253d 0%, #1c3b62 55%, #275286 100%)',
      }}
    >
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#a8d8ff]">
        Resumen de pago
      </p>
      <h2 className="mt-3 text-3xl font-semibold text-white">Factura resumida de tu inscripcion</h2>
      <p className="mt-4 text-sm leading-7 text-white/78">
        Puedes pagar el saldo completo o registrar un abono parcial. La referencia principal sigue
        siendo el estado actual de tu inscripcion.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <MetricCard label="Valor total" value={formatCurrency(registrationTotal)} />
        <MetricCard label="Valor pagado" value={formatCurrency(paidAmount)} />
        <MetricCard label="Saldo pendiente" value={formatCurrency(pendingAmount)} accent />
      </div>

      <div className="mt-6 rounded-[1.75rem] border border-white/10 bg-white/10 p-6">
        <InputField
          label="Monto base a pagar ahora"
          type="number"
          min="0"
          step="0.01"
          value={paymentAmount}
          onChange={(event) => onPaymentAmountChange(event.target.value)}
          helperText="Puedes registrar un abono parcial sobre el saldo pendiente."
          className="[&>span:first-child]:text-white [&_input]:border-white/10 [&_input]:bg-white/10 [&_input]:text-white [&_input]:placeholder:text-white/45 [&_input]:focus:border-white/25 [&_input]:focus:ring-white/10 [&_span:last-child]:text-white/70"
        />

        <div className="mt-6 space-y-4">
          <SummaryLine label="Pago inscripcion conferencia" value={formatCurrency(baseAmount)} />
          <SummaryLine
            label="Pago de impuestos (15%)"
            value={formatCurrency(taxesAmount)}
            muted={!includeTaxes}
          />
        </div>

        <label className="mt-6 flex items-start gap-3 rounded-2xl border border-white/10 bg-white/10 p-4">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4"
            checked={includeTaxes}
            onChange={(event) => onIncludeTaxesChange(event.target.checked)}
          />
          <span>
            <span className="block text-sm font-semibold text-white">Agregar pago de impuestos</span>
            <span className="mt-1 block text-sm leading-6 text-white/72">
              Activa esta opcion para sumar un 15% adicional sobre el monto base de este pago.
            </span>
          </span>
        </label>

        <div className="mt-6 border-t border-white/10 pt-5">
          <SummaryLine label="Pago total a procesar" value={formatCurrency(totalToCharge)} emphasized />
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value, accent = false }) {
  return (
    <div className={`rounded-2xl border px-4 py-4 ${accent ? 'border-[#6db7ff]/35 bg-[#6db7ff]/10' : 'border-white/10 bg-white/10'}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">{label}</p>
      <p className="mt-2 text-xl font-semibold text-white">{value}</p>
    </div>
  );
}

function SummaryLine({ label, value, emphasized = false, muted = false }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className={`text-sm ${emphasized ? 'font-semibold text-white' : muted ? 'text-white/55' : 'text-white/80'}`}>
        {label}
      </span>
      <span className={`${emphasized ? 'text-2xl font-bold text-white' : 'text-base font-semibold text-white'}`}>
        {value}
      </span>
    </div>
  );
}
