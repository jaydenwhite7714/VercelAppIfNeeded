import type { Metadata } from 'next';
import { AuthForm } from '@/components/auth/AuthForm';

export const metadata: Metadata = { title: 'Sign in | Unbilled' };

export default function SignInPage() {
  return <AuthForm mode="signin" />;
}
