import type { HTMLAttributes } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Adds hover lift + glow and pointer cursor for clickable cards. */
  interactive?: boolean;
}

/** Glass surface with the brand violet→magenta 1px gradient border. */
export function Card({ interactive = false, className, ...rest }: CardProps) {
  const classes = ['glass-card'];
  if (interactive) classes.push('glass-card--interactive');
  if (className) classes.push(className);
  return <div className={classes.join(' ')} {...rest} />;
}
