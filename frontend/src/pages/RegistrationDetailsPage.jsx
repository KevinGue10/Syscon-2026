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
            'No fue posible cargar el detalle del usuario.',
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
          message: response.message || 'Detalle del registro obtenido correctamente.',
          user: response.user,
          registrations: response.registrations,
        });
      } catch (error) {
        setRemoteState({
          isLoading: false,
          error:
            error?.response?.data?.message ||
            error?.message ||
            'No fue posible cargar las inscripciones del participante.',
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
    ? 'Detalle de la inscripcion del participante'
    : 'Tu informacion de inscripcion';

  const pageDescription = isAdminRemoteView
    ? 'Aqui puedes revisar de forma clara los datos personales, la inscripcion, los pagos y los articulos asociados al participante.'
    : 'Aqui puedes revisar los datos que registraste, el estado de tu inscripcion y la informacion de tus articulos.';

  const personalRows = useMemo(
    () => [
      { label: 'Nombres', value: profile?.firstName },
      { label: 'Apellidos', value: profile?.lastName },
      { label: 'Correo electronico', value: profile?.email },
      { label: 'Telefono', value: profile?.phoneNumber },
      { label: 'Pais', value: resolveCountry(profile) },
      { label: 'Ciudad', value: profile?.city },
      { label: 'Direccion', value: profile?.address },
      { label: 'Fecha de nacimiento', value: profile?.birthDate },
      { label: 'Genero', value: translateGender(profile?.gender) },
      { label: 'Tipo de documento', value: translateDocumentType(profile?.docType) },
      { label: 'Numero de documento', value: profile?.docNumber },
      { label: 'Afiliacion', value: profile?.affiliation || profile?.organization },
      { label: 'Ocupacion', value: translateOccupation(profile?.occupation) },
    ],
    [profile],
  );

  if ((isAdminRemoteView || isUserRemoteView) && remoteState.isLoading) {
    return (
      <section className="container-shell py-16">
        <Alert
          title={isAdminRemoteView ? 'Cargando detalle del usuario' : 'Cargando tus inscripciones'}
          description={
            isAdminRemoteView
              ? 'Consultando informacion de inscripciones, pagos y articulos desde el backend.'
              : 'Consultando tus datos de registro y articulos desde el backend.'
          }
          variant="info"
        />
      </section>
    );
  }

  if ((isAdminRemoteView || isUserRemoteView) && remoteState.error) {
    return (
      <section className="container-shell py-16">
        <Alert title="No fue posible cargar el detalle" description={remoteState.error} variant="danger" />
      </section>
    );
  }

  if (!profile || !activeRegistration) {
    return (
      <section className="container-shell py-16">
        <Alert
          title="No hay datos de registro disponibles"
          description="Todavia no se encuentra una inscripcion disponible para mostrar."
          variant="warning"
        />
      </section>
    );
  }

  return (
    <section className="container-shell py-16">
      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-600">
          Datos de registro
        </p>
        <h1 className="mt-3 text-4xl font-semibold text-slate-950">{pageTitle}</h1>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600">{pageDescription}</p>
        {!isAdminRemoteView ? (
          <div className="mt-6">
            <Button variant="primary" onClick={() => navigate('/registration-details/edit')}>
              Editar informacion
            </Button>
          </div>
        ) : null}
      </div>

      <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="p-8">
          <h2 className="text-2xl font-semibold text-slate-950">Informacion personal</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {personalRows.map((row) => (
              <ReadOnlyRow key={row.label} label={row.label} value={row.value} />
            ))}
          </div>

          {profile.customFieldValues?.length ? (
            <div className="mt-8">
              <h3 className="text-lg font-semibold text-slate-950">Campos adicionales del usuario</h3>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                {profile.customFieldValues.map((field) => (
                  <ReadOnlyRow
                    key={field.id || `${field.customFieldId}-${field.value}`}
                    label={field.customField?.label || `Campo ${field.customFieldId}`}
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
              Resumen general
            </p>
            <h2 className="mt-3 text-2xl font-semibold text-white">Estado actual de tu inscripcion</h2>
            <div className="mt-6 grid gap-4">
              <SummaryPill
                label="Articulos registrados"
                value={`${activeRegistration.papers?.length || 0}`}
                accent="red"
              />
              <SummaryPill
                label="Saldo pendiente"
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
  const willAttendTour = resolveTourAttendance(registration);
  const invoiceTaxAmount = resolveInvoiceTaxAmount(registration);

  const registrationRows = [
    { label: 'Conferencia', value: registration.eventEdition?.name || 'IEEE SYSCON LATAM 2026' },
    {
      label: 'Tipo de participacion',
      value: translateParticipationType(registration.participantType || registration.participationType),
    },
    { label: 'Modalidad', value: translateAttendanceType(registration.attendanceType) },
    { label: 'Tipo de miembro', value: translateMemberType(registration.memberType) },
    { label: 'Numero de membresia', value: registration.membershipNumber || 'No aplica' },
    { label: 'Estado de inscripcion', value: translateRegistrationStatus(registration.status) },
    { label: 'Estado de pago', value: translatePaymentStatus(registration.paymentStatus) },
    { label: 'Requiere factura', value: formatBooleanPreference(requiresInvoice) },
    {
      label: 'Cargo de factura e impuestos',
      value: requiresInvoice ? formatCurrency(invoiceTaxAmount) : 'No aplica',
    },
    { label: 'Asistencia al tour', value: formatBooleanPreference(willAttendTour) },
    {
      label: 'Saldo pendiente',
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
            Tu inscripcion
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-950">Inscripcion activa</h2>
        </div>
        <div className="rounded-2xl bg-slate-100 px-4 py-3 text-right">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Estado de pago
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
          <h3 className="text-lg font-semibold text-slate-950">Datos de inscripcion</h3>
          <div className="mt-4 grid gap-4">
            {registrationRows.map((row) => (
              <ReadOnlyRow key={row.label} label={row.label} value={row.value} />
            ))}
          </div>

          {registration.customFieldValues?.length ? (
            <div className="mt-8">
              <h3 className="text-lg font-semibold text-slate-950">Campos adicionales de la inscripcion</h3>
              <div className="mt-4 grid gap-4">
                {registration.customFieldValues.map((field) => (
                  <ReadOnlyRow
                    key={field.id || `${field.customFieldId}-${field.value}`}
                    label={field.customField?.label || `Campo ${field.customFieldId}`}
                    value={field.value}
                  />
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <div className="space-y-8">
          <div>
            <h3 className="text-lg font-semibold text-slate-950">Resumen financiero</h3>
            <div className="mt-4 grid gap-4">
              <ReadOnlyRow
                label="Valor total"
                value={formatCurrency(paymentSummary?.totalAmount || registration.totalAmount)}
              />
              <ReadOnlyRow
                label="Valor pagado"
                value={formatCurrency(paymentSummary?.paidAmount || registration.paidAmount)}
              />
              <ReadOnlyRow
                label="Valor pendiente"
                value={formatCurrency(paymentSummary?.pendingAmount || registration.pendingAmount)}
              />
            </div>
          </div>

          {isAdminRemoteView ? (
            <div>
              <h3 className="text-lg font-semibold text-slate-950">Pagos registrados</h3>
              <div className="mt-4">
                <Table
                  columns={[
                    { key: 'paymentMethod', label: 'Metodo' },
                    {
                      key: 'amountUsd',
                      label: 'Monto USD',
                      render: (value) => formatCurrency(value),
                    },
                    {
                      key: 'status',
                      label: 'Estado',
                      render: (value) => (
                        <StatusBadge
                          status={value}
                          label={translatePaymentStatus(value)}
                        />
                      ),
                    },
                    { key: 'transactionReference', label: 'Referencia' },
                  ]}
                  rows={registration.payments || []}
                  emptyMessage="No hay pagos registrados."
                />
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-10">
        <h3 className="text-lg font-semibold text-slate-950">Articulos registrados</h3>
        <div className="mt-4">
          <Table
            columns={[
              { key: 'title', label: 'Titulo' },
              { key: 'paperCode', label: 'Codigo' },
              {
                key: 'authors',
                label: 'Autores',
                render: (value) => (Array.isArray(value) ? value.join(', ') : value),
              },
              { key: 'pages', label: 'Paginas' },
            ]}
            rows={registration.papers || []}
            emptyMessage="No se registraron articulos."
          />
        </div>

        {registration.papers?.length ? (
          <div className="mt-6 grid gap-4">
            {registration.papers.map((paper, paperIndex) => (
              <div key={paper.id || paperIndex} className="rounded-2xl bg-slate-50 p-5">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Articulo {paperIndex + 1}
                </p>
                <p className="mt-2 text-base font-semibold text-slate-950">{paper.title}</p>
                {paper.customFieldValues?.length ? (
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    {paper.customFieldValues.map((field) => (
                      <ReadOnlyRow
                        key={field.id || `${field.customFieldId}-${field.value}`}
                        label={field.customField?.label || `Campo ${field.customFieldId}`}
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
      <p className="mt-2 text-sm font-medium text-slate-950">{value || 'No registrado'}</p>
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

  return 'No registrado';
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

function resolveTourAttendance(registration) {
  const latestPayment = resolveLatestPayment(registration);
  const paymentLevelValue = latestPayment?.includesTour;

  if (paymentLevelValue !== undefined) {
    return normalizeBooleanPreference(paymentLevelValue);
  }

  const directValue = firstDefinedValue([
    registration?.willAttendTour,
    registration?.tourAttendance,
    registration?.attendTour,
    registration?.includeMiddleOfTheWorldTour,
    registration?.middleOfTheWorldTour,
    registration?.requiresTour,
    registration?.includesTour,
    registration?.paymentSummary?.includeMiddleOfTheWorldTour,
    registration?.paymentSummary?.includesTour,
  ]);

  if (directValue !== undefined) {
    return normalizeBooleanPreference(directValue);
  }

  return resolveCustomFieldBoolean(
    registration?.customFieldValues,
    ['tour', 'mitad del mundo', 'middle of the world'],
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
    return 'Si';
  }

  if (value === false) {
    return 'No';
  }

  return 'No registrado';
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
