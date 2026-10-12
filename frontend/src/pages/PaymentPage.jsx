import { useEffect, useMemo, useState } from 'react';
import { Alert } from '../components/Alert';
import { Card } from '../components/Card';
import { BankTransferForm } from '../components/BankTransferForm';
import { PaymentMethods } from '../components/PaymentMethods';
import { PaymentSummaryCard } from '../components/PaymentSummaryCard';
import { dashboardService } from '../services/dashboardService';
import { metadataService } from '../services/metadataService';
import { paymentService } from '../services/paymentService';
import { formatCurrency } from '../utils/currency';
import { StatusBadge } from '../utils/statusStyles.jsx';
import { translatePaymentStatus } from '../utils/translations';

const TAX_RATE = 0.19;

function PaymentPage() {
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const [submittingPaymentFlow, setSubmittingPaymentFlow] = useState('');
  const [highlightedPaymentId, setHighlightedPaymentId] = useState(null);
  const [pageState, setPageState] = useState({
    isLoading: true,
    error: '',
    registration: null,
    payments: [],
  });
  const [generatedTransfer, setGeneratedTransfer] = useState(null);
  const [transferQuoteKey, setTransferQuoteKey] = useState('');
  const [bankTransferDetails, setBankTransferDetails] = useState(null);
  const [includeTaxes, setIncludeTaxes] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [couponState, setCouponState] = useState({
    code: '',
    isApplying: false,
    isRedeeming: false,
    error: '',
    message: '',
    applied: null,
  });
  const [bankTransferState, setBankTransferState] = useState({
    transactionReference: '',
    supportingFile: null,
    error: '',
    success: '',
  });

  useEffect(() => {
    let isMounted = true;

    async function loadPaymentContext() {
      try {
        setPageState({
          isLoading: true,
          error: '',
          registration: null,
          payments: [],
        });

        const response = await dashboardService.getMyRegistrationDetails();
        const activeRegistration = response.registrations?.[0] || null;
        const [bankDetailsResponse, paymentsResponse] = await Promise.all([
          metadataService.getBankTransferDetails().catch(() => null),
          activeRegistration
            ? paymentService.getRegistrationPayments(activeRegistration.id)
            : Promise.resolve({ payments: [] }),
        ]);
        const resolvedPayments = paymentsResponse.payments || [];
        const hydratedRegistration = activeRegistration
          ? {
              ...activeRegistration,
              payments: resolvedPayments,
            }
          : null;

        if (!isMounted) {
          return;
        }

        const selectionDefaults = resolvePaymentOptionDefaults(hydratedRegistration);

        setPageState({
          isLoading: false,
          error: '',
          registration: hydratedRegistration,
          payments: resolvedPayments,
        });
        setBankTransferDetails(bankDetailsResponse);
        setIncludeTaxes(selectionDefaults.includeTaxes);
        setPaymentAmount(selectionDefaults.baseAmount.toFixed(2));
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setPageState({
          isLoading: false,
          error:
            error?.response?.data?.message ||
            error?.message ||
            "Unable to load payment information.",
          registration: null,
          payments: [],
        });
      }
    }

    loadPaymentContext();

    return () => {
      isMounted = false;
    };
  }, []);

  const registrationTotals = useMemo(() => {
    const registration = pageState.registration;
    const paymentSummary = registration?.paymentSummary || registration?.pricing?.breakdown || null;
    const latestPendingPayment = resolveLatestPendingPayment(registration);
    const displayedPendingAmount = resolveDisplayedPendingAmount(registration);

    return {
      totalAmount: Number(
        latestPendingPayment?.amountUsd ||
          paymentSummary?.totalAmount ||
          registration?.pricing?.total ||
          registration?.totalAmount ||
          displayedPendingAmount ||
          0,
      ),
      paidAmount: Number(
        paymentSummary?.paidAmount || registration?.pricing?.paid || registration?.paidAmount || 0,
      ),
      pendingAmount: displayedPendingAmount,
      latestPendingPayment,
    };
  }, [pageState.registration]);

  const paymentBreakdown = useMemo(() => {
    const baseAmount = sanitizePaymentAmount(paymentAmount, registrationTotals.pendingAmount);
    const discountAmount = resolveCouponDiscount(couponState.applied, baseAmount);
    const discountedBaseAmount = Number(Math.max(0, baseAmount - discountAmount).toFixed(2));
    const taxesAmount = includeTaxes ? Number((discountedBaseAmount * TAX_RATE).toFixed(2)) : 0;
    const totalAmount = Number(
      Math.max(0, discountedBaseAmount + taxesAmount).toFixed(2),
    );

    return {
      baseAmount,
      discountAmount,
      discountedBaseAmount,
      taxesAmount,
      totalAmount,
    };
  }, [
    couponState.applied,
    includeTaxes,
    paymentAmount,
    pageState.registration,
    registrationTotals.pendingAmount,
  ]);

  const bankDetails = useMemo(() => buildBankDetails(bankTransferDetails), [bankTransferDetails]);
  const latestPayment = pageState.payments?.[0] || null;
  const canRedeemCoupon = Boolean(couponState.applied) && paymentBreakdown.totalAmount <= 0;

  useEffect(() => {
    setCouponState((current) => {
      if (!current.applied) {
        return current;
      }

      return {
        ...current,
        applied: null,
        error: '',
        message: "The amount or taxes changed. Apply the coupon again.",
      };
    });
  }, [includeTaxes, paymentAmount]);

  async function refreshPaymentContext(preferredPaymentId = null) {
    const response = await dashboardService.getMyRegistrationDetails();
    const activeRegistration = response.registrations?.[0] || null;
    const paymentsResponse = activeRegistration
      ? await paymentService.getRegistrationPayments(activeRegistration.id)
      : { payments: [] };
    const refreshedPayments = paymentsResponse.payments || [];
    const hydratedRegistration = activeRegistration
      ? {
          ...activeRegistration,
          payments: refreshedPayments,
        }
      : null;
    const selectionDefaults = resolvePaymentOptionDefaults(hydratedRegistration);

    setPageState({
      isLoading: false,
      error: '',
      registration: hydratedRegistration,
      payments: refreshedPayments,
    });
    setIncludeTaxes(selectionDefaults.includeTaxes);
    setPaymentAmount(selectionDefaults.baseAmount.toFixed(2));
    setHighlightedPaymentId(
      preferredPaymentId &&
        refreshedPayments.some((payment) => String(payment.id) === String(preferredPaymentId))
        ? preferredPaymentId
        : null,
    );
    setCouponState({
      code: '',
      isApplying: false,
      isRedeeming: false,
      error: '',
      message: '',
      applied: null,
    });
  }

  async function handleApplyCoupon() {
    if (!pageState.registration || !couponState.code.trim()) {
      return;
    }

    try {
      setCouponState((current) => ({
        ...current,
        isApplying: true,
        error: '',
        message: '',
      }));

      const response = await paymentService.previewCoupon({
        registrationId: pageState.registration.id,
        code: couponState.code.trim().toUpperCase(),
        baseAmount: paymentBreakdown.baseAmount,
        includeTaxes,
      });
      const preview = response.couponPreview;

      if (!preview) {
        throw new Error("The server did not return the coupon summary.");
      }

      setCouponState((current) => ({
        ...current,
        code: preview.code || current.code.trim().toUpperCase(),
        isApplying: false,
        error: '',
        message:
          preview.message ||
          (Number(preview.discountAmount || 0) > 0
            ? "Coupon validated successfully."
            : "The coupon does not provide a discount for this payment."),
        applied: preview,
      }));
    } catch (error) {
      setCouponState((current) => ({
        ...current,
        isApplying: false,
        error:
          error?.response?.data?.message ||
          error?.message ||
          "Unable to validate the coupon.",
        message: '',
        applied: null,
      }));
    }
  }

  async function handleRedeemCoupon() {
    if (!pageState.registration || !couponState.applied || !canRedeemCoupon) {
      return;
    }

    try {
      setCouponState((current) => ({
        ...current,
        isRedeeming: true,
        error: '',
        message: '',
      }));

      const response = await paymentService.redeemCoupon({
        registrationId: pageState.registration.id,
        code: couponState.applied.code || couponState.code.trim().toUpperCase(),
        baseAmount: paymentBreakdown.baseAmount,
        includeTaxes,
      });

      setPageState((current) => ({
        ...current,
        registration: response.registration || current.registration,
      }));
      await refreshPaymentContext();
      setCouponState((current) => ({
        ...current,
        isRedeeming: false,
        message:
          response.message ||
          "The coupon settled the balance. The outstanding amount is now zero.",
      }));
    } catch (error) {
      setCouponState((current) => ({
        ...current,
        isRedeeming: false,
        error:
          error?.response?.data?.message ||
          error?.message ||
          "Unable to settle the balance with the coupon.",
      }));
    }
  }

  async function handleBankTransferSubmit() {
    if (!pageState.registration || isSubmittingPayment) return;
    const quoteKey = JSON.stringify([paymentBreakdown.totalAmount, includeTaxes, couponState.applied?.code || '']);
    const isUpload = Boolean(generatedTransfer && transferQuoteKey === quoteKey);
    if (isUpload && !bankTransferState.supportingFile) {
      setBankTransferState(current => ({...current, error:"Attach a screenshot or receipt of your transfer.",success:''}));
      return;
    }
    try {
      setIsSubmittingPayment(true);
      setSubmittingPaymentFlow('bank_transfer');
      setBankTransferState(current => ({...current,error:'',success:''}));
      if (!isUpload) {
        const response = await paymentService.createBankTransferPayment({
          registrationId:pageState.registration.id,
          amountUsd:paymentBreakdown.totalAmount,
          currency:'USD', includesTaxes:includeTaxes,
          taxAmount:paymentBreakdown.taxesAmount,
          couponCode:couponState.applied?.code || undefined,
        });
        if (!response.payment?.id || !Number.isFinite(Number(response.payment.amountCop)) || Number(response.payment.amountCop) <= 0) {
          throw new Error("No valid exchange rate is available to calculate the amount in pesos. Contact the organizing team.");
        }
        setGeneratedTransfer(response.payment);
        setTransferQuoteKey(quoteKey);
        setBankTransferState(current => ({...current,supportingFile:null,transactionReference:'',success:''}));
        return;
      }
      const payload = buildPaymentProofFormData({file:bankTransferState.supportingFile,transactionReference:bankTransferState.transactionReference});
      await paymentService.uploadPaymentProof(generatedTransfer.id,payload);
      setGeneratedTransfer(null);
      setTransferQuoteKey('');
      setBankTransferState({transactionReference:'',supportingFile:null,error:'',success:"Receipt submitted. Your transfer is pending review."});
      await refreshPaymentContext(generatedTransfer.id);
    } catch (err) {
      setBankTransferState(current => ({...current,error:err?.response?.data?.message || err.message || "Unable to process the transfer."}));
    } finally {
      setIsSubmittingPayment(false);
      setSubmittingPaymentFlow('');
    }
  }

  if (pageState.isLoading) {
    return (
      <section className="container-shell py-16">
        <Alert
          title="Loading payment information"
          description="Loading your outstanding balance and registration summary."
          variant="info"
        />
      </section>
    );
  }

  if (pageState.error) {
    return (
      <section className="container-shell py-16">
        <Alert
          title="Unable to load the payments page"
          description={pageState.error}
          variant="danger"
        />
      </section>
    );
  }

  if (!pageState.registration) {
    return (
      <section className="container-shell py-16">
        <Alert
          title="No active registration to pay"
          description="You can manage your payments here once you have a registration with an outstanding balance."
          variant="warning"
        />
      </section>
    );
  }

  return (
    <section className="container-shell py-16">
      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-600">
          Payments
        </p>
        <h1 className="mt-3 text-4xl font-semibold text-slate-950">
          Complete your registration payment
        </h1>
        <p className="mt-4 max-w-4xl text-sm leading-7 text-slate-600">
          This page displays your outstanding balance and the two available payment methods: direct bank transfer and online payment with Cobru.
        </p>
      </div>

      <div className="grid gap-8 xl:grid-cols-[0.9fr_1.1fr]">
        <PaymentSummaryCard
          registrationTotal={registrationTotals.totalAmount}
          paidAmount={registrationTotals.paidAmount}
          pendingAmount={registrationTotals.pendingAmount}
          paymentAmount={paymentAmount}
          baseAmount={paymentBreakdown.baseAmount}
          onPaymentAmountChange={setPaymentAmount}
          includeTaxes={includeTaxes}
          onIncludeTaxesChange={setIncludeTaxes}
          taxesAmount={paymentBreakdown.taxesAmount}
          discountAmount={paymentBreakdown.discountAmount}
          totalToCharge={paymentBreakdown.totalAmount}
          couponCode={couponState.code}
          onCouponCodeChange={(value) =>
            setCouponState((current) => ({
              ...current,
              code: value,
              applied:
                current.applied?.code === value.trim().toUpperCase() ? current.applied : null,
              error: '',
              message: '',
            }))
          }
          onApplyCoupon={handleApplyCoupon}
          couponState={couponState}
          onRedeemCoupon={handleRedeemCoupon}
          isRedeemingCoupon={couponState.isRedeeming}
          canRedeemCoupon={canRedeemCoupon}
        />

        <div className="space-y-8">
          {canRedeemCoupon ? (
            <Card className="rounded-xl p-8">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-600">
                Full discount
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-950">
                No external payment is required
              </h2>
              <p className="mt-4 text-sm leading-7 text-slate-600">
                The coupon covers the full payment amount. Confirm settlement to clear the outstanding balance and record the discount.
              </p>
            </Card>
          ) : (
            <>
              <BankTransferForm
                generatedPayment={generatedTransfer}
                quoteChanged={Boolean(generatedTransfer && transferQuoteKey !== JSON.stringify([paymentBreakdown.totalAmount, includeTaxes, couponState.applied?.code || '']))}
                bankDetails={bankDetails}
                amountToCharge={paymentBreakdown.totalAmount}
                transactionReference={bankTransferState.transactionReference}
                onTransactionReferenceChange={(value) =>
                  setBankTransferState((current) => ({
                    ...current,
                    transactionReference: value,
                    error: '',
                    success: '',
                  }))
                }
                supportingFile={bankTransferState.supportingFile}
                onFileChange={(file) =>
                  setBankTransferState((current) => ({
                    ...current,
                    supportingFile: file,
                    error: '',
                    success: '',
                  }))
                }
                isSubmitting={
                  isSubmittingPayment && submittingPaymentFlow === 'bank_transfer'
                }
                error={bankTransferState.error}
                success={bankTransferState.success}
                onSubmit={handleBankTransferSubmit}
              />

              <PaymentMethods
                registrationId={pageState.registration.id}
                pendingAmount={registrationTotals.pendingAmount}
                requiresInvoice={includeTaxes}
                payments={pageState.payments}
                couponApplied={couponState.applied}
                onUpdated={refreshPaymentContext}
                disabled={isSubmittingPayment}
              />
            </>
          )}
        </div>
      </div>

      <Card className="mt-8 p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-600">
              Payment history
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-950">Registered payments</h2>
          </div>
          {latestPayment ? (
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Latest status:
              </span>
              <StatusBadge
                status={latestPayment.status}
                label={translatePaymentStatus(latestPayment.status)}
              />
            </div>
          ) : null}
        </div>

        {pageState.payments.length ? (
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            {pageState.payments.map((payment) => (
              <div
                key={payment.id}
                className={`rounded-xl border bg-slate-50 p-5 ${
                  String(highlightedPaymentId) === String(payment.id)
                    ? 'border-brand-400 shadow-[0_20px_50px_rgba(37,82,134,0.12)]'
                    : 'border-slate-200'
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Payment #{payment.id}
                    </p>
                    <p className="mt-2 text-lg font-semibold text-slate-950">
                      {formatCurrency(payment.amountUsd || 0)}
                    </p>
                  </div>
                  <StatusBadge
                    status={payment.status}
                    label={translatePaymentStatus(payment.status)}
                  />
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <PaymentMeta label="Method" value={formatMethod(payment.paymentMethod)} />
                  <PaymentMeta label="Provider" value={formatProvider(payment.provider)} />
                  <PaymentMeta
                    label="Reference"
                    value={payment.transactionReference || "Not provided"}
                  />
                  <PaymentMeta
                    label="Receipt"
                    value={payment.paymentProofUrl ? "Available" : "Not uploaded"}
                  />
                </div>

                {payment.paymentProofUrl ? (
                  <a
                    href={payment.paymentProofUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-5 inline-flex text-sm font-semibold text-brand-700 transition hover:text-brand-900"
                  >
                    View receipt
                  </a>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-6">
            <Alert
              title="No payments recorded yet"
              description="Payments created by bank transfer or Cobru will appear in this history."
              variant="info"
            />
          </div>
        )}
      </Card>
    </section>
  );
}

export default PaymentPage;

function PaymentMeta({ label, value }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-medium text-slate-950">{value}</p>
    </div>
  );
}

function buildBankDetails(bankTransferDetails) {
  if (!bankTransferDetails) {
    return [];
  }

  const items = [
    { label: "Bank", value: bankTransferDetails.bankName || bankTransferDetails.bank || '' },
    {
      label: "Account holder",
      value: bankTransferDetails.accountHolder || bankTransferDetails.holder || '',
    },
    {
      label: "Account type",
      value: bankTransferDetails.accountType || '',
    },
    {
      label: "Account number",
      value: bankTransferDetails.accountNumber || '',
    },
    {
      label: 'RUC',
      value:
        bankTransferDetails.ruc ||
        bankTransferDetails.taxId ||
        bankTransferDetails.taxIdentificationNumber ||
        '',
    },
    { label: "SWIFT code", value: bankTransferDetails.swiftCode || bankTransferDetails.swift || '' },
    {
      label: "Destination country",
      value: bankTransferDetails.destinationCountry || bankTransferDetails.country || '',
    },
  ];

  return items.filter((item) => item.value);
}

function resolvePendingAmount(registration) {
  return Number(
    registration?.paymentSummary?.pendingAmount ||
      registration?.pricing?.balance ||
      registration?.pendingAmount ||
      0,
  );
}

function sanitizePaymentAmount(value, pendingAmount) {
  const parsedValue = Number(value);

  if (Number.isNaN(parsedValue) || parsedValue <= 0) {
    return 0;
  }

  if (pendingAmount > 0 && parsedValue > pendingAmount) {
    return Number(pendingAmount);
  }

  return Number(parsedValue.toFixed(2));
}

function formatMethod(value) {
  const map = {
    bank_transfer: "Bank transfer",
    paypal: 'PayPal',
    payphone: "PayPhone (legacy)",
    cobru: 'Cobru',
  };

  return map[value] || value || "Not provided";
}

function formatProvider(value) {
  const map = {
    manual_bank_transfer: "Manual bank transfer",
    paypal: 'PayPal',
    payphone: "PayPhone (legacy)",
    cobru: 'Cobru',
  };

  return map[value] || value || "Not provided";
}

function resolveCouponDiscount(appliedCoupon, baseAmount) {
  if (!appliedCoupon || baseAmount <= 0) {
    return 0;
  }

  if (appliedCoupon.discountAmount !== undefined && appliedCoupon.discountAmount !== null) {
    return Number(Math.max(0, Number(appliedCoupon.discountAmount)).toFixed(2));
  }

  if (appliedCoupon.percentage !== undefined && appliedCoupon.percentage !== null) {
    return Number(
      Math.max(0, (baseAmount * Number(appliedCoupon.percentage)) / 100).toFixed(2),
    );
  }

  return 0;
}

function buildPaymentProofFormData({ file, transactionReference }) {
  const formData = new FormData();

  formData.append('file', file);

  if (transactionReference?.trim()) {
    formData.append('transactionReference', transactionReference.trim());
  }

  return formData;
}


function resolvePaymentOptionDefaults(registration) {
  const latestPendingPayment = resolveLatestPendingPayment(registration);
  const includeTaxes = resolvePersistedInvoiceSelection(registration);
  const persistedTaxAmount = resolvePersistedTaxAmount(registration);

  if (latestPendingPayment?.amountUsd) {
    const paymentTotalAmount = Number(latestPendingPayment.amountUsd || 0);
    const baseAmountFromPayment = Math.max(
      0,
      paymentTotalAmount -
        (includeTaxes ? persistedTaxAmount : 0),
    );

    return {
      includeTaxes,
      baseAmount: Number(baseAmountFromPayment.toFixed(2)),
    };
  }

  const pendingAmount = resolvePendingAmount(registration);
  const amountBeforeTax = Math.max(0, pendingAmount);
  const baseAmount = includeTaxes
    ? Number(Math.max(0, amountBeforeTax - persistedTaxAmount).toFixed(2))
    : Number(amountBeforeTax.toFixed(2));

  return {
    includeTaxes,
    baseAmount,
  };
}

function resolvePersistedInvoiceSelection(registration) {
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
    registration?.includeTax,
    registration?.includesTaxes,
    registration?.paymentSummary?.requiresInvoice,
    registration?.paymentSummary?.includeTax,
    registration?.paymentSummary?.includesTaxes,
  ]);

  if (directValue !== undefined) {
    return normalizeBooleanPreference(directValue);
  }

  return resolveCustomFieldBoolean(
    registration?.customFieldValues,
    ['factura', 'invoice', 'billing'],
  );
}


function resolvePersistedTaxAmount(registration) {
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
    registration?.paymentSummary?.requiresInvoice ? registration?.paymentSummary?.taxAmount : undefined,
    registration?.paymentSummary?.taxAmount,
    registration?.paymentSummary?.invoiceTaxAmount,
  ]);

  if (directValue !== undefined && directValue !== null && directValue !== '') {
    return Number(Math.max(0, Number(directValue)).toFixed(2));
  }

  const includeTaxes = resolvePersistedInvoiceSelection(registration);

  if (!includeTaxes) {
    return 0;
  }

  const pendingAmount = resolvePendingAmount(registration);
  const amountBeforeTax = Math.max(0, pendingAmount);

  return Number((amountBeforeTax - amountBeforeTax / (1 + TAX_RATE)).toFixed(2));
}

function resolveCustomFieldBoolean(customFieldValues, keywords) {
  const matchedField = (customFieldValues || []).find((field) => {
    const label = normalizeText(
      field?.customField?.label || field?.label || field?.customField?.name || '',
    );

    return keywords.some((keyword) => label.includes(normalizeText(keyword)));
  });

  if (!matchedField) {
    return false;
  }

  return normalizeBooleanPreference(matchedField.value);
}

function normalizeBooleanPreference(value) {
  if (typeof value === 'boolean') {
    return value;
  }

  if (value === null || value === undefined) {
    return false;
  }

  const normalizedValue = normalizeText(String(value));

  return ['true', '1', 'si', 'sí', 'yes', 'y', 'requiere', 'solicita'].includes(
    normalizedValue,
  );
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

function resolveLatestPendingPayment(registration) {
  const payments = registration?.payments || [];

  return (
    [...payments]
      .filter((payment) => !isResolvedPaymentStatus(payment?.status))
      .sort((left, right) => {
        const leftTime = new Date(left?.createdAt || 0).getTime();
        const rightTime = new Date(right?.createdAt || 0).getTime();
        return rightTime - leftTime;
      })[0] || null
  );
}

function resolveDisplayedPendingAmount(registration) {
  const latestPendingPayment = resolveLatestPendingPayment(registration);

  if (latestPendingPayment?.amountUsd) {
    return Number(latestPendingPayment.amountUsd);
  }

  return resolvePendingAmount(registration);
}

function isResolvedPaymentStatus(status) {
  return ['approved', 'accepted', 'paid', 'rejected', 'cancelled', 'canceled'].includes(
    String(status || '').toLowerCase(),
  );
}

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}
