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
  const { logout, user } = useAuth();
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
        success: "Your password has been updated. Please sign in again for security.",
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
            Security
          </p>
          <h1 className="mt-3 text-4xl font-semibold text-slate-950">Change password</h1>
          <p className="mt-4 text-sm leading-7 text-slate-600">
            Update your account password. After the change, we will sign you out and return you to the sign-in page.
          </p>

          <form className="mt-8 grid gap-5" onSubmit={handleSubmit(onSubmit)}>
            {serverState.error ? (
              <Alert
                title="Unable to change your password"
                description={serverState.error}
                variant="danger"
              />
            ) : null}

            {serverState.success ? (
              <Alert
                title="Password updated"
                description={serverState.success}
                variant="success"
              />
            ) : null}

            <InputField
              label="Current password"
              type="password"
              autoComplete="current-password"
              error={errors.currentPassword?.message}
              {...register('currentPassword', {
                required: "Current password is required",
              })}
            />

            <InputField
              label="New password"
              type="password"
              autoComplete="new-password"
              error={errors.newPassword?.message}
              helperText="Use at least 8 characters."
              {...register('newPassword', {
                required: "New password is required",
                minLength: {
                  value: 8,
                  message: "New password must be at least 8 characters long",
                },
              })}
            />

            <InputField
              label="Confirm new password"
              type="password"
              autoComplete="new-password"
              error={errors.confirmPassword?.message}
              {...register('confirmPassword', {
                required: "Please confirm your new password",
                validate: (value) =>
                  value === newPassword || "The confirmation does not match the new password",
              })}
            />

            <div className="mt-2 flex flex-wrap gap-3">
              <Button type="submit" variant="primary" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Update password"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="border border-slate-200"
                onClick={() => navigate(user?.role === 'admin' ? '/admin' : '/dashboard')}
              >
                Back to dashboard
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
    "Unable to update your password."
  );
}
