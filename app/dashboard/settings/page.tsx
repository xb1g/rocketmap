import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/appwrite-server';
import { SettingsClient } from './SettingsClient';
import { getAnthropicApiKeyFromUser, maskAnthropicApiKey } from '@/lib/ai/user-preferences';

export default async function SettingsPage() {
  const user = await getSessionUser();

  if (!user) {
    redirect('/?error=unauthorized');
  }

  const anthropicApiKey = getAnthropicApiKeyFromUser(user);

  return (
    <SettingsClient
      initialAnthropicKeyStatus={{
        hasKey: Boolean(anthropicApiKey),
        maskedKey: anthropicApiKey ? maskAnthropicApiKey(anthropicApiKey) : null,
      }}
    />
  );
}
