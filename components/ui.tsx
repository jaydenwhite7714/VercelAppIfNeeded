'use client';

import * as React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { createPortal } from 'react-dom';
import { Check, Clipboard, X } from 'lucide-react';
import { cn } from '@/lib/cn';

/* ------------------------------------------------------------------ button */

type ButtonVariant = 'primary' | 'accent' | 'outline' | 'ghost' | 'subtle' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

const buttonVariants: Record<ButtonVariant, string> = {
  primary: 'bg-ink text-paper hover:bg-[#20242b] shadow-[0_1px_0_rgba(255,255,255,0.14)_inset]',
  accent: 'bg-accent text-white hover:bg-accent-deep shadow-[0_1px_0_rgba(255,255,255,0.18)_inset]',
  outline: 'border border-line-strong bg-card/70 text-ink hover:bg-card hover:border-ink/40',
  ghost: 'text-ink-soft hover:text-ink hover:bg-ink/[0.045]',
  subtle: 'bg-paper-deep text-ink hover:bg-line/70',
  danger: 'border border-accent/30 text-accent hover:bg-accent-soft',
};

const buttonSizes: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-[13px] gap-1.5 rounded-lg',
  md: 'h-10 px-4 text-sm gap-2 rounded-[10px]',
  lg: 'h-12 px-5 text-[15px] gap-2 rounded-xl',
  icon: 'h-9 w-9 rounded-lg',
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = 'primary', size = 'md', loading, children, disabled, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'btn-press inline-flex select-none items-center justify-center font-medium tracking-[-0.01em] disabled:cursor-not-allowed disabled:opacity-50',
        buttonVariants[variant],
        buttonSizes[size],
        className,
      )}
      {...props}
    >
      {loading ? <Spinner className="mr-1.5" /> : null}
      {children}
    </button>
  );
});

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={cn('inline-block h-3.5 w-3.5 animate-spin rounded-full border-[1.5px] border-current border-t-transparent', className)}
      aria-hidden
    />
  );
}

/* ------------------------------------------------------------------- inputs */

export function Field({
  label,
  hint,
  error,
  children,
  className,
  optional,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
  optional?: boolean;
}) {
  return (
    <label className={cn('block', className)}>
      <span className="mb-1.5 flex items-baseline justify-between gap-3">
        <span className="text-[13px] font-medium text-ink">{label}</span>
        {optional ? <span className="mono-label normal-case tracking-[0.06em]">optional</span> : null}
      </span>
      {children}
      {error ? <span className="mt-1.5 block text-xs text-accent">{error}</span> : hint ? <span className="mt-1.5 block text-xs leading-relaxed text-ink-mute">{hint}</span> : null}
    </label>
  );
}

const controlClass =
  'w-full rounded-[10px] border border-line bg-card px-3 text-sm text-ink placeholder:text-ink-mute/70 transition-colors hover:border-line-strong focus:border-ink/50 focus:outline-none focus:ring-2 focus:ring-ink/10 disabled:opacity-60';

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...props }, ref) {
  return <input ref={ref} className={cn(controlClass, 'h-10', className)} {...props} />;
});

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({ className, ...props }, ref) {
  return <textarea ref={ref} className={cn(controlClass, 'min-h-24 resize-y py-2.5 leading-relaxed', className)} {...props} />;
});

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(function Select({ className, children, ...props }, ref) {
  return (
    <select
      ref={ref}
      className={cn(controlClass, 'h-10 cursor-pointer appearance-none bg-[length:14px] bg-[right_0.65rem_center] bg-no-repeat pr-9', className)}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%237d7a70' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
      }}
      {...props}
    >
      {children}
    </select>
  );
});

/* -------------------------------------------------------------------- badge */

export function Badge({
  children,
  tone = 'neutral',
  className,
}: {
  children: React.ReactNode;
  tone?: 'neutral' | 'accent' | 'sage' | 'gold' | 'ink';
  className?: string;
}) {
  const tones = {
    neutral: 'bg-paper-deep text-ink-soft border-line-strong/60',
    accent: 'bg-accent-soft text-accent-deep border-accent/20',
    sage: 'bg-sage-soft text-sage border-sage/20',
    gold: 'bg-gold-soft text-gold border-gold/25',
    ink: 'bg-ink text-paper border-ink',
  };
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-[3px] text-[11px] font-medium leading-none tracking-[0.01em]',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/* --------------------------------------------------------------------- card */

export function Card({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('rounded-[var(--radius-card)] border border-line bg-card shadow-[var(--shadow-paper)]', className)} {...props}>
      {children}
    </div>
  );
}

export function SectionLabel({ children, className, index }: { children: React.ReactNode; className?: string; index?: string }) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      {index ? <span className="mono-label text-accent">{index}</span> : <span className="h-[5px] w-[5px] rounded-full bg-accent" />}
      <span className="mono-label">{children}</span>
      <span className="h-px flex-1 bg-line" aria-hidden />
    </div>
  );
}

/* -------------------------------------------------------------------- modal */

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  wide?: boolean;
}) {
  const [mounted, setMounted] = React.useState(false);
  const dialogTitleId = React.useId();
  const dialogDescriptionId = React.useId();
  const dialogRef = React.useRef<HTMLDivElement>(null);
  const onCloseRef = React.useRef(onClose);
  React.useEffect(() => setMounted(true), []);
  React.useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  React.useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusableElements = () => Array.from(dialogRef.current?.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ) ?? []).filter((element) => !element.hidden && element.getAttribute('aria-hidden') !== 'true' && element.getClientRects().length > 0);
    const focusFrame = window.requestAnimationFrame(() => (focusableElements()[0] ?? dialogRef.current)?.focus());
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab') return;
      const elements = focusableElements();
      if (!elements.length) {
        event.preventDefault();
        dialogRef.current?.focus();
        return;
      }
      const first = elements[0];
      const last = elements[elements.length - 1];
      const dialog = dialogRef.current;
      const active = document.activeElement;
      if (dialog && active && !dialog.contains(active)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      } else if (event.shiftKey && (active === first || active === dialog)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
      if (previouslyFocused?.isConnected) previouslyFocused.focus();
    };
  }, [open]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-6">
          <motion.div
            aria-hidden="true"
            className="absolute inset-0 bg-ink/35 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            ref={dialogRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby={dialogTitleId}
            aria-describedby={description ? dialogDescriptionId : undefined}
            initial={{ opacity: 0, y: 28, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.99 }}
            transition={{ type: 'spring', stiffness: 380, damping: 34 }}
            className={cn(
              'relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-[22px] border border-line bg-card shadow-[var(--shadow-lift)] sm:rounded-[22px]',
              wide ? 'sm:max-w-3xl' : 'sm:max-w-lg',
            )}
          >
            <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4 sm:px-6">
              <div>
                <h2 id={dialogTitleId} className="text-[20px] leading-tight">{title}</h2>
                {description ? <p id={dialogDescriptionId} className="mt-1 text-[13px] leading-relaxed text-ink-mute">{description}</p> : null}
              </div>
              <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close dialog">
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
            {footer ? <div className="border-t border-line bg-paper/60 px-5 py-4 sm:px-6">{footer}</div> : null}
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}

/* ------------------------------------------------------------------- toasts */

interface Toast {
  id: string;
  message: string;
  tone: 'default' | 'error';
}

const ToastContext = React.createContext<{ push: (message: string, tone?: 'default' | 'error') => void }>({ push: () => {} });

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);

  const push = React.useCallback((message: string, tone: 'default' | 'error' = 'default') => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev.slice(-2), { id, message, tone }]);
    window.setTimeout(() => setToasts((prev) => prev.filter((toast) => toast.id !== id)), 3600);
  }, []);

  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <div role="region" aria-label="Notifications" className="pointer-events-none fixed bottom-4 left-1/2 z-[60] flex w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 flex-col gap-2 sm:left-auto sm:right-5 sm:translate-x-0">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              role={toast.tone === 'error' ? 'alert' : 'status'}
              aria-atomic="true"
              className={cn(
                'pointer-events-auto rounded-xl border px-3.5 py-2.5 text-[13px] shadow-[var(--shadow-lift)]',
                toast.tone === 'error' ? 'border-accent/30 bg-accent-soft text-accent-deep' : 'border-ink bg-ink text-paper',
              )}
            >
              {toast.message}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return React.useContext(ToastContext);
}

/* --------------------------------------------------------------- copy button */

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const active = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('aria-hidden', 'true');
    area.tabIndex = -1;
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    try {
      area.focus({ preventScroll: true });
      area.select();
      return document.execCommand('copy');
    } catch {
      return false;
    } finally {
      area.remove();
      active?.focus({ preventScroll: true });
    }
  }
}

export function CopyButton({
  value,
  label = 'Copy',
  copiedLabel = 'Copied',
  className,
  variant = 'outline',
  size = 'sm',
  icon = true,
}: {
  value: string;
  label?: string;
  copiedLabel?: string;
  className?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: boolean;
}) {
  const [copied, setCopied] = React.useState(false);
  const { push } = useToast();

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={className}
      onClick={async () => {
        const ok = await copyText(value);
        if (ok) {
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1800);
        } else {
          push('Could not access the clipboard — select the text and copy manually.', 'error');
        }
      }}
    >
      {icon ? copied ? <Check className="h-3.5 w-3.5" /> : <Clipboard className="h-3.5 w-3.5" /> : null}
      {copied ? copiedLabel : label}
    </Button>
  );
}

/* -------------------------------------------------------------- empty state */

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center rounded-[var(--radius-card)] border border-dashed border-line-strong bg-card/50 px-6 py-12 text-center', className)}>
      {icon ? <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full border border-line bg-card text-ink-mute">{icon}</div> : null}
      <h3 className="text-[17px]">{title}</h3>
      <p className="mt-1.5 max-w-sm text-[13px] leading-relaxed text-ink-mute">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

/* ---------------------------------------------------------------- skeletons */

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-md bg-line/70', className)} />;
}

export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
  className,
}: {
  tabs: { value: T; label: string; count?: number }[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}) {
  return (
    <div className={cn('no-scrollbar flex gap-1 overflow-x-auto rounded-full border border-line bg-card/60 p-1', className)} role="tablist">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          role="tab"
          aria-selected={value === tab.value}
          onClick={() => onChange(tab.value)}
          className={cn(
            'whitespace-nowrap rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors',
            value === tab.value ? 'bg-ink text-paper' : 'text-ink-soft hover:bg-ink/5 hover:text-ink',
          )}
        >
          {tab.label}
          {typeof tab.count === 'number' ? <span className={cn('ml-1.5 tnum', value === tab.value ? 'text-paper/60' : 'text-ink-mute')}>{tab.count}</span> : null}
        </button>
      ))}
    </div>
  );
}
