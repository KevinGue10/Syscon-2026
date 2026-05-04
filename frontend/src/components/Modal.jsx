export function Modal({ isOpen, title, children, onClose }) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4">
      <div className="panel w-full max-w-lg p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-xl font-semibold text-slate-950">{title}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-950"
            aria-label="Close modal"
          >
            X
          </button>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}
