import type { ReactNode } from 'react';

interface ToastProps {
  show: boolean;
  tone?: 'default' | 'success';
  children: ReactNode;
}

/** Transient top-center notification. Caller owns the show/hide timer. */
export function Toast({ show, tone = 'default', children }: ToastProps) {
  if (!show) return null;
  return (
    <div
      className={tone === 'success' ? 'toast toast--success' : 'toast'}
      role="status"
      aria-live="polite"
    >
      {children}
    </div>
  );
}
