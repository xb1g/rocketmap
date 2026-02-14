'use client';

interface UserAvatarProps {
  name: string;
  size?: 'sm' | 'md' | 'lg';
}

function getInitials(name: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return parts[0].slice(0, 2).toUpperCase();
}

export function UserAvatar({ name, size = 'md' }: UserAvatarProps) {
  return (
    <div className={`user-avatar user-avatar-${size}`}>
      {getInitials(name)}
    </div>
  );
}
