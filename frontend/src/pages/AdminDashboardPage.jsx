import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Alert } from '../components/Alert';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Table } from '../components/Table';
import { dashboardService } from '../services/dashboardService';
import { StatusBadge } from '../utils/statusStyles.jsx';
import { translatePaymentStatus } from '../utils/translations';

function AdminDashboardPage() {
  const [dashboard, setDashboard] = useState({
    metrics: [],
    recentRegistrations: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function loadDashboard() {
      try {
        setIsLoading(true);
        setError('');
        const response = await dashboardService.getAdminDashboard();

        if (!isMounted) {
          return;
        }

        setDashboard(response);
      } catch (loadError) {
        if (!isMounted) {
          return;
        }

        setError(
          loadError?.response?.data?.message ||
            loadError?.message ||
            'No fue posible cargar el panel de administracion.',
        );
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadDashboard();

    return () => {
      isMounted = false;
    };
  }, []);

  if (isLoading) {
    return (
      <section className="container-shell py-16">
        <Alert
          title="Cargando panel de administracion"
          description="Consultando resumen general y actividad reciente desde el backend."
          variant="info"
        />
      </section>
    );
  }

  if (error) {
    return (
      <section className="container-shell py-16">
        <Alert title="No fue posible cargar el panel" description={error} variant="danger" />
      </section>
    );
  }

  return (
    <section className="container-shell py-16">
      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-600">
          Consola de administracion
        </p>
        <h1 className="mt-3 text-4xl font-semibold text-slate-950">
          Panorama operativo y de registros
        </h1>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {dashboard.metrics.map((metric) => (
          <Card key={metric.label} className="p-6">
            <p className="text-sm text-slate-500">{metric.label}</p>
            <p className="mt-3 text-3xl font-semibold text-slate-950">{metric.value}</p>
            {metric.delta ? <p className="mt-2 text-sm text-emerald-600">{metric.delta}</p> : null}
          </Card>
        ))}
      </div>

      <div className="mt-8 grid gap-8 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="p-8">
          <div className="mb-6">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-600">
              Cola de registros
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-950">
              Actividad reciente de participantes
            </h2>
          </div>
          <Table
            columns={[
              { key: 'id', label: 'ID' },
              { key: 'participant', label: 'Participante' },
              { key: 'type', label: 'Tipo' },
              { key: 'papers', label: 'Articulos' },
              {
                key: 'paymentStatus',
                label: 'Estado de pago',
                render: (value) => (
                  <StatusBadge
                    status={value}
                    label={translatePaymentStatus(value)}
                  />
                ),
              },
            ]}
            rows={dashboard.recentRegistrations}
            emptyMessage="No hay actividad reciente para mostrar."
          />
          <div className="mt-6 flex justify-end">
            <Link to="/admin/users-overview">
              <Button variant="ghost" className="border border-slate-200">
                Ver detalle completo
              </Button>
            </Link>
          </div>
        </Card>

        <Card className="p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-600">
            Proximas integraciones
          </p>
          <div className="mt-6 space-y-4">
            <PlaceholderItem title="Asignacion de revisores">
              Espacio reservado para la asignacion de articulos a revisores y el flujo de aprobacion.
            </PlaceholderItem>
            <PlaceholderItem title="Conciliacion financiera">
              Espacio reservado para estado de pasarela, exportacion de facturas y aprobaciones financieras.
            </PlaceholderItem>
            <PlaceholderItem title="Centro de comunicaciones">
              Espacio reservado para correos masivos, recordatorios y notificaciones de aceptacion.
            </PlaceholderItem>
          </div>
        </Card>
      </div>
    </section>
  );
}

function PlaceholderItem({ title, children }) {
  return (
    <div className="rounded-2xl border border-slate-200 p-5">
      <p className="text-base font-semibold text-slate-950">{title}</p>
      <p className="mt-2 text-sm text-slate-600">{children}</p>
    </div>
  );
}

export default AdminDashboardPage;
