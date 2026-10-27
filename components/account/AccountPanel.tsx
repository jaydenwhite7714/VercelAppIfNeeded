'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CloudDownload, CloudUpload, LockKeyhole, LogOut, RefreshCw, ShieldCheck } from 'lucide-react';
import { Button, Card, Modal, SectionLabel } from '@/components/ui';
import { exportWorkspace, importWorkspace } from '@/lib/db';
import { validateWorkspace, type WorkspaceExport } from '@/lib/workspace-schema';

type Account = { configured?: boolean; authenticated?: boolean; verified?: boolean; email?: string; username?: string };
type CloudResult = { workspace: unknown | null; updatedAt: string | null; error?: string };
type ConfirmAction = 'overwrite' | 'restore' | 'delete' | null;

function downloadJson(workspace: WorkspaceExport, prefix: string) {
  const blob = new Blob([JSON.stringify(workspace, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${prefix}-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

export function AccountPanel() {
  const router = useRouter();
  const [account, setAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);
  const [cloudWorkspace, setCloudWorkspace] = useState<WorkspaceExport | null>(null);
  const [cloudUpdatedAt, setCloudUpdatedAt] = useState<string | null>(null);
  const [cloudChecked, setCloudChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmAction>(null);
  const [localBackupDownloaded, setLocalBackupDownloaded] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function reloadCloud() {
    setCloudChecked(false);
    const response = await fetch('/api/account/workspace', { cache: 'no-store', credentials: 'same-origin' });
    const data = await response.json() as CloudResult;
    if (!response.ok) throw new Error(data.error || 'Could not check the private cloud backup.');
    if (data.workspace !== null && !validateWorkspace(data.workspace)) throw new Error('The saved cloud snapshot is invalid. Your local workspace was not changed.');
    setCloudWorkspace(data.workspace as WorkspaceExport | null);
    setCloudUpdatedAt(data.updatedAt);
    setCloudChecked(true);
  }

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const [statusResponse, sessionResponse] = await Promise.all([
          fetch('/api/account/status', { cache: 'no-store' }),
          fetch('/api/account/session', { cache: 'no-store', credentials: 'same-origin' }),
        ]);
        const status = await statusResponse.json() as { providerConfigured?: boolean; databaseReady?: boolean };
        const session = await sessionResponse.json() as Account & { error?: string };
        if (!active) return;
        setAccount({ ...session, configured: Boolean(status.providerConfigured && status.databaseReady) });
        if (session.authenticated && session.verified) {
          try {
            await reloadCloud();
          } catch (loadError) {
            if (active) setError(loadError instanceof Error ? loadError.message : 'Could not read the private backup.');
          }
        }
      } catch {
        if (active) setAccount({ configured: false });
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => { active = false; };
    // The initial session is intentionally checked once per settings-page visit.
  }, []);

  async function uploadLocal(overwrite: boolean) {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      if (overwrite && cloudWorkspace) downloadJson(cloudWorkspace, 'unbilled-cloud-before-overwrite');
      const local = await exportWorkspace();
      const response = await fetch('/api/account/workspace', {
        method: 'PUT',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspace: local, expectedUpdatedAt: cloudUpdatedAt }),
      });
      const data = await response.json() as { error?: string; updatedAt?: string };
      if (!response.ok) throw new Error(data.error || 'Private cloud backup failed. Your local workspace is unchanged.');
      setCloudWorkspace(local);
      setCloudUpdatedAt(data.updatedAt ?? new Date().toISOString());
      setCloudChecked(true);
      setNotice('Private cloud backup saved. Local data remains on this device; no automatic sync is running.');
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Private cloud backup failed. Your local workspace remains unchanged.');
      if (uploadError instanceof Error && uploadError.message.includes('changed since you last checked')) {
        try { await reloadCloud(); } catch { /* Keep the original conflict message visible. */ }
      }
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  }

  async function prepareLocalBackup() {
    setBusy(true);
    setError('');
    try {
      downloadJson(await exportWorkspace(), 'unbilled-local-before-restore');
      setLocalBackupDownloaded(true);
      setNotice('A local JSON backup download was started. Confirm the file is saved before continuing.');
    } catch (backupError) {
      setError(backupError instanceof Error ? backupError.message : 'Could not prepare a local backup. The cloud restore remains blocked.');
    } finally {
      setBusy(false);
    }
  }

  async function restoreCloud() {
    if (!cloudWorkspace || !localBackupDownloaded) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await importWorkspace(cloudWorkspace);
      setNotice('Cloud workspace restored. The local JSON backup was downloaded before the restore.');
      router.refresh();
    } catch (restoreError) {
      setError(restoreError instanceof Error ? restoreError.message : 'Could not restore the cloud snapshot.');
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  }

  async function deleteCloud() {
    if (!cloudUpdatedAt) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const response = await fetch('/api/account/workspace', {
        method: 'DELETE',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expectedUpdatedAt: cloudUpdatedAt }),
      });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || 'Could not delete the cloud backup.');
      setCloudWorkspace(null);
      setCloudUpdatedAt(null);
      setCloudChecked(true);
      setNotice('Private cloud backup deleted. The local workspace in this browser was not changed.');
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Could not delete the cloud backup.');
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  }

  async function signOut() {
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/auth/signout', { method: 'POST', credentials: 'same-origin' });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || 'Could not sign out.');
      setAccount({ configured: account?.configured, authenticated: false });
      setCloudWorkspace(null);
      setCloudUpdatedAt(null);
      setCloudChecked(false);
      setNotice('Signed out. This browser’s local workspace was not deleted. On a shared device, export and clear local data if appropriate.');
      router.refresh();
    } catch (signOutError) {
      setError(signOutError instanceof Error ? signOutError.message : 'Could not sign out.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="p-4 sm:p-5">
      <div className="flex items-center gap-2">
        <LockKeyhole className="h-4 w-4 text-sage" />
        <SectionLabel className="flex-1">Account & private backup</SectionLabel>
      </div>
      {loading ? <p role="status" className="mt-3 text-xs text-ink-mute">Checking account status…</p> : null}
      {!loading && !account?.configured ? (
        <div className="mt-3 space-y-3">
          <p className="text-[12px] leading-relaxed text-ink-mute">Accounts are not configured on this deployment yet. The local workspace still works; account signup and cloud backup remain unavailable until Supabase and email delivery are set up.</p>
          <Link href="/signup"><Button size="sm" variant="outline">Account setup details</Button></Link>
        </div>
      ) : null}
      {!loading && account?.configured && !account.authenticated ? (
        <div className="mt-3 space-y-3">
          <p className="text-[12px] leading-relaxed text-ink-mute">You are using a local browser workspace. Create or sign in to an account to keep an optional private cloud backup. Nothing uploads until you choose it.</p>
          <div className="flex flex-wrap gap-2"><Link href="/signup"><Button size="sm" variant="accent">Create account</Button></Link><Link href="/signin"><Button size="sm" variant="outline">Sign in</Button></Link></div>
        </div>
      ) : null}
      {!loading && account?.authenticated && !account.verified ? (
        <div className="mt-3 space-y-3">
          <p className="text-[12px] leading-relaxed text-ink-mute">{account.email} is not verified. Private cloud backup stays locked until the authentication provider confirms mailbox access.</p>
          <Link href="/verify-email"><Button size="sm" variant="outline">Request verification link</Button></Link>
        </div>
      ) : null}
      {!loading && account?.authenticated && account.verified ? (
        <div className="mt-3 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line bg-paper/50 p-3">
            <div className="min-w-0"><p className="truncate text-[13px] font-medium">@{account.username || 'account'}</p><p className="truncate text-[11px] text-ink-mute">{account.email}</p></div>
            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-sage"><ShieldCheck className="h-3.5 w-3.5" /> verified</span>
          </div>
          <p className="text-[12px] leading-relaxed text-ink-mute">Local projects, requests, and reports remain in this browser. Upload or restore a private snapshot only when you choose; this is manual backup, not automatic sync.</p>
          {cloudChecked ? <p className="text-[11px] text-ink-mute">{cloudWorkspace ? `Private backup saved ${cloudUpdatedAt ? new Date(cloudUpdatedAt).toLocaleString() : 'in your account'}.` : 'No cloud backup exists for this account yet.'}</p> : null}
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" loading={busy} disabled={busy || !cloudChecked} onClick={() => cloudWorkspace ? setConfirm('overwrite') : void uploadLocal(false)}><CloudUpload className="h-3.5 w-3.5" />{cloudWorkspace ? 'Replace cloud backup' : 'Save local workspace to cloud'}</Button>
            <Button size="sm" variant="outline" loading={busy} disabled={busy || !cloudChecked || !cloudWorkspace} onClick={() => { setLocalBackupDownloaded(false); setConfirm('restore'); }}><CloudDownload className="h-3.5 w-3.5" />Restore cloud backup</Button>
            {cloudWorkspace ? <Button size="sm" variant="ghost" disabled={busy} onClick={() => setConfirm('delete')}>Delete cloud backup</Button> : null}
            <Button size="sm" variant="ghost" disabled={busy} onClick={() => { setError(''); void reloadCloud().catch((loadError) => setError(loadError instanceof Error ? loadError.message : 'Could not refresh backup status.')); }}><RefreshCw className="h-3.5 w-3.5" />Refresh</Button>
            <Button size="sm" variant="ghost" disabled={busy} onClick={() => void signOut()}><LogOut className="h-3.5 w-3.5" />Sign out</Button>
          </div>
        </div>
      ) : null}
      {error ? <p role="alert" className="mt-3 rounded-lg border border-accent/30 bg-accent-soft/50 p-2.5 text-xs leading-relaxed text-accent-deep">{error}</p> : null}
      {notice ? <p role="status" className="mt-3 rounded-lg border border-sage/30 bg-sage-soft/50 p-2.5 text-xs leading-relaxed text-sage">{notice}</p> : null}
      <Modal
        open={confirm !== null}
        onClose={() => { if (!busy) setConfirm(null); }}
        title={confirm === 'restore' ? 'Restore this account’s cloud backup?' : confirm === 'delete' ? 'Delete this account’s cloud backup?' : 'Replace this account’s cloud backup?'}
        description={confirm === 'restore'
          ? 'This replaces the workspace currently in this browser. Before restoring, the app downloads a JSON backup of the current local workspace. You can also cancel and export from Settings first.'
          : confirm === 'delete'
            ? 'This permanently removes the saved snapshot for this account. Your local workspace and account are not deleted.'
            : 'This replaces the snapshot stored for this account. The existing cloud snapshot is downloaded to this device first; your local workspace is not changed.'}
        footer={
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="ghost" disabled={busy} onClick={() => setConfirm(null)}>Cancel</Button>
            {confirm === 'restore' ? <Button variant="outline" loading={busy && !localBackupDownloaded} disabled={busy || localBackupDownloaded} onClick={() => void prepareLocalBackup()}>Download local backup</Button> : null}
            <Button
              variant={confirm === 'delete' ? 'danger' : 'accent'}
              loading={busy && (confirm !== 'restore' || localBackupDownloaded)}
              disabled={busy || (confirm === 'restore' && !localBackupDownloaded)}
              onClick={() => confirm === 'restore' ? void restoreCloud() : confirm === 'delete' ? void deleteCloud() : void uploadLocal(true)}
            >
              {confirm === 'restore' ? 'I saved the backup — restore' : confirm === 'delete' ? 'Delete cloud backup' : 'Download cloud backup & replace'}
            </Button>
          </div>
        }
      >
        <p className="text-xs leading-relaxed text-ink-mute">Only the authenticated account can read or write its cloud snapshot. Concurrent cloud edits are rejected rather than silently overwritten.</p>
      </Modal>
    </Card>
  );
}
