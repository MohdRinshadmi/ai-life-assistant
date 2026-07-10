import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { MicOrb } from '@/components/ui/MicOrb';
import { authService } from '@/services/api/authService';
import { getApiErrorMessage } from '@/services/api/client';
import { useAuthStore } from '@/stores/authStore';
import './AuthPages.css';

export function LoginPage() {
  const login = useAuthStore((s) => s.login);
  const [showForm, setShowForm] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email || !password || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const { user, tokens } = await authService.login({ email, password, deviceInfo: 'web' });
      login(
        { id: user.id, email: user.email, displayName: user.displayName, avatarUrl: user.avatarUrl },
        tokens,
      );
    } catch (err) {
      setError(getApiErrorMessage(err, 'Login failed'));
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
        <h1 className="auth__title">Effortless control with AI Life</h1>
        <p className="auth__subtitle">
          We believe in the power of voice. Give any command naturally, from generating notes to
          scheduling tasks.
        </p>
        <div className="auth__dots">
          <span className="auth__dot" />
          <span className="auth__dot auth__dot--active" />
          <span className="auth__dot" />
        </div>
      </div>

      {showForm ? (
        <form className="auth__form" onSubmit={handleSubmit}>
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
            placeholder="Password"
            value={password}
            autoComplete="current-password"
            onChange={(e) => setPassword(e.target.value)}
          />
          {error && <p className="auth__error">{error}</p>}
          <button className="pill-btn" type="submit" disabled={submitting || !email || !password}>
            {submitting ? 'Signing in…' : 'Sign In'}
          </button>
          <p className="auth__switch">
            New here? <Link to="/register">Create an account</Link>
          </p>
        </form>
      ) : (
        <div className="auth__actions">
          <Link to="/register" className="pill-btn">
            Sign Up
          </Link>
          <button className="pill-btn pill-btn--outline" onClick={() => setShowForm(true)}>
            Sign In with Email
          </button>
        </div>
      )}
    </div>
  );
}
