import { Outlet } from 'react-router-dom';
import { Background } from '@/components/layout/Background';

export function AuthLayout() {
  return (
    <div className="relative flex min-h-screen items-center justify-center px-4 py-12">
      <Background />
      <div className="w-full max-w-md">
        <Outlet />
      </div>
    </div>
  );
}
