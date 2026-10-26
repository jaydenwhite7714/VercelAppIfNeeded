'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import {
  BarChart3,
  BookOpen,
  FileSignature,
  FolderKanban,
  Inbox,
  Lock,
  Quote,
  Settings2,
  type LucideIcon,
} from 'lucide-react';
import { Wordmark } from '@/components/brand';
import { Skeleton } from '@/components/ui';
import { useReadySettings } from '@/lib/hooks';
import { cn } from '@/lib/cn';
import { useGuestAccess } from '@/components/auth/GuestAccess';

interface NavItem {
  href: string;
  label: string;
  short: string;
  icon: LucideIcon;
}

const NAV: NavItem[] = [
  { href: '/app', label: 'The ledger', short: 'Ledger', icon: BookOpen },
  { href: '/app/requests', label: 'Requests', short: 'Requests', icon: Inbox },
  { href: '/app/projects', label: 'Projects', short: 'Projects', icon: FolderKanban },
  { href: '/app/change-orders', label: 'Change orders', short: 'Orders', icon: FileSignature },
  { href: '/app/reports', label: 'Leak report', short: 'Report', icon: BarChart3 },
];

const SECONDARY: NavItem[] = [
  { href: '/app/library', label: 'Reply library', short: 'Library', icon: Quote },
  { href: '/app/settings', label: 'Settings', short: 'Settings', icon: Settings2 },
];

// Keep the secondary reply library reachable in the mobile workspace as well.
const MOBILE_NAV: NavItem[] = [...NAV, SECONDARY[0]];

function GuestUsageBadge() {
  const { mode, actionsRemaining } = useGuestAccess();
  if (mode !== 'guest') return null;
  return (
    <p className="mt-0 whitespace-nowrap rounded-lg border border-accent/20 bg-accent-soft/50 px-2.5 py-1.5 text-[10.5px] font-medium text-accent-deep lg:mt-2" role="status">
      <span className="lg:hidden">Guest {actionsRemaining}/2</span>
      <span className="hidden lg:inline">{actionsRemaining} of 2 guest actions left</span>
    </p>
  );
}

function NavLink({ item, active, onClick }: { item: NavItem; active: boolean; onClick?: () => void }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={cn(
        'group flex items-center gap-2.5 rounded-[10px] px-3 py-2 text-[13.5px] transition-colors',
        active ? 'bg-ink text-paper' : 'text-ink-soft hover:bg-ink/[0.05] hover:text-ink',
      )}
      aria-current={active ? 'page' : undefined}
    >
      <Icon className={cn('h-4 w-4', active ? 'text-paper' : 'text-ink-mute group-hover:text-ink')} strokeWidth={1.8} />
      {item.label}
    </Link>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { settings, loading } = useReadySettings();

  useEffect(() => {
    if (!loading && !settings?.onboardedAt) router.replace('/onboarding');
  }, [loading, settings, router]);

  if (loading) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-6xl gap-8 px-5 py-10">
        <div className="hidden w-56 shrink-0 space-y-3 lg:block">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="mt-8 h-9 w-full" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
        </div>
        <div className="flex-1 space-y-4">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-2/3" />
          <div className="grid gap-4 sm:grid-cols-3">
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!settings?.onboardedAt) {
    return <div className="min-h-dvh" />;
  }

  const isActive = (href: string) => (href === '/app' ? pathname === '/app' : pathname?.startsWith(href));

  return (
    <div className="min-h-dvh bg-paper">
      {/* desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[248px] flex-col border-r border-line bg-paper-deep/25 px-3.5 py-5 lg:flex">
        <Link href="/" className="px-2.5" aria-label="Unbilled home">
          <Wordmark />
        </Link>

        <div className="mt-6 px-1">
          <div className="rounded-xl border border-line bg-card px-3 py-2.5">
            <p className="mono-label">workspace</p>
            <p className="mt-1 truncate text-[13px] font-medium">{settings.businessName || settings.name}</p>
            <p className="mt-0.5 truncate text-[11.5px] text-ink-mute">
              {settings.role} · {settings.currency}
            </p>
            <GuestUsageBadge />
          </div>
        </div>

        <nav className="mt-6 flex flex-col gap-0.5" aria-label="Workspace">
          {NAV.map((item) => (
            <NavLink key={item.href} item={item} active={!!isActive(item.href)} />
          ))}
        </nav>

        <div className="my-4 h-px bg-line" />

        <nav className="flex flex-col gap-0.5" aria-label="More">
          {SECONDARY.map((item) => (
            <NavLink key={item.href} item={item} active={!!isActive(item.href)} />
          ))}
        </nav>

        <div className="mt-auto rounded-xl border border-line bg-card/70 p-3">
          <div className="flex items-center gap-1.5 text-sage">
            <Lock className="h-3 w-3" />
            <span className="mono-label text-sage">local-first</span>
          </div>
          <p className="mt-1.5 text-[11px] leading-relaxed text-ink-mute">
            Your ledger is stored in this browser. Export a backup in settings.
          </p>
        </div>
      </aside>

      {/* mobile header */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-paper/90 px-4 backdrop-blur-md lg:hidden">
        <Link href="/app" aria-label="Unbilled ledger">
          <Wordmark />
        </Link>
        <div className="flex items-center gap-2">
          <GuestUsageBadge />
          <Link
            href="/app/settings"
            className={cn(
              'flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-card',
              pathname === '/app/settings' && 'border-ink',
            )}
            aria-label="Settings"
          >
            <Settings2 className="h-4 w-4" />
          </Link>
        </div>
      </header>

      <main className="lg:pl-[248px]">
        <div className="mx-auto w-full max-w-5xl px-4 pb-28 pt-5 sm:px-7 sm:pt-8 lg:pb-16">{children}</div>
      </main>

      {/* mobile bottom nav */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-paper/95 pb-[max(env(safe-area-inset-bottom),0.5rem)] backdrop-blur-md lg:hidden"
        aria-label="Primary"
      >
        <div className="grid grid-cols-6">
          {MOBILE_NAV.map((item) => {
            const Icon = item.icon;
            const active = !!isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn('flex flex-col items-center gap-1 py-2 text-[10.5px]', active ? 'text-ink' : 'text-ink-mute')}
              >
                <Icon className="h-[18px] w-[18px]" strokeWidth={active ? 2.2 : 1.8} />
                {item.short}
                <span className={cn('h-0.5 w-4 rounded-full', active ? 'bg-accent' : 'bg-transparent')} />
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow ? <p className="mono-label mb-2">{eyebrow}</p> : null}
        <h1 className="text-[clamp(1.7rem,3.6vw,2.2rem)] font-semibold leading-[1.05] tracking-[-0.03em]">{title}</h1>
        {description ? <div className="mt-1.5 max-w-2xl text-[13.5px] leading-relaxed text-ink-mute">{description}</div> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
