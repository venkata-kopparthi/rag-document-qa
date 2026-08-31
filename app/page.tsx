"use client";

import { useChat } from "@ai-sdk/react";
import { useState } from "react";

import type { RagUIMessage } from "@/lib/types";

function messageText(message: RagUIMessage): string {
  return message.parts
    .filter((part): part is { type: "text"; text: string } => part.type === "text")
    .map((part) => part.text)
    .join("");
}

export default function ChatPage() {
  const { messages, sendMessage, status, error } = useChat<RagUIMessage>();
  const [input, setInput] = useState("");

  const isBusy = status === "submitted" || status === "streaming";

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || isBusy) return;
    sendMessage({ text });
    setInput("");
  }

  return (
    <main className="chat-shell">
      <div className="chat-header">
        <h1>Document Q&amp;A</h1>
        <p>Ask questions and get answers grounded in your ingested documents.</p>
      </div>

      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="chat-empty">
            Ask a question about the documents you ingested with{" "}
            <code>npm run ingest</code>.
          </div>
        )}

        {messages.map((message) => {
          const sources = message.metadata?.sources ?? [];
          return (
            <div key={message.id} className={`bubble-row ${message.role}`}>
              <div className={`bubble ${message.role}`}>
                {messageText(message) || (isBusy && message.role === "assistant" ? "..." : "")}

                {message.role === "assistant" && sources.length > 0 && (
                  <div className="sources">
                    Sources:
                    <ol>
                      {sources.map((s, i) => (
                        <li key={`${message.id}-${i}`}>
                          {s.source} (chunk {s.chunkIndex}, similarity {s.similarity.toFixed(2)})
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {status === "submitted" && <div className="status-banner">thinking...</div>}
      {error && <div className="error-banner">{error.message}</div>}

      <form className="chat-form" onSubmit={handleSubmit}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about your documents..."
          disabled={isBusy}
        />
        <button type="submit" disabled={isBusy || !input.trim()}>
          Send
        </button>
      </form>
    </main>
  );
}
