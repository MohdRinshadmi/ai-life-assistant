import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { Icon } from '@/components/ui/Icon';
import { MicOrb } from '@/components/ui/MicOrb';
import { useChat } from './useChat';
import { useChatStore, type UIMessage } from './chatStore';
import { useSpeechRecognition } from '@/features/voice/useSpeechRecognition';
import './ChatPage.css';

function MessageBubble({ message }: { message: UIMessage }) {
  const isUser = message.role === 'user';
  return (
    <div className={`bubble-row${isUser ? ' bubble-row--user' : ''}`}>
      {!isUser && <span className="bubble-avatar">AI</span>}
      <div className={`bubble ${isUser ? 'bubble--user' : 'bubble--assistant'}`}>
        {message.content || (
          <span className="typing-dots">
            <span />
            <span />
            <span />
          </span>
        )}
        {message.isStreaming && message.content && <span className="bubble-cursor" />}
      </div>
    </div>
  );
}

export function ChatPage() {
  const { connected, taskToast, sendMessage } = useChat();
  const messages = useChatStore((s) => s.messages);
  const isAssistantTyping = useChatStore((s) => s.isAssistantTyping);
  const error = useChatStore((s) => s.error);
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

  return (
    <div className="chat">
      <header className="chat__header">
        <h2>AI Chat</h2>
        <div className="chat__status">
          <span className={`chat__dot${connected ? ' chat__dot--on' : ''}`} />
          {connected ? 'Connected' : 'Connecting…'}
        </div>
      </header>

      {taskToast && <div className="chat__toast">✓ Task created: {taskToast.title}</div>}
      {error && <div className="chat__error">{error}</div>}

      <div className="chat__list" ref={listRef}>
        {messages.length === 0 ? (
          <div className="empty-state chat__empty">
            <MicOrb size={72} active={false} />
            <h3>AI Life Assistant</h3>
            <p>Ask me anything — or use the mic to talk.</p>
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
          placeholder="Message your AI assistant…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        {voice.supported && (
          <button
            className={`chat__mic${voice.listening ? ' chat__mic--on' : ''}`}
            onClick={voice.listening ? voice.stop : voice.start}
            aria-label="Voice input"
          >
            <Icon name="mic" size={18} />
          </button>
        )}
        <button
          className={`chat__send${draft.trim() && !isAssistantTyping ? ' chat__send--ready' : ''}`}
          onClick={handleSend}
          disabled={!draft.trim() || isAssistantTyping}
          aria-label="Send"
        >
          {isAssistantTyping ? <span className="spinner" style={{ width: 16, height: 16 }} /> : <Icon name="send" size={16} />}
        </button>
      </div>
    </div>
  );
}
