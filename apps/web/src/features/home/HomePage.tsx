import { useNavigate } from 'react-router-dom';
import { Avatar, Card, Icon, MicOrb, type IconName } from '@/components/ui';
import { useAuthStore } from '@/stores/authStore';
import './HomePage.css';

const ACTIONS: Array<{ icon: IconName; title: string; subtitle: string; to: string }> = [
  { icon: 'chat', title: 'Start a Chat', subtitle: 'Ask your AI anything', to: '/chat' },
  { icon: 'notes', title: 'Capture a Note', subtitle: 'Save ideas instantly', to: '/notes' },
  { icon: 'tasks', title: 'Create a Task', subtitle: 'Plan your day', to: '/tasks' },
  { icon: 'mic', title: 'Voice Command', subtitle: 'Just speak naturally', to: '/chat' },
];

function daypart(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export function HomePage() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const firstName = user?.displayName?.split(' ')[0] ?? 'there';

  return (
    <div className="home">
      <header className="home__topbar rise">
        <button className="home__premium" type="button">
          <Icon name="plus" size={14} />
          Try Premium
        </button>
        <Avatar name={user?.displayName} src={user?.avatarUrl} size={36} />
      </header>

      <div className="home__hero rise rise-2">
        <p className="home__eyebrow">
          <span className="home__eyebrow-dot" aria-hidden="true" />
          {daypart()}
        </p>
        <h1 className="display">
          Hi {firstName},
          <br />
          <span className="ink">what can I do for you?</span>
        </h1>
        <p className="home__subtitle">
          Give any command naturally, from generating notes to scheduling tasks
        </p>
      </div>

      <div className="home__stage rise rise-3">
        <span className="home__ring home__ring--outer" aria-hidden="true" />
        <span className="home__ring home__ring--inner" aria-hidden="true" />
        <MicOrb size={128} onClick={() => navigate('/chat')} />
        <p className="home__stage-caption">Tap and just speak</p>
      </div>

      <div className="home__grid rise rise-4">
        {ACTIONS.map((action) => (
          <Card
            key={action.title}
            interactive
            className="home__action"
            role="link"
            tabIndex={0}
            aria-label={`${action.title} — ${action.subtitle}`}
            onClick={() => navigate(action.to)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                navigate(action.to);
              }
            }}
          >
            <span className="home__action-icon">
              <Icon name={action.icon} size={17} />
            </span>
            <span className="home__action-text">
              <span className="home__action-title">{action.title}</span>
              <span className="home__action-subtitle">{action.subtitle}</span>
            </span>
            <span className="home__action-arrow" aria-hidden="true">
              <Icon name="arrow-right" size={16} />
            </span>
          </Card>
        ))}
      </div>
    </div>
  );
}
