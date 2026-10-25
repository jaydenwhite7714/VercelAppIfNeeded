import type { Metadata } from 'next';
import { AuthForm } from '@/components/auth/AuthForm';

export const metadata: Metadata = { title: 'Create an account | Unbilled' };

export default function SignupPage() {
  return <AuthForm mode="signup" />;
}
