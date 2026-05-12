import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { Alert } from '../components/Alert';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { InputField } from '../components/InputField';
import { useAuth } from '../hooks/useAuth';
import { authService } from '../services/authService';

function ChangePasswordPage() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [serverState, setServerState] = useState({
    error: '',
    success: '',
  });
  const {
    register,
    handleSubmit,
    setError,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const newPassword = watch('newPassword');

  const onSubmit = async (values) => {
    try {
      setServerState({
        error: '',
        success: '',
      });

      await authService.changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });

      setServerState({
        error: '',
        success: 'Tu contrasena fue actualizada. Por seguridad debes iniciar sesion de nuevo.',
      });

      setTimeout(() => {
        logout();
        navigate('/login', { replace: true });
      }, 1200);
    } catch (error) {
      const backendFieldErrors = error?.response?.data?.errors || [];
      backendFieldErrors.forEach((item) => {
        if (item?.field) {
          setError(item.field, {
            type: 'server',
            message: item.message,
          });
        }
      });

      setServerState({
        error: resolveBackendPasswordError(error),
        success: '',
      });
    }
  };

  return (
    <section className="container-shell py-16">
      <div className="mx-auto max-w-2xl">
        <Card className="p-8 sm:p-10">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-600">
            Seguridad
          </p>
          <h1 className="mt-3 text-4xl font-semibold text-slate-950">Cambiar contrasena</h1>
          <p className="mt-4 text-sm leading-7 text-slate-600">
            Actualiza tu contrasena de acceso. Despues del cambio cerraremos tu sesion por
            seguridad y te enviaremos de nuevo al ingreso.
          </p>

          <form className="mt-8 grid gap-5" onSubmit={handleSubmit(onSubmit)}>
            {serverState.error ? (
              <Alert
                title="No fue posible cambiar la contrasena"
                description={serverState.error}
                variant="danger"
              />
            ) : null}

            {serverState.success ? (
              <Alert
                title="Contrasena actualizada"
                description={serverState.success}
                variant="success"
              />
            ) : null}

            <InputField
              label="Contrasena actual"
              type="password"
              error={errors.currentPassword?.message}
              {...register('currentPassword', {
                required: 'La contrasena actual es obligatoria',
              })}
            />

            <InputField
              label="Nueva contrasena"
              type="password"
              error={errors.newPassword?.message}
              helperText="Usa al menos 8 caracteres."
              {...register('newPassword', {
                required: 'La nueva contrasena es obligatoria',
                minLength: {
                  value: 8,
                  message: 'La nueva contrasena debe tener al menos 8 caracteres',
                },
              })}
            />

            <InputField
              label="Confirmar nueva contrasena"
              type="password"
              error={errors.confirmPassword?.message}
              {...register('confirmPassword', {
                required: 'Debes confirmar la nueva contrasena',
                validate: (value) =>
                  value === newPassword || 'La confirmacion no coincide con la nueva contrasena',
              })}
            />

            <div className="mt-2 flex flex-wrap gap-3">
              <Button type="submit" variant="primary" disabled={isSubmitting}>
                {isSubmitting ? 'Guardando...' : 'Actualizar contrasena'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="border border-slate-200"
                onClick={() => navigate('/dashboard')}
              >
                Volver al panel
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </section>
  );
}

export default ChangePasswordPage;

function resolveBackendPasswordError(error) {
  const fieldErrorMessage = error?.response?.data?.errors?.[0]?.message;

  return (
    fieldErrorMessage ||
    error?.response?.data?.message ||
    error?.message ||
    'No fue posible actualizar la contrasena.'
  );
}
