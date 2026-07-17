import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { VALIDATION } from '@ai-life/shared';
import { Button, Input } from '@/components/ui';
import { authService } from '@/services/api/authService';
import { getApiErrorMessage } from '@/services/api/client';
import { useAuthStore } from '@/stores/authStore';
import { AuthHero } from './AuthHero';
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
      <AuthHero
        title={
          <>
            Create your <span className="ink">account</span>
          </>
        }
        subtitle="Your AI assistant for notes, tasks and everything between."
      />

      <form className="auth__form" onSubmit={handleSubmit}>
        <Input
          placeholder="Display name"
          aria-label="Display name"
          value={displayName}
          autoComplete="name"
          onChange={(e) => setDisplayName(e.target.value)}
        />
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
          placeholder={`Password (min ${VALIDATION.PASSWORD_MIN_LENGTH} characters)`}
          aria-label="Password"
          value={password}
          autoComplete="new-password"
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && (
          <p className="auth__error" role="alert">
            {error}
          </p>
        )}
        <Button type="submit" size="lg" loading={submitting} disabled={!valid}>
          Sign Up
        </Button>
        <p className="auth__switch">
          Already have an account? <Link to="/login">Sign In</Link>
        </p>
      </form>
    </div>
  );
}
