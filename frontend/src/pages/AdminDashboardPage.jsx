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
            "Unable to load the administration dashboard.",
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
          title="Loading administration dashboard"
          description="Loading the overview and recent activity."
          variant="info"
        />
      </section>
    );
  }

  if (error) {
    return (
      <section className="container-shell py-16">
        <Alert title="Unable to load the dashboard" description={error} variant="danger" />
      </section>
    );
  }

  return (
    <section className="container-shell py-16">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-5">
        <div>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-600">
          Administration console
        </p>
        <h1 className="mt-3 text-4xl font-semibold text-slate-950">
          Registration and operations overview
        </h1>
        </div>
        <Link to="/change-password" className="inline-flex rounded-lg border border-brand-200 bg-white px-5 py-3 text-sm font-semibold text-brand-800 transition hover:bg-brand-50">
          Change my password
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {dashboard.metrics.map((metric) => (
          <Card key={metric.label} className="p-6">
            <p className="text-sm text-slate-500">{metric.label}</p>
            <p
              className={`mt-3 text-3xl font-semibold ${
                metric.label === "Revenue collected"
                  ? 'text-emerald-600'
                  : metric.label === "Outstanding balances"
                    ? 'text-rose-600'
                    : 'text-slate-950'
              }`}
            >
              {metric.value}
            </p>
            {metric.delta ? <p className="mt-2 text-sm text-emerald-600">{metric.delta}</p> : null}
          </Card>
        ))}
      </div>

      <div className="mt-8 grid gap-8 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="p-8">
          <div className="mb-6">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-600">
              Registration queue
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-950">
              Recent participant activity
            </h2>
          </div>
          <Table
            columns={[
              { key: 'id', label: 'ID' },
              { key: 'participant', label: "Participant" },
              { key: 'type', label: "Type" },
              { key: 'papers', label: "Papers" },
              {
                key: 'paymentStatus',
                label: "Payment status",
                render: (value) => (
                  <StatusBadge
                    status={value}
                    label={translatePaymentStatus(value)}
                  />
                ),
              },
            ]}
            rows={dashboard.recentRegistrations}
            emptyMessage="No recent activity to display."
          />
          <div className="mt-6 flex justify-end">
            <Link to="/admin/users-overview">
              <Button variant="ghost" className="border border-slate-200">
                View full details
              </Button>
            </Link>
          </div>
        </Card>

        <Card className="p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-600">
            Upcoming integrations
          </p>
          <div className="mt-6 space-y-4">
            <PlaceholderItem title="Reviewer assignments">
              Reserved for paper assignments to reviewers and the approval workflow.
            </PlaceholderItem>
            <PlaceholderItem title="Financial reconciliation">
              Reserved for payment gateway status, invoice exports and financial approvals.
            </PlaceholderItem>
            <PlaceholderItem title="Communications center">
              Reserved for bulk emails, reminders and acceptance notifications.
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
