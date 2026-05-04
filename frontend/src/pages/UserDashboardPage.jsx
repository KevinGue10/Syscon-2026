import { useEffect, useState } from 'react';
import { Alert } from '../components/Alert';
import { Card } from '../components/Card';
import { Table } from '../components/Table';
import { useAuth } from '../hooks/useAuth';
import { useSession } from '../hooks/useSession';
import { dashboardService } from '../services/dashboardService';
import { formatCurrency } from '../utils/currency';

function UserDashboardPage() {
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
              Participant Profile
            </p>
            <h1 className="mt-3 text-3xl font-semibold text-slate-950">
              {dashboard?.profile?.name || 'Conference participant'}
            </h1>
            <div className="mt-6 space-y-3 text-sm text-slate-600">
              <p>Email: {dashboard?.profile?.email || 'Not provided yet'}</p>
              <p>Organization: {dashboard?.profile?.organization || 'Not provided yet'}</p>
              <p>Country: {dashboard?.profile?.country || 'Not provided yet'}</p>
            </div>
          </Card>

          <Card className="p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-600">
              Payment Status
            </p>
            <div className="mt-5 space-y-4">
              <Metric label="Registrations" value={`${registrations.length}`} />
              <Metric
                label="Registered Papers"
                value={`${dashboard?.metrics?.activePapers || 0}`}
              />
              <Metric label="Pending Balance" value={formatCurrency(outstandingBalance)} />
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          {!registrations.length ? (
            <Alert
              title="No registrations yet"
              description="Submit the registration flow to populate this dashboard with papers and payment data."
              variant="warning"
            />
          ) : null}

          <Card className="p-8">
            <div className="mb-6">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-600">
                Registration History
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-950">
                Papers and payment overview
              </h2>
            </div>
            <Table
              columns={[
                { key: 'id', label: 'Registration ID' },
                {
                  key: 'participantType',
                  label: 'Type',
                  render: (value) => value?.charAt(0).toUpperCase() + value?.slice(1),
                },
                {
                  key: 'papers',
                  label: 'Papers',
                  render: (value) => value.length,
                },
                { key: 'paymentStatus', label: 'Payment' },
                {
                  key: 'pricing',
                  label: 'Balance',
                  render: (value) => formatCurrency(value.balance),
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
