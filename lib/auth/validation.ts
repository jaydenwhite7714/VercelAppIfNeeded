import { z } from 'zod';

export const USERNAME_PATTERN = /^[a-z][a-z0-9_]{2,23}$/;
export const MIN_PASSWORD_LENGTH = 12;

const emailSchema = z.string().trim().email('Enter a valid email address.').max(254, 'Email address is too long.');
const usernameSchema = z.string().trim().toLowerCase().regex(
  USERNAME_PATTERN,
  'Username must start with a letter and contain 3–24 letters, numbers, or underscores.',
);
const passwordSchema = z.string().min(MIN_PASSWORD_LENGTH, `Use at least ${MIN_PASSWORD_LENGTH} characters for your password.`).max(128, 'Password must be 128 characters or fewer.');

export const signupSchema = z.object({
  username: usernameSchema,
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: z.string(),
}).refine((value) => value.password === value.confirmPassword, {
  path: ['confirmPassword'],
  message: 'Passwords do not match.',
});

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Enter your password.'),
});

export const emailOnlySchema = z.object({ email: emailSchema });

export const passwordUpdateSchema = z.object({
  password: passwordSchema,
  confirmPassword: z.string(),
}).refine((value) => value.password === value.confirmPassword, {
  path: ['confirmPassword'],
  message: 'Passwords do not match.',
});

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

export function safeNextPath(value: string | null | undefined): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return '/app';
  return value;
}

export function authErrorMessage(message: string): { status: number; message: string } {
  const lower = message.toLowerCase();
  if (lower.includes('rate limit') || lower.includes('too many requests') || (lower.includes('for security purposes') && lower.includes('seconds'))) {
    return { status: 429, message: 'Too many account requests. Wait a little while and try again.' };
  }
  if (lower.includes('smtp') || lower.includes('sending confirmation email') || lower.includes('email provider') || lower.includes('failed to send')) {
    return { status: 503, message: 'The email provider could not accept this request. No email delivery was confirmed; check Supabase Auth email settings and retry later.' };
  }
  if (lower.includes('username_normalized') || lower.includes('profiles_username') || lower.includes('username already taken')) {
    return { status: 409, message: 'That username is already taken. Please choose another.' };
  }
  if (lower.includes('email') && (lower.includes('invalid') || lower.includes('format'))) {
    return { status: 400, message: 'Enter a valid email address.' };
  }
  if (lower.includes('password') && (lower.includes('weak') || lower.includes('least') || lower.includes('short'))) {
    return { status: 400, message: `Use at least ${MIN_PASSWORD_LENGTH} characters for your password.` };
  }
  return { status: 400, message: 'We could not create the account. Check your details and try again.' };
}

export function isUsernameConflict(error: { code?: string; message?: string } | null | undefined): boolean {
  const message = error?.message?.toLowerCase() ?? '';
  return error?.code === '23505'
    && (message.includes('username') || message.includes('profiles_username'))
    || message.includes('username_normalized')
    || message.includes('profiles_username');
}
