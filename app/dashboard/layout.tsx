import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/appwrite-server';
import { DashboardSidebar } from '../components/dashboard/DashboardSidebar';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();

  if (!user) {
    redirect('/?error=unauthorized');
  }

  return (
    <div className="dashboard-layout">
      <div className="dashboard-atmosphere" />
      <DashboardSidebar
        user={{
          name: user.name || '',
          email: user.email,
        }}
      />
      <main className="dashboard-main">
        <div className="dashboard-content">
          {children}
        </div>
      </main>
    </div>
  );
}
