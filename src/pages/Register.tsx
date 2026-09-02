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
import { registerSchema, type RegisterInput } from '@/utils/validators';
import {
  ArrowRightIcon,
  EyeIcon,
  EyeOffIcon,
  LockIcon,
  MailIcon,
  UserIcon,
  ZapIcon,
} from '@/components/ui/Icon';

export default function Register() {
  const { register: registerAccount, signInWithGoogle } = useAuth();
  const { error: showError } = useToast();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { displayName: '', email: '', password: '', confirmPassword: '' },
  });

  const onSubmit = async (values: RegisterInput) => {
    try {
      await registerAccount(values.displayName, values.email, values.password);
      navigate(APP_ROUTES.dashboard);
    } catch (err) {
      showError('Registration failed', getErrorMessage(err));
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
        title="Create your account"
        description="Start moving files to Google Drive in seconds."
        Icon={ZapIcon}
        footer={
          <>
            Already have an account?{' '}
            <Link to={APP_ROUTES.login} className="font-medium text-electric transition hover:text-electric-100">
              Sign in
            </Link>
          </>
        }
      >
        <GoogleButton onClick={handleGoogle} loading={googleLoading} label="Sign up with Google" />

        <div className="my-6 flex items-center gap-4">
          <span className="h-px flex-1 bg-white/10" />
          <span className="text-xs uppercase tracking-wider text-slate-500">or</span>
          <span className="h-px flex-1 bg-white/10" />
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <Input
            label="Full name"
            type="text"
            placeholder="Jane Doe"
            leftIcon={<UserIcon size={17} />}
            error={errors.displayName?.message}
            autoComplete="name"
            {...register('displayName')}
          />
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
            placeholder="Min. 6 characters"
            leftIcon={<LockIcon size={17} />}
            error={errors.password?.message}
            autoComplete="new-password"
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
          <Input
            label="Confirm password"
            type={showPassword ? 'text' : 'password'}
            placeholder="Repeat your password"
            leftIcon={<LockIcon size={17} />}
            error={errors.confirmPassword?.message}
            autoComplete="new-password"
            {...register('confirmPassword')}
          />
          <Button type="submit" variant="primary" size="lg" fullWidth loading={isSubmitting}>
            Create account
            <ArrowRightIcon size={17} />
          </Button>
        </form>
      </AuthShell>
      <BackToHome />
    </>
  );
}
