import { Icon } from '@/components/ui/Icon';
import { authService } from '@/services/api/authService';
import { useAuthStore } from '@/stores/authStore';
import './SettingsPage.css';

export function SettingsPage() {
  const user = useAuthStore((s) => s.user);

  return (
    <div className="settings">
      <h1 className="settings__title">Settings</h1>

      <div className="settings__row">
        <span className="settings__avatar">
          {user?.avatarUrl ? (
            <img src={user.avatarUrl} alt="" />
          ) : (
            (user?.displayName?.[0] ?? '?').toUpperCase()
          )}
        </span>
        <div>
          <p className="settings__name">{user?.displayName}</p>
          <p className="settings__email">{user?.email}</p>
        </div>
      </div>

      <button className="settings__row settings__row--action" onClick={() => void authService.logout()}>
        <Icon name="logout" size={18} />
        <span className="settings__signout">Sign Out</span>
      </button>
    </div>
  );
}
