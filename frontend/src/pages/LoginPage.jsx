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
      email: 'attendee@ieee.org',
      password: '123456',
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
            Secure Access
          </p>
          <h1 className="mt-3 text-4xl font-semibold text-slate-950">Sign in to the platform</h1>
          <p className="mt-4 text-sm text-slate-600">
            Mock authentication is enabled. Use `attendee@ieee.org` or `admin@ieee.org`.
          </p>

          <form className="mt-8 grid gap-5" onSubmit={handleSubmit(onSubmit)}>
            {error ? <Alert title="Login failed" description={error} variant="danger" /> : null}

            <InputField
              label="Email"
              type="email"
              placeholder="attendee@ieee.org"
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
              placeholder="Minimum 6 characters"
              error={errors.password?.message}
              {...register('password', {
                required: 'Password is required',
                minLength: {
                  value: 6,
                  message: 'Password must have at least 6 characters',
                },
              })}
            />

            <Button type="submit" variant="primary" disabled={isSubmitting} className="mt-2">
              {isSubmitting ? 'Signing in...' : 'Login'}
            </Button>
          </form>
        </Card>
      </div>
    </section>
  );
}

export default LoginPage;
