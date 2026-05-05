import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useLocation, useNavigate } from 'react-router-dom';
import { Alert } from '../components/Alert';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { InputField } from '../components/InputField';
import { useAuth } from '../hooks/useAuth';
import { useSession } from '../hooks/useSession';

function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const { setUserProfile } = useSession();
  const [error, setError] = useState('');
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
      setError(submissionError.message);
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
            Este formulario usa el backend local real configurado en `VITE_API_URL`.
          </p>

          <form className="mt-8 grid gap-5" onSubmit={handleSubmit(onSubmit)}>
            {error ? <Alert title="No fue posible iniciar sesion" description={error} variant="danger" /> : null}

            <InputField
              label="Email"
              type="email"
              placeholder="correo@dominio.com"
              error={errors.email?.message}
              {...register('email', {
                required: 'Email is required',
                pattern: {
                  value: /^\S+@\S+\.\S+$/,
                  message: 'Enter a valid email',
                },
              })}
            />

            <InputField
              label="Password"
              type="password"
              placeholder="Minimo 8 caracteres"
              error={errors.password?.message}
              {...register('password', {
                required: 'Password is required',
                minLength: {
                  value: 8,
                  message: 'Password must have at least 8 characters',
                },
              })}
            />

            <Button type="submit" variant="primary" disabled={isSubmitting} className="mt-2">
              {isSubmitting ? 'Ingresando...' : 'Ingresar'}
            </Button>
          </form>
        </Card>
      </div>
    </section>
  );
}

export default LoginPage;
