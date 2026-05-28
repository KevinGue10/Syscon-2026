import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert } from '../components/Alert';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { InputField } from '../components/InputField';
import { Modal } from '../components/Modal';
import { SelectField } from '../components/SelectField';
import { Table } from '../components/Table';
import { dashboardService } from '../services/dashboardService';
import { paymentService } from '../services/paymentService';
import { TextAreaField } from '../components/TextAreaField';
import { formatCurrency } from '../utils/currency';
import { StatusBadge } from '../utils/statusStyles.jsx';
import {
  translateAttendanceType,
  translateDocumentType,
  translateGender,
  translateOccupation,
  translatePaymentStatus,
} from '../utils/translations';

const PAGE_SIZE = 10;

function AdminUsersOverviewPage() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: PAGE_SIZE,
    totalItems: 0,
    totalPages: 1,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    search: '',
    country: '',
    city: '',
    occupation: '',
    attendanceType: '',
    isIeeeMember: '',
    isTems: '',
  });
  const [appliedFilters, setAppliedFilters] = useState({
    search: '',
    country: '',
    city: '',
    occupation: '',
    attendanceType: '',
    isIeeeMember: '',
    isTems: '',
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState(null);
  const [actionModal, setActionModal] = useState({
    isOpen: false,
    title: '',
    user: null,
  });
  const [articlesModalState, setArticlesModalState] = useState({
    isOpen: false,
    isLoading: false,
    error: '',
    user: null,
    registration: null,
    papers: [],
  });
  const [paymentReviewState, setPaymentReviewState] = useState({
    isOpen: false,
    isLoading: false,
    isSubmitting: false,
    isProofLoading: false,
    error: '',
    success: '',
    user: null,
    registration: null,
    payments: [],
    selectedPaymentId: null,
    proofAccess: null,
    paymentLink: '',
    reviewedAmount: '',
    rejectionReason: '',
  });

  useEffect(() => {
    let isMounted = true;

    async function loadUsers() {
      try {
        setIsLoading(true);
        setError('');
        const response = await dashboardService.getAdminUsers({
          page: currentPage,
          pageSize: PAGE_SIZE,
          filters: appliedFilters,
        });

        if (!isMounted) {
          return;
        }

        setUsers(response.users || []);
        setPagination(
          response.pagination || {
            page: currentPage,
            pageSize: PAGE_SIZE,
            totalItems: response.users?.length || 0,
            totalPages: 1,
          },
        );
      } catch (loadError) {
        if (!isMounted) {
          return;
        }

        setError(
          loadError?.response?.data?.message ||
            loadError?.message ||
            'No fue posible cargar el consolidado de usuarios.',
        );
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadUsers();

    return () => {
      isMounted = false;
    };
  }, [appliedFilters, currentPage]);

  const countryOptions = useMemo(
    () => buildDistinctOptions(users.map((user) => resolveCountryName(user))),
    [users],
  );

  const cityOptions = useMemo(
    () => buildDistinctOptions(users.map((user) => user.city || '')),
    [users],
  );

  const occupationOptions = useMemo(
    () => buildDistinctOptions(users.map((user) => translateOccupation(user.occupation))),
    [users],
  );

  const attendanceOptions = useMemo(
    () => buildDistinctOptions(users.map((user) => translateAttendanceType(resolvePrimaryRegistration(user)?.attendanceType))),
    [users],
  );

  const booleanOptions = [
    { value: 'true', label: 'Si' },
    { value: 'false', label: 'No' },
  ];
  const selectedReviewedPayment = resolveSelectedPayment(paymentReviewState);
  const isResolvedPayment = isPaymentResolved(selectedReviewedPayment);
  const isRejectedPayment = isPaymentRejected(selectedReviewedPayment);
  const isApprovedPayment = isPaymentApproved(selectedReviewedPayment);
  const isCancelledPayment = isPaymentCancelled(selectedReviewedPayment);
  const canSendSelectedPayPhoneLink = canSendPayPhoneLink(selectedReviewedPayment);
  const canValidateSelectedPayment = canValidatePayment(selectedReviewedPayment);
  const canCancelSelectedPayment = canCancelPayment(selectedReviewedPayment);

  if (isLoading) {
    return (
      <section className="container-shell py-16">
        <Alert
          title="Cargando consolidado de usuarios"
          description="Consultando los datos completos de participantes desde el backend."
          variant="info"
        />
      </section>
    );
  }

  if (error) {
    return (
      <section className="container-shell py-16">
        <Alert title="No fue posible cargar la vista" description={error} variant="danger" />
      </section>
    );
  }

  return (
    <section className="container-shell py-16">
      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-600">
          Vista administrativa
        </p>
        <h1 className="mt-3 text-4xl font-semibold text-slate-950">
          Detalle completo de participantes
        </h1>
        <p className="mt-4 max-w-4xl text-sm leading-7 text-slate-600">
          Consulta los datos personales y de inscripcion en una sola tabla, con filtros de apoyo
          para seguimiento administrativo y operativo.
        </p>
      </div>

      <Card className="p-8">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <InputField
            label="Buscar"
            placeholder="Nombre, correo, afiliacion o documento"
            value={filters.search}
            onChange={(event) => updateFilter(setFilters, 'search', event.target.value)}
          />
          <SelectField
            label="Pais"
            options={countryOptions}
            value={filters.country}
            onChange={(event) => updateFilter(setFilters, 'country', event.target.value)}
          />
          <SelectField
            label="Ciudad"
            options={cityOptions}
            value={filters.city}
            onChange={(event) => updateFilter(setFilters, 'city', event.target.value)}
          />
          <SelectField
            label="Ocupacion"
            options={occupationOptions}
            value={filters.occupation}
            onChange={(event) => updateFilter(setFilters, 'occupation', event.target.value)}
          />
          <SelectField
            label="Tipo de asistencia"
            options={attendanceOptions}
            value={filters.attendanceType}
            onChange={(event) => updateFilter(setFilters, 'attendanceType', event.target.value)}
          />
          <SelectField
            label="Miembro IEEE"
            options={booleanOptions}
            value={filters.isIeeeMember}
            onChange={(event) => updateFilter(setFilters, 'isIeeeMember', event.target.value)}
          />
          <SelectField
            label="Miembro TEMS"
            options={booleanOptions}
            value={filters.isTems}
            onChange={(event) => updateFilter(setFilters, 'isTems', event.target.value)}
          />
          <div className="flex items-end gap-3">
            <Button
              variant="primary"
              className="w-full"
              onClick={() => {
                setCurrentPage(1);
                setAppliedFilters(filters);
              }}
            >
              Aplicar filtros
            </Button>
            <Button
              variant="ghost"
              className="w-full border border-slate-200"
              onClick={() => {
                const clearedFilters = {
                  search: '',
                  country: '',
                  city: '',
                  occupation: '',
                  attendanceType: '',
                  isIeeeMember: '',
                  isTems: '',
                };
                setFilters(clearedFilters);
                setAppliedFilters(clearedFilters);
                setCurrentPage(1);
              }}
            >
              Limpiar
            </Button>
          </div>
        </div>

        <div className="mt-6">
          <Table
            allowOverflow
            getRowClassName={(row) =>
              hasAdministrativePendingPayment(row)
                ? 'bg-amber-50/70'
                : ''
            }
            columns={[
              { key: 'id', label: 'ID' },
              {
                key: 'fullName',
                label: 'Nombre completo',
                render: (_, row) => (
                  <div className="min-w-[12rem]">
                    {`${row.firstName || ''} ${row.lastName || ''}`.trim() || 'No registrado'}
                  </div>
                ),
              },
              { key: 'email', label: 'Correo' },
              {
                key: 'country',
                label: 'Pais',
                render: (_, row) => resolveCountryName(row) || 'No registrado',
              },
              { key: 'city', label: 'Ciudad' },
              { key: 'affiliation', label: 'Afiliacion' },
              {
                key: 'occupation',
                label: 'Ocupacion',
                render: (value) => translateOccupation(value),
              },
              {
                key: 'gender',
                label: 'Genero',
                render: (value) => translateGender(value),
              },
              {
                key: 'docType',
                label: 'Documento',
                render: (value, row) => (
                  <div className="min-w-[12rem]">
                    {`${translateDocumentType(value)}${row.docNumber ? ` - ${row.docNumber}` : ''}`}
                  </div>
                ),
              },
              { key: 'phoneNumber', label: 'Telefono' },
              {
                key: 'isIeeeMember',
                label: 'Miembro IEEE',
                render: (_, row) => (resolvePrimaryRegistration(row)?.isIeeeMember ? 'Si' : 'No'),
              },
              {
                key: 'isTems',
                label: 'Miembro TEMS',
                render: (_, row) => (resolvePrimaryRegistration(row)?.isTems ? 'Si' : 'No'),
              },
              {
                key: 'membershipNumber',
                label: 'Membresia',
                render: (_, row) => resolvePrimaryRegistration(row)?.membershipNumber || 'No aplica',
              },
              {
                key: 'attendanceType',
                label: 'Asistencia',
                render: (_, row) =>
                  translateAttendanceType(resolvePrimaryRegistration(row)?.attendanceType),
              },
              {
                key: 'actions',
                label: 'Acciones',
                render: (_, row) => (
                  <button
                    type="button"
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-lg font-semibold text-slate-700 transition hover:bg-slate-100"
                    onClick={() => setSelectedUser(row)}
                  >
                    ...
                  </button>
                ),
              },
            ]}
            rows={users}
            emptyMessage="No hay participantes que coincidan con los filtros aplicados."
          />
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
          <p className="text-sm text-slate-500">
            Mostrando pagina {pagination.page} de {pagination.totalPages}. Total de registros:{' '}
            {pagination.totalItems}
          </p>
          <div className="flex gap-3">
            <Button
              variant="ghost"
              className="border border-slate-200"
              disabled={pagination.page <= 1}
              onClick={() => setCurrentPage((page) => Math.max(page - 1, 1))}
            >
              Anterior
            </Button>
            <Button
              variant="ghost"
              className="border border-slate-200"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => setCurrentPage((page) => Math.min(page + 1, pagination.totalPages))}
            >
              Siguiente
            </Button>
          </div>
        </div>
      </Card>

      <Modal
        isOpen={Boolean(selectedUser)}
        title="Acciones disponibles"
        onClose={() => setSelectedUser(null)}
      >
        <div className="space-y-3">
          <p className="text-sm text-slate-600">
            Selecciona una accion para{' '}
            <span className="font-semibold text-slate-950">
              {selectedUser
                ? `${selectedUser.firstName || ''} ${selectedUser.lastName || ''}`.trim()
                : 'el participante'}
            </span>
            .
          </p>
          <div className="grid gap-2">
            {['Ver detalle del usuario', 'Validar pago', 'Ver articulos', 'Inhabilitar usuario'].map((action) => (
              <button
                key={action}
                type="button"
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-left text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
                onClick={async () => {
                  setSelectedUser(null);
                  if (action === 'Ver detalle del usuario') {
                    if (selectedUser?.id) {
                      navigate(`/admin/users/${selectedUser.id}/registration-details`);
                    }
                    return;
                  }
                  if (action === 'Validar pago') {
                    await openPaymentReviewModal(selectedUser);
                    return;
                  }
                  if (action === 'Ver articulos') {
                    await openArticlesModal(selectedUser);
                    return;
                  }
                  setActionModal({
                    isOpen: true,
                    title: action,
                    user: selectedUser,
                  });
                }}
              >
                {action}
              </button>
            ))}
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={actionModal.isOpen}
        title={actionModal.title}
        onClose={() =>
          setActionModal({
            isOpen: false,
            title: '',
            user: null,
          })
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-slate-600">
            Accion seleccionada para{' '}
            <span className="font-semibold text-slate-950">
              {actionModal.user
                ? `${actionModal.user.firstName || ''} ${actionModal.user.lastName || ''}`.trim()
                : 'el participante'}
            </span>
            .
          </p>
          <p className="text-sm text-slate-500">
            Cuando me detalles el flujo de esta opcion, conecto aqui el contenido y las acciones del
            modal.
          </p>
          <div className="flex justify-end">
            <Button
              variant="primary"
              onClick={() =>
                setActionModal({
                  isOpen: false,
                  title: '',
                  user: null,
                })
              }
            >
              Cerrar
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={articlesModalState.isOpen}
        title="Ver articulos"
        panelClassName="max-w-5xl"
        onClose={() =>
          setArticlesModalState({
            isOpen: false,
            isLoading: false,
            error: '',
            user: null,
            registration: null,
            papers: [],
          })
        }
      >
        {articlesModalState.isLoading ? (
          <Alert
            title="Cargando articulos"
            description="Consultando los articulos registrados por el participante desde el backend."
            variant="info"
          />
        ) : articlesModalState.error ? (
          <Alert title="No fue posible abrir los articulos" description={articlesModalState.error} variant="danger" />
        ) : (
          <div className="space-y-5">
            <p className="text-sm text-slate-600">
              Articulos registrados por{' '}
              <span className="font-semibold text-slate-950">
                {articlesModalState.user
                  ? `${articlesModalState.user.firstName || ''} ${articlesModalState.user.lastName || ''}`.trim()
                  : 'el participante'}
              </span>
              .
            </p>

            {!articlesModalState.papers.length ? (
              <Alert
                title="Sin articulos registrados"
                description="Este participante no tiene articulos asociados a su inscripcion."
                variant="warning"
              />
            ) : (
              <div className="space-y-4">
                {articlesModalState.papers.map((paper, index) => (
                  <div key={paper.id || index} className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Articulo {index + 1}
                        </p>
                        <h3 className="mt-2 text-lg font-semibold text-slate-950">
                          {paper.title || 'Sin titulo'}
                        </h3>
                      </div>
                      <div className="rounded-2xl bg-white px-4 py-3 text-right">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Codigo
                        </p>
                        <p className="mt-2 text-sm font-semibold text-slate-950">
                          {paper.paperCode || 'No registrado'}
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 grid gap-4 md:grid-cols-2">
                      <ReadOnlyCard
                        label="Autores"
                        value={Array.isArray(paper.authors) ? paper.authors.join(', ') : paper.authors}
                      />
                      <ReadOnlyCard label="Paginas" value={paper.pages} />
                    </div>

                    {paper.customFieldValues?.length ? (
                      <div className="mt-5 grid gap-4 md:grid-cols-2">
                        {paper.customFieldValues.map((field) => (
                          <ReadOnlyCard
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
            )}

            <div className="flex justify-end">
              <Button
                variant="primary"
                onClick={() =>
                  setArticlesModalState({
                    isOpen: false,
                    isLoading: false,
                    error: '',
                    user: null,
                    registration: null,
                    papers: [],
                  })
                }
              >
                Cerrar
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={paymentReviewState.isOpen}
        title="Validar pago"
        panelClassName="w-[min(96vw,78rem)] max-w-none"
        onClose={() =>
          setPaymentReviewState({
            isOpen: false,
            isLoading: false,
            isSubmitting: false,
            isProofLoading: false,
            error: '',
            success: '',
            user: null,
            registration: null,
            payments: [],
            selectedPaymentId: null,
            proofAccess: null,
            reviewedAmount: '',
            rejectionReason: '',
          })
        }
      >
        {paymentReviewState.isLoading ? (
          <Alert
            title="Cargando detalle del pago"
            description="Consultando comprobantes, montos y estado actual desde el backend."
            variant="info"
          />
        ) : paymentReviewState.error && !paymentReviewState.payments.length ? (
          <Alert title="No fue posible abrir la validacion" description={paymentReviewState.error} variant="danger" />
        ) : (
          <div className="space-y-6">
            <div>
              <p className="text-sm text-slate-600">
                Revisa el comprobante y decide si apruebas o rechazas el soporte cargado por{' '}
                <span className="font-semibold text-slate-950">
                  {paymentReviewState.user
                    ? `${paymentReviewState.user.firstName || ''} ${paymentReviewState.user.lastName || ''}`.trim()
                    : 'el participante'}
                </span>
                .
              </p>
            </div>

            {paymentReviewState.error &&
            paymentReviewState.payments.length &&
            !isMissingPaymentProofMessage(paymentReviewState.error) ? (
              <Alert title="Accion no completada" description={paymentReviewState.error} variant="danger" />
            ) : null}
            {paymentReviewState.success ? (
              <Alert title="Pago actualizado" description={paymentReviewState.success} variant="success" />
            ) : null}

            {!paymentReviewState.payments.length ? (
              <Alert
                title="No hay pagos registrados"
                description="Este participante no tiene pagos disponibles para validar."
                variant="warning"
              />
            ) : (
              <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
                <div className="space-y-4">
                  <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Pagos del participante
                    </p>
                    <div className="mt-4 space-y-3">
                      {paymentReviewState.payments.map((payment) => (
                        <button
                          key={payment.id}
                          type="button"
                          onClick={() =>
                            selectPaymentForReview(payment)
                          }
                          className={`w-full rounded-2xl border px-4 py-4 text-left transition ${
                            paymentReviewState.selectedPaymentId === payment.id
                              ? 'border-brand-300 bg-white shadow-[0_12px_30px_rgba(37,82,134,0.08)]'
                              : 'border-slate-200 bg-white hover:bg-slate-100'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p className="text-sm font-semibold text-slate-950">
                                Pago #{payment.id}
                              </p>
                              <p className="mt-1 text-sm text-slate-600">
                                {formatMethod(payment.paymentMethod)} · {formatCurrency(payment.amountUsd || 0)}
                              </p>
                            </div>
                            <StatusBadge
                              status={payment.status}
                              label={translatePaymentStatus(payment.status)}
                            />
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5">
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Resumen de revision
                    </p>
                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                      <ReviewItem
                        label="Inscripcion"
                        value={paymentReviewState.registration?.id || 'No registrada'}
                      />
                      <ReviewItem
                        label="Saldo pendiente"
                        value={formatCurrency(
                          paymentReviewState.registration?.paymentSummary?.pendingAmount ||
                            paymentReviewState.registration?.pendingAmount ||
                            0,
                        )}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5">
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Comprobante cargado
                    </p>
                    <div className="mt-4">
                      <PaymentProofViewer
                        payment={resolveSelectedPayment(paymentReviewState)}
                        proofAccess={paymentReviewState.proofAccess}
                        isLoading={paymentReviewState.isProofLoading}
                      />
                    </div>
                  </div>

                  <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5">
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Validacion administrativa
                    </p>
                    {isResolvedPayment ? (
                      <div className="mt-4 space-y-4">
                        {isApprovedPayment ? (
                          <ReviewItem
                            label="Valor aprobado"
                            value={formatCurrency(
                              Number(selectedReviewedPayment?.amountUsd || 0),
                            )}
                          />
                        ) : null}
                        {isRejectedPayment ? (
                          <div className="rounded-2xl bg-rose-50 px-4 py-4">
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-rose-700">
                              Motivo de rechazo
                            </p>
                            <p className="mt-2 text-sm font-medium text-rose-900">
                              {selectedReviewedPayment?.rejectionReason || 'No registrado'}
                            </p>
                          </div>
                        ) : null}
                        {isCancelledPayment ? (
                          <div className="rounded-2xl bg-slate-100 px-4 py-4">
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
                              Estado final
                            </p>
                            <p className="mt-2 text-sm font-medium text-slate-900">
                              Este pago fue cancelado administrativamente.
                            </p>
                          </div>
                        ) : null}
                        <p className="text-sm text-slate-500">
                          Este pago ya tiene una decision administrativa tomada y no admite una
                          nueva accion desde esta pantalla.
                        </p>
                        {canCancelSelectedPayment ? (
                          <div className="flex justify-end">
                            <Button
                              variant="ghost"
                              className="border border-rose-200 text-rose-700 hover:bg-rose-50"
                              onClick={async () => {
                                const selectedPayment = resolveSelectedPayment(paymentReviewState);

                                if (!selectedPayment?.id) {
                                  return;
                                }

                                try {
                                  setPaymentReviewState((current) => ({
                                    ...current,
                                    isSubmitting: true,
                                    error: '',
                                    success: '',
                                  }));

                                  await paymentService.cancelPayment(selectedPayment.id);

                                  await openPaymentReviewModal(paymentReviewState.user, selectedPayment.id);
                                  setPaymentReviewState((current) => ({
                                    ...current,
                                    success: 'El pago fue cancelado correctamente.',
                                  }));
                                } catch (error) {
                                  setPaymentReviewState((current) => ({
                                    ...current,
                                    isSubmitting: false,
                                    error:
                                      error?.response?.data?.message ||
                                      error?.message ||
                                      'No fue posible cancelar el pago.',
                                    success: '',
                                  }));
                                }
                              }}
                              disabled={paymentReviewState.isSubmitting}
                            >
                              {paymentReviewState.isSubmitting ? 'Procesando...' : 'Cancelar pago'}
                            </Button>
                          </div>
                        ) : null}
                      </div>
                    ) : canValidateSelectedPayment ? (
                      <>
                        <div className="mt-4 grid gap-4">
                          <InputField
                            label="Valor verificado"
                            type="number"
                            step="0.01"
                            value={paymentReviewState.reviewedAmount}
                            onChange={(event) =>
                              setPaymentReviewState((current) => ({
                                ...current,
                                reviewedAmount: event.target.value,
                              }))
                            }
                            helperText="Este valor queda listo para conectarse al backend si desean guardar el monto validado por el administrador."
                          />
                          <TextAreaField
                            label="Motivo de rechazo"
                            placeholder="Describe por que el comprobante no es valido o que debe corregir el participante."
                            value={paymentReviewState.rejectionReason}
                            onChange={(event) =>
                              setPaymentReviewState((current) => ({
                                ...current,
                                rejectionReason: event.target.value,
                              }))
                            }
                          />
                        </div>

                        <div className="mt-6 flex flex-wrap justify-end gap-3">
                          <Button
                            variant="ghost"
                            className="border border-rose-200 text-rose-700 hover:bg-rose-50"
                            onClick={async () => {
                              const selectedPayment = resolveSelectedPayment(paymentReviewState);

                              if (!selectedPayment?.id) {
                                return;
                              }

                              try {
                                setPaymentReviewState((current) => ({
                                  ...current,
                                  isSubmitting: true,
                                  error: '',
                                  success: '',
                                }));

                                await paymentService.cancelPayment(selectedPayment.id);

                                await openPaymentReviewModal(paymentReviewState.user, selectedPayment.id);
                                setPaymentReviewState((current) => ({
                                  ...current,
                                  success: 'El pago fue cancelado correctamente.',
                                }));
                              } catch (error) {
                                setPaymentReviewState((current) => ({
                                  ...current,
                                  isSubmitting: false,
                                  error:
                                    error?.response?.data?.message ||
                                    error?.message ||
                                    'No fue posible cancelar el pago.',
                                  success: '',
                                }));
                              }
                            }}
                            disabled={paymentReviewState.isSubmitting}
                          >
                            {paymentReviewState.isSubmitting ? 'Procesando...' : 'Cancelar pago'}
                          </Button>
                          <Button
                            variant="ghost"
                            className="border border-slate-200"
                            onClick={async () => {
                              const selectedPayment = resolveSelectedPayment(paymentReviewState);

                              if (!selectedPayment?.id) {
                                return;
                              }

                              if (!paymentReviewState.rejectionReason.trim()) {
                                setPaymentReviewState((current) => ({
                                  ...current,
                                  error: 'Debes escribir el motivo de rechazo antes de continuar.',
                                  success: '',
                                }));
                                return;
                              }

                              try {
                                setPaymentReviewState((current) => ({
                                  ...current,
                                  isSubmitting: true,
                                  error: '',
                                  success: '',
                                }));

                                await paymentService.rejectPayment(selectedPayment.id, {
                                  rejectionReason: paymentReviewState.rejectionReason.trim(),
                                  reviewedAmount: paymentReviewState.reviewedAmount
                                    ? Number(paymentReviewState.reviewedAmount)
                                    : undefined,
                                });

                                await openPaymentReviewModal(paymentReviewState.user, selectedPayment.id);
                                setPaymentReviewState((current) => ({
                                  ...current,
                                  success: 'El pago fue rechazado correctamente.',
                                }));
                              } catch (error) {
                                setPaymentReviewState((current) => ({
                                  ...current,
                                  isSubmitting: false,
                                  error:
                                    error?.response?.data?.message ||
                                    error?.message ||
                                    'No fue posible rechazar el pago.',
                                  success: '',
                                }));
                              }
                            }}
                            disabled={paymentReviewState.isSubmitting}
                          >
                            {paymentReviewState.isSubmitting ? 'Procesando...' : 'Rechazar soporte'}
                          </Button>
                          <Button
                            variant="primary"
                            onClick={async () => {
                              const selectedPayment = resolveSelectedPayment(paymentReviewState);

                              if (!selectedPayment?.id) {
                                return;
                              }

                              try {
                                setPaymentReviewState((current) => ({
                                  ...current,
                                  isSubmitting: true,
                                  error: '',
                                  success: '',
                                }));

                                await paymentService.approvePayment(selectedPayment.id, {
                                  reviewedAmount: paymentReviewState.reviewedAmount
                                    ? Number(paymentReviewState.reviewedAmount)
                                    : undefined,
                                });

                                await openPaymentReviewModal(paymentReviewState.user, selectedPayment.id);
                                setPaymentReviewState((current) => ({
                                  ...current,
                                  success: 'El pago fue aprobado correctamente.',
                                }));
                              } catch (error) {
                                setPaymentReviewState((current) => ({
                                  ...current,
                                  isSubmitting: false,
                                  error:
                                    error?.response?.data?.message ||
                                    error?.message ||
                                    'No fue posible aprobar el pago.',
                                  success: '',
                                }));
                              }
                            }}
                            disabled={paymentReviewState.isSubmitting}
                          >
                            {paymentReviewState.isSubmitting ? 'Procesando...' : 'Validar pago'}
                          </Button>
                        </div>
                      </>
                    ) : (
                      <div className="mt-4 space-y-4">
                        {canSendSelectedPayPhoneLink ? (
                          <Alert
                            title="Pendiente de envío de link"
                            description="Este pago PayPhone fue registrado por el participante y está esperando que administración envíe el link de pago."
                            variant="info"
                          />
                        ) : (
                          <Alert
                            title="Pendiente de pago"
                            description="Todavía no hay un comprobante listo para validación. Cuando el participante cargue el soporte, el estado cambiará a pendiente de validación."
                            variant="warning"
                          />
                        )}

                        {canSendSelectedPayPhoneLink ? (
                          <InputField
                            label="Link de pago"
                            placeholder="https://..."
                            value={paymentReviewState.paymentLink}
                            onChange={(event) =>
                              setPaymentReviewState((current) => ({
                                ...current,
                                paymentLink: event.target.value,
                                error: '',
                                success: '',
                              }))
                            }
                            helperText="Pega aqui el enlace que recibira el participante por correo."
                          />
                        ) : null}

                        <div className="flex flex-wrap justify-end gap-3">
                          {canSendSelectedPayPhoneLink ? (
                            <Button
                              variant="primary"
                              onClick={async () => {
                                const selectedPayment = resolveSelectedPayment(paymentReviewState);
                                const normalizedPaymentLink = paymentReviewState.paymentLink.trim();

                                if (!selectedPayment?.id) {
                                  return;
                                }

                                if (!normalizedPaymentLink) {
                                  setPaymentReviewState((current) => ({
                                    ...current,
                                    error: 'Debes pegar el link de pago antes de enviarlo.',
                                    success: '',
                                  }));
                                  return;
                                }

                                try {
                                  setPaymentReviewState((current) => ({
                                    ...current,
                                    isSubmitting: true,
                                    error: '',
                                    success: '',
                                  }));

                                  await paymentService.sendPayPhoneLink(selectedPayment.id, {
                                    paymentLink: normalizedPaymentLink,
                                  });

                                  await openPaymentReviewModal(paymentReviewState.user, selectedPayment.id);
                                  setPaymentReviewState((current) => ({
                                    ...current,
                                    success:
                                      'El link de PayPhone fue marcado como enviado. Estado actual: pendiente de pago.',
                                  }));
                                } catch (error) {
                                  setPaymentReviewState((current) => ({
                                    ...current,
                                    isSubmitting: false,
                                    error:
                                      error?.response?.data?.message ||
                                      error?.message ||
                                      'No fue posible marcar el envío del link PayPhone.',
                                    success: '',
                                  }));
                                }
                              }}
                              disabled={paymentReviewState.isSubmitting}
                            >
                              {paymentReviewState.isSubmitting ? 'Procesando...' : 'Enviar link'}
                            </Button>
                          ) : null}
                          {canCancelSelectedPayment ? (
                            <Button
                              variant="ghost"
                              className="border border-rose-200 text-rose-700 hover:bg-rose-50"
                              onClick={async () => {
                                const selectedPayment = resolveSelectedPayment(paymentReviewState);

                                if (!selectedPayment?.id) {
                                  return;
                                }

                                try {
                                  setPaymentReviewState((current) => ({
                                    ...current,
                                    isSubmitting: true,
                                    error: '',
                                    success: '',
                                  }));

                                  await paymentService.cancelPayment(selectedPayment.id);

                                  await openPaymentReviewModal(paymentReviewState.user, selectedPayment.id);
                                  setPaymentReviewState((current) => ({
                                    ...current,
                                    success: 'El pago fue cancelado correctamente.',
                                  }));
                                } catch (error) {
                                  setPaymentReviewState((current) => ({
                                    ...current,
                                    isSubmitting: false,
                                    error:
                                      error?.response?.data?.message ||
                                      error?.message ||
                                      'No fue posible cancelar el pago.',
                                    success: '',
                                  }));
                                }
                              }}
                              disabled={paymentReviewState.isSubmitting}
                            >
                              {paymentReviewState.isSubmitting ? 'Procesando...' : 'Cancelar pago'}
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </section>
  );

  async function openPaymentReviewModal(user, preferredPaymentId = null) {
    if (!user?.id) {
      return;
    }

    try {
      setPaymentReviewState({
        isOpen: true,
            isLoading: true,
            isSubmitting: false,
            isProofLoading: false,
            error: '',
            success: '',
            user,
            registration: null,
            payments: [],
            selectedPaymentId: null,
            proofAccess: null,
            paymentLink: '',
            reviewedAmount: '',
            rejectionReason: '',
          });

      const response = await dashboardService.getAdminUserRegistrationDetails(user.id);
      const registration = response.registrations?.[0] || null;
      const payments = [...(registration?.payments || [])].sort((a, b) => {
        const left = new Date(b.createdAt || 0).getTime();
        const right = new Date(a.createdAt || 0).getTime();
        return left - right;
      });
      const selectedPayment =
        payments.find((payment) => String(payment.id) === String(preferredPaymentId)) ||
        payments[0] ||
        null;

      setPaymentReviewState({
        isOpen: true,
        isLoading: false,
        isSubmitting: false,
        isProofLoading: false,
        error: '',
        success: '',
        user,
        registration,
        payments,
        selectedPaymentId: selectedPayment?.id || null,
        proofAccess: null,
        paymentLink: selectedPayment?.paymentUrl || '',
        reviewedAmount: selectedPayment?.amountUsd ? String(selectedPayment.amountUsd) : '',
        rejectionReason: '',
      });
      if (selectedPayment?.id) {
        await loadPaymentProofAccess(selectedPayment.id);
      }
    } catch (error) {
      setPaymentReviewState({
        isOpen: true,
        isLoading: false,
        isSubmitting: false,
        isProofLoading: false,
        error:
          error?.response?.data?.message ||
          error?.message ||
          'No fue posible cargar el detalle de pagos del participante.',
        success: '',
        user,
        registration: null,
        payments: [],
        selectedPaymentId: null,
        proofAccess: null,
        paymentLink: '',
        reviewedAmount: '',
        rejectionReason: '',
      });
    }
  }

  async function openArticlesModal(user) {
    if (!user?.id) {
      return;
    }

    try {
      setArticlesModalState({
        isOpen: true,
        isLoading: true,
        error: '',
        user,
        registration: null,
        papers: [],
      });

      const response = await dashboardService.getAdminUserRegistrationDetails(user.id);
      const registration = response.registrations?.[0] || null;

      setArticlesModalState({
        isOpen: true,
        isLoading: false,
        error: '',
        user,
        registration,
        papers: registration?.papers || [],
      });
    } catch (error) {
      setArticlesModalState({
        isOpen: true,
        isLoading: false,
        error:
          error?.response?.data?.message ||
          error?.message ||
          'No fue posible cargar los articulos del participante.',
        user,
        registration: null,
        papers: [],
      });
    }
  }

  async function selectPaymentForReview(payment) {
    setPaymentReviewState((current) => ({
      ...current,
      selectedPaymentId: payment.id,
      proofAccess: null,
      paymentLink: payment.paymentUrl || '',
      reviewedAmount: String(payment.amountUsd || ''),
      rejectionReason: '',
      error: '',
      success: '',
    }));

    await loadPaymentProofAccess(payment.id);
  }

  async function loadPaymentProofAccess(paymentId) {
    try {
      setPaymentReviewState((current) => ({
        ...current,
        isProofLoading: true,
        error: '',
      }));

      const response = await paymentService.getPaymentProofAccess(paymentId);

      setPaymentReviewState((current) => ({
        ...current,
        isProofLoading: false,
        proofAccess: response.proofAccess,
      }));
    } catch (error) {
      setPaymentReviewState((current) => ({
        ...current,
        isProofLoading: false,
        proofAccess: null,
        error:
          error?.response?.data?.message ||
          error?.message ||
          'No fue posible obtener el acceso al comprobante.',
      }));
    }
  }
}

function updateFilter(setFilters, key, value) {
  setFilters((current) => ({
    ...current,
    [key]: value,
  }));
}

function buildDistinctOptions(values) {
  return [...new Set(values.filter(Boolean))]
    .sort((a, b) => a.localeCompare(b))
    .map((value) => ({
      value,
      label: value,
    }));
}

function resolveCountryName(user) {
  if (user?.country?.name) {
    return user.country.name;
  }

  if (typeof user?.country === 'string' && user.country.trim()) {
    return user.country;
  }

  return '';
}

function resolvePrimaryRegistration(user) {
  return user?.registrations?.[0] || null;
}

function hasAdministrativePendingPayment(user) {
  const payments = resolvePrimaryRegistration(user)?.payments || [];

  return payments.some(
    (payment) => isPaymentPendingValidation(payment) || isPaymentPendingLink(payment),
  );
}

function resolveSelectedPayment(paymentReviewState) {
  return (
    paymentReviewState.payments.find(
      (payment) => String(payment.id) === String(paymentReviewState.selectedPaymentId),
    ) || null
  );
}

function formatMethod(value) {
  const map = {
    bank_transfer: 'Transferencia bancaria',
    paypal: 'PayPal',
    payphone: 'PayPhone',
  };

  return map[value] || value || 'No registrado';
}

function isPaymentApproved(payment) {
  return ['approved', 'accepted', 'paid'].includes(
    String(payment?.status || '').toLowerCase(),
  );
}

function isPaymentRejected(payment) {
  return ['rejected'].includes(
    String(payment?.status || '').toLowerCase(),
  );
}

function isPaymentCancelled(payment) {
  return ['cancelled', 'canceled'].includes(String(payment?.status || '').toLowerCase());
}

function isPaymentResolved(payment) {
  return isPaymentApproved(payment) || isPaymentRejected(payment) || isPaymentCancelled(payment);
}

function isPaymentPendingValidation(payment) {
  return String(payment?.status || '').toLowerCase() === 'pending_validation';
}

function isPaymentPendingLink(payment) {
  return (
    String(payment?.status || '').toLowerCase() === 'pending_link' &&
    String(payment?.paymentMethod || '').toLowerCase() === 'payphone'
  );
}

function canSendPayPhoneLink(payment) {
  return isPaymentPendingLink(payment);
}

function canValidatePayment(payment) {
  return isPaymentPendingValidation(payment);
}

function canCancelPayment(payment) {
  if (!payment) {
    return false;
  }

  const normalizedStatus = String(payment.status || '').toLowerCase();
  return !['approved', 'paid', 'accepted', 'cancelled', 'canceled'].includes(normalizedStatus);
}

function ReviewItem({ label, value }) {
  return (
    <div className="rounded-2xl bg-slate-50 px-4 py-4">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function ReadOnlyCard({ label, value }) {
  return (
    <div className="rounded-2xl bg-white px-4 py-4">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-medium text-slate-950">{value || 'No registrado'}</p>
    </div>
  );
}

function PaymentProofViewer({ payment, proofAccess, isLoading }) {
  if (isLoading) {
    return (
      <Alert
        title="Cargando comprobante"
        description="Solicitando acceso temporal al archivo desde el backend."
        variant="info"
      />
    );
  }

  if (!payment) {
    return (
      <Alert
        title="Selecciona un pago"
        description="Elige uno de los pagos del lado izquierdo para revisar su comprobante."
        variant="info"
      />
    );
  }

  const proofUrl = proofAccess?.signedUrl || proofAccess?.publicUrl || payment.paymentProofUrl || null;

  if (!proofUrl) {
    return (
      <Alert
        title="No hay comprobante disponible"
        description="Este pago no tiene un soporte cargado por el participante."
        variant="warning"
      />
    );
  }

  const mimeType = proofAccess?.mimeType || payment.paymentProofMimeType || '';
  const originalName = proofAccess?.originalName || payment.paymentProofFilename || 'comprobante';
  const size = proofAccess?.size || null;
  const isPdf = mimeType === 'application/pdf' || /\.pdf($|\?)/i.test(proofUrl);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
        {isPdf ? (
          <iframe
            title={`Comprobante de pago ${payment.id}`}
            src={proofUrl}
            className="h-[28rem] w-full rounded-xl bg-white"
          />
        ) : (
          <img
            src={proofUrl}
            alt={`Comprobante de pago ${payment.id}`}
            className="max-h-[28rem] w-full rounded-xl object-contain bg-white"
          />
        )}
      </div>
      <a
        href={proofUrl}
        target="_blank"
        rel="noreferrer"
        className="inline-flex text-sm font-semibold text-brand-700 transition hover:text-brand-900"
      >
        Abrir comprobante en una pestaña nueva
      </a>
    </div>
  );
}

function isMissingPaymentProofMessage(message) {
  const normalizedMessage = String(message || '').toLowerCase();

  return (
    normalizedMessage.includes('payment proof not found') ||
    normalizedMessage.includes('proof not found') ||
    normalizedMessage.includes('no hay comprobante') ||
    normalizedMessage.includes('comprobante no encontrado') ||
    normalizedMessage.includes('soporte no encontrado')
  );
}

export default AdminUsersOverviewPage;
