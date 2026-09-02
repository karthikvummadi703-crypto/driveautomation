import { Button } from '@/components/ui/Button';
import { GoogleIcon } from '@/components/ui/Icon';

export interface GoogleButtonProps {
  onClick: () => void;
  loading?: boolean;
  fullWidth?: boolean;
  label?: string;
}

export function GoogleButton({
  onClick,
  loading = false,
  fullWidth = true,
  label = 'Continue with Google',
}: GoogleButtonProps) {
  return (
    <Button variant="secondary" onClick={onClick} loading={loading} fullWidth={fullWidth} type="button">
      {!loading && <GoogleIcon size={18} />}
      {label}
    </Button>
  );
}
