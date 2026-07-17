import type { CSSProperties } from 'react';

interface ChipProps {
  label: string;
  active?: boolean;
  onClick?: () => void;
  /** Override the active fill color (defaults to brand primary). */
  activeColor?: string;
}

/** Selectable filter pill. Exposes selection state to assistive tech via aria-pressed. */
export function Chip({ label, active = false, onClick, activeColor }: ChipProps) {
  const style =
    active && activeColor ? ({ '--chip-color': activeColor } as CSSProperties) : undefined;
  return (
    <button
      type="button"
      className={active ? 'chip chip--active' : 'chip'}
      style={style}
      aria-pressed={active}
      onClick={onClick}
    >
      {label}
    </button>
  );
}
