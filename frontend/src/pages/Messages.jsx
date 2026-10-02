import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../lib/api";
import { useAuth } from "../context/AuthContext";

export default function Messages() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState("");
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [error, setError] = useState("");

  async function loadConversations() {
    setLoading(true);
    setError("");
    try {
      const response = await apiFetch("/messages/conversations");
      const items = response.conversations || [];
      setConversations(items);
      if (!activeId && items[0]) setActiveId(items[0].id);
      if (activeId && !items.some((item) => item.id === activeId)) {
        setActiveId(items[0]?.id || "");
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadMessages(conversationId) {
    if (!conversationId) {
      setMessages([]);
      return;
    }
    setMessagesLoading(true);
    setError("");
    try {
      const response = await apiFetch("/messages/" + conversationId + "/messages");
      setMessages(response.messages || []);
    } catch (e) {
      setMessages([]);
      setError(e.message);
    } finally {
      setMessagesLoading(false);
    }
  }

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    loadMessages(activeId);
  }, [activeId]);

  async function send(e) {
    e.preventDefault();
    const body = text.trim();
    if (!body || !activeId) return;

    try {
      const response = await apiFetch("/messages/" + activeId + "/messages", {
        method: "POST",
        body: JSON.stringify({ body }),
      });
      setMessages((current) => [...current, response.message]);
      setText("");
    } catch (e) {
      setError(e.message);
    }
  }

  const active = conversations.find((item) => item.id === activeId);

  return (
    <div className="content-wrap messages-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">PRIVATE CONVERSATIONS</p>
          <h1>Messages</h1>
          <p>Chat with travellers after a request has been accepted.</p>
        </div>
      </div>

      {error && <p className="form-error">{error}</p>}

      {loading ? (
        <section className="empty-state-card"><h2>Loading conversations…</h2></section>
      ) : conversations.length === 0 ? (
        <section className="discover-empty">
          <div className="discover-illustration">✦</div>
          <h2>No conversations yet</h2>
          <p>Accept a travel request and the conversation will appear here.</p>
          <Link className="button" to="/requests">View requests</Link>
        </section>
      ) : (
        <div className="chat-layout">
          <aside className="conversation-list">
            {conversations.map((conversation) => (
              <button
                key={conversation.id}
                type="button"
                className={activeId === conversation.id ? "conversation active" : "conversation"}
                onClick={() => setActiveId(conversation.id)}
              >
                <div className="mini-avatar">
                  {(conversation.other?.display_name || "T").slice(0, 1).toUpperCase()}
                </div>
                <div>
                  <strong>{conversation.other?.display_name || "Traveller"}</strong>
                  <small>{conversation.request?.trip?.destination || "Travel connection"}</small>
                </div>
              </button>
            ))}
          </aside>

          <section className="chat-panel">
            <div className="chat-head">
              <div className="mini-avatar">
                {(active?.other?.display_name || "T").slice(0, 1).toUpperCase()}
              </div>
              <div>
                <strong>{active?.other?.display_name || "Traveller"}</strong>
                <span>{active?.request?.trip?.destination || "Accepted connection"}</span>
              </div>
            </div>

            <div className="message-stream">
              {messagesLoading ? (
                <p className="muted">Loading messages…</p>
              ) : messages.length === 0 ? (
                <p className="muted">No messages yet. Start the conversation.</p>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={message.sender_id === user?.id ? "message mine" : "message"}
                  >
                    <span>{message.body}</span>
                    <small>{new Date(message.created_at).toLocaleString()}</small>
                  </div>
                ))
              )}
            </div>

            <form className="message-form" onSubmit={send}>
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={"Message " + (active?.other?.display_name || "traveller") + "…"}
                maxLength={4000}
              />
              <button className="button" disabled={!text.trim()}>Send</button>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
