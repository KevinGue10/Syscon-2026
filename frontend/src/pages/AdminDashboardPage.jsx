import { useEffect, useState } from 'react';
import { Card } from '../components/Card';
import { Table } from '../components/Table';
import { dashboardService } from '../services/dashboardService';
import { translatePaymentStatus } from '../utils/translations';

function AdminDashboardPage() {
  const [dashboard, setDashboard] = useState({
    metrics: [],
    recentRegistrations: [],
  });

  useEffect(() => {
    dashboardService.getAdminDashboard().then(setDashboard);
  }, []);

  return (
    <section className="container-shell py-16">
      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-600">
          Admin Console
        </p>
        <h1 className="mt-3 text-4xl font-semibold text-slate-950">
          Operations and registration snapshot
        </h1>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {dashboard.metrics.map((metric) => (
          <Card key={metric.label} className="p-6">
            <p className="text-sm text-slate-500">{metric.label}</p>
            <p className="mt-3 text-3xl font-semibold text-slate-950">{metric.value}</p>
            <p className="mt-2 text-sm text-emerald-600">{metric.delta}</p>
          </Card>
        ))}
      </div>

      <div className="mt-8 grid gap-8 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="p-8">
          <div className="mb-6">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-600">
              Registration Queue
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-950">
              Recent participant activity
            </h2>
          </div>
          <Table
            columns={[
              { key: 'id', label: 'ID' },
              { key: 'participant', label: 'Participant' },
              { key: 'type', label: 'Type' },
              { key: 'papers', label: 'Papers' },
              {
                key: 'paymentStatus',
                label: 'Payment Status',
                render: (value) => translatePaymentStatus(value),
              },
            ]}
            rows={dashboard.recentRegistrations}
          />
        </Card>

        <Card className="p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-600">
            Next Integrations
          </p>
          <div className="mt-6 space-y-4">
            <PlaceholderItem title="Reviewer Assignment">
              Placeholder for paper-to-reviewer routing and approval workflow.
            </PlaceholderItem>
            <PlaceholderItem title="Finance Reconciliation">
              Placeholder for gateway status, invoice export, and finance approvals.
            </PlaceholderItem>
            <PlaceholderItem title="Communication Center">
              Placeholder for bulk email, reminders, and acceptance notifications.
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
