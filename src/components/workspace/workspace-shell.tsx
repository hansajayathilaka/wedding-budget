'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UserMenu } from '@/components/auth/user-menu';
import { FullPageSpinner } from '@/components/auth/auth-gate';
import { useWedding } from '@/data/weddings';
import { cn } from '@/lib/utils';
import { NoAccess } from './no-access';
import { WorkspaceProvider } from './workspace-context';

const TABS = [
  { href: '', label: 'Dashboard' },
  { href: '/items', label: 'Items' },
  { href: '/settings', label: 'Settings' },
] as const;

/**
 * The isolated wedding shell (F3). There is deliberately no link to `/` anywhere in here: the
 * wedding name is plain text, there is no logo link, no breadcrumb and no back button.
 */
export function WorkspaceShell({
  weddingId,
  children,
}: {
  weddingId: string;
  children: ReactNode;
}) {
  const { wedding, status, retry } = useWedding(weddingId);
  const pathname = usePathname();

  if (status === 'loading') return <FullPageSpinner />;
  if (status === 'denied' || !wedding) return <NoAccess weddingId={weddingId} onApproved={retry} />;

  const base = `/w/${weddingId}`;
  return (
    <WorkspaceProvider wedding={wedding}>
      <div className="mx-auto min-h-dvh max-w-5xl px-4 pb-24">
        <header className="sticky top-0 z-30 -mx-4 border-b bg-background/95 px-4 backdrop-blur">
          <div className="flex items-center justify-between gap-3 py-3">
            <div className="min-w-0">
              <p
                className="truncate text-lg font-semibold leading-tight"
                data-testid="wedding-title"
              >
                {wedding.name}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {wedding.groomName} & {wedding.brideName}
              </p>
            </div>
            <UserMenu />
          </div>
          <nav aria-label="Wedding sections" className="-mb-px flex gap-1">
            {TABS.map((tab) => {
              const href = base + tab.href;
              const active = tab.href === '' ? pathname === base : pathname.startsWith(href);
              return (
                <Link
                  key={tab.label}
                  href={href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'border-b-2 px-3 py-2.5 text-sm font-medium transition-colors',
                    active
                      ? 'border-foreground text-foreground'
                      : 'border-transparent text-muted-foreground hover:text-foreground',
                  )}
                >
                  {tab.label}
                </Link>
              );
            })}
          </nav>
        </header>
        <main className="pt-5">{children}</main>
      </div>
    </WorkspaceProvider>
  );
}
