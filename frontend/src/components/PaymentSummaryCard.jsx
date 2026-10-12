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
  discountAmount,
  totalToCharge,
  couponCode,
  onCouponCodeChange,
  onApplyCoupon,
  couponState,
  onRedeemCoupon,
  isRedeemingCoupon,
  canRedeemCoupon,
}) {
  return (
    <div
      className="rounded-xl p-8 text-white shadow-[0_30px_80px_rgba(19,37,61,0.22)]"
      style={{
        background: 'linear-gradient(135deg, #00334d 0%, #00485d 55%, #007b91 100%)',
      }}
    >
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#a6dce5]">
        Payment summary
      </p>
      <h2 className="mt-3 text-3xl font-semibold text-white">Your registration payment summary</h2>
      <p className="mt-4 text-sm leading-7 text-white/78">
        You can pay the full balance or make a partial payment. Your current registration status remains the main reference.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <MetricCard label="Total amount" value={formatCurrency(registrationTotal)} />
        <MetricCard label="Amount paid" value={formatCurrency(paidAmount)} />
        <MetricCard label="Outstanding balance" value={formatCurrency(pendingAmount)} accent />
      </div>

      <div className="mt-6 rounded-[1.75rem] border border-white/10 bg-white/10 p-6">
        <InputField
          label="Base amount to pay now"
          type="number"
          min="0"
          step="0.01"
          value={paymentAmount}
          onChange={(event) => onPaymentAmountChange(event.target.value)}
          helperText="You can make a partial payment toward your outstanding balance."
          className="[&>span:first-child]:text-white [&_input]:border-white/10 [&_input]:bg-white/10 [&_input]:text-white [&_input]:placeholder:text-white/45 [&_input]:focus:border-white/25 [&_input]:focus:ring-white/10 [&_span:last-child]:text-white/70"
        />

        <div className="mt-6 space-y-4">
          <SummaryLine label="Conference registration payment" value={formatCurrency(baseAmount)} />
          <SummaryLine
            label="Coupon discount"
            value={`-${formatCurrency(discountAmount)}`}
            muted={!discountAmount}
          />
          <SummaryLine
            label="Invoice and tax charge (19%)"
            value={formatCurrency(taxesAmount)}
            muted={!includeTaxes}
          />
        </div>

        <div className="mt-6 rounded-2xl border border-white/10 bg-white/10 p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <InputField
              label="Discount coupon"
              placeholder="e.g. SYSCON2026"
              value={couponCode}
              onChange={(event) => onCouponCodeChange(event.target.value)}
              className="flex-1 [&>span:first-child]:text-white [&_input]:border-white/10 [&_input]:bg-white/10 [&_input]:text-white [&_input]:uppercase [&_input]:placeholder:text-white/45 [&_input]:focus:border-white/25 [&_input]:focus:ring-white/10"
            />
            <button
              type="button"
              onClick={onApplyCoupon}
              disabled={couponState.isApplying || !couponCode.trim()}
              className="inline-flex h-[3.25rem] items-center justify-center rounded-2xl border border-white/15 bg-white/10 px-5 text-sm font-semibold text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {couponState.isApplying ? "Applying..." : "Apply coupon"}
            </button>
          </div>

          {couponState.error ? (
            <p className="mt-3 text-sm text-[#ffb4b4]">{couponState.error}</p>
          ) : null}
          {couponState.message ? (
            <p className="mt-3 text-sm text-[#b4e5e9]">{couponState.message}</p>
          ) : null}

          {couponState.applied ? (
            <div className="mt-4 rounded-2xl border border-emerald-300/20 bg-emerald-400/10 px-4 py-3">
              <p className="text-sm font-semibold text-white">
                Coupon applied: {couponState.applied.code}
              </p>
              <p className="mt-1 text-sm text-white/72">
                Confirmed discount: {formatCurrency(discountAmount)}
              </p>
            </div>
          ) : null}
        </div>


        <label className="mt-4 flex items-start gap-3 rounded-2xl border border-white/10 bg-white/10 p-4">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4"
            checked={includeTaxes}
            onChange={(event) => onIncludeTaxesChange(event.target.checked)}
          />
          <span>
            <span className="block text-sm font-semibold text-white">Request an invoice</span>
            <span className="mt-1 block text-sm leading-6 text-white/72">
              Select this option if you need an invoice. A 19% tax charge will be added to the base amount of this payment.
            </span>
          </span>
        </label>

        <div className="mt-6 border-t border-white/10 pt-5">
          <SummaryLine label="Total payment to process" value={formatCurrency(totalToCharge)} emphasized />
        </div>

        {canRedeemCoupon ? (
          <div className="mt-6 rounded-2xl border border-emerald-300/20 bg-emerald-400/10 p-4">
            <p className="text-sm font-semibold text-white">Balance covered by coupon</p>
            <p className="mt-1 text-sm leading-6 text-white/72">
              No external payment is required. You can settle the balance and leave your registration with no outstanding amount.
            </p>
            <button
              type="button"
              onClick={onRedeemCoupon}
              disabled={isRedeemingCoupon}
              className="mt-4 inline-flex items-center justify-center rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isRedeemingCoupon ? "Settling..." : "Settle balance with coupon"}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function MetricCard({ label, value, accent = false }) {
  return (
    <div
      className={`rounded-2xl border px-4 py-4 ${
        accent ? 'border-[#79c5d1]/35 bg-[#79c5d1]/10' : 'border-white/10 bg-white/10'
      }`}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">{label}</p>
      <p className="mt-2 text-xl font-semibold text-white">{value}</p>
    </div>
  );
}

function SummaryLine({ label, value, emphasized = false, muted = false }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span
        className={`text-sm ${
          emphasized ? 'font-semibold text-white' : muted ? 'text-white/55' : 'text-white/80'
        }`}
      >
        {label}
      </span>
      <span
        className={`${
          emphasized ? 'text-2xl font-bold text-white' : 'text-base font-semibold text-white'
        }`}
      >
        {value}
      </span>
    </div>
  );
}
