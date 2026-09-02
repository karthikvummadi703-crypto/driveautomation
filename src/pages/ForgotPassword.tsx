import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { AuthShell, BackToHome } from '@/components/auth/AuthShell';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { APP_ROUTES } from '@/config/constants';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { getErrorMessage } from '@/services/api';
import { forgotPasswordSchema, type ForgotPasswordInput } from '@/utils/validators';
import { CheckCircleIcon, KeyIcon, MailIcon, SendIcon } from '@/components/ui/Icon';

export default function ForgotPassword() {
  const { resetPassword } = useAuth();
  const { success, error: showError } = useToast();
  const [sent, setSent] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = async (values: ForgotPasswordInput) => {
    try {
      await resetPassword(values.email);
      setSent(true);
      success('Password reset email sent', 'Check your inbox for the reset link.');
    } catch (err) {
      showError('Could not send reset email', getErrorMessage(err));
    }
  };

  return (
    <>
      <AuthShell
        title="Reset your password"
        description="We’ll email you a secure link to create a new one."
        Icon={KeyIcon}
        accent="from-grape to-electric"
        footer={
          <>
            Remembered it?{' '}
            <Link to={APP_ROUTES.login} className="font-medium text-electric transition hover:text-electric-100">
              Back to sign in
            </Link>
          </>
        }
      >
        {sent ? (
          <div className="flex flex-col items-center text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-400/10 text-emerald-400">
              <CheckCircleIcon size={28} />
            </span>
            <p className="mt-4 text-sm text-slate-300">
              If an account exists for that address, a password reset link is on its way.
            </p>
            <Button
              variant="secondary"
              className="mt-6"
              onClick={() => setSent(false)}
            >
              Send again
            </Button>
          </div>
        ) : (
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
            <Button type="submit" variant="primary" size="lg" fullWidth loading={isSubmitting}>
              Send reset link
              <SendIcon size={17} />
            </Button>
          </form>
        )}
      </AuthShell>
      <BackToHome />
    </>
  );
}
