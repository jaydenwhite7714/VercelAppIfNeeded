import type { Metadata } from 'next';
import { AuthForm } from '@/components/auth/AuthForm';

export const metadata: Metadata = { title: 'Verify your email | Unbilled' };

export default function VerifyEmailPage() {
  return <AuthForm mode="verify" />;
}
