import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert } from '../components/Alert';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Table } from '../components/Table';
import { useAuth } from '../hooks/useAuth';
import { useSession } from '../hooks/useSession';
import { dashboardService } from '../services/dashboardService';
import { formatCurrency } from '../utils/currency';
import {
  translateParticipationType,
  translatePaymentStatus,
} from '../utils/translations';

function UserDashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { session } = useSession();
  const [dashboard, setDashboard] = useState(null);

  useEffect(() => {
    dashboardService.getUserDashboard({
      user: {
        ...session.user,
        ...user,
      },
      registrations: session.registrations,
    }).then(setDashboard);
  }, [session, user]);

  const registrations = dashboard?.registrations || [];
  const outstandingBalance = registrations.reduce(
    (sum, item) => sum + (item.pricing?.balance || 0),
    0,
  );

  return (
    <section className="container-shell py-16">
      <div className="grid gap-8 lg:grid-cols-[0.75fr_1.25fr]">
        <div className="space-y-6">
          <Card className="p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-600">
              Perfil del participante
            </p>
            <h1 className="mt-3 text-3xl font-semibold text-slate-950">
              {dashboard?.profile?.name || 'Participante del evento'}
            </h1>
            <div className="mt-6 space-y-3 text-sm text-slate-600">
              <p>Email: {dashboard?.profile?.email || 'No registrado'}</p>
              <p>Organizacion: {dashboard?.profile?.organization || 'No registrada'}</p>
              <p>Pais: {dashboard?.profile?.country || 'No registrado'}</p>
            </div>
            <Button
              variant="primary"
              className="mt-6 w-full sm:w-fit"
              onClick={() => navigate('/registration-details')}
            >
              Visualizar datos de registro
            </Button>
          </Card>

          <Card className="p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-600">
              Estado de pago
            </p>
            <div className="mt-5 space-y-4">
              <Metric label="Inscripciones" value={`${registrations.length}`} />
              <Metric
                label="Articulos registrados"
                value={`${dashboard?.metrics?.activePapers || 0}`}
              />
              <Metric label="Saldo pendiente" value={formatCurrency(outstandingBalance)} />
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          {!registrations.length ? (
            <Alert
              title="No hay inscripciones registradas"
              description="Completa el flujo de inscripcion para visualizar articulos y estado de pago."
              variant="warning"
            />
          ) : null}

          <Card className="p-8">
            <div className="mb-6">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-600">
                Historial de inscripcion
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-950">
                Resumen de articulos y pagos
              </h2>
            </div>
            <Table
              columns={[
                { key: 'id', label: 'ID de inscripcion' },
                {
                  key: 'participantType',
                  label: 'Tipo',
                  render: (value) => translateParticipationType(value),
                },
                {
                  key: 'papers',
                  label: 'Articulos',
                  render: (value) => value?.length || 0,
                },
                {
                  key: 'paymentStatus',
                  label: 'Pago',
                  render: (value) => translatePaymentStatus(value),
                },
                {
                  key: 'pricing',
                  label: 'Saldo',
                  render: (value, row) =>
                    formatCurrency(value?.balance ?? row?.pendingAmount ?? 0),
                },
              ]}
              rows={registrations}
            />
          </Card>
        </div>
      </div>
    </section>
  );
}

function Metric({ label, value }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-950">{value}</p>
    </div>
  );
}

export default UserDashboardPage;
