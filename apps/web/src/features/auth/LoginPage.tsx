import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Button, Input } from '@/components/ui';
import { authService } from '@/services/api/authService';
import { getApiErrorMessage } from '@/services/api/client';
import { useAuthStore } from '@/stores/authStore';
import { AuthHero } from './AuthHero';
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
      <AuthHero
        title={
          <>
            Effortless control <span className="ink">with AI Life</span>
          </>
        }
        subtitle="We believe in the power of voice. Give any command naturally, from generating notes to scheduling tasks."
      >
        <div className="auth__dots" aria-hidden="true">
          <span className="auth__dot" />
          <span className="auth__dot auth__dot--active" />
          <span className="auth__dot" />
        </div>
      </AuthHero>

      {showForm ? (
        <form className="auth__form" onSubmit={handleSubmit}>
          <Input
            type="email"
            placeholder="Email"
            aria-label="Email"
            value={email}
            autoComplete="email"
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            type="password"
            placeholder="Password"
            aria-label="Password"
            value={password}
            autoComplete="current-password"
            onChange={(e) => setPassword(e.target.value)}
          />
          {error && (
            <p className="auth__error" role="alert">
              {error}
            </p>
          )}
          <Button type="submit" size="lg" loading={submitting} disabled={!email || !password}>
            Sign In
          </Button>
          <p className="auth__switch">
            New here? <Link to="/register">Create an account</Link>
          </p>
        </form>
      ) : (
        <div className="auth__actions">
          <Link to="/register" className="btn btn--primary btn--lg">
            Sign Up
          </Link>
          <Button variant="outline" size="lg" onClick={() => setShowForm(true)}>
            Sign In with Email
          </Button>
        </div>
      )}
    </div>
  );
}
