import Link from 'next/link';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { Wordmark } from '@/components/brand';
import { Button, Card } from '@/components/ui';

export default function BillingCancelledPage() {
  return <main className="min-h-dvh bg-paper px-4 py-7 sm:px-8"><div className="mx-auto max-w-2xl">
    <Link href="/" aria-label="Unbilled home"><Wordmark /></Link>
    <Card className="mt-12 p-6 text-center sm:p-10"><ShieldCheck className="mx-auto h-8 w-8 text-sage" /><p className="mono-label mt-4">No subscription started</p><h1 className="mt-2 font-display text-3xl">Checkout cancelled</h1><p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-ink-mute">You were not enrolled. Your free workspace and local data are unchanged.</p><Link href="/pricing" className="mt-6 inline-block"><Button variant="outline"><ArrowLeft className="h-4 w-4" /> Back to pricing</Button></Link></Card>
  </div></main>;
}
