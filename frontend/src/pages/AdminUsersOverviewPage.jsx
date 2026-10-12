import { getPaymentReviewAmounts, formatReviewMoney } from '../utils/paymentReview';
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
  const [allUsers, setAllUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    search: '',
    country: '',
    city: '',
    occupation: '',
    attendanceType: '',
    isIeeeMember: '',
    active: 'true',
    paymentStatus: '',
  });
  const [appliedFilters, setAppliedFilters] = useState({
    search: '',
    country: '',
    city: '',
    occupation: '',
    attendanceType: '',
    isIeeeMember: '',
    active: 'true',
    paymentStatus: '',
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState(null);
  const [actionModal, setActionModal] = useState({
    isOpen: false,
    title: '',
    user: null,
    actionType: '',
    isSubmitting: false,
    error: '',
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
          filters: {
            active: appliedFilters.active,
          },
        });

        if (!isMounted) {
          return;
        }

        setAllUsers(response.users || []);
      } catch (loadError) {
        if (!isMounted) {
          return;
        }

        setError(
          loadError?.response?.data?.message ||
            loadError?.message ||
            "Unable to load the participant overview.",
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
  }, [appliedFilters.active]);

  const filteredUsers = useMemo(
    () => applyAdminUserFilters(allUsers, appliedFilters),
    [allUsers, appliedFilters],
  );

  const pagination = useMemo(() => {
    const totalItems = filteredUsers.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
    const safePage = Math.min(currentPage, totalPages);

    return {
      page: safePage,
      pageSize: PAGE_SIZE,
      totalItems,
      totalPages,
    };
  }, [currentPage, filteredUsers.length]);

  const users = useMemo(() => {
    const startIndex = (pagination.page - 1) * PAGE_SIZE;
    return filteredUsers.slice(startIndex, startIndex + PAGE_SIZE);
  }, [filteredUsers, pagination.page]);

  useEffect(() => {
    if (currentPage > pagination.totalPages) {
      setCurrentPage(pagination.totalPages);
    }
  }, [currentPage, pagination.totalPages]);

  const countryOptions = useMemo(
    () => buildDistinctOptions(allUsers.map((user) => resolveCountryName(user))),
    [allUsers],
  );

  const cityOptions = useMemo(
    () => buildDistinctOptions(allUsers.map((user) => user.city || '')),
    [allUsers],
  );

  const occupationOptions = useMemo(
    () => buildDistinctOptions(allUsers.map((user) => translateOccupation(user.occupation))),
    [allUsers],
  );

  const attendanceOptions = useMemo(
    () =>
      buildDistinctOptions(
        allUsers.map((user) =>
          translateAttendanceType(resolvePrimaryRegistration(user)?.attendanceType),
        ),
      ),
    [allUsers],
  );
  const paymentStatusOptions = useMemo(
    () =>
      buildDistinctOptions(
        allUsers.map((user) => resolveLatestPaymentStatusLabel(user?.latestPaymentStatus)),
      ),
    [allUsers],
  );

  const booleanOptions = [
    { value: 'true', label: "Yes" },
    { value: 'false', label: 'No' },
  ];
  const activityOptions = [
    { value: 'true', label: "Active" },
    { value: 'false', label: "Inactive" },
    { value: 'all', label: "All" },
  ];
  const [reviewCurrency, setReviewCurrency] = useState('USD');
  useEffect(() => { setReviewCurrency('USD'); }, [paymentReviewState.selectedPaymentId, paymentReviewState.isOpen]);
  const selectedReviewedPayment = resolveSelectedPayment(paymentReviewState);
  const reviewAmounts = getPaymentReviewAmounts(selectedReviewedPayment, paymentReviewState.registration, paymentReviewState.reviewedAmount, reviewCurrency);
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
          title="Loading participant overview"
          description="Loading complete participant information."
          variant="info"
        />
      </section>
    );
  }

  if (error) {
    return (
      <section className="container-shell py-16">
        <Alert title="Unable to load this view" description={error} variant="danger" />
      </section>
    );
  }

  return (
    <section className="container-shell py-16">
      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-600">
          Administrative view
        </p>
        <h1 className="mt-3 text-4xl font-semibold text-slate-950">
          Complete participant details
        </h1>
        <p className="mt-4 max-w-4xl text-sm leading-7 text-slate-600">
          Review personal and registration information in one table, with filters for administrative and operational follow-up.
        </p>
      </div>

      <Card className="p-8">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <InputField
            label="Search"
            placeholder="Name, email, affiliation or ID number"
            value={filters.search}
            onChange={(event) => updateFilter(setFilters, 'search', event.target.value)}
          />
          <SelectField
            label="Country"
            options={countryOptions}
            value={filters.country}
            onChange={(event) => updateFilter(setFilters, 'country', event.target.value)}
          />
          <SelectField
            label="City"
            options={cityOptions}
            value={filters.city}
            onChange={(event) => updateFilter(setFilters, 'city', event.target.value)}
          />
          <SelectField
            label="Occupation"
            options={occupationOptions}
            value={filters.occupation}
            onChange={(event) => updateFilter(setFilters, 'occupation', event.target.value)}
          />
          <SelectField
            label="Attendance type"
            options={attendanceOptions}
            value={filters.attendanceType}
            onChange={(event) => updateFilter(setFilters, 'attendanceType', event.target.value)}
          />
          <SelectField
            label="IEEE member"
            options={booleanOptions}
            value={filters.isIeeeMember}
            onChange={(event) => updateFilter(setFilters, 'isIeeeMember', event.target.value)}
          />
          <SelectField
            label="Account status"
            options={activityOptions}
            value={filters.active}
            onChange={(event) => updateFilter(setFilters, 'active', event.target.value)}
          />
          <SelectField
            label="Payment status"
            options={paymentStatusOptions}
            value={filters.paymentStatus}
            onChange={(event) => updateFilter(setFilters, 'paymentStatus', event.target.value)}
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
              Apply filters
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
                  active: 'true',
                  paymentStatus: '',
                };
                setFilters(clearedFilters);
                setAppliedFilters(clearedFilters);
                setCurrentPage(1);
              }}
            >
              Clear
            </Button>
          </div>
        </div>

        <div className="mt-6">
          <Table
            allowOverflow
            getRowClassName={resolveUserRowClassName}
            columns={[
              { key: 'id', label: 'ID' },
              {
                key: 'active',
                label: "Status",
                render: (value) => (
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${
                      value
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-rose-100 text-rose-700'
                    }`}
                  >
                    {value ? "Active" : "Inactive"}
                  </span>
                ),
              },
              {
                key: 'latestPaymentStatus',
                label: "Payment status",
                render: (value) => <PaymentStatusCell status={value} />,
              },
              {
                key: 'fullName',
                label: "Full name",
                render: (_, row) => (
                  <div className="min-w-[12rem]">
                    {`${row.firstName || ''} ${row.lastName || ''}`.trim() || "Not provided"}
                  </div>
                ),
              },
              { key: 'email', label: "Email" },
              {
                key: 'country',
                label: "Country",
                render: (_, row) => resolveCountryName(row) || "Not provided",
              },
              { key: 'city', label: "City" },
              { key: 'affiliation', label: "Affiliation" },
              {
                key: 'occupation',
                label: "Occupation",
                render: (value) => translateOccupation(value),
              },
              {
                key: 'gender',
                label: "Gender",
                render: (value) => translateGender(value),
              },
              {
                key: 'docType',
                label: "ID document",
                render: (value, row) => (
                  <div className="min-w-[12rem]">
                    {`${translateDocumentType(value)}${row.docNumber ? ` - ${row.docNumber}` : ''}`}
                  </div>
                ),
              },
              { key: 'phoneNumber', label: "Phone" },
              {
                key: 'isIeeeMember',
                label: "IEEE member",
                render: (_, row) => (resolvePrimaryRegistration(row)?.isIeeeMember ? "Yes" : 'No'),
              },
              {
                key: 'membershipNumber',
                label: "Membership",
                render: (_, row) => resolvePrimaryRegistration(row)?.membershipNumber || "Not applicable",
              },
              {
                key: 'attendanceType',
                label: "Attendance",
                render: (_, row) =>
                  translateAttendanceType(resolvePrimaryRegistration(row)?.attendanceType),
              },
              {
                key: 'actions',
                label: "Actions",
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
            emptyMessage="No participants match the selected filters."
          />
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
          <p className="text-sm text-slate-500">
            Page {pagination.page} of {pagination.totalPages}. Total records:{' '}
            {pagination.totalItems}
          </p>
          <div className="flex gap-3">
            <Button
              variant="ghost"
              className="border border-slate-200"
              disabled={pagination.page <= 1}
              onClick={() => setCurrentPage((page) => Math.max(page - 1, 1))}
            >
              Previous
            </Button>
            <Button
              variant="ghost"
              className="border border-slate-200"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => setCurrentPage((page) => Math.min(page + 1, pagination.totalPages))}
            >
              Next
            </Button>
          </div>
        </div>
      </Card>

      <Modal
        isOpen={Boolean(selectedUser)}
        title="Available actions"
        onClose={() => setSelectedUser(null)}
      >
        <div className="space-y-3">
          <p className="text-sm text-slate-600">
            Select an action for{' '}
            <span className="font-semibold text-slate-950">
              {selectedUser
                ? `${selectedUser.firstName || ''} ${selectedUser.lastName || ''}`.trim()
                : "the participant"}
            </span>
            .
          </p>
          <div className="grid gap-2">
            {buildUserActions(selectedUser).map((action) => (
              <button
                key={action.label}
                type="button"
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-left text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
                onClick={async () => {
                  setSelectedUser(null);
                  if (action.type === 'view-details') {
                    if (selectedUser?.id) {
                      navigate(`/admin/users/${selectedUser.id}/registration-details`);
                    }
                    return;
                  }
                  if (action.type === 'review-payments') {
                    await openPaymentReviewModal(selectedUser);
                    return;
                  }
                  if (action.type === 'view-papers') {
                    await openArticlesModal(selectedUser);
                    return;
                  }
                  setActionModal({
                    isOpen: true,
                    title: action.label,
                    user: selectedUser,
                    actionType: action.type,
                    isSubmitting: false,
                    error: '',
                  });
                }}
              >
                {action.label}
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
            actionType: '',
            isSubmitting: false,
            error: '',
          })
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-slate-600">
            Selected action for{' '}
            <span className="font-semibold text-slate-950">
              {actionModal.user
                ? `${actionModal.user.firstName || ''} ${actionModal.user.lastName || ''}`.trim()
                : "the participant"}
            </span>
            .
          </p>
          {actionModal.error ? (
            <Alert title="Unable to update the user" description={actionModal.error} variant="danger" />
          ) : null}
          <p className="text-sm text-slate-500">
            {actionModal.actionType === 'deactivate-user'
              ? "The user will lose access to the platform until an administrator enables the account again."
              : "The user will regain access to the platform immediately after this action."}
          </p>
          <div className="flex justify-end gap-3">
            <Button
              variant="ghost"
              className="border border-slate-200"
              onClick={() =>
                setActionModal({
                  isOpen: false,
                  title: '',
                  user: null,
                  actionType: '',
                  isSubmitting: false,
                  error: '',
                })
              }
              disabled={actionModal.isSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={submitUserActiveStatus}
              disabled={actionModal.isSubmitting}
            >
              {actionModal.isSubmitting
                ? "Processing..."
                : actionModal.actionType === 'deactivate-user'
                  ? "Disable account"
                  : "Enable account"}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={articlesModalState.isOpen}
        title="View papers"
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
            title="Loading papers"
            description="Loading the participant's registered papers."
            variant="info"
          />
        ) : articlesModalState.error ? (
          <Alert title="Unable to open papers" description={articlesModalState.error} variant="danger" />
        ) : (
          <div className="space-y-5">
            <p className="text-sm text-slate-600">
              Papers registered by{' '}
              <span className="font-semibold text-slate-950">
                {articlesModalState.user
                  ? `${articlesModalState.user.firstName || ''} ${articlesModalState.user.lastName || ''}`.trim()
                  : "the participant"}
              </span>
              .
            </p>

            {!articlesModalState.papers.length ? (
              <Alert
                title="No registered papers"
                description="This participant has no papers associated with their registration."
                variant="warning"
              />
            ) : (
              <div className="space-y-4">
                {articlesModalState.papers.map((paper, index) => (
                  <div key={paper.id || index} className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Paper {index + 1}
                        </p>
                        <h3 className="mt-2 text-lg font-semibold text-slate-950">
                          {paper.title || "Untitled"}
                        </h3>
                      </div>
                      <div className="rounded-2xl bg-white px-4 py-3 text-right">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Code
                        </p>
                        <p className="mt-2 text-sm font-semibold text-slate-950">
                          {paper.paperCode || "Not provided"}
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 grid gap-4 md:grid-cols-2">
                      <ReadOnlyCard
                        label="Authors"
                        value={Array.isArray(paper.authors) ? paper.authors.join(', ') : paper.authors}
                      />
                      <ReadOnlyCard label="Pages" value={paper.pages} />
                    </div>

                    {paper.customFieldValues?.length ? (
                      <div className="mt-5 grid gap-4 md:grid-cols-2">
                        {paper.customFieldValues.map((field) => (
                          <ReadOnlyCard
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
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={paymentReviewState.isOpen}
        title="Review payment"
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
            title="Loading payment details"
            description="Loading receipts, amounts and current status."
            variant="info"
          />
        ) : paymentReviewState.error && !paymentReviewState.payments.length ? (
          <Alert title="Unable to open payment review" description={paymentReviewState.error} variant="danger" />
        ) : (
          <div className="space-y-6">
            <div>
              <p className="text-sm text-slate-600">
                Review the receipt and decide whether to approve or reject the payment submitted by{' '}
                <span className="font-semibold text-slate-950">
                  {paymentReviewState.user
                    ? `${paymentReviewState.user.firstName || ''} ${paymentReviewState.user.lastName || ''}`.trim()
                    : "the participant"}
                </span>
                .
              </p>
            </div>

            {paymentReviewState.error &&
            paymentReviewState.payments.length &&
            !isMissingPaymentProofMessage(paymentReviewState.error) ? (
              <Alert title="Action not completed" description={paymentReviewState.error} variant="danger" />
            ) : null}
            {paymentReviewState.success ? (
              <Alert title="Payment updated" description={paymentReviewState.success} variant="success" />
            ) : null}

            {!paymentReviewState.payments.length ? (
              <Alert
                title="No registered payments"
                description="This participant has no payments available for review."
                variant="warning"
              />
            ) : (
              <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
                <div className="space-y-4">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Participant payments
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
                                Payment #{payment.id}
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

                  <div className="rounded-xl border border-slate-200 bg-white p-5">
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Review summary
                    </p>
                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                      <ReviewItem
                        label="Registration"
                        value={paymentReviewState.registration?.id || "Not provided"}
                      />
                      <ReviewItem
                        label="Outstanding balance"
                        value={formatReviewMoney(reviewAmounts.pendingUsd, reviewAmounts.rate)}
                      />
                      <ReviewItem label="Registration total" value={formatReviewMoney(Number(paymentReviewState.registration?.paymentSummary?.totalAmount ?? paymentReviewState.registration?.totalAmount ?? 0), reviewAmounts.rate)} />
                      <ReviewItem label="Previously paid" value={formatReviewMoney(Number(paymentReviewState.registration?.paymentSummary?.paidAmount ?? paymentReviewState.registration?.paidAmount ?? 0), reviewAmounts.rate)} />
                      <ReviewItem label="Selected payment amount" value={formatReviewMoney(reviewAmounts.originalUsd, reviewAmounts.rate)} />
                      <ReviewItem label="Payment exchange rate" value={reviewAmounts.rate ? reviewAmounts.rate.toLocaleString('en-US',{maximumFractionDigits:4}) + " COP per USD" : "No exchange rate recorded"} />
                    </div>
                    <p className="mt-3 text-xs leading-6 text-slate-500">COP equivalents in this summary use the selected payment's exchange rate. Previous payments may have used different rates.</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="rounded-xl border border-slate-200 bg-white p-5">
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Uploaded receipt
                    </p>
                    <div className="mt-4">
                      <PaymentProofViewer
                        payment={resolveSelectedPayment(paymentReviewState)}
                        proofAccess={paymentReviewState.proofAccess}
                        isLoading={paymentReviewState.isProofLoading}
                      />
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-5">
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Administrative review
                    </p>
                    {isResolvedPayment ? (
                      <div className="mt-4 space-y-4">
                        {isApprovedPayment ? (
                          <ReviewItem
                            label="Approved amount"
                            value={formatCurrency(
                              Number(selectedReviewedPayment?.amountUsd || 0),
                            )}
                          />
                        ) : null}
                        {isRejectedPayment ? (
                          <div className="rounded-2xl bg-rose-50 px-4 py-4">
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-rose-700">
                              Reason for rejection
                            </p>
                            <p className="mt-2 text-sm font-medium text-rose-900">
                              {selectedReviewedPayment?.rejectionReason || "Not provided"}
                            </p>
                          </div>
                        ) : null}
                        {isCancelledPayment ? (
                          <div className="rounded-2xl bg-slate-100 px-4 py-4">
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
                              Final status
                            </p>
                            <p className="mt-2 text-sm font-medium text-slate-900">
                              This payment was cancelled by an administrator.
                            </p>
                          </div>
                        ) : null}
                        <p className="text-sm text-slate-500">
                          This payment already has a final administrative decision and cannot be changed from this screen.
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
                                    success: "Payment cancelled successfully.",
                                  }));
                                } catch (error) {
                                  setPaymentReviewState((current) => ({
                                    ...current,
                                    isSubmitting: false,
                                    error:
                                      error?.response?.data?.message ||
                                      error?.message ||
                                      "Unable to cancel the payment.",
                                    success: '',
                                  }));
                                }
                              }}
                              disabled={paymentReviewState.isSubmitting}
                            >
                              {paymentReviewState.isSubmitting ? "Processing..." : "Cancel payment"}
                            </Button>
                          </div>
                        ) : null}
                      </div>
                    ) : canValidateSelectedPayment ? (
                      <>
                        <div className="mt-4 grid gap-4">
                          <SelectField
                            label="Receipt currency"
                            value={reviewCurrency}
                            options={[{label:"US dollars (USD)",value:'USD'}, ...(reviewAmounts.rate ? [{label:"Colombian pesos (COP)",value:'COP'}] : [])]}
                            onChange={event => {
                              const next = event.target.value;
                              setPaymentReviewState(current => ({...current, reviewedAmount:Number.isFinite(reviewAmounts.verifiedUsd) ? String(next === 'COP' ? reviewAmounts.verifiedCop : reviewAmounts.verifiedUsd) : ''}));
                              setReviewCurrency(next);
                            }}
                          />
                          <InputField
                            label={"Verified amount (" + reviewCurrency + ')'}
                            disabled={paymentReviewState.isSubmitting}
                            type="number"
                            step="0.01"
                            value={paymentReviewState.reviewedAmount}
                            onChange={(event) =>
                              setPaymentReviewState((current) => ({
                                ...current,
                                reviewedAmount: event.target.value,
                              }))
                            }
                            min="0.01"
                            max={reviewCurrency === 'COP' ? reviewAmounts.originalCop : reviewAmounts.originalUsd}
                            helperText="Enter the amount received according to the receipt. You can approve a partial amount below the generated payment value."
                          />
                          <div className="rounded-xl border border-brand-200 bg-brand-50 p-5" aria-live="polite">
                            {reviewAmounts.valid ? <>
                              <p className="font-semibold text-brand-900">{reviewAmounts.remainingUsd <= 0 ? "Full payment: the outstanding balance will be covered" : "Partial payment: an outstanding balance will remain"}</p>
                              <p className="mt-2 text-sm text-slate-700">Amount to credit: {formatReviewMoney(reviewAmounts.verifiedUsd, reviewAmounts.rate)}</p>
                              <p className="mt-2 text-sm text-slate-700">Balance after approval: {formatReviewMoney(reviewAmounts.remainingUsd, reviewAmounts.rate)}</p>
                            </> : <p className="text-sm text-rose-700">Enter an amount greater than zero that does not exceed the selected payment amount.</p>}
                          </div>
                          <TextAreaField
                            label="Reason for rejection"
                            placeholder="Describe why the receipt is invalid or what the participant needs to correct."
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
                                  success: "Payment cancelled successfully.",
                                }));
                              } catch (error) {
                                setPaymentReviewState((current) => ({
                                  ...current,
                                  isSubmitting: false,
                                  error:
                                    error?.response?.data?.message ||
                                    error?.message ||
                                    "Unable to cancel the payment.",
                                  success: '',
                                }));
                              }
                            }}
                            disabled={paymentReviewState.isSubmitting}
                          >
                            {paymentReviewState.isSubmitting ? "Processing..." : "Cancel payment"}
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
                                  error: "Enter a reason for rejection before continuing.",
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
                                  reviewedAmount: reviewAmounts.valid ? reviewAmounts.verifiedUsd : undefined,
                                });

                                await openPaymentReviewModal(paymentReviewState.user, selectedPayment.id);
                                setPaymentReviewState((current) => ({
                                  ...current,
                                  success: "Payment rejected successfully.",
                                }));
                              } catch (error) {
                                setPaymentReviewState((current) => ({
                                  ...current,
                                  isSubmitting: false,
                                  error:
                                    error?.response?.data?.message ||
                                    error?.message ||
                                    "Unable to reject the payment.",
                                  success: '',
                                }));
                              }
                            }}
                            disabled={paymentReviewState.isSubmitting}
                          >
                            {paymentReviewState.isSubmitting ? "Processing..." : "Reject receipt"}
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

                                if (!reviewAmounts.valid) throw new Error("Check the verified amount before approving the payment.");
                                await paymentService.approvePayment(selectedPayment.id, {
                                  reviewedAmount: reviewAmounts.valid ? reviewAmounts.verifiedUsd : undefined,
                                });

                                await openPaymentReviewModal(paymentReviewState.user, selectedPayment.id);
                                setPaymentReviewState((current) => ({
                                  ...current,
                                  success: "Payment approved successfully.",
                                }));
                              } catch (error) {
                                setPaymentReviewState((current) => ({
                                  ...current,
                                  isSubmitting: false,
                                  error:
                                    error?.response?.data?.message ||
                                    error?.message ||
                                    "Unable to approve the payment.",
                                  success: '',
                                }));
                              }
                            }}
                            disabled={paymentReviewState.isSubmitting}
                          >
                            {paymentReviewState.isSubmitting ? "Processing..." : "Review payment"}
                          </Button>
                        </div>
                      </>
                    ) : (
                      <div className="mt-4 space-y-4">
                        {canSendSelectedPayPhoneLink ? (
                          <Alert
                            title="Awaiting payment link"
                            description="The participant registered this PayPhone payment and is waiting for an administrator to send the payment link."
                            variant="info"
                          />
                        ) : (
                          <Alert
                            title="Awaiting payment"
                            description="No receipt is available for review yet. Once the participant uploads it, the status will change to pending review."
                            variant="warning"
                          />
                        )}

                        {canSendSelectedPayPhoneLink ? (
                          <InputField
                            label="Payment link"
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
                            helperText="Paste the link that the participant will receive by email."
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
                                    error: "Paste the payment link before sending it.",
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
                                      "The PayPhone link was marked as sent. Current status: awaiting payment.",
                                  }));
                                } catch (error) {
                                  setPaymentReviewState((current) => ({
                                    ...current,
                                    isSubmitting: false,
                                    error:
                                      error?.response?.data?.message ||
                                      error?.message ||
                                      "Unable to mark the PayPhone link as sent.",
                                    success: '',
                                  }));
                                }
                              }}
                              disabled={paymentReviewState.isSubmitting}
                            >
                              {paymentReviewState.isSubmitting ? "Processing..." : "Send link"}
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
                                    success: "Payment cancelled successfully.",
                                  }));
                                } catch (error) {
                                  setPaymentReviewState((current) => ({
                                    ...current,
                                    isSubmitting: false,
                                    error:
                                      error?.response?.data?.message ||
                                      error?.message ||
                                      "Unable to cancel the payment.",
                                    success: '',
                                  }));
                                }
                              }}
                              disabled={paymentReviewState.isSubmitting}
                            >
                              {paymentReviewState.isSubmitting ? "Processing..." : "Cancel payment"}
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
          "Unable to load the participant's payment details.",
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
          "Unable to load the participant's papers.",
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
          "Unable to access the receipt.",
      }));
    }
  }

  async function submitUserActiveStatus() {
    if (!actionModal.user?.id) {
      return;
    }

    const nextActiveState = actionModal.actionType === 'activate-user';

    try {
      setActionModal((current) => ({
        ...current,
        isSubmitting: true,
        error: '',
      }));

      await dashboardService.updateAdminUserActiveStatus(actionModal.user.id, nextActiveState);

      const response = await dashboardService.getAdminUsers({
        filters: {
          active: appliedFilters.active,
        },
      });

      setAllUsers(response.users || []);
      setActionModal({
        isOpen: false,
        title: '',
        user: null,
        actionType: '',
        isSubmitting: false,
        error: '',
      });
    } catch (submitError) {
      setActionModal((current) => ({
        ...current,
        isSubmitting: false,
        error:
          submitError?.response?.data?.message ||
          submitError?.message ||
          "Unable to update the account status.",
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

function applyAdminUserFilters(users, filters) {
  return (users || []).filter((user) => {
    const primaryRegistration = resolvePrimaryRegistration(user);
    const normalizedSearch = normalizeFilterText(filters.search);

    if (normalizedSearch) {
      const searchTarget = normalizeFilterText(
        [
          `${user.firstName || ''} ${user.lastName || ''}`.trim(),
          user.email,
          user.affiliation,
          user.docNumber,
          resolveCountryName(user),
          user.city,
        ]
          .filter(Boolean)
          .join(' '),
      );

      if (!searchTarget.includes(normalizedSearch)) {
        return false;
      }
    }

    if (
      filters.country &&
      normalizeFilterText(resolveCountryName(user)) !== normalizeFilterText(filters.country)
    ) {
      return false;
    }

    if (filters.city && normalizeFilterText(user.city) !== normalizeFilterText(filters.city)) {
      return false;
    }

    if (
      filters.occupation &&
      normalizeFilterText(translateOccupation(user.occupation)) !==
        normalizeFilterText(filters.occupation)
    ) {
      return false;
    }

    if (
      filters.attendanceType &&
      normalizeFilterText(translateAttendanceType(primaryRegistration?.attendanceType)) !==
        normalizeFilterText(filters.attendanceType)
    ) {
      return false;
    }

    if (filters.isIeeeMember !== '') {
      const isIeeeMember = Boolean(primaryRegistration?.isIeeeMember);
      if (String(isIeeeMember) !== String(filters.isIeeeMember)) {
        return false;
      }
    }

    if (filters.active !== '' && filters.active !== 'all') {
      const isActive = Boolean(user?.active);
      if (String(isActive) !== String(filters.active)) {
        return false;
      }
    }

    if (
      filters.paymentStatus &&
      normalizeFilterText(resolveLatestPaymentStatusLabel(user?.latestPaymentStatus)) !==
        normalizeFilterText(filters.paymentStatus)
    ) {
      return false;
    }

    return true;
  });
}

function buildUserActions(user) {
  return [
    { type: 'view-details', label: "View participant details" },
    { type: 'review-payments', label: "Review payment" },
    { type: 'view-papers', label: "View papers" },
    {
      type: user?.active === false ? 'activate-user' : 'deactivate-user',
      label: user?.active === false ? "Enable account" : "Disable account",
    },
  ];
}

function normalizeFilterText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function hasAdministrativePendingPayment(user) {
  const payments = resolvePrimaryRegistration(user)?.payments || [];

  return payments.some(
    (payment) => isPaymentPendingValidation(payment) || isPaymentPendingLink(payment),
  );
}

function resolveUserRowClassName(user) {
  if (user?.active === false && hasAdministrativePendingPayment(user)) {
    return 'bg-amber-50/70 opacity-75';
  }

  if (user?.active === false) {
    return 'bg-slate-100/80 opacity-75';
  }

  if (hasAdministrativePendingPayment(user)) {
    return 'bg-amber-50/70';
  }

  return '';
}

function PaymentStatusCell({ status }) {
  if (!status) {
    return (
      <span className="inline-flex rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
        No payment recorded
      </span>
    );
  }

  return <StatusBadge status={status} label={translatePaymentStatus(status)} />;
}

function resolveLatestPaymentStatusLabel(status) {
  if (!status) {
    return "No payment recorded";
  }

  return translatePaymentStatus(status);
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
    bank_transfer: "Bank transfer",
    paypal: 'PayPal',
    payphone: 'PayPhone',
  };

  return map[value] || value || "Not provided";
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
      <p className="mt-2 text-sm font-medium text-slate-950">{value || "Not provided"}</p>
    </div>
  );
}

function PaymentProofViewer({ payment, proofAccess, isLoading }) {
  if (isLoading) {
    return (
      <Alert
        title="Loading receipt"
        description="Requesting temporary access to the file."
        variant="info"
      />
    );
  }

  if (!payment) {
    return (
      <Alert
        title="Select a payment"
        description="Choose a payment on the left to review its receipt."
        variant="info"
      />
    );
  }

  const proofUrl = proofAccess?.signedUrl || proofAccess?.publicUrl || payment.paymentProofUrl || null;

  if (!proofUrl) {
    return (
      <Alert
        title="No receipt available"
        description="The participant has not uploaded a receipt for this payment."
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
            title={`Payment receipt ${payment.id}`}
            src={proofUrl}
            className="h-[28rem] w-full rounded-xl bg-white"
          />
        ) : (
          <img
            src={proofUrl}
            alt={`Payment receipt ${payment.id}`}
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
        Open receipt in a new tab
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
