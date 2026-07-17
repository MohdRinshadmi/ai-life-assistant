interface AvatarProps {
  name?: string | null;
  src?: string | null;
  size?: number;
  className?: string;
}

/** Gradient initial (or image) avatar. Decorative by default; pair with visible name text. */
export function Avatar({ name, src, size = 36, className }: AvatarProps) {
  const initial = name?.trim().charAt(0).toUpperCase() || '?';
  return (
    <span
      className={className ? `avatar ${className}` : 'avatar'}
      style={{ width: size, height: size, fontSize: size * 0.42 }}
      aria-hidden="true"
    >
      {src ? <img src={src} alt="" /> : initial}
    </span>
  );
}
