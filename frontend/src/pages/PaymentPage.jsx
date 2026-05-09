import { useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { Card } from '../components/Card';

function PaymentPage() {
  const navigate = useNavigate();

  return (
    <section className="container-shell py-16">
      <div className="mx-auto max-w-3xl">
        <Card className="rounded-[2rem] p-8 sm:p-10">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-600">
            Pagos
          </p>
          <h1 className="mt-3 text-4xl font-semibold text-slate-950">
            Pasarela de pago en construccion
          </h1>
          <p className="mt-4 text-sm leading-7 text-slate-600 sm:text-base">
            Esta seccion sera el punto de entrada para completar el pago de la inscripcion. Por
            ahora dejamos lista la ruta para conectar la experiencia cuando se construya la
            pagina final.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Button variant="primary" onClick={() => navigate('/dashboard')}>
              Ir al panel
            </Button>
            <Button
              variant="ghost"
              className="border border-slate-200"
              onClick={() => navigate('/registration-details')}
            >
              Ver mi inscripcion
            </Button>
          </div>
        </Card>
      </div>
    </section>
  );
}

export default PaymentPage;
