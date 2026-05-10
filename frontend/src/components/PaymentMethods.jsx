import { Alert } from './Alert';
import { Card } from './Card';
import { PayPalButton } from './PayPalButton';
import { PayPhoneButton } from './PayPhoneButton';
import { formatCurrency } from '../utils/currency';

export function PaymentMethods({
  selectedMethod,
  onSelectMethod,
  amountToCharge,
  paypalState,
  payphoneState,
  onPayPalClick,
  onPayPhoneClick,
}) {
  return (
    <Card className="rounded-[2rem] p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-600">Opcion 2</p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-950">Pago con tarjetas</h2>
        </div>
        <span className="rounded-full bg-emerald-100 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
          Activo
        </span>
      </div>

      <p className="mt-4 text-sm leading-7 text-slate-600">
        Elige el proveedor con el que deseas procesar {formatCurrency(amountToCharge)}. Ambos
        flujos te redirigen a una pasarela segura y luego regresan a la plataforma.
      </p>

      <div className="mt-6 flex flex-wrap gap-3">
        <MethodChip
          label="PayPal"
          active={selectedMethod === 'paypal'}
          onClick={() => onSelectMethod('paypal')}
        />
        <MethodChip
          label="PayPhone"
          active={selectedMethod === 'payphone'}
          onClick={() => onSelectMethod('payphone')}
        />
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <GatewayCard
          title="PayPal"
          description="Ideal para pagos internacionales con tarjeta o saldo disponible."
          active={selectedMethod === 'paypal'}
        >
          {paypalState.error ? (
            <Alert title="Error con PayPal" description={paypalState.error} variant="danger" />
          ) : null}
          <div className="mt-5">
            <PayPalButton onClick={onPayPalClick} isLoading={paypalState.isLoading} disabled={amountToCharge <= 0} />
          </div>
        </GatewayCard>

        <GatewayCard
          title="PayPhone"
          description="Flujo local orientado a tarjetas y experiencia movil en Ecuador."
          active={selectedMethod === 'payphone'}
        >
          {payphoneState.error ? (
            <Alert title="Error con PayPhone" description={payphoneState.error} variant="danger" />
          ) : null}
          <div className="mt-5">
            <PayPhoneButton onClick={onPayPhoneClick} isLoading={payphoneState.isLoading} disabled={amountToCharge <= 0} />
          </div>
        </GatewayCard>
      </div>
    </Card>
  );
}

function MethodChip({ label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
        active
          ? 'border-brand-400 bg-brand-50 text-brand-800'
          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-950'
      }`}
    >
      {label}
    </button>
  );
}

function GatewayCard({ title, description, active, children }) {
  return (
    <div className={`rounded-[1.5rem] border bg-white p-5 ${active ? 'border-brand-300 shadow-[0_20px_50px_rgba(37,82,134,0.12)]' : 'border-slate-200'}`}>
      <p className="text-lg font-semibold text-slate-950">{title}</p>
      <p className="mt-2 text-sm leading-7 text-slate-600">{description}</p>
      {children}
    </div>
  );
}
