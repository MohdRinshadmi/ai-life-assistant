import { memo, useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { Icon, MicOrb, Spinner, Toast } from '@/components/ui';
import { useAuthStore } from '@/stores/authStore';
import { useChat } from './useChat';
import { useChatStore, type UIMessage } from './chatStore';
import { useSpeechRecognition } from '@/features/voice/useSpeechRecognition';
import { TodayPanel } from './TodayPanel';
import './ChatPage.css';

const SUGGESTIONS = [
  { title: 'Plan my day', subtitle: 'around my tasks', prompt: 'Plan my day' },
  { title: 'Add a task', subtitle: 'buy groceries tomorrow', prompt: 'Add a task: buy groceries tomorrow' },
  { title: 'Summarize my notes', subtitle: 'the recent ones', prompt: 'Summarize my notes' },
  { title: 'Brainstorm ideas', subtitle: 'for the weekend', prompt: 'Brainstorm some ideas for the weekend' },
];

function daypart(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

/** Memoized: while tokens stream in, only the active message re-renders. */
const MessageBubble = memo(function MessageBubble({ message }: { message: UIMessage }) {
  const isUser = message.role === 'user';
  return (
    <div className={`bubble-row${isUser ? ' bubble-row--user' : ''}`}>
      <div className={`bubble ${isUser ? 'bubble--user' : 'bubble--assistant'}`}>
        {message.content || (
          <span className="typing-dots" aria-label="Assistant is typing">
            <span />
            <span />
            <span />
          </span>
        )}
        {message.isStreaming && message.content && <span className="bubble-cursor" />}
      </div>
    </div>
  );
});

export function ChatPage() {
  const { connected, taskToast, sendMessage } = useChat();
  const messages = useChatStore((s) => s.messages);
  const isAssistantTyping = useChatStore((s) => s.isAssistantTyping);
  const error = useChatStore((s) => s.error);
  const user = useAuthStore((s) => s.user);
  const [draft, setDraft] = useState('');
  const listRef = useRef<HTMLDivElement>(null);

  const voice = useSpeechRecognition((finalTranscript) => sendMessage(finalTranscript));

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!draft.trim() || isAssistantTyping) return;
    sendMessage(draft);
    setDraft('');
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const firstName = user?.displayName.split(' ')[0] ?? 'there';

  return (
    <div className="chat-shell">
      <div className="chat">
        <header className="chat__header">
          <h2>Assistant</h2>
          <div className="chat__status">
            <span
              className={`chat__dot${connected ? ' chat__dot--on' : ''}`}
              aria-hidden="true"
            />
            {connected ? 'Connected' : 'Connecting…'}
          </div>
        </header>

        <Toast show={Boolean(taskToast)} tone="success">
          ✓ Task created: {taskToast?.title}
        </Toast>
        {error && (
          <div className="chat__error" role="alert">
            {error}
          </div>
        )}

        <div className="chat__list" ref={listRef} aria-live="polite">
          {messages.length === 0 ? (
            <div className="chat__empty">
              <div className="chat__greeting rise">
                <MicOrb size={76} active={false} />
                <h3 className="display chat__empty-title">
                  {daypart()}, <span className="ink">{firstName}</span>.
                </h3>
                <p>Type below, or use the mic and just talk.</p>
              </div>
              <div className="chat__suggestion-grid rise rise-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s.title}
                    type="button"
                    className="suggestion-card"
                    onClick={() => sendMessage(s.prompt)}
                  >
                    <strong>{s.title}</strong>
                    <span>{s.subtitle}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m) => <MessageBubble key={m.id} message={m} />)
          )}
        </div>

        {voice.listening && (
          <div className="chat__listening">
            <p className="chat__transcript">{voice.transcript || 'Listening…'}</p>
            <MicOrb size={64} active onClick={voice.stop} />
          </div>
        )}

        <div className="chat__inputbar">
          <textarea
            rows={1}
            maxLength={4000}
            placeholder="Ask anything"
            aria-label="Ask anything"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          {voice.supported && (
            <button
              type="button"
              className={`chat__mic${voice.listening ? ' chat__mic--on' : ''}`}
              onClick={voice.listening ? voice.stop : voice.start}
              aria-label={voice.listening ? 'Stop voice input' : 'Start voice input'}
              aria-pressed={voice.listening}
            >
              <Icon name="mic" size={18} />
            </button>
          )}
          <button
            type="button"
            className={`chat__send${draft.trim() && !isAssistantTyping ? ' chat__send--ready' : ''}`}
            onClick={handleSend}
            disabled={!draft.trim() || isAssistantTyping}
            aria-label="Send message"
          >
            {isAssistantTyping ? <Spinner size="sm" /> : <Icon name="send" size={16} />}
          </button>
        </div>
      </div>

      <TodayPanel onSuggest={sendMessage} />
    </div>
  );
}
