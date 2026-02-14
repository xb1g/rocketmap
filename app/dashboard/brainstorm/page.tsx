import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/appwrite-server';
import { BrainstormClient } from './BrainstormClient';

export default async function BrainstormPage() {
  const user = await getSessionUser();

  if (!user) {
    redirect('/?error=unauthorized');
  }

  return <BrainstormClient />;
}
