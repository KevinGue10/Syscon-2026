import { useState } from 'react';
import { Alert } from './Alert';
import { Button } from './Button';
import { Card } from './Card';
import { InputField } from './InputField';
import { formatCurrency } from '../utils/currency';

export function PaymentMethods({
  amountToCharge,
  requestState,
  onReferenceChange,
  onFileChange,
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
    <Card className="rounded-[2rem] p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-600">
            Opcion 2
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-950">
            Solicitud de pago con tarjeta
          </h2>
        </div>
        <span className="rounded-full bg-amber-100 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-amber-800">
          Informativo
        </span>
      </div>

      <p className="mt-4 text-sm leading-7 text-slate-600">
        Esta opcion registra en la plataforma que deseas pagar con tarjeta mediante PayPhone por{' '}
        {formatCurrency(amountToCharge)}. Despues de guardar la solicitud, el equipo
        administrativo podra verla y enviara al correo registrado el enlace de pago para continuar
        la gestion directamente contigo.
      </p>

      {requestState.error ? (
        <div className="mt-5">
          <Alert
            title="No fue posible registrar la solicitud"
            description={requestState.error}
            variant="danger"
          />
        </div>
      ) : null}

      {requestState.success ? (
        <div className="mt-5">
          <Alert
            title="Solicitud PayPhone registrada"
            description={requestState.success}
            variant="success"
          />
        </div>
      ) : null}

      <div className="mt-6 rounded-[1.5rem] border border-brand-100 bg-brand-50/70 p-5">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-700">
          Como funciona
        </p>
        <div className="mt-4 grid gap-3 text-sm leading-7 text-slate-700">
          <p>1. Registras aqui tu interes de pagar con tarjeta.</p>
          <p>2. El sistema guarda que seleccionaste PayPhone como metodo de pago.</p>
          <p>3. El equipo de la conferencia te contacta y envia el enlace de pago a tu correo.</p>
          <p>
            4. Si ya cuentas con un comprobante o soporte de gestion, puedes adjuntarlo desde este
            mismo formulario.
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
          <p className="text-lg font-semibold text-slate-950">PayPhone</p>
          <p className="mt-2 text-sm leading-7 text-slate-600">
            Canal previsto para pagos con tarjeta. Esta vista no redirige a una pasarela; solo
            deja la solicitud registrada para seguimiento administrativo.
          </p>

          <div className="mt-5 grid gap-4">
            <InputField
              label="Referencia o comentario"
              placeholder="Ej. Solicito link de pago para mi tarjeta corporativa"
              value={requestState.reference}
              onChange={(event) => onReferenceChange(event.target.value)}
              helperText="Este dato ayuda al equipo a identificar tu solicitud cuando te contacte."
            />
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5">
          <div className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-slate-700">
              Adjuntar comprobante o soporte
            </span>
            <label
              className={`flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed px-4 py-5 text-center transition ${
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
                {requestState.supportingFile
                  ? requestState.supportingFile.name
                  : 'Seleccionar archivo'}
              </span>
              <span className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">
                {isDragOver ? 'Suelta el archivo aqui' : 'JPG, PNG o PDF'}
              </span>
              <span className="mt-2 max-w-sm text-sm leading-6 text-slate-500">
                Este archivo quedara disponible para el equipo administrativo dentro de la revision
                del pago.
              </span>
              <input
                type="file"
                accept=".jpg,.jpeg,.png,.pdf"
                className="hidden"
                onChange={(event) => {
                  const selectedFile = event.target.files?.[0] || null;
                  onFileChange(
                    selectedFile && isAcceptedProofFile(selectedFile) ? selectedFile : null,
                  );
                }}
              />
            </label>
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Button
          variant="primary"
          onClick={onSubmit}
          disabled={requestState.isSubmitting || amountToCharge <= 0}
        >
          {requestState.isSubmitting
            ? 'Registrando solicitud...'
            : 'Registrar solicitud PayPhone'}
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
