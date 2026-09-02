import { RouterProvider } from 'react-router-dom';
import { router } from '@/routes';
import { ThemeProvider } from '@/context/ThemeContext';
import { ToastProvider } from '@/context/ToastContext';
import { AuthProvider } from '@/context/AuthContext';
import { DriveProvider } from '@/context/DriveContext';

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <DriveProvider>
            <RouterProvider router={router} />
          </DriveProvider>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
