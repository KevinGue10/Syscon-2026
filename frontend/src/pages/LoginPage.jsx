import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Alert } from '../components/Alert';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { InputField } from '../components/InputField';
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

  return (
    <section className="container-shell py-20">
      <div className="mx-auto max-w-xl">
        <Card className="p-8 sm:p-10">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-600">
            Acceso
          </p>
          <h1 className="mt-3 text-4xl font-semibold text-slate-950">Ingresa a la plataforma</h1>
          <p className="mt-4 text-sm text-slate-600">
            Ingresa con tu correo y contrasena para acceder a tu panel de participante.
          </p>

          <form className="mt-8 grid gap-5" onSubmit={handleSubmit(onSubmit)}>
            {sessionExpired ? (
              <Alert
                title="Sesion expirada"
                description="Por seguridad cerramos tu sesion automaticamente. Ingresa de nuevo para continuar."
                variant="warning"
              />
            ) : null}
            {error ? <Alert title="No fue posible iniciar sesion" description={error} variant="danger" /> : null}

            <InputField
              label="Email"
              type="email"
              placeholder="correo@dominio.com"
              error={errors.email?.message}
              {...register('email', {
                required: 'El correo es obligatorio',
                pattern: {
                  value: /^\S+@\S+\.\S+$/,
                  message: 'Ingresa un correo valido',
                },
              })}
            />

            <InputField
              label="Contrasena"
              type="password"
              placeholder="Minimo 8 caracteres"
              error={errors.password?.message}
              {...register('password', {
                required: 'La contrasena es obligatoria',
                minLength: {
                  value: 8,
                  message: 'La contrasena debe tener al menos 8 caracteres',
                },
              })}
            />

            <div className="flex justify-start">
              <button
                type="button"
                onClick={() => setShowRecovery((current) => !current)}
                className="text-sm font-semibold text-brand-600 transition hover:text-brand-800"
              >
                {showRecovery ? 'Ocultar recuperacion de contrasena' : '¿Olvidaste tu contrasena?'}
              </button>
            </div>

            {showRecovery ? (
              <div className="rounded-3xl border border-brand-100 bg-brand-50/70 p-5">
                <p className="text-sm font-semibold text-slate-950">Recuperar contrasena</p>
                <p className="mt-2 text-sm leading-7 text-slate-600">
                  Esta seccion queda lista para conectar el envio de correo desde el backend.
                  Por ahora, el flujo es solo visual.
                </p>
                <div className="mt-4 grid gap-4">
                  <InputField
                    label="Correo para recuperacion"
                    type="email"
                    placeholder="correo@dominio.com"
                    value={recoveryEmail}
                    onChange={(event) => setRecoveryEmail(event.target.value)}
                  />
                  <Button type="button" variant="secondary" className="w-full sm:w-fit">
                    Solicitar recuperacion
                  </Button>
                </div>
                <p className="mt-3 text-xs uppercase tracking-[0.18em] text-slate-500">
                  Proximamente enviaremos un enlace de restablecimiento a este correo.
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
    'No fue posible iniciar sesion.'
  );
}

export default LoginPage;
