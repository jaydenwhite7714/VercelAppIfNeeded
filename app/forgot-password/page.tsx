import type { Metadata } from 'next';
import { AuthForm } from '@/components/auth/AuthForm';

export const metadata: Metadata = { title: 'Reset your password | Unbilled' };

export default function ForgotPasswordPage() {
  return <AuthForm mode="reset" />;
}
