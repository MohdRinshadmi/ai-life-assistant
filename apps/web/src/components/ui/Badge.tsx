import type { CSSProperties, ReactNode } from 'react';

interface BadgeProps {
  /** Any CSS color; drives text, tinted background, and border via color-mix. */
  color?: string;
  dot?: boolean;
  children: ReactNode;
  className?: string;
}

/** Small tinted status/priority pill. */
export function Badge({ color, dot = false, children, className }: BadgeProps) {
  const style = color ? ({ '--badge-color': color } as CSSProperties) : undefined;
  return (
    <span className={className ? `badge ${className}` : 'badge'} style={style}>
      {dot && <span className="badge__dot" aria-hidden="true" />}
      {children}
    </span>
  );
}
