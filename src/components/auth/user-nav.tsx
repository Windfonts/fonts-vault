'use client';

import { useSession } from 'next-auth/react';
import { LogoutButton } from './logout-button';

export function UserNav() {
  const { data: session, status } = useSession();

  if (status !== 'authenticated' || !session?.user) {
    return null;
  }

  return (
    <div className="flex items-center gap-4">
      <div className="text-sm">
        <p className="font-medium">{session.user.name}</p>
        <p className="text-muted-foreground">{session.user.email}</p>
      </div>
      <LogoutButton />
    </div>
  );
}
