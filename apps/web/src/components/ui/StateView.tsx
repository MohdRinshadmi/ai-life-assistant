import type { ReactNode } from 'react';
import { Button } from './Button';
import { Spinner } from './Spinner';

interface StateViewProps {
  variant: 'loading' | 'empty' | 'error';
  title?: string;
  description?: string;
  /** Custom visual (e.g. an icon or the MicOrb) shown above the title. */
  visual?: ReactNode;
  actionLabel?: string;
  onAction?: () => void;
}

/** Unified loading / empty / error block used by every list screen. */
export function StateView({
  variant,
  title,
  description,
  visual,
  actionLabel,
  onAction,
}: StateViewProps) {
  return (
    <div className="state-view" role={variant === 'error' ? 'alert' : undefined}>
      {variant === 'loading' ? <Spinner /> : visual}
      {title && <h3 className="state-view__title">{title}</h3>}
      {description && <p>{description}</p>}
      {actionLabel && onAction && (
        <Button
          variant={variant === 'error' ? 'outline' : 'primary'}
          className="state-view__action"
          onClick={onAction}
        >
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
