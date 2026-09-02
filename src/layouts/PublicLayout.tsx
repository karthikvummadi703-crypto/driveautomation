import { Outlet } from 'react-router-dom';
import { Background } from '@/components/layout/Background';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';

export function PublicLayout() {
  return (
    <div className="relative min-h-screen">
      <Background />
      <Navbar />
      <main>
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
