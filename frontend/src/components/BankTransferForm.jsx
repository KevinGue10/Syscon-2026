import { useState } from 'react';
import { Alert } from './Alert';
import { Button } from './Button';
import { Card } from './Card';
import { InputField } from './InputField';
import { formatCurrency } from '../utils/currency';

export function BankTransferForm({
  generatedPayment,
  quoteChanged,
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
  const [isDragOver, setIsDragOver] = useState(false);

  function handleDrop(event) {
    event.preventDefault();
    setIsDragOver(false);

    const droppedFile = event.dataTransfer?.files?.[0] || null;

    if (droppedFile && isAcceptedProofFile(droppedFile)) {
      onFileChange(droppedFile);
    }
  }

  return (
    <Card className="rounded-xl p-8">
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
        Genera tu pago para consultar el valor exacto en pesos colombianos. Después de transferir, adjunta el comprobante para su validación.
      </p>

      {error ? <div className="mt-5"><Alert title="No fue posible registrar la transferencia" description={error} variant="danger" /></div> : null}
      {success ? <div className="mt-5"><Alert title="Transferencia registrada" description={success} variant="success" /></div> : null}

      {generatedPayment && <div className="mt-6 rounded-xl border border-brand-200 bg-brand-50 p-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-brand-700">Valor a transferir · Pago #{generatedPayment.id}</p>
        <p className="mt-2 text-3xl font-semibold text-brand-900">{new Intl.NumberFormat('es-CO',{style:'currency',currency:'COP',maximumFractionDigits:2}).format(Number(generatedPayment.amountCop))} COP</p>
        <p className="mt-2 text-sm text-slate-600">Equivalente a {Number(generatedPayment.amountUsd).toFixed(2)} USD. Tasa aplicada: {new Intl.NumberFormat('es-CO',{maximumFractionDigits:4}).format(Number(generatedPayment.amountCop) / Number(generatedPayment.amountUsd))} COP por USD.</p>
        <p className="mt-2 text-sm text-slate-600">Envía este importe a la cuenta indicada. El pago se confirmará cuando el equipo revise el soporte.</p>
      </div>}
      {quoteChanged && <div className="mt-4"><Alert title="El monto o las opciones cambiaron" description="Genera de nuevo el pago antes de transferir. Si ya hiciste la transferencia, restaura el monto y las opciones originales para adjuntar el soporte a ese pago." variant="warning" /></div>}
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

      {generatedPayment && !quoteChanged && <>
      <div className="mt-6 max-w-md">
        <InputField
          label="Referencia de la transferencia (opcional)"
          placeholder="Ej. TRX-2026-001"
          value={transactionReference}
          onChange={(event) => onTransactionReferenceChange(event.target.value)}
        />
      </div>

      <div className="mt-6 max-w-xl">
        <div className="flex flex-col gap-2">
          <span className="text-sm font-semibold text-slate-700">Adjuntar soporte de transferencia</span>
          <label
            className={`flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed px-4 py-5 text-center transition ${
              isDragOver
                ? 'border-brand-500 bg-brand-50'
                : 'border-slate-300 bg-slate-50 hover:border-brand-400 hover:bg-brand-50/40'
            }`}
            onDragOver={(event) => {
              event.preventDefault();
              setIsDragOver(true);
            }}
            onDragEnter={(event) => {
              event.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={(event) => {
              event.preventDefault();
              if (event.currentTarget === event.target) {
                setIsDragOver(false);
              }
            }}
            onDrop={handleDrop}
          >
            <span className="text-sm font-semibold text-slate-800">
              {supportingFile ? supportingFile.name : 'Seleccionar archivo'}
            </span>
            <span className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">
              {isDragOver ? 'Suelta el archivo aqui' : 'JPG, PNG o PDF'}
            </span>
            <input
              type="file"
              accept=".jpg,.jpeg,.png,.pdf"
              className="hidden"
              onChange={(event) => {
                const selectedFile = event.target.files?.[0] || null;
                onFileChange(selectedFile && isAcceptedProofFile(selectedFile) ? selectedFile : null);
              }}
            />
          </label>
        </div>
      </div>

      </>}
      <div className="mt-6 flex flex-wrap gap-3">
        <Button variant="primary" onClick={onSubmit} disabled={isSubmitting || amountToCharge <= 0 || !bankDetails.length || Boolean(generatedPayment && !quoteChanged && !supportingFile)}>
          {isSubmitting ? 'Procesando...' : generatedPayment && !quoteChanged ? 'Enviar comprobante' : 'Generar pago en pesos'}
        </Button>
      </div>
    </Card>
  );
}

function isAcceptedProofFile(file) {
  const acceptedMimeTypes = ['image/jpeg', 'image/png', 'application/pdf'];
  const fileName = String(file?.name || '').toLowerCase();
  const hasAcceptedExtension = ['.jpg', '.jpeg', '.png', '.pdf'].some((extension) =>
    fileName.endsWith(extension),
  );

  return acceptedMimeTypes.includes(file?.type) || hasAcceptedExtension;
}
