/**
 * Gonsave AI — Frontend (deploy to Vercel)
 * src/GonsaveChatbot.jsx
 *
 * Create a .env file with:
 *   VITE_API_URL=https://your-replit-app.replit.app
 *   VITE_API_KEY=gonsave-internal-2026   (must match API_SECRET in Replit)
 *   VITE_USER_ID=user_001                (hardcode for internal single-user tool)
 */

import { useState, useRef, useEffect, useCallback } from "react";

const API_URL  = import.meta.env.VITE_API_URL  || "http://localhost:3001";
const API_KEY  = import.meta.env.VITE_API_KEY  || "";
const USER_ID  = import.meta.env.VITE_USER_ID  || "default_user";

// ── Brand colors ──────────────────────────────────────────────────────────────
const C = {
  orange: "#cb3c04", orangeDark: "#a83203",
  dark: "#2c2c2c", teal: "#37b09b",
  rose: "#dfd2d4", roseFaint: "#fdf8f7",
  white: "#ffffff", border: "#ede9eb",
  muted: "#888", hint: "#bbb",
};

// ── API client — all calls go through Replit backend ─────────────────────────
const api = {
  headers: { "Content-Type": "application/json", "x-api-key": API_KEY },

  async chat(message, history) {
    const r = await fetch(`${API_URL}/api/chat`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify({ userId: USER_ID, message, history }),
    });
    if (!r.ok) throw new Error((await r.json()).error || "API error");
    return r.json(); // { reply, retrieved, newMemories }
  },

  async getMemories() {
    const r = await fetch(`${API_URL}/api/memories/${USER_ID}`, { headers: this.headers });
    if (!r.ok) throw new Error("Failed to load memories");
    return (await r.json()).memories;
  },

  async deleteMemory(memId) {
    await fetch(`${API_URL}/api/memories/${USER_ID}/${memId}`, {
      method: "DELETE", headers: this.headers,
    });
  },

  async editMemory(memId, content) {
    await fetch(`${API_URL}/api/memories/${USER_ID}/${memId}`, {
      method: "PATCH",
      headers: this.headers,
      body: JSON.stringify({ content }),
    });
  },

  async clearAll() {
    await fetch(`${API_URL}/api/memories/${USER_ID}`, {
      method: "DELETE", headers: this.headers,
    });
  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
const fmtTime = ts => new Date(ts).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
const fmtDate = ts => new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" });

const catStyle = {
  preference: { bg: "#e9f7f4", color: "#0a7a67", border: "1px solid #c0e8e0" },
  personal:   { bg: "#fdf0eb", color: "#8c3200", border: `1px solid ${C.rose}` },
  fact:       { bg: "#f3f0fe", color: "#4a3eaa", border: "1px solid #cbc7f0" },
  goal:       { bg: "#f5f9e8", color: "#3a6010", border: "1px solid #c5da8a" },
};

// ── Sub-components ────────────────────────────────────────────────────────────
function NavItem({ icon, label, badge, active, onClick }) {
  return (
    <div onClick={onClick} style={{
      display: "flex", alignItems: "center", gap: 10, padding: "8px 18px",
      cursor: "pointer", fontSize: 12.5, transition: "background 0.15s",
      color: active ? C.orange : "rgba(255,255,255,0.6)",
      background: active ? "rgba(203,60,4,0.18)" : "transparent",
      borderRight: active ? `2px solid ${C.orange}` : "2px solid transparent",
    }}>
      <i className={`ti ti-${icon}`} aria-hidden="true" style={{ fontSize: 15 }} />
      <span style={{ flex: 1 }}>{label}</span>
      {badge !== undefined && (
        <span style={{ background: C.orange, color: C.white, fontSize: 9, padding: "1px 6px", borderRadius: 99, fontWeight: 600 }}>
          {badge}
        </span>
      )}
    </div>
  );
}

function MemChip({ memory, onDelete }) {
  const short = memory.content.length > 26 ? memory.content.slice(0, 26) + "…" : memory.content;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 99, background: C.white, border: `1px solid ${C.border}`, fontSize: 11, color: "#555" }}>
      <i className="ti ti-circle-check" aria-hidden="true" style={{ fontSize: 12, color: C.teal }} />
      {short}
      <span onClick={() => onDelete(memory.id)} role="button" aria-label="Remove" style={{ fontSize: 12, color: C.hint, cursor: "pointer", marginLeft: 2 }}>×</span>
    </span>
  );
}

function MemCard({ memory, onDelete, onEdit }) {
  const cs = catStyle[memory.category] || catStyle.fact;
  return (
    <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 10, padding: "9px 11px", marginBottom: 7 }}>
      <div style={{ fontSize: 12, color: C.dark, lineHeight: 1.5 }}>{memory.content}</div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 6 }}>
        <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 99, fontWeight: 500, background: cs.bg, color: cs.color, border: cs.border }}>
          {memory.category}
        </span>
        <div style={{ display: "flex", gap: 4 }}>
          {[["edit", () => onEdit(memory.id, memory.content)], ["trash", () => onDelete(memory.id)]].map(([icon, fn]) => (
            <button key={icon} onClick={fn} aria-label={icon} style={{ width: 22, height: 22, borderRadius: 6, border: `1px solid ${C.border}`, background: C.white, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: C.hint }}>
              <i className={`ti ti-${icon}`} style={{ fontSize: 12 }} aria-hidden="true" />
            </button>
          ))}
        </div>
      </div>
      <div style={{ fontSize: 10, color: C.hint, marginTop: 3 }}>{fmtDate(memory.createdAt)}</div>
    </div>
  );
}

function MemTag({ content, saved }) {
  const short = content.length > 32 ? content.slice(0, 32) + "…" : content;
  const cs = saved
    ? { bg: "#fdf0eb", color: "#a33000", border: `1px solid ${C.rose}` }
    : { bg: "#e9f7f4", color: "#0a7a67", border: "1px solid #c0e8e0" };
  return (
    <span style={{ display: "inline-block", fontSize: 10, padding: "2px 7px", borderRadius: 99, margin: "2px 2px 0 0", background: cs.bg, color: cs.color, border: cs.border }}>
      <i className={`ti ti-${saved ? "bookmark" : "circle-check"}`} aria-hidden="true" /> {saved ? "Remembered: " : ""}{short}
    </span>
  );
}

function Bubble({ msg }) {
  const isUser = msg.role === "user";
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "flex-end", flexDirection: isUser ? "row-reverse" : "row", marginBottom: 14 }}>
      <div style={{ width: 28, height: 28, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 600, background: isUser ? C.teal : C.orange, color: C.white }}>
        {isUser ? "AY" : "G"}
      </div>
      <div style={{ maxWidth: "75%" }}>
        {!isUser && msg.retrieved?.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", marginBottom: 4 }}>
            {msg.retrieved.map((m, i) => <MemTag key={i} content={m.content} />)}
          </div>
        )}
        <div style={{
          padding: "10px 14px",
          borderRadius: isUser ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
          background: isUser ? C.orange : "#f7f4f5",
          border: `1px solid ${isUser ? C.orangeDark : C.border}`,
          color: isUser ? C.white : C.dark,
          fontSize: 13, lineHeight: 1.55,
        }}>
          {msg.content.split("\n").map((line, i, arr) => (
            <span key={i}>{line}{i < arr.length - 1 && <br />}</span>
          ))}
        </div>
        {!isUser && msg.newMemories?.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", marginTop: 4 }}>
            {msg.newMemories.map((m, i) => <MemTag key={i} content={m.content} saved />)}
          </div>
        )}
        <div style={{ fontSize: 10, color: C.hint, marginTop: 3, textAlign: isUser ? "right" : "left" }}>
          {fmtTime(msg.ts)}
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function GonsaveChatbot() {
  const [memories, setMemories] = useState([]);
  const [messages, setMessages] = useState([
    { id: uid(), role: "assistant", content: "Hello — I'm your Gonsave AI assistant. I remember context across sessions so I can give sharper insights over time.\n\nAsk me about cost reduction, retention strategy, or team performance.", ts: Date.now() },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showMem, setShowMem] = useState(false);
  const [memFilter, setMemFilter] = useState("all");
  const [memSearch, setMemSearch] = useState("");
  const [error, setError] = useState("");
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  // Load memories from backend on mount
  useEffect(() => {
    api.getMemories().then(setMemories).catch(console.error);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleDelete = useCallback(async (memId) => {
    await api.deleteMemory(memId);
    setMemories(prev => prev.filter(m => m.id !== memId));
  }, []);

  const handleEdit = useCallback(async (memId, old) => {
    const val = window.prompt("Edit memory:", old);
    if (!val?.trim()) return;
    await api.editMemory(memId, val.trim());
    setMemories(prev => prev.map(m => m.id === memId ? { ...m, content: val.trim(), updatedAt: Date.now() } : m));
  }, []);

  const handleClearAll = useCallback(async () => {
    if (!window.confirm("Delete all memories permanently?")) return;
    await api.clearAll();
    setMemories([]);
  }, []);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    setError("");
    const userMsg = { id: uid(), role: "user", content: text, ts: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);
    try {
      const history = messages.slice(-12).map(m => ({ role: m.role, content: m.content }));
      const { reply, retrieved, newMemories } = await api.chat(text, history);
      if (newMemories?.length) {
        setMemories(prev => [...prev, ...newMemories]);
      }
      setMessages(prev => [...prev, { id: uid(), role: "assistant", content: reply, ts: Date.now(), retrieved, newMemories }]);
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
    inputRef.current?.focus();
  };

  const filtered = memories
    .filter(m => memFilter === "all" || m.category === memFilter)
    .filter(m => !memSearch || m.content.toLowerCase().includes(memSearch.toLowerCase()));

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Mulish:wght@300;400;500;600;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        body{font-family:'Mulish',sans-serif}
        ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:#ddd;border-radius:99px}
        @keyframes dotpulse{0%,80%,100%{transform:scale(1);opacity:.5}40%{transform:scale(1.3);opacity:1}}
      `}</style>

      <div style={{ display: "flex", height: "100vh", fontFamily: "'Mulish', sans-serif", background: C.white, overflow: "hidden" }}>
        {/* Sidebar */}
        <div style={{ width: 220, background: C.dark, display: "flex", flexDirection: "column", flexShrink: 0 }}>
          <div style={{ padding: "20px 18px 16px", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 32, height: 32, background: C.orange, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 700, color: C.white }}>G</div>
              <div style={{ fontSize: 17, fontWeight: 700, color: C.white, letterSpacing: "-0.3px" }}>
                <span style={{ color: C.orange }}>Go</span>nsave
              </div>
            </div>
            <div style={{ fontSize: 9, color: "rgba(255,255,255,0.4)", marginTop: 3, letterSpacing: "0.3px", lineHeight: 1.4 }}>
              Insights that Improve Costs,<br />Retention &amp; Performance
            </div>
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: "12px 0" }}>
            <div style={{ fontSize: 9, color: "rgba(255,255,255,0.35)", letterSpacing: "0.8px", padding: "12px 18px 4px", fontWeight: 600 }}>Workspace</div>
            <NavItem icon="message-2" label="AI assistant" active />
            <NavItem icon="chart-bar" label="Analytics" badge={3} />
            <NavItem icon="users" label="Retention" />
            <NavItem icon="coin" label="Cost insights" />
            <div style={{ fontSize: 9, color: "rgba(255,255,255,0.35)", letterSpacing: "0.8px", padding: "12px 18px 4px", fontWeight: 600 }}>Memory</div>
            <NavItem icon="brain" label="Your memories" badge={memories.length} active={showMem} onClick={() => setShowMem(p => !p)} />
            <NavItem icon="lock" label="Privacy" />
          </div>
          <div style={{ padding: "14px 18px", borderTop: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", gap: 9 }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", background: C.orange, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 600, color: C.white }}>AY</div>
            <div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", fontWeight: 500 }}>Alex Yusuf</div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)" }}>Strategy team</div>
            </div>
          </div>
        </div>

        {/* Main */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
          {/* Topbar */}
          <div style={{ height: 52, background: C.white, borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", padding: "0 20px", gap: 10, flexShrink: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: C.dark, flex: 1 }}>
              <span style={{ color: C.orange }}>Go</span>nsave AI — strategy assistant
            </div>
            <button onClick={() => setMessages([{ id: uid(), role: "assistant", content: "Chat cleared. Memories are intact.", ts: Date.now() }])} style={{ height: 30, padding: "0 12px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.white, fontSize: 11.5, cursor: "pointer", display: "flex", alignItems: "center", gap: 5, color: C.muted, fontFamily: "'Mulish', sans-serif" }}>
              <i className="ti ti-refresh" style={{ fontSize: 13 }} aria-hidden="true" /> New chat
            </button>
            <button onClick={() => setShowMem(p => !p)} style={{ height: 30, padding: "0 12px", borderRadius: 8, border: `1px solid ${showMem ? C.orange : C.border}`, background: showMem ? C.orange : C.white, fontSize: 11.5, cursor: "pointer", display: "flex", alignItems: "center", gap: 5, color: showMem ? C.white : C.muted, fontFamily: "'Mulish', sans-serif" }}>
              <i className="ti ti-brain" style={{ fontSize: 13 }} aria-hidden="true" /> Memories {memories.length > 0 && <strong style={{ marginLeft: 2 }}>{memories.length}</strong>}
            </button>
          </div>

          {/* Memory strip */}
          <div style={{ background: C.roseFaint, borderBottom: `1px solid ${C.border}`, padding: "6px 20px", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", minHeight: 36 }}>
            <span style={{ fontSize: 10, color: "#999", fontWeight: 600, letterSpacing: "0.3px" }}>
              <i className="ti ti-brain" aria-hidden="true" style={{ fontSize: 11, color: C.teal, marginRight: 3 }} /> Active context:
            </span>
            {memories.length === 0
              ? <span style={{ fontSize: 11, color: C.hint, fontStyle: "italic" }}>No memories yet — start chatting</span>
              : memories.slice(-4).map(m => <MemChip key={m.id} memory={m} onDelete={handleDelete} />)
            }
          </div>

          {/* Chat */}
          <div style={{ flex: 1, overflowY: "auto", padding: "20px 20px 12px" }}>
            {messages.length === 1 && (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
                {["My team has high churn — where do I start?", "We overspent on vendors last quarter", "I prefer data-driven concise responses"].map(hint => (
                  <button key={hint} onClick={() => { setInput(hint); inputRef.current?.focus(); }} style={{ fontSize: 12, padding: "6px 12px", borderRadius: 99, border: `1px solid ${C.border}`, background: C.white, cursor: "pointer", color: C.muted, fontFamily: "'Mulish', sans-serif" }}>
                    {hint}
                  </button>
                ))}
              </div>
            )}
            {messages.map(msg => <Bubble key={msg.id} msg={msg} />)}
            {loading && (
              <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: C.orange, color: C.white, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 600 }}>G</div>
                <div style={{ padding: "12px 16px", borderRadius: "14px 14px 14px 4px", background: "#f7f4f5", border: `1px solid ${C.border}` }}>
                  <div style={{ display: "flex", gap: 4 }}>
                    {[0, 0.2, 0.4].map((d, i) => (
                      <span key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: C.hint, display: "inline-block", animation: `dotpulse 1.2s ${d}s infinite` }} />
                    ))}
                  </div>
                </div>
              </div>
            )}
            {error && (
              <div style={{ fontSize: 12, color: "#a33000", background: "#fdf0eb", border: `1px solid ${C.rose}`, borderRadius: 8, padding: "8px 12px", marginTop: 8 }}>
                {error}
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{ padding: "12px 16px", background: C.white, borderTop: `1px solid ${C.border}`, display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
            <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }} placeholder="Ask about costs, retention, or strategy…" disabled={loading} style={{ flex: 1, height: 38, border: `1px solid ${C.border}`, borderRadius: 10, padding: "0 12px", fontSize: 13, fontFamily: "'Mulish', sans-serif", outline: "none", color: C.dark, background: "#fdfcfc" }} />
            <button onClick={sendMessage} disabled={loading || !input.trim()} aria-label="Send" style={{ width: 38, height: 38, borderRadius: 10, background: loading || !input.trim() ? "#e0dce0" : C.orange, border: "none", cursor: loading || !input.trim() ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <i className="ti ti-send" aria-hidden="true" style={{ fontSize: 16, color: C.white }} />
            </button>
          </div>
        </div>

        {/* Memory panel */}
        {showMem && (
          <div style={{ width: 260, borderLeft: `1px solid ${C.border}`, background: "#fdfcfc", display: "flex", flexDirection: "column", flexShrink: 0 }}>
            <div style={{ padding: "14px 16px 10px", borderBottom: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.dark }}>
                <i className="ti ti-brain" aria-hidden="true" style={{ color: C.teal, marginRight: 4 }} /> Your memories
              </div>
              <div style={{ fontSize: 11, color: "#999", marginTop: 1 }}>{memories.length} fact{memories.length === 1 ? "" : "s"} stored · backed by server</div>
            </div>
            <div style={{ padding: "8px 12px", borderBottom: `1px solid ${C.border}` }}>
              <input value={memSearch} onChange={e => setMemSearch(e.target.value)} placeholder="Search…" style={{ width: "100%", height: 30, border: `1px solid ${C.border}`, borderRadius: 8, padding: "0 10px", fontSize: 12, fontFamily: "'Mulish', sans-serif", outline: "none", background: C.white, color: C.dark }} />
            </div>
            <div style={{ padding: "6px 12px 8px", display: "flex", gap: 4, flexWrap: "wrap", borderBottom: `1px solid ${C.border}` }}>
              {["all", "preference", "personal", "fact", "goal"].map(f => (
                <button key={f} onClick={() => setMemFilter(f)} style={{ fontSize: 10, padding: "2px 8px", borderRadius: 99, cursor: "pointer", fontFamily: "'Mulish', sans-serif", background: memFilter === f ? C.teal : C.white, border: `1px solid ${memFilter === f ? C.teal : C.border}`, color: memFilter === f ? C.white : "#666" }}>
                  {f}
                </button>
              ))}
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "8px 12px" }}>
              {filtered.length === 0
                ? <div style={{ textAlign: "center", color: C.hint, fontSize: 12, marginTop: 24 }}>{memories.length === 0 ? "No memories yet" : "No matches"}</div>
                : filtered.map(m => <MemCard key={m.id} memory={m} onDelete={handleDelete} onEdit={handleEdit} />)
              }
            </div>
            {memories.length > 0 && (
              <div style={{ padding: "10px 12px", borderTop: `1px solid ${C.border}` }}>
                <button onClick={handleClearAll} style={{ width: "100%", height: 30, borderRadius: 8, border: `1px solid ${C.rose}`, background: C.white, fontSize: 11, cursor: "pointer", color: C.orange, fontFamily: "'Mulish', sans-serif" }}>
                  <i className="ti ti-trash" aria-hidden="true" style={{ fontSize: 12 }} /> Clear all memories
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
