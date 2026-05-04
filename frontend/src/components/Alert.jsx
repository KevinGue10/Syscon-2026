export function Alert({ title, description, variant = 'info' }) {
  const variants = {
    info: 'border-brand-200 bg-brand-50 text-brand-900',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
    warning: 'border-amber-200 bg-amber-50 text-amber-900',
    danger: 'border-rose-200 bg-rose-50 text-rose-900',
  };

  return (
    <div className={`rounded-2xl border px-4 py-3 ${variants[variant]}`}>
      <p className="text-sm font-semibold">{title}</p>
      {description ? <p className="mt-1 text-sm opacity-80">{description}</p> : null}
    </div>
  );
}
