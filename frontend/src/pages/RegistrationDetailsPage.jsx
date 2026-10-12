import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Alert } from '../components/Alert';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Table } from '../components/Table';
import { useAuth } from '../hooks/useAuth';
import { useSession } from '../hooks/useSession';
import { dashboardService } from '../services/dashboardService';
import { formatCurrency } from '../utils/currency';
import { StatusBadge } from '../utils/statusStyles.jsx';
import {
  translateAttendanceType,
  translateDocumentType,
  translateGender,
  translateOccupation,
  translateMemberType,
  translateParticipationType,
  translatePaymentStatus,
  translateRegistrationStatus,
} from '../utils/translations';

function RegistrationDetailsPage() {
  const navigate = useNavigate();
  const { userId } = useParams();
  const { user } = useAuth();
  const { session } = useSession();
  const isAdminRemoteView = user?.role === 'admin' && Boolean(userId);
  const isUserRemoteView = user?.role !== 'admin';

  const [remoteState, setRemoteState] = useState({
    isLoading: false,
    error: '',
    message: '',
    user: null,
    registrations: [],
  });

  useEffect(() => {
    if (!isAdminRemoteView) {
      return;
    }

    async function loadRegistrationDetails() {
      try {
        setRemoteState((current) => ({
          ...current,
          isLoading: true,
          error: '',
        }));

        const response = await dashboardService.getAdminUserRegistrationDetails(userId);

        setRemoteState({
          isLoading: false,
          error: '',
          message: response.message,
          user: response.user,
          registrations: response.registrations,
        });
      } catch (error) {
        setRemoteState({
          isLoading: false,
          error:
            error?.response?.data?.message ||
            error?.message ||
            "Unable to load participant details.",
          message: '',
          user: null,
          registrations: [],
        });
      }
    }

    loadRegistrationDetails();
  }, [isAdminRemoteView, userId]);

  useEffect(() => {
    if (!isUserRemoteView) {
      return;
    }

    async function loadMyRegistrations() {
      try {
        setRemoteState((current) => ({
          ...current,
          isLoading: true,
          error: '',
        }));

        const response = await dashboardService.getMyRegistrationDetails();

        setRemoteState({
          isLoading: false,
          error: '',
          message: response.message || "Registration details retrieved successfully.",
          user: response.user,
          registrations: response.registrations,
        });
      } catch (error) {
        setRemoteState({
          isLoading: false,
          error:
            error?.response?.data?.message ||
            error?.message ||
            "Unable to load the participant's registrations.",
          message: '',
          user: null,
          registrations: [],
        });
      }
    }

    loadMyRegistrations();
  }, [isUserRemoteView]);

  const localProfile = {
    ...session.user,
    ...user,
  };

  const localRegistrations = session.registrations || [];
  const profile =
    isAdminRemoteView || isUserRemoteView
      ? remoteState.user || localProfile
      : localProfile;
  const registrations = isAdminRemoteView
    ? remoteState.registrations
    : remoteState.registrations.length
      ? remoteState.registrations
      : localRegistrations;
  const activeRegistration = registrations[0] || null;

  const pageTitle = isAdminRemoteView
    ? "Participant registration details"
    : "Your registration information";

  const pageDescription = isAdminRemoteView
    ? "Review the participant's personal details, registration, payments and associated papers here."
    : "Review your registered details, registration status and paper information here.";

  const personalRows = useMemo(
    () => [
      { label: "First name", value: profile?.firstName },
      { label: "Last name", value: profile?.lastName },
      { label: "Email address", value: profile?.email },
      { label: "Phone", value: profile?.phoneNumber },
      { label: "Country", value: resolveCountry(profile) },
      { label: "City", value: profile?.city },
      { label: "Address", value: profile?.address },
      { label: "Date of birth", value: profile?.birthDate },
      { label: "Gender", value: translateGender(profile?.gender) },
      { label: "ID document type", value: translateDocumentType(profile?.docType) },
      { label: "ID document number", value: profile?.docNumber },
      { label: "Affiliation", value: profile?.affiliation || profile?.organization },
      { label: "Occupation", value: translateOccupation(profile?.occupation) },
    ],
    [profile],
  );

  if ((isAdminRemoteView || isUserRemoteView) && remoteState.isLoading) {
    return (
      <section className="container-shell py-16">
        <Alert
          title={isAdminRemoteView ? "Loading participant details" : "Loading your registrations"}
          description={
            isAdminRemoteView
              ? "Loading registration, payment and paper information."
              : "Loading your registration and paper details."
          }
          variant="info"
        />
      </section>
    );
  }

  if ((isAdminRemoteView || isUserRemoteView) && remoteState.error) {
    return (
      <section className="container-shell py-16">
        <Alert title="Unable to load details" description={remoteState.error} variant="danger" />
      </section>
    );
  }

  if (!profile || !activeRegistration) {
    return (
      <section className="container-shell py-16">
        <Alert
          title="No registration information available"
          description="No registration is available to display yet."
          variant="warning"
        />
      </section>
    );
  }

  return (
    <section className="container-shell py-16">
      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-600">
          Registration information
        </p>
        <h1 className="mt-3 text-4xl font-semibold text-slate-950">{pageTitle}</h1>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600">{pageDescription}</p>
        {!isAdminRemoteView ? (
          <div className="mt-6">
            <Button variant="primary" onClick={() => navigate('/registration-details/edit')}>
              Edit information
            </Button>
          </div>
        ) : null}
      </div>

      <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="p-8">
          <h2 className="text-2xl font-semibold text-slate-950">Personal information</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {personalRows.map((row) => (
              <ReadOnlyRow key={row.label} label={row.label} value={row.value} />
            ))}
          </div>

          {profile.customFieldValues?.length ? (
            <div className="mt-8">
              <h3 className="text-lg font-semibold text-slate-950">Additional participant fields</h3>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                {profile.customFieldValues.map((field) => (
                  <ReadOnlyRow
                    key={field.id || `${field.customFieldId}-${field.value}`}
                    label={field.customField?.label || `Field ${field.customFieldId}`}
                    value={field.value}
                  />
                ))}
              </div>
            </div>
          ) : null}
        </Card>

        <Card className="overflow-hidden border-none bg-[#00334d] p-8 text-white shadow-[0_30px_80px_rgba(0,51,77,0.2)]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,74,74,0.18),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(57,141,222,0.18),transparent_30%)]" />
          <div className="relative">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#a6dce5]">
              Overview
            </p>
            <h2 className="mt-3 text-2xl font-semibold text-white">Current registration status</h2>
            <div className="mt-6 grid gap-4">
              <SummaryPill
                label="Registered papers"
                value={`${activeRegistration.papers?.length || 0}`}
                accent="red"
              />
              <SummaryPill
                label="Outstanding balance"
                value={formatCurrency(
                  activeRegistration.paymentSummary?.pendingAmount ||
                    activeRegistration.pricing?.balance ||
                    activeRegistration.pendingAmount,
                )}
                accent="blue"
              />
            </div>
          </div>
        </Card>
      </div>

      <div className="mt-10">
        <RegistrationSection registration={activeRegistration} isAdminRemoteView={isAdminRemoteView} />
      </div>
    </section>
  );
}

function RegistrationSection({ registration, isAdminRemoteView }) {
  const requiresInvoice = resolveInvoiceRequirement(registration);
  const invoiceTaxAmount = resolveInvoiceTaxAmount(registration);

  const registrationRows = [
    { label: "Conference", value: registration.eventEdition?.name || 'IEEE SYSCON LATAM 2026' },
    {
      label: "Participation type",
      value: translateParticipationType(registration.participantType || registration.participationType),
    },
    { label: "Attendance format", value: translateAttendanceType(registration.attendanceType) },
    { label: "Membership type", value: translateMemberType(registration.memberType) },
    { label: "Membership number", value: registration.membershipNumber || "Not applicable" },
    { label: "Registration status", value: translateRegistrationStatus(registration.status) },
    { label: "Payment status", value: translatePaymentStatus(registration.paymentStatus) },
    { label: "Invoice requested", value: formatBooleanPreference(requiresInvoice) },
    {
      label: "Invoice and tax charge",
      value: requiresInvoice ? formatCurrency(invoiceTaxAmount) : "Not applicable",
    },
    {
      label: "Outstanding balance",
      value: formatCurrency(
        registration.paymentSummary?.pendingAmount || registration.pricing?.balance || registration.pendingAmount,
      ),
    },
  ];

  const paymentSummary = registration.paymentSummary || registration.pricing?.breakdown || null;

  return (
    <Card className="p-8">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-600">
            Your registration
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-950">Active registration</h2>
        </div>
        <div className="rounded-2xl bg-slate-100 px-4 py-3 text-right">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Payment status
          </p>
          <div className="mt-2 flex justify-end">
            <StatusBadge
              status={registration.paymentStatus}
              label={translatePaymentStatus(registration.paymentStatus)}
            />
          </div>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_1fr]">
        <div>
          <h3 className="text-lg font-semibold text-slate-950">Registration details</h3>
          <div className="mt-4 grid gap-4">
            {registrationRows.map((row) => (
              <ReadOnlyRow key={row.label} label={row.label} value={row.value} />
            ))}
          </div>

          {registration.customFieldValues?.length ? (
            <div className="mt-8">
              <h3 className="text-lg font-semibold text-slate-950">Additional registration fields</h3>
              <div className="mt-4 grid gap-4">
                {registration.customFieldValues.map((field) => (
                  <ReadOnlyRow
                    key={field.id || `${field.customFieldId}-${field.value}`}
                    label={field.customField?.label || `Field ${field.customFieldId}`}
                    value={field.value}
                  />
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <div className="space-y-8">
          <div>
            <h3 className="text-lg font-semibold text-slate-950">Financial summary</h3>
            <div className="mt-4 grid gap-4">
              <ReadOnlyRow
                label="Total amount"
                value={formatCurrency(paymentSummary?.totalAmount || registration.totalAmount)}
              />
              <ReadOnlyRow
                label="Amount paid"
                value={formatCurrency(paymentSummary?.paidAmount || registration.paidAmount)}
              />
              <ReadOnlyRow
                label="Outstanding amount"
                value={formatCurrency(paymentSummary?.pendingAmount || registration.pendingAmount)}
              />
            </div>
          </div>

          {isAdminRemoteView ? (
            <div>
              <h3 className="text-lg font-semibold text-slate-950">Registered payments</h3>
              <div className="mt-4">
                <Table
                  columns={[
                    { key: 'paymentMethod', label: "Method" },
                    {
                      key: 'amountUsd',
                      label: "Amount in USD",
                      render: (value) => formatCurrency(value),
                    },
                    {
                      key: 'status',
                      label: "Status",
                      render: (value) => (
                        <StatusBadge
                          status={value}
                          label={translatePaymentStatus(value)}
                        />
                      ),
                    },
                    { key: 'transactionReference', label: "Reference" },
                  ]}
                  rows={registration.payments || []}
                  emptyMessage="No payments recorded."
                />
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-10">
        <h3 className="text-lg font-semibold text-slate-950">Registered papers</h3>
        <div className="mt-4">
          <Table
            columns={[
              { key: 'title', label: "Title" },
              { key: 'paperCode', label: "Code" },
              {
                key: 'authors',
                label: "Authors",
                render: (value) => (Array.isArray(value) ? value.join(', ') : value),
              },
              { key: 'pages', label: "Pages" },
            ]}
            rows={registration.papers || []}
            emptyMessage="No papers registered."
          />
        </div>

        {registration.papers?.length ? (
          <div className="mt-6 grid gap-4">
            {registration.papers.map((paper, paperIndex) => (
              <div key={paper.id || paperIndex} className="rounded-2xl bg-slate-50 p-5">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Paper {paperIndex + 1}
                </p>
                <p className="mt-2 text-base font-semibold text-slate-950">{paper.title}</p>
                {paper.customFieldValues?.length ? (
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    {paper.customFieldValues.map((field) => (
                      <ReadOnlyRow
                        key={field.id || `${field.customFieldId}-${field.value}`}
                        label={field.customField?.label || `Field ${field.customFieldId}`}
                        value={field.value}
                      />
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </Card>
  );
}

function ReadOnlyRow({ label, value }) {
  return (
    <div className="rounded-2xl bg-slate-50 px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-medium text-slate-950">{value || "Not provided"}</p>
    </div>
  );
}

function SummaryPill({ label, value, accent = 'blue' }) {
  const styles =
    accent === 'red'
      ? 'border-[#ff944d]/35 bg-[#ff944d]/10 text-white'
      : 'border-[#79c5d1]/35 bg-[#79c5d1]/10 text-white';

  return (
    <div className={`rounded-2xl border px-4 py-4 ${styles}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">{label}</p>
      <p className="mt-2 text-xl font-semibold">{value}</p>
    </div>
  );
}

function resolveCountry(profile) {
  if (profile?.country?.name) {
    return profile.country.name;
  }

  if (profile?.country) {
    return profile.country;
  }

  if (profile?.countryId) {
    return `ID ${profile.countryId}`;
  }

  return "Not provided";
}

function resolveInvoiceRequirement(registration) {
  const latestPayment = resolveLatestPayment(registration);
  const paymentLevelValue = firstDefinedValue([
    latestPayment?.requiresInvoice,
    latestPayment?.includeTax,
    latestPayment?.includesTax,
    latestPayment?.includesTaxes,
  ]);

  if (paymentLevelValue !== undefined) {
    return normalizeBooleanPreference(paymentLevelValue);
  }

  const directValue = firstDefinedValue([
    registration?.requiresInvoice,
    registration?.invoiceRequired,
    registration?.needsInvoice,
    registration?.requestInvoice,
    registration?.billingRequested,
    registration?.includeTaxes,
    registration?.includeTax,
    registration?.includesTaxes,
    registration?.paymentSummary?.requiresInvoice,
    registration?.paymentSummary?.includeTax,
    registration?.paymentSummary?.includeTaxes,
    registration?.paymentSummary?.includesTaxes,
  ]);

  if (directValue !== undefined) {
    return normalizeBooleanPreference(directValue);
  }

  return resolveCustomFieldBoolean(
    registration?.customFieldValues,
    ['factura', 'invoice', 'billing', 'impuestos', 'tax'],
  );
}


function resolveInvoiceTaxAmount(registration) {
  const latestPayment = resolveLatestPayment(registration);
  const latestPaymentTaxAmount = firstDefinedValue([
    latestPayment?.taxAmount,
    latestPayment?.invoiceTaxAmount,
  ]);

  if (
    latestPaymentTaxAmount !== undefined &&
    latestPaymentTaxAmount !== null &&
    latestPaymentTaxAmount !== ''
  ) {
    return Number(Math.max(0, Number(latestPaymentTaxAmount)).toFixed(2));
  }

  const directValue = firstDefinedValue([
    registration?.taxAmount,
    registration?.invoiceTaxAmount,
    registration?.paymentSummary?.taxAmount,
    registration?.paymentSummary?.invoiceTaxAmount,
  ]);

  if (directValue !== undefined && directValue !== null && directValue !== '') {
    return Number(Math.max(0, Number(directValue)).toFixed(2));
  }

  return 0;
}

function resolveCustomFieldBoolean(customFieldValues, keywords) {
  const matchedField = (customFieldValues || []).find((field) => {
    const label = normalizeText(
      field?.customField?.label || field?.label || field?.customField?.name || '',
    );

    return keywords.some((keyword) => label.includes(normalizeText(keyword)));
  });

  if (!matchedField) {
    return undefined;
  }

  return normalizeBooleanPreference(matchedField.value);
}

function normalizeBooleanPreference(value) {
  if (typeof value === 'boolean') {
    return value;
  }

  if (value === null || value === undefined) {
    return undefined;
  }

  const normalizedValue = normalizeText(String(value));

  if (['true', '1', 'si', 'sí', 'yes', 'y', 'requiere', 'solicita'].includes(normalizedValue)) {
    return true;
  }

  if (['false', '0', 'no', 'n', 'not'].includes(normalizedValue)) {
    return false;
  }

  return undefined;
}

function formatBooleanPreference(value) {
  if (value === true) {
    return "Yes";
  }

  if (value === false) {
    return 'No';
  }

  return "Not provided";
}

function firstDefinedValue(values) {
  return values.find((value) => value !== undefined && value !== null);
}

function resolveLatestPayment(registration) {
  const payments = registration?.payments || [];

  if (!payments.length) {
    return null;
  }

  return [...payments].sort((left, right) => {
    const leftTime = new Date(left?.createdAt || 0).getTime();
    const rightTime = new Date(right?.createdAt || 0).getTime();
    return rightTime - leftTime;
  })[0];
}

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export default RegistrationDetailsPage;
