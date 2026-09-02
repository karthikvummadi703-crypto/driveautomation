import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { AuthShell, BackToHome } from '@/components/auth/AuthShell';
import { GoogleButton } from '@/components/auth/GoogleButton';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { APP_ROUTES } from '@/config/constants';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { getErrorMessage } from '@/services/api';
import { loginSchema, type LoginInput } from '@/utils/validators';
import { ArrowRightIcon, EyeIcon, EyeOffIcon, LockIcon, LogInIcon, MailIcon } from '@/components/ui/Icon';

export default function Login() {
  const { signInWithEmail, signInWithGoogle } = useAuth();
  const { error: showError } = useToast();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (values: LoginInput) => {
    try {
      await signInWithEmail(values.email, values.password);
      navigate(APP_ROUTES.dashboard);
    } catch (err) {
      showError('Sign in failed', getErrorMessage(err));
    }
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
      navigate(APP_ROUTES.dashboard);
    } catch (err) {
      showError('Google sign in failed', getErrorMessage(err));
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <>
      <AuthShell
        title="Welcome back"
        description="Sign in to upload files straight to your Google Drive."
        Icon={LogInIcon}
        footer={
          <>
            Don’t have an account?{' '}
            <Link to={APP_ROUTES.register} className="font-medium text-electric transition hover:text-electric-100">
              Create one
            </Link>
          </>
        }
      >
        <GoogleButton onClick={handleGoogle} loading={googleLoading} />

        <div className="my-6 flex items-center gap-4">
          <span className="h-px flex-1 bg-white/10" />
          <span className="text-xs uppercase tracking-wider text-slate-500">or</span>
          <span className="h-px flex-1 bg-white/10" />
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <Input
            label="Email address"
            type="email"
            placeholder="you@example.com"
            leftIcon={<MailIcon size={17} />}
            error={errors.email?.message}
            autoComplete="email"
            {...register('email')}
          />
          <Input
            label="Password"
            type={showPassword ? 'text' : 'password'}
            placeholder="••••••••"
            leftIcon={<LockIcon size={17} />}
            error={errors.password?.message}
            autoComplete="current-password"
            rightSlot={
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="p-1 text-slate-400 transition hover:text-white"
              >
                {showPassword ? <EyeOffIcon size={17} /> : <EyeIcon size={17} />}
              </button>
            }
            {...register('password')}
          />
          <div className="flex justify-end">
            <Link
              to={APP_ROUTES.forgotPassword}
              className="text-xs font-medium text-slate-400 transition hover:text-electric"
            >
              Forgot password?
            </Link>
          </div>
          <Button type="submit" variant="primary" size="lg" fullWidth loading={isSubmitting}>
            Sign in
            <ArrowRightIcon size={17} />
          </Button>
        </form>
      </AuthShell>
      <BackToHome />
    </>
  );
}
