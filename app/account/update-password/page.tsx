import type { Metadata } from 'next';
import { AuthForm } from '@/components/auth/AuthForm';

export const metadata: Metadata = { title: 'Choose a new password | Unbilled' };

export default function UpdatePasswordPage() {
  return <AuthForm mode="update-password" />;
}
