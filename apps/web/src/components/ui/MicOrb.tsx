import { Icon } from './Icon';
import './MicOrb.css';

interface MicOrbProps {
  size?: number;
  active?: boolean;
  onClick?: () => void;
}

/** Glowing gradient mic orb — the app's signature centerpiece. */
export function MicOrb({ size = 92, active = false, onClick }: MicOrbProps) {
  return (
    <button
      type="button"
      className={`mic-orb${active ? ' mic-orb--active' : ''}`}
      style={{ width: size, height: size }}
      onClick={onClick}
      aria-label={active ? 'Stop listening' : 'Start voice input'}
    >
      <span className="mic-orb__glow" />
      <span className="mic-orb__ring" />
      <span className="mic-orb__core">
        <Icon name="mic" size={size * 0.4} />
      </span>
    </button>
  );
}
