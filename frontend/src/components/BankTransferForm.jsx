import { useState } from 'react';
import { Alert } from './Alert';
import { Button } from './Button';
import { Card } from './Card';
import { InputField } from './InputField';


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
  const [fileError, setFileError] = useState('');
  function selectFile(file) {
    if (!file || isSubmitting) return;
    if (!isAcceptedProofFile(file)) {
      setFileError("Choose a JPG or PNG image, or a PDF document.");
      return;
    }
    setFileError('');
    onFileChange(file);
  }

  function handleDrop(event) {
    event.preventDefault();
    setIsDragOver(false);

    const droppedFile = event.dataTransfer?.files?.[0] || null;

    selectFile(droppedFile);
  }

  return (
    <Card className="rounded-xl p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-600">Option 1</p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-950">Direct bank transfer</h2>
        </div>
        <span className="rounded-full bg-slate-100 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          Manual
        </span>
      </div>

      <p className="mt-4 text-sm leading-7 text-slate-600">
        Generate your payment to see the exact amount in Colombian pesos. After making the transfer, upload your payment receipt for review.
      </p>

      {error ? <div className="mt-5"><Alert title="Unable to register the transfer" description={error} variant="danger" /></div> : null}
      {success ? <div className="mt-5"><Alert title="Transfer registered" description={success} variant="success" /></div> : null}

      {generatedPayment && <div className="mt-6 rounded-xl border border-brand-200 bg-brand-50 p-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-brand-700">Amount to transfer · Payment #{generatedPayment.id}</p>
        <p className="mt-2 text-3xl font-semibold text-brand-900">{new Intl.NumberFormat('en-US',{style:'currency',currency:'COP',maximumFractionDigits:2}).format(Number(generatedPayment.amountCop))} COP</p>
        <p className="mt-2 text-sm text-slate-600">Equivalent to {Number(generatedPayment.amountUsd).toFixed(2)} USD. Exchange rate: {new Intl.NumberFormat('en-US',{maximumFractionDigits:4}).format(Number(generatedPayment.amountCop) / Number(generatedPayment.amountUsd))} COP per USD.</p>
        <p className="mt-2 text-sm text-slate-600">Transfer this amount to the account shown below. Your payment will be confirmed once the team reviews the receipt.</p>
      </div>}
      {quoteChanged && <div className="mt-4"><Alert title="The amount or payment options have changed" description="Generate the payment again before transferring funds. If you already made the transfer, restore the original amount and options to attach the receipt to that payment." variant="warning" /></div>}
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
            title="Unable to load bank details"
            description="Reload the page to try loading the bank details again."
            variant="warning"
          />
        </div>
      )}

      {generatedPayment && !quoteChanged && <>
      <div className="mt-6 max-w-md">
        <InputField
          label="Transfer reference (optional)"
          placeholder="e.g. TRX-2026-001"
          value={transactionReference}
          onChange={(event) => onTransactionReferenceChange(event.target.value)}
        />
      </div>

      <div className="mt-6 max-w-xl">
        <div className="flex flex-col gap-2">
          <span className="text-sm font-semibold text-slate-700">Upload transfer receipt</span>
          <label
            className={`flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed px-4 py-5 text-center transition ${
              isDragOver
                ? 'border-brand-500 bg-brand-50'
                : supportingFile ? 'border-emerald-400 bg-emerald-50' : 'border-slate-300 bg-slate-50 hover:border-brand-400 hover:bg-brand-50/40'
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
            {supportingFile && <span className="mb-2 flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-emerald-700" aria-hidden="true"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m5 12 4 4L19 6" /></svg></span>}
            <span className="text-sm font-semibold text-slate-800 break-all">
              {supportingFile ? supportingFile.name : "Choose a file"}
            </span>
            <span className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">
              {isDragOver ? "Drop the file here" : "JPG, PNG or PDF"}
            </span>
            <input
              type="file"
              accept=".jpg,.jpeg,.png,.pdf"
              className="sr-only"
              disabled={isSubmitting}
              onChange={(event) => {
                const selectedFile = event.target.files?.[0] || null;
                selectFile(selectedFile);
                event.target.value = '';
              }}
            />
          </label>
          <div role="status" aria-live="polite">
            {supportingFile && <div className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
              <p className="font-semibold">Receipt attached successfully</p>
              <p className="mt-1">{(supportingFile.size / 1024).toFixed(0)} KB. {isSubmitting ? "Uploading receipt. Please wait for confirmation." : "Ready to upload. Click \"Submit receipt\" to complete the upload."}</p>
            </div>}
          </div>
          {fileError && <p role="alert" className="mt-2 text-sm text-rose-700">{fileError}</p>}
        </div>
      </div>

      </>}
      <div className="mt-6 flex flex-wrap gap-3">
        <Button variant="primary" onClick={onSubmit} disabled={isSubmitting || amountToCharge <= 0 || !bankDetails.length || Boolean(generatedPayment && !quoteChanged && !supportingFile)}>
          {isSubmitting && <span aria-hidden="true" className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white motion-reduce:animate-none" />}
          {isSubmitting ? (generatedPayment && !quoteChanged ? "Uploading receipt..." : "Generating payment...") : generatedPayment && !quoteChanged ? "Submit receipt" : "Generate payment in COP"}
        </Button>
      </div>
      {success && <div className="mt-4" role="status"><Alert title="Receipt submitted" description={success} variant="success" /></div>}
      {error && <p role="alert" className="mt-3 text-sm text-rose-700">{error}</p>}
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
