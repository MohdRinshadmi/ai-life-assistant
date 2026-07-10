import { useNavigate } from 'react-router-dom';
import { Icon, type IconName } from '@/components/ui/Icon';
import { useAuthStore } from '@/stores/authStore';
import './HomePage.css';

const ACTIONS: Array<{ icon: IconName; title: string; subtitle: string; to: string }> = [
  { icon: 'chat', title: 'Start a Chat', subtitle: 'Ask your AI anything', to: '/chat' },
  { icon: 'notes', title: 'Capture a Note', subtitle: 'Save ideas instantly', to: '/notes' },
  { icon: 'tasks', title: 'Create a Task', subtitle: 'Plan your day', to: '/tasks' },
  { icon: 'mic', title: 'Voice Command', subtitle: 'Just speak naturally', to: '/chat' },
];

export function HomePage() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const firstName = user?.displayName?.split(' ')[0] ?? 'there';

  return (
    <div className="home">
      <header className="home__topbar">
        <button className="home__premium">
          <Icon name="plus" size={14} />
          Try Premium
        </button>
        <span className="home__avatar">
          {user?.avatarUrl ? <img src={user.avatarUrl} alt="" /> : (firstName[0] ?? '?').toUpperCase()}
        </span>
      </header>

      <h1 className="home__greeting">Hi {firstName},</h1>
      <p className="home__subtitle">
        Give any command naturally, from generating notes to scheduling tasks
      </p>

      <div className="home__aurora" />

      <div className="home__grid">
        {ACTIONS.map((action) => (
          <button
            key={action.title}
            className="glass-card home__action"
            onClick={() => navigate(action.to)}
          >
            <span className="home__action-icon">
              <Icon name={action.icon} size={16} />
            </span>
            <span className="home__action-title">{action.title}</span>
            <span className="home__action-subtitle">{action.subtitle}</span>
          </button>
        ))}
      </div>

      <button className="pill-btn home__cta" onClick={() => navigate('/chat')}>
        <span>Tap here to start chatting</span>
        <span className="home__cta-mic">
          <Icon name="mic" size={20} />
        </span>
      </button>
    </div>
  );
}
