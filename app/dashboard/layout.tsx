import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/appwrite-server';
import { DashboardSidebar } from '../components/dashboard/DashboardSidebar';
import { checkAiQuota } from '@/lib/ai/quota';
import { getAiUsageStatsFromUser } from '@/lib/ai/user-preferences';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();

  if (!user) {
    redirect('/?error=unauthorized');
  }

  const aiQuota = await checkAiQuota(user);
  const aiUsage = getAiUsageStatsFromUser(user);

  return (
    <div className="dashboard-layout">
      <DashboardSidebar
        user={{
          name: user.name || '',
          email: user.email,
        }}
        aiQuota={{
          allowed: aiQuota.allowed,
          used: aiQuota.used,
          limit: aiQuota.limit,
          tier: aiQuota.tier,
          resetsAt: aiQuota.resetsAt,
          lifetimeCalls: aiUsage.calls,
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
