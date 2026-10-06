export function Button({
  children,
  type = 'button',
  variant = 'primary',
  className = '',
  ...props
}) {
  const variants = {
    primary: 'bg-accent-600 text-white hover:bg-accent-700',
    secondary: 'bg-brand-100 text-brand-800 hover:bg-brand-200',
    ghost: 'bg-white text-slate-900 hover:bg-slate-100',
    accent: 'bg-accent-600 text-white hover:bg-accent-700',
    danger: 'bg-rose-600 text-white hover:bg-rose-700',
  };

  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center rounded-2xl px-5 py-3 text-sm font-semibold transition duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-600 disabled:cursor-not-allowed disabled:opacity-60 ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
