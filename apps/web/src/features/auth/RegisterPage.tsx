import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { VALIDATION } from '@ai-life/shared';
import { MicOrb } from '@/components/ui/MicOrb';
import { authService } from '@/services/api/authService';
import { getApiErrorMessage } from '@/services/api/client';
import { useAuthStore } from '@/stores/authStore';
import './AuthPages.css';

export function RegisterPage() {
  const login = useAuthStore((s) => s.login);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const valid =
    displayName.trim().length >= VALIDATION.DISPLAY_NAME_MIN_LENGTH &&
    email.includes('@') &&
    password.length >= VALIDATION.PASSWORD_MIN_LENGTH;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!valid || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const { user, tokens } = await authService.register({
        email,
        password,
        displayName: displayName.trim(),
      });
      login(
        { id: user.id, email: user.email, displayName: user.displayName, avatarUrl: user.avatarUrl },
        tokens,
      );
    } catch (err) {
      setError(getApiErrorMessage(err, 'Registration failed'));
      setSubmitting(false);
    }
  };

  return (
    <div className="auth screen">
      <div className="auth__hero">
        <MicOrb size={92} />
        <span className="auth__tag">
          <span className="auth__tag-dot" />
          AI Voice Command
        </span>
        <h1 className="auth__title">Create your account</h1>
        <p className="auth__subtitle">Your AI assistant for notes, tasks and everything between.</p>
      </div>

      <form className="auth__form" onSubmit={handleSubmit}>
        <input
          className="dark-input"
          placeholder="Display name"
          value={displayName}
          autoComplete="name"
          onChange={(e) => setDisplayName(e.target.value)}
        />
        <input
          className="dark-input"
          type="email"
          placeholder="Email"
          value={email}
          autoComplete="email"
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          className="dark-input"
          type="password"
          placeholder={`Password (min ${VALIDATION.PASSWORD_MIN_LENGTH} characters)`}
          value={password}
          autoComplete="new-password"
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <p className="auth__error">{error}</p>}
        <button className="pill-btn" type="submit" disabled={!valid || submitting}>
          {submitting ? 'Creating account…' : 'Sign Up'}
        </button>
        <p className="auth__switch">
          Already have an account? <Link to="/login">Sign In</Link>
        </p>
      </form>
    </div>
  );
}
