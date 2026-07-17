import { useState } from 'react';
import { Avatar, Button, Card, Icon } from '@/components/ui';
import { authService } from '@/services/api/authService';
import { useAuthStore } from '@/stores/authStore';
import './SettingsPage.css';

const APP_VERSION = '1.0.0';

export function SettingsPage() {
  const user = useAuthStore((s) => s.user);
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await authService.logout();
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <div className="settings">
      <h1 className="settings__title">Settings</h1>

      <section aria-label="Profile">
        <h2 className="settings__section">Profile</h2>
        <Card className="settings__profile">
          <Avatar name={user?.displayName} src={user?.avatarUrl} size={48} />
          <div className="settings__identity">
            <p className="settings__name">{user?.displayName}</p>
            <p className="settings__email">{user?.email}</p>
          </div>
        </Card>
      </section>

      <section aria-label="About">
        <h2 className="settings__section">About</h2>
        <div className="settings__row">
          <span className="settings__row-label">Version</span>
          <span className="settings__row-value">{APP_VERSION}</span>
        </div>
      </section>

      <section aria-label="Account">
        <h2 className="settings__section">Account</h2>
        <Button
          variant="danger"
          className="settings__signout"
          loading={signingOut}
          iconLeft={<Icon name="logout" size={18} />}
          onClick={() => void handleSignOut()}
        >
          Sign Out
        </Button>
      </section>
    </div>
  );
}
