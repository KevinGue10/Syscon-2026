export function Stepper({ steps, currentStep }) {
  return (
    <div
      className="grid gap-4"
      style={{
        gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))`,
      }}
    >
      {steps.map((step, index) => {
        const state =
          index < currentStep ? 'complete' : index === currentStep ? 'current' : 'upcoming';

        return (
          <div
            key={step}
            className={`rounded-2xl border p-4 transition ${
              state === 'complete'
                ? 'border-emerald-200 bg-emerald-50'
                : state === 'current'
                  ? 'border-brand-300 bg-brand-50'
                  : 'border-slate-200 bg-white'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold ${
                  state === 'complete'
                    ? 'bg-emerald-500 text-white'
                    : state === 'current'
                      ? 'bg-brand-600 text-white'
                      : 'bg-slate-100 text-slate-500'
                }`}
              >
                {index + 1}
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                  Paso {index + 1}
                </p>
                <p className="text-sm font-semibold text-slate-900">{step}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
