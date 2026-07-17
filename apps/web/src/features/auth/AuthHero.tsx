import type { ReactNode } from 'react';
import { MicOrb } from '@/components/ui';

interface AuthHeroProps {
  title: ReactNode;
  subtitle: string;
  /** Extra content below the subtitle (e.g. the carousel dots). */
  children?: ReactNode;
}

/** Shared hero for the auth screens: MicOrb + tag + display headline. */
export function AuthHero({ title, subtitle, children }: AuthHeroProps) {
  return (
    <div className="auth__hero rise">
      <MicOrb size={96} />
      <span className="auth__tag">
        <span className="auth__tag-dot" aria-hidden="true" />
        AI Voice Command
      </span>
      <h1 className="display auth__title">{title}</h1>
      <p className="auth__subtitle">{subtitle}</p>
      {children}
    </div>
  );
}
