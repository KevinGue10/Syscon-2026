import { Alert } from './Alert';
import { Button } from './Button';
import { Card } from './Card';
import { InputField } from './InputField';
import { formatCurrency } from '../utils/currency';

export function BankTransferForm({
  bankDetails,
  amountToCharge,
  transactionReference,
  onTransactionReferenceChange,
  supportingFile,
  onFileChange,
  isSubmitting,
  error,
  success,
  onSubmit,
}) {
  return (
    <Card className="rounded-[2rem] p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-600">Opcion 1</p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-950">Transferencia directa</h2>
        </div>
        <span className="rounded-full bg-slate-100 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          Manual
        </span>
      </div>

      <p className="mt-4 text-sm leading-7 text-slate-600">
        Se creara un pago pendiente por {formatCurrency(amountToCharge)}. Luego el soporte quedara
        disponible para validacion administrativa.
      </p>

      {error ? <div className="mt-5"><Alert title="No fue posible registrar la transferencia" description={error} variant="danger" /></div> : null}
      {success ? <div className="mt-5"><Alert title="Transferencia registrada" description={success} variant="success" /></div> : null}

      {bankDetails.length ? (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {bankDetails.map((item) => (
            <div key={item.label} className="rounded-2xl bg-slate-50 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{item.label}</p>
              <p className="mt-2 text-sm font-semibold text-slate-950">{item.value}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-6">
          <Alert
            title="No se pudieron cargar los datos bancarios"
            description="Verifica el endpoint de metadata o vuelve a cargar la pagina."
            variant="warning"
          />
        </div>
      )}

      <div className="mt-6 max-w-md">
        <InputField
          label="Referencia de la transferencia"
          placeholder="Ej. TRX-2026-001"
          value={transactionReference}
          onChange={(event) => onTransactionReferenceChange(event.target.value)}
        />
      </div>

      <div className="mt-6 max-w-xl">
        <div className="flex flex-col gap-2">
          <span className="text-sm font-semibold text-slate-700">Adjuntar soporte de transferencia</span>
          <label className="flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-center transition hover:border-brand-400 hover:bg-brand-50/40">
            <span className="text-sm font-semibold text-slate-800">
              {supportingFile ? supportingFile.name : 'Seleccionar archivo'}
            </span>
            <span className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">
              JPG, PNG o PDF
            </span>
            <input
              type="file"
              accept=".jpg,.jpeg,.png,.pdf"
              className="hidden"
              onChange={(event) => onFileChange(event.target.files?.[0] || null)}
            />
          </label>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Button variant="primary" onClick={onSubmit} disabled={isSubmitting || amountToCharge <= 0}>
          {isSubmitting ? 'Procesando...' : 'Crear pago y subir soporte'}
        </Button>
      </div>
    </Card>
  );
}
