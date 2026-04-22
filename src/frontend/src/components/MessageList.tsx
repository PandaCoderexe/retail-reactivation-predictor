import type { RefObject } from "react";
import type { ChatMessage } from "../types";

type MessageListProps = {
  messages: ChatMessage[];
  messagesRef: RefObject<HTMLElement | null>;
  messagesEndRef: RefObject<HTMLDivElement | null>;
};

export function MessageList({ messages, messagesRef, messagesEndRef }: MessageListProps) {
  return (
    <section className="messages" aria-live="polite" ref={messagesRef}>
      {messages.map((message) => (
        <article className={`message ${message.role}`} key={message.id}>
          <div className="message-header">
            <span>{message.title}</span>
          </div>
          <pre>{message.body}</pre>
        </article>
      ))}
      <div ref={messagesEndRef} />
    </section>
  );
}
