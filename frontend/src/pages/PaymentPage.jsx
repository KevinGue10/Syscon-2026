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
import { translatePaymentStatus } from '../utils/translations';

const TAX_RATE = 0.15;

function PaymentPage() {
  const [pageState, setPageState] = useState({
    isLoading: true,
    error: '',
    registration: null,
    payments: [],
  });
  const [bankTransferDetails, setBankTransferDetails] = useState(null);
  const [includeTaxes, setIncludeTaxes] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [selectedMethod, setSelectedMethod] = useState('paypal');
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
    isSubmitting: false,
    error: '',
    success: '',
  });
  const [gatewayState, setGatewayState] = useState({
    paypal: { isLoading: false, error: '' },
    payphone: { isLoading: false, error: '' },
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

        if (!isMounted) {
          return;
        }

        setPageState({
          isLoading: false,
          error: '',
          registration: activeRegistration,
          payments: paymentsResponse.payments || [],
        });
        setBankTransferDetails(bankDetailsResponse);
        setPaymentAmount(resolvePendingAmount(activeRegistration).toFixed(2));
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setPageState({
          isLoading: false,
          error:
            error?.response?.data?.message ||
            error?.message ||
            'No fue posible cargar la informacion de pago.',
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

    return {
      totalAmount: Number(paymentSummary?.totalAmount || registration?.pricing?.total || registration?.totalAmount || 0),
      paidAmount: Number(paymentSummary?.paidAmount || registration?.pricing?.paid || registration?.paidAmount || 0),
      pendingAmount: resolvePendingAmount(registration),
    };
  }, [pageState.registration]);

  const paymentBreakdown = useMemo(() => {
    const baseAmount = sanitizePaymentAmount(paymentAmount, registrationTotals.pendingAmount);
    const discountAmount = resolveCouponDiscount(couponState.applied, baseAmount);
    const discountedBaseAmount = Number(Math.max(0, baseAmount - discountAmount).toFixed(2));
    const taxesAmount = includeTaxes ? Number((discountedBaseAmount * TAX_RATE).toFixed(2)) : 0;
    const totalAmount = Number(Math.max(0, discountedBaseAmount + taxesAmount).toFixed(2));

    return {
      baseAmount,
      discountAmount,
      discountedBaseAmount,
      taxesAmount,
      totalAmount,
    };
  }, [couponState.applied, includeTaxes, paymentAmount, registrationTotals.pendingAmount]);

  const bankDetails = useMemo(
    () => buildBankDetails(bankTransferDetails),
    [bankTransferDetails],
  );
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
        message: 'El monto o los impuestos cambiaron. Vuelve a aplicar el cupon.',
      };
    });
  }, [includeTaxes, paymentAmount]);

  async function refreshPaymentContext() {
    const response = await dashboardService.getMyRegistrationDetails();
    const activeRegistration = response.registrations?.[0] || null;
    const paymentsResponse = activeRegistration
      ? await paymentService.getRegistrationPayments(activeRegistration.id)
      : { payments: [] };

    setPageState({
      isLoading: false,
      error: '',
      registration: activeRegistration,
      payments: paymentsResponse.payments || [],
    });
    setPaymentAmount(resolvePendingAmount(activeRegistration).toFixed(2));
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
        throw new Error('El backend no devolvio el resumen del cupon.');
      }

      setCouponState((current) => ({
        ...current,
        code: preview.code || current.code.trim().toUpperCase(),
        isApplying: false,
        error: '',
        message:
          preview.message ||
          (Number(preview.discountAmount || 0) > 0
            ? 'El cupon fue validado correctamente.'
            : 'El cupon no genera descuento para este pago.'),
        applied: preview,
      }));
    } catch (error) {
      setCouponState((current) => ({
        ...current,
        isApplying: false,
        error:
          error?.response?.data?.message ||
          error?.message ||
          'No fue posible validar el cupon.',
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
          'La deuda quedo liquidada con el cupon y el saldo pendiente se actualizo a cero.',
      }));
    } catch (error) {
      setCouponState((current) => ({
        ...current,
        isRedeeming: false,
        error:
          error?.response?.data?.message ||
          error?.message ||
          'No fue posible liquidar la deuda con el cupon.',
      }));
    }
  }

  async function handleBankTransferSubmit() {
    if (!pageState.registration) {
      return;
    }

    if (paymentBreakdown.totalAmount <= 0) {
      setBankTransferState((current) => ({
        ...current,
        error: 'Define un monto valido para registrar el pago.',
        success: '',
      }));
      return;
    }

    if (!bankTransferState.supportingFile) {
      setBankTransferState((current) => ({
        ...current,
        error: 'Debes adjuntar el soporte de la transferencia.',
        success: '',
      }));
      return;
    }

    try {
      setBankTransferState((current) => ({
        ...current,
        isSubmitting: true,
        error: '',
        success: '',
      }));

      const createResponse = await paymentService.createBankTransferPayment({
        registrationId: pageState.registration.id,
        amountUsd: paymentBreakdown.totalAmount,
        currency: 'USD',
        transactionReference: bankTransferState.transactionReference.trim() || undefined,
        couponCode: couponState.applied?.code || undefined,
      });

      const createdPaymentId = createResponse.payment?.id;

      if (!createdPaymentId) {
        throw new Error('El backend no devolvio el identificador del pago creado.');
      }

      const filePayload = buildPaymentProofFormData({
        file: bankTransferState.supportingFile,
        transactionReference: bankTransferState.transactionReference,
      });
      await paymentService.uploadPaymentProof(createdPaymentId, filePayload);
      await refreshPaymentContext();

      setBankTransferState({
        transactionReference: '',
        supportingFile: null,
        isSubmitting: false,
        error: '',
        success: 'El pago quedo registrado y el soporte fue enviado. Estado actual: pendiente de validacion.',
      });
    } catch (error) {
      setBankTransferState((current) => ({
        ...current,
        isSubmitting: false,
        error:
          error?.response?.data?.message ||
          error?.message ||
          'No fue posible registrar la transferencia.',
        success: '',
      }));
    }
  }

  async function handlePayPalCheckout() {
    if (!pageState.registration) {
      return;
    }

    try {
      setGatewayState((current) => ({
        ...current,
        paypal: { isLoading: true, error: '' },
      }));

      const response = await paymentService.createPayPalOrder({
        registrationId: pageState.registration.id,
        amountUsd: paymentBreakdown.totalAmount,
        currency: 'USD',
        couponCode: couponState.applied?.code || undefined,
      });

      const approvalUrl = response.payment?.paymentUrl || response.payment?.approvalUrl || null;

      if (!approvalUrl) {
        throw new Error('El backend no devolvio la URL de aprobacion de PayPal.');
      }

      window.location.assign(approvalUrl);
    } catch (error) {
      setGatewayState((current) => ({
        ...current,
        paypal: {
          isLoading: false,
          error:
            error?.response?.data?.message ||
            error?.message ||
            'No fue posible iniciar el checkout de PayPal.',
        },
      }));
    }
  }

  async function handlePayPhoneCheckout() {
    if (!pageState.registration) {
      return;
    }

    try {
      setGatewayState((current) => ({
        ...current,
        payphone: { isLoading: true, error: '' },
      }));

      const response = await paymentService.createPayPhonePayment({
        registrationId: pageState.registration.id,
        amountUsd: paymentBreakdown.totalAmount,
        currency: 'USD',
        couponCode: couponState.applied?.code || undefined,
      });

      const paymentUrl = response.payment?.paymentUrl || null;

      if (!paymentUrl) {
        throw new Error('El backend no devolvio la URL de pago de PayPhone.');
      }

      window.location.assign(paymentUrl);
    } catch (error) {
      setGatewayState((current) => ({
        ...current,
        payphone: {
          isLoading: false,
          error:
            error?.response?.data?.message ||
            error?.message ||
            'No fue posible iniciar el checkout de PayPhone.',
        },
      }));
    }
  }

  if (pageState.isLoading) {
    return (
      <section className="container-shell py-16">
        <Alert
          title="Cargando informacion de pago"
          description="Consultando saldo pendiente y resumen de la inscripcion."
          variant="info"
        />
      </section>
    );
  }

  if (pageState.error) {
    return (
      <section className="container-shell py-16">
        <Alert title="No fue posible cargar la pagina de pagos" description={pageState.error} variant="danger" />
      </section>
    );
  }

  if (!pageState.registration) {
    return (
      <section className="container-shell py-16">
        <Alert
          title="No hay una inscripcion activa para pagar"
          description="Cuando exista una inscripcion con saldo pendiente, podras gestionarla desde esta pagina."
          variant="warning"
        />
      </section>
    );
  }

  return (
    <section className="container-shell py-16">
      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-600">
          Pagos
        </p>
        <h1 className="mt-3 text-4xl font-semibold text-slate-950">
          Completa el pago de tu inscripcion
        </h1>
        <p className="mt-4 max-w-4xl text-sm leading-7 text-slate-600">
          Esta pagina concentra el resumen del valor pendiente y los dos caminos de pago que
          tendra la plataforma: transferencia directa y pago con tarjetas.
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
              applied: current.applied?.code === value.trim().toUpperCase() ? current.applied : null,
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
            <Card className="rounded-[2rem] p-8">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-600">
                Descuento total
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-950">
                No necesitas procesar un pago externo
              </h2>
              <p className="mt-4 text-sm leading-7 text-slate-600">
                El cupon cubre el valor completo de este pago. El siguiente paso es confirmar la
                liquidación para que el backend deje el saldo pendiente en cero y registre la
                trazabilidad del descuento.
              </p>
            </Card>
          ) : (
            <>
              <BankTransferForm
                bankDetails={bankDetails}
                amountToCharge={paymentBreakdown.totalAmount}
                transactionReference={bankTransferState.transactionReference}
                onTransactionReferenceChange={(value) =>
                  setBankTransferState((current) => ({
                    ...current,
                    transactionReference: value,
                  }))
                }
                supportingFile={bankTransferState.supportingFile}
                onFileChange={(file) =>
                  setBankTransferState((current) => ({
                    ...current,
                    supportingFile: file,
                  }))
                }
                isSubmitting={bankTransferState.isSubmitting}
                error={bankTransferState.error}
                success={bankTransferState.success}
                onSubmit={handleBankTransferSubmit}
              />

              <PaymentMethods
                selectedMethod={selectedMethod}
                onSelectMethod={setSelectedMethod}
                amountToCharge={paymentBreakdown.totalAmount}
                paypalState={gatewayState.paypal}
                payphoneState={gatewayState.payphone}
                onPayPalClick={handlePayPalCheckout}
                onPayPhoneClick={handlePayPhoneCheckout}
              />
            </>
          )}
        </div>
      </div>

      <Card className="mt-8 p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-600">
              Trazabilidad de pagos
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-950">Pagos registrados</h2>
          </div>
          {latestPayment ? (
            <span className="rounded-full bg-slate-100 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
              Ultimo estado: {translatePaymentStatus(latestPayment.status)}
            </span>
          ) : null}
        </div>

        {pageState.payments.length ? (
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            {pageState.payments.map((payment) => (
              <div key={payment.id} className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Pago #{payment.id}
                    </p>
                    <p className="mt-2 text-lg font-semibold text-slate-950">
                      {formatCurrency(payment.amountUsd || 0)}
                    </p>
                  </div>
                  <span className="rounded-full bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
                    {translatePaymentStatus(payment.status)}
                  </span>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <PaymentMeta label="Metodo" value={formatMethod(payment.paymentMethod)} />
                  <PaymentMeta label="Proveedor" value={formatProvider(payment.provider)} />
                  <PaymentMeta label="Referencia" value={payment.transactionReference || 'No registrada'} />
                  <PaymentMeta label="Comprobante" value={payment.paymentProofUrl ? 'Disponible' : 'No cargado'} />
                </div>

                {payment.paymentProofUrl ? (
                  <a
                    href={payment.paymentProofUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-5 inline-flex text-sm font-semibold text-brand-700 transition hover:text-brand-900"
                  >
                    Ver comprobante
                  </a>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-6">
            <Alert
              title="Todavia no hay pagos registrados"
              description="Cuando generes un pago por transferencia, PayPal o PayPhone, aparecera en este historial."
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
    { label: 'Banco', value: bankTransferDetails.bankName || bankTransferDetails.bank || '' },
    { label: 'Titular', value: bankTransferDetails.accountHolder || bankTransferDetails.holder || '' },
    {
      label: 'Tipo de cuenta',
      value: bankTransferDetails.accountType || '',
    },
    {
      label: 'Numero de cuenta',
      value: bankTransferDetails.accountNumber || '',
    },
    { label: 'Codigo SWIFT', value: bankTransferDetails.swiftCode || bankTransferDetails.swift || '' },
    {
      label: 'Pais destino',
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
    bank_transfer: 'Transferencia bancaria',
    paypal: 'PayPal',
    payphone: 'PayPhone',
  };

  return map[value] || value || 'No registrado';
}

function formatProvider(value) {
  const map = {
    manual_bank_transfer: 'Transferencia manual',
    paypal: 'PayPal',
    payphone: 'PayPhone',
  };

  return map[value] || value || 'No registrado';
}

function resolveCouponDiscount(appliedCoupon, baseAmount) {
  if (!appliedCoupon || baseAmount <= 0) {
    return 0;
  }

  if (appliedCoupon.discountAmount !== undefined && appliedCoupon.discountAmount !== null) {
    return Number(Math.max(0, Number(appliedCoupon.discountAmount)).toFixed(2));
  }

  if (appliedCoupon.percentage !== undefined && appliedCoupon.percentage !== null) {
    return Number(Math.max(0, (baseAmount * Number(appliedCoupon.percentage)) / 100).toFixed(2));
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
