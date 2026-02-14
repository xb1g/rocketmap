import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/appwrite-server';
import { SettingsClient } from './SettingsClient';

export default async function SettingsPage() {
  const user = await getSessionUser();

  if (!user) {
    redirect('/?error=unauthorized');
  }

  return <SettingsClient />;
}
