import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/appwrite-server';
import { SettingsClient } from './SettingsClient';
import { getAiApiKeyFromUser, maskAiApiKey } from '@/lib/ai/user-preferences';

export default async function SettingsPage() {
  const user = await getSessionUser();

  if (!user) {
    redirect('/?error=unauthorized');
  }

  const aiApiKey = getAiApiKeyFromUser(user);

  return (
    <SettingsClient
      initialAnthropicKeyStatus={{
        hasKey: Boolean(aiApiKey),
        maskedKey: aiApiKey ? maskAiApiKey(aiApiKey) : null,
      }}
    />
  );
}
