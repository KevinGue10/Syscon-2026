import { forwardRef, useState } from 'react';

export const InputField = forwardRef(function InputField(
  { label, error, helperText, className = '', type = 'text', ...props },
  ref,
) {
  const [showPassword, setShowPassword] = useState(false);
  const resolvedType = type === 'password' && showPassword ? 'text' : type;

  return (
    <label className={`flex flex-col gap-2 ${className}`}>
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      <div className="relative">
        <input
          ref={ref}
          type={resolvedType}
          className={`w-full rounded-2xl border bg-white px-4 py-3 text-sm outline-none transition ${
            type === 'password' ? 'pr-14' : ''
          } ${
            error
              ? 'border-rose-400 ring-2 ring-rose-100'
              : 'border-slate-200 focus:border-brand-400 focus:ring-4 focus:ring-brand-100'
          }`}
          {...props}
        />
        {type === 'password' ? (
          <button
            type="button"
            onClick={() => setShowPassword((current) => !current)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 transition hover:text-slate-900"
          >
            {showPassword ? 'Ocultar' : 'Ver'}
          </button>
        ) : null}
      </div>
      {error ? (
        <span className="text-sm text-rose-600">{error}</span>
      ) : helperText ? (
        <span className="text-sm text-slate-500">{helperText}</span>
      ) : null}
    </label>
  );
});
