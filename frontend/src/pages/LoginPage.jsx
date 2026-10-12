import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Alert } from '../components/Alert';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { InputField } from '../components/InputField';
import { authService } from '../services/authService';
import { useAuth } from '../hooks/useAuth';
import { useSession } from '../hooks/useSession';

function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { login } = useAuth();
  const { setUserProfile } = useSession();
  const [error, setError] = useState('');
  const [showRecovery, setShowRecovery] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoveryState, setRecoveryState] = useState({
    isSubmitting: false,
    error: '',
    success: '',
  });
  const sessionExpired = searchParams.get('reason') === 'session-expired';
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (values) => {
    try {
      setError('');
      const user = await login(values);
      setUserProfile(user);
      const redirectPath =
        user.role === 'admin' ? '/admin' : location.state?.from || '/dashboard';
      navigate(redirectPath, { replace: true });
    } catch (submissionError) {
      setError(resolveLoginError(submissionError));
    }
  };

  const handleForgotPassword = async () => {
    const normalizedEmail = recoveryEmail.trim().toLowerCase();

    if (!normalizedEmail) {
      setRecoveryState({
        isSubmitting: false,
        error: "Enter the email address you use to access the platform.",
        success: '',
      });
      return;
    }

    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      setRecoveryState({
        isSubmitting: false,
        error: "Enter a valid email address to continue.",
        success: '',
      });
      return;
    }

    try {
      setRecoveryState({
        isSubmitting: true,
        error: '',
        success: '',
      });

      const response = await authService.forgotPassword({
        email: normalizedEmail,
      });

      setRecoveryState({
        isSubmitting: false,
        error: '',
        success:
          response.message ||
          "If the email address exists, a temporary password will be sent to your inbox.",
      });
    } catch (requestError) {
      setRecoveryState({
        isSubmitting: false,
        error:
          requestError?.response?.data?.message ||
          requestError?.message ||
          "Unable to process password recovery.",
        success: '',
      });
    }
  };

  return (
    <section className="container-shell py-20">
      <div className="mx-auto max-w-xl">
        <Card className="p-8 sm:p-10">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-600">
            Account access
          </p>
          <h1 className="mt-3 text-4xl font-semibold text-slate-950">Sign in to the platform</h1>
          <p className="mt-4 text-sm text-slate-600">
            Enter your email and password to access your participant dashboard.
          </p>

          <form className="mt-8 grid gap-5" onSubmit={handleSubmit(onSubmit)}>
            {sessionExpired ? (
              <Alert
                title="Session expired"
                description="For your security, we signed you out automatically. Please sign in again to continue."
                variant="warning"
              />
            ) : null}
            {error ? <Alert title="Unable to sign in" description={error} variant="danger" /> : null}

            <InputField
              label="Email"
              type="email"
              placeholder="email@example.com"
              error={errors.email?.message}
              {...register('email', {
                required: "Email address is required",
                pattern: {
                  value: /^\S+@\S+\.\S+$/,
                  message: "Enter a valid email address",
                },
              })}
            />

            <InputField
              label="Password"
              type="password"
              placeholder="At least 8 characters"
              error={errors.password?.message}
              {...register('password', {
                required: "Password is required",
                minLength: {
                  value: 8,
                  message: "Password must be at least 8 characters long",
                },
              })}
            />

            <div className="flex justify-start">
              <button
                type="button"
                onClick={() => {
                  setShowRecovery((current) => !current);
                  setRecoveryState({
                    isSubmitting: false,
                    error: '',
                    success: '',
                  });
                }}
                className="text-sm font-semibold text-brand-600 transition hover:text-brand-800"
              >
                {showRecovery ? "Hide password recovery" : "Forgot your password?"}
              </button>
            </div>

            {showRecovery ? (
              <div className="rounded-3xl border border-brand-100 bg-brand-50/70 p-5">
                <p className="text-sm font-semibold text-slate-950">Recover password</p>
                <p className="mt-2 text-sm leading-7 text-slate-600">
                  Enter your email address and we will send you a temporary password to restore access.
                </p>
                {recoveryState.error ? (
                  <div className="mt-4">
                    <Alert
                      title="Unable to recover your password"
                      description={recoveryState.error}
                      variant="danger"
                    />
                  </div>
                ) : null}
                {recoveryState.success ? (
                  <div className="mt-4">
                    <Alert
                      title="Request processed"
                      description={recoveryState.success}
                      variant="success"
                    />
                  </div>
                ) : null}
                <div className="mt-4 grid gap-4">
                  <InputField
                    label="Recovery email address"
                    type="email"
                    placeholder="email@example.com"
                    value={recoveryEmail}
                    onChange={(event) => {
                      setRecoveryEmail(event.target.value);
                      setRecoveryState((current) => ({
                        ...current,
                        error: '',
                        success: '',
                      }));
                    }}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    className="w-full sm:w-fit"
                    onClick={handleForgotPassword}
                    disabled={recoveryState.isSubmitting}
                  >
                    {recoveryState.isSubmitting ? 'Solicitando...' : "Request password recovery"}
                  </Button>
                </div>
                <p className="mt-3 text-xs uppercase tracking-[0.18em] text-slate-500">
                  You will receive a temporary password that you can change from your account.
                </p>
              </div>
            ) : null}

            <Button type="submit" variant="primary" disabled={isSubmitting} className="mt-2">
              {isSubmitting ? 'Ingresando...' : "Sign in"}
            </Button>
          </form>
        </Card>
      </div>
    </section>
  );
}

function resolveLoginError(error) {
  return (
    error?.response?.data?.message ||
    error?.message ||
    "Unable to sign in."
  );
}

export default LoginPage;
