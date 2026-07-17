import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { IconButton } from './Button';
import { Icon } from './Icon';

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

/**
 * Modal dialog — centered card on desktop, bottom sheet on mobile (see ui.css).
 * Closes on Escape and backdrop click; focuses itself on open so keyboard
 * and screen-reader context moves into the dialog.
 */
export function Sheet({ open, onClose, title, children }: SheetProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="overlay" onClick={onClose}>
      <div
        ref={ref}
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sheet__header">
          <h2 className="sheet__title">{title}</h2>
          <IconButton label="Close" onClick={onClose}>
            <Icon name="close" size={20} />
          </IconButton>
        </div>
        {children}
      </div>
    </div>
  );
}
