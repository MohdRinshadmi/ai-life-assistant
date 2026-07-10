import { NavLink, Outlet } from 'react-router-dom';
import { Icon, type IconName } from '@/components/ui/Icon';
import { useAuthStore } from '@/stores/authStore';
import './MainLayout.css';

const NAV_ITEMS: Array<{ to: string; label: string; icon: IconName }> = [
  { to: '/', label: 'Home', icon: 'home' },
  { to: '/chat', label: 'AI Chat', icon: 'chat' },
  { to: '/notes', label: 'Notes', icon: 'notes' },
  { to: '/tasks', label: 'Tasks', icon: 'tasks' },
  { to: '/settings', label: 'Settings', icon: 'settings' },
];

/**
 * Responsive shell: sidebar on desktop, bottom tab bar (mobile parity) below 768px.
 */
export function MainLayout() {
  const user = useAuthStore((s) => s.user);

  return (
    <div className="layout screen">
      <nav className="layout__nav">
        <div className="layout__brand">
          <span className="layout__brand-orb" />
          <span className="layout__brand-name">AI Life</span>
        </div>
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) => `layout__link${isActive ? ' layout__link--active' : ''}`}
          >
            {({ isActive }) => (
              <>
                <Icon name={item.icon} size={22} filled={isActive && item.icon === 'home'} />
                <span>{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
        <div className="layout__user">
          <span className="layout__avatar">
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt="" />
            ) : (
              (user?.displayName?.[0] ?? '?').toUpperCase()
            )}
          </span>
          <span className="layout__user-name">{user?.displayName}</span>
        </div>
      </nav>
      <main className="layout__content">
        <Outlet />
      </main>
    </div>
  );
}
