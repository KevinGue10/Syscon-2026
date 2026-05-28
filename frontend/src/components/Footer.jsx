export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="container-shell grid gap-8 py-10 md:grid-cols-2">
        <div>
          <p className="font-display text-lg font-semibold text-slate-950">
            IEEE Conference Platform
          </p>
          <p className="mt-2 max-w-md text-sm text-slate-600">
            Plataforma oficial para gestionar inscripciones, articulos y pagos del evento.
          </p>
        </div>
        <div className="md:text-right">
          <p className="text-sm text-slate-500">Soporte: Alejandra.orellana@ieee.org</p>
          <p className="mt-2 text-sm text-slate-500">
            Si necesitas ayuda con tu registro o tu pago, contactanos por este medio.
          </p>
        </div>
      </div>
    </footer>
  );
}
