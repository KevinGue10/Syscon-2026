export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="container-shell grid gap-8 py-10 md:grid-cols-2">
        <div>
          <p className="font-display text-lg font-semibold text-slate-950">
            IEEE SYSCON LATAM 2026
          </p>
          <p className="mt-2 max-w-md text-sm text-slate-600">
            Cartagena, Colombia · December 3–4, 2026. Participant registration and management.
          </p>
        </div>
        <div className="md:text-right">
          <p className="text-sm text-slate-500">Support: josesanchezdelahoz@ieee.org</p>
          <p className="mt-2 text-sm text-slate-500">
            If you need help with registration or payment, please contact us at this address.
          </p>
        </div>
      </div>
    </footer>
  );
}
