export function InputField({
  label,
  error,
  helperText,
  className = '',
  ...props
}) {
  return (
    <label className={`flex flex-col gap-2 ${className}`}>
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      <input
        className={`w-full rounded-2xl border bg-white px-4 py-3 text-sm outline-none transition ${
          error
            ? 'border-rose-400 ring-2 ring-rose-100'
            : 'border-slate-200 focus:border-brand-400 focus:ring-4 focus:ring-brand-100'
        }`}
        {...props}
      />
      {error ? (
        <span className="text-sm text-rose-600">{error}</span>
      ) : helperText ? (
        <span className="text-sm text-slate-500">{helperText}</span>
      ) : null}
    </label>
  );
}
