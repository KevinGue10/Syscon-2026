import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { Alert } from '../components/Alert';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { paymentService } from '../services/paymentService';
import { dashboardService } from '../services/dashboardService';
import { formatCurrency } from '../utils/currency';
import { translatePaymentStatus } from '../utils/translations';

function PaymentSuccess() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [state, setState] = useState({
    isLoading: true,
    error: '',
    payment: null,
    paymentSummary: null,
    registration: null,
    payments: [],
  });

  useEffect(() => {
    let isMounted = true;

    async function resolvePaymentReturn() {
      try {
        setState({
          isLoading: true,
          error: '',
          payment: null,
          paymentSummary: null,
          registration: null,
          payments: [],
        });

        if (location.pathname.includes('/paypal/return')) {
          const orderId = searchParams.get('token') || searchParams.get('orderId');

          if (!orderId) {
            throw new Error("PayPal order ID was not found.");
          }

          const response = await paymentService.capturePayPalOrder(orderId);

          if (!isMounted) {
            return;
          }

          setState({
            isLoading: false,
            error: '',
            payment: response.payment,
            paymentSummary: response.paymentSummary,
            registration: response.registration,
            payments: response.payment ? [response.payment] : [],
          });
          return;
        }

        const registrationResponse = await dashboardService.getMyRegistrationDetails();
        const registration = registrationResponse.registrations?.[0] || null;
        const paymentsResponse = registration
          ? await paymentService.getRegistrationPayments(registration.id)
          : { payments: [] };

        if (!isMounted) {
          return;
        }

        setState({
          isLoading: false,
          error: '',
          payment: paymentsResponse.payments?.[0] || null,
          paymentSummary: registration?.paymentSummary || registration?.pricing?.breakdown || null,
          registration,
          payments: paymentsResponse.payments || [],
        });
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setState({
          isLoading: false,
          error:
            error?.response?.data?.message ||
            error?.message ||
            "Unable to confirm the payment status.",
          payment: null,
          paymentSummary: null,
          registration: null,
          payments: [],
        });
      }
    }

    resolvePaymentReturn();

    return () => {
      isMounted = false;
    };
  }, [location.pathname, searchParams]);

  const latestPayment = useMemo(() => state.payment || state.payments?.[0] || null, [state.payment, state.payments]);
  const alertVariant = latestPayment?.status === 'approved' ? 'success' : 'info';
  const alertTitle =
    latestPayment?.status === 'approved'
      ? "Payment confirmed"
      : "Payment recorded or pending review";
  const alertDescription =
    latestPayment?.status === 'approved'
      ? "The payment has been applied to your registration."
      : "The provider returned successfully. If the status is still pending, check again in a few minutes.";

  return (
    <section className="container-shell py-16">
      <div className="mx-auto max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-600">Payments</p>
        <h1 className="mt-3 text-4xl font-semibold text-slate-950">Payment result</h1>

        {state.isLoading ? (
          <div className="mt-8">
            <Alert
              title="Checking payment status"
              description="Checking the final payment result with the server."
              variant="info"
            />
          </div>
        ) : state.error ? (
          <div className="mt-8">
            <Alert title="Unable to confirm the payment" description={state.error} variant="danger" />
          </div>
        ) : (
          <>
            <div className="mt-8">
              <Alert title={alertTitle} description={alertDescription} variant={alertVariant} />
            </div>

            <Card className="mt-8 p-8">
              <div className="grid gap-4 md:grid-cols-2">
                <InfoItem label="Method" value={formatMethod(latestPayment?.paymentMethod)} />
                <InfoItem label="Provider" value={formatProvider(latestPayment?.provider)} />
                <InfoItem label="Status" value={translatePaymentStatus(latestPayment?.status)} />
                <InfoItem label="Amount" value={formatCurrency(latestPayment?.amountUsd || 0)} />
                <InfoItem label="Amount paid" value={formatCurrency(state.paymentSummary?.paidAmount || state.registration?.paidAmount || 0)} />
                <InfoItem label="Outstanding balance" value={formatCurrency(state.paymentSummary?.pendingAmount || state.registration?.pendingAmount || 0)} />
              </div>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link to="/payments">
                  <Button variant="primary">Back to payments</Button>
                </Link>
                <Link to="/dashboard">
                  <Button variant="ghost" className="border border-slate-200">Go to dashboard</Button>
                </Link>
              </div>
            </Card>
          </>
        )}
      </div>
    </section>
  );
}

function InfoItem({ label, value }) {
  return (
    <div className="rounded-2xl bg-slate-50 px-4 py-4">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-semibold text-slate-950">{value || "Not provided"}</p>
    </div>
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

function formatProvider(value) {
  const map = {
    manual_bank_transfer: "Manual bank transfer",
    paypal: 'PayPal',
    payphone: 'PayPhone',
  };

  return map[value] || value || "Not provided";
}

export default PaymentSuccess;
