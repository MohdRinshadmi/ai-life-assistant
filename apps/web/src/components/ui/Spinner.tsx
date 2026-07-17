interface SpinnerProps {
  size?: 'sm' | 'md';
  className?: string;
}

export function Spinner({ size = 'md', className }: SpinnerProps) {
  const classes = ['spinner'];
  if (size === 'sm') classes.push('spinner--sm');
  if (className) classes.push(className);
  return <span className={classes.join(' ')} role="status" aria-label="Loading" />;
}
