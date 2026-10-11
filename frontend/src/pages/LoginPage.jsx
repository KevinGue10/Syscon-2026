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
        error: 'Ingresa el correo con el que accedes a la plataforma.',
        success: '',
      });
      return;
    }

    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      setRecoveryState({
        isSubmitting: false,
        error: 'Ingresa un correo válido para continuar.',
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
          'Si el correo existe, se enviará una contraseña provisional a tu bandeja de entrada.',
      });
    } catch (requestError) {
      setRecoveryState({
        isSubmitting: false,
        error:
          requestError?.response?.data?.message ||
          requestError?.message ||
          'No fue posible procesar la recuperacion de contraseña.',
        success: '',
      });
    }
  };

  return (
    <section className="container-shell py-20">
      <div className="mx-auto max-w-xl">
        <Card className="p-8 sm:p-10">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-600">
            Acceso
          </p>
          <h1 className="mt-3 text-4xl font-semibold text-slate-950">Ingresa a la plataforma</h1>
          <p className="mt-4 text-sm text-slate-600">
            Ingresa con tu correo y contraseña para acceder a tu panel de participante.
          </p>

          <form className="mt-8 grid gap-5" onSubmit={handleSubmit(onSubmit)}>
            {sessionExpired ? (
              <Alert
                title="Sesión expirada"
                description="Por seguridad cerramos tu sesión automáticamente. Ingresa de nuevo para continuar."
                variant="warning"
              />
            ) : null}
            {error ? <Alert title="No fue posible iniciar sesión" description={error} variant="danger" /> : null}

            <InputField
              label="Email"
              type="email"
              placeholder="correo@dominio.com"
              error={errors.email?.message}
              {...register('email', {
                required: 'El correo es obligatorio',
                pattern: {
                  value: /^\S+@\S+\.\S+$/,
                  message: 'Ingresa un correo válido',
                },
              })}
            />

            <InputField
              label="Contraseña"
              type="password"
              placeholder="Mínimo 8 caracteres"
              error={errors.password?.message}
              {...register('password', {
                required: 'La contraseña es obligatoria',
                minLength: {
                  value: 8,
                  message: 'La contraseña debe tener al menos 8 caracteres',
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
                {showRecovery ? 'Ocultar recuperacion de contraseña' : '¿Olvidaste tu contraseña?'}
              </button>
            </div>

            {showRecovery ? (
              <div className="rounded-3xl border border-brand-100 bg-brand-50/70 p-5">
                <p className="text-sm font-semibold text-slate-950">Recuperar contraseña</p>
                <p className="mt-2 text-sm leading-7 text-slate-600">
                  Ingresa tu correo y te enviaremos una contraseña temporal para recuperar el acceso.
                </p>
                {recoveryState.error ? (
                  <div className="mt-4">
                    <Alert
                      title="No fue posible recuperar la contraseña"
                      description={recoveryState.error}
                      variant="danger"
                    />
                  </div>
                ) : null}
                {recoveryState.success ? (
                  <div className="mt-4">
                    <Alert
                      title="Solicitud procesada"
                      description={recoveryState.success}
                      variant="success"
                    />
                  </div>
                ) : null}
                <div className="mt-4 grid gap-4">
                  <InputField
                    label="Correo para recuperacion"
                    type="email"
                    placeholder="correo@dominio.com"
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
                    {recoveryState.isSubmitting ? 'Solicitando...' : 'Solicitar recuperacion'}
                  </Button>
                </div>
                <p className="mt-3 text-xs uppercase tracking-[0.18em] text-slate-500">
                  Recibirás una contraseña provisional y luego podrás cambiarla desde tu cuenta.
                </p>
              </div>
            ) : null}

            <Button type="submit" variant="primary" disabled={isSubmitting} className="mt-2">
              {isSubmitting ? 'Ingresando...' : 'Ingresar'}
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
    'No fue posible iniciar sesión.'
  );
}

export default LoginPage;
