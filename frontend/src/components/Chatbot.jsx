import React, { useState, useRef, useEffect } from "react";

// ─── Knowledge Base ───────────────────────────────────────────────────────────
const FAQ = [
  {
    keywords: ["what is securevote", "about securevote", "what is this", "tell me about"],
    answer:
      "SecureVote is a blockchain-based voting platform that uses smart contracts, Zero-Knowledge Proofs (ZKP), and biometric face verification to ensure elections are secure, transparent, and tamper-proof.",
  },
  {
    keywords: ["register", "how to register", "voter registration", "sign up", "apply"],
    answer:
      "Go to the Register page, connect your MetaMask wallet, fill in your details (name, Aadhaar/ID reference, district, ward info), and upload a clear photo. Your application will be reviewed by the admin.",
  },
  {
    keywords: ["whitelist", "approved", "approval", "whitelisted", "get approved"],
    answer:
      "After you submit your registration, the admin reviews it. Once approved, your wallet address is added to the blockchain whitelist and you can participate in elections.",
  },
  {
    keywords: ["vote", "how to vote", "cast vote", "voting"],
    answer:
      "Go to the Election Booth page. Connect your wallet → Pass biometric face verification → Generate your anonymous ZK identity → Select a candidate and cast your vote. Your vote is recorded permanently on the blockchain.",
  },
  {
    keywords: ["biometric", "face", "face verification", "face auth", "camera", "recognition"],
    answer:
      "Before voting, you must verify your identity using your webcam. The system matches your face against the photo registered by the admin. Make sure you are in good lighting and look directly at the camera.",
  },
  {
    keywords: ["face mismatch", "not recognizing", "face not matching", "biometric fail", "failed verification"],
    answer:
      "Try these: ✅ Ensure good lighting (no backlighting). ✅ Look directly at the camera. ✅ Remove glasses/hat if possible. ✅ Click 'Retry Scan'. If it still fails, contact your admin to re-register your face photo.",
  },
  {
    keywords: ["metamask", "wallet", "connect wallet", "web3", "ethereum"],
    answer:
      "Install the MetaMask browser extension from metamask.io. Create or import a wallet, then click 'Connect Wallet' on any page. Make sure you are connected to the correct network (Sepolia testnet or the configured network).",
  },
  {
    keywords: ["anonymous", "privacy", "private", "traceable", "identity"],
    answer:
      "Yes! SecureVote uses Semaphore Zero-Knowledge Proofs. Your vote cannot be linked back to your wallet address. You register a cryptographic commitment on-chain and vote anonymously — zero traceability.",
  },
  {
    keywords: ["zkp", "zero knowledge", "zk proof", "semaphore", "proof"],
    answer:
      "Zero-Knowledge Proof (ZKP) lets you prove you are a registered voter without revealing WHO you are. SecureVote uses the Semaphore protocol — your vote is cast with a zk-SNARK proof, meaning no one can trace your vote to your identity.",
  },
  {
    keywords: ["receipt", "proof of vote", "download receipt", "confirmation"],
    answer:
      "After successfully voting, a cryptographic receipt is shown with your transaction hash and block number. You can download it as a PDF. Use the transaction hash on the Verify page to independently confirm your vote on the blockchain.",
  },
  {
    keywords: ["verify", "verification", "check vote", "transaction hash"],
    answer:
      "Go to the Verify page and enter your transaction hash to independently confirm your vote was recorded on the blockchain — without revealing your identity or who you voted for.",
  },
  {
    keywords: ["results", "winner", "election results", "who won"],
    answer:
      "Go to the Results page to see live or final election results. The admin can also view detailed analytics and export signed PDF/CSV reports from the Admin Dashboard.",
  },
  {
    keywords: ["election", "when", "active election", "election time", "start", "end"],
    answer:
      "Active elections are shown on the Election Booth page. Each election displays its closing time. If no elections are listed, there are no ongoing elections at the moment.",
  },
  {
    keywords: ["admin", "how admin works", "admin panel"],
    answer:
      "The admin can: create elections, whitelist voters, process voter applications, register face descriptors, view analytics, and export results. The admin panel is accessible at /admin with credentials.",
  },
  {
    keywords: ["pending", "application status", "my status", "application pending"],
    answer:
      "After registering, check the notification bell (🔔) in the top navbar — it shows whether your application is Pending, Approved, or Rejected.",
  },
  {
    keywords: ["hello", "hi", "hey", "help", "hii"],
    answer:
      "Hello! 👋 I'm the SecureVote Assistant. I can help you with voter registration, biometric verification, voting, ZK proofs, and more. What would you like to know?",
  },
];

const SUGGESTIONS = [
  "How do I register?",
  "How does face verification work?",
  "How do I vote?",
  "What is Zero-Knowledge Proof?",
  "My face isn't being recognized",
  "How to connect MetaMask?",
  "Is my vote anonymous?",
];

const FALLBACK =
  "I'm not sure about that. Try asking about: registration, voting, biometric verification, MetaMask, ZK proofs, or election results. You can also contact the admin for further help.";

function findAnswer(query) {
  const q = query.toLowerCase();
  for (const faq of FAQ) {
    if (faq.keywords.some((kw) => q.includes(kw))) {
      return faq.answer;
    }
  }
  return FALLBACK;
}

// ─── Chatbot Component ────────────────────────────────────────────────────────
export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      from: "bot",
      text: "👋 Hi! I'm the SecureVote Assistant. Ask me anything about voting, registration, biometrics, or ZK proofs!",
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setHasUnread(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const sendMessage = (text) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    setMessages((prev) => [...prev, { from: "user", text: trimmed }]);
    setInput("");
    setIsTyping(true);

    setTimeout(() => {
      const answer = findAnswer(trimmed);
      setIsTyping(false);
      setMessages((prev) => [...prev, { from: "bot", text: answer }]);
      if (!isOpen) setHasUnread(true);
    }, 700);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage(input);
  };

  return (
    <>
      {/* ── Chat Window ─────────────────────────────────────── */}
      <div
        style={{
          position: "fixed",
          bottom: "6rem",
          right: "1.5rem",
          width: "min(370px, calc(100vw - 2rem))",
          zIndex: 9999,
          display: "flex",
          flexDirection: "column",
          borderRadius: "1.4rem",
          overflow: "hidden",
          boxShadow: "0 32px 72px rgba(2,6,23,0.55), 0 0 0 1px rgba(99,102,241,0.18)",
          background: "var(--surface-1)",
          border: "1px solid var(--border-soft)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          transformOrigin: "bottom right",
          transition: "opacity 220ms ease, transform 220ms cubic-bezier(.34,1.56,.64,1)",
          opacity: isOpen ? 1 : 0,
          transform: isOpen ? "scale(1) translateY(0)" : "scale(0.88) translateY(16px)",
          pointerEvents: isOpen ? "all" : "none",
        }}
      >
        {/* Header */}
        <div
          style={{
            background: "linear-gradient(135deg, #4f46e5, #0ea5e9)",
            padding: "1rem 1.2rem",
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
          }}
        >
          <div
            style={{
              width: "2.4rem",
              height: "2.4rem",
              borderRadius: "999px",
              background: "rgba(255,255,255,0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.2rem",
              flexShrink: 0,
            }}
          >
            🤖
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ color: "#fff", fontWeight: 700, fontSize: "0.95rem", letterSpacing: "0.01em" }}>
              SecureVote Assistant
            </div>
            <div style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.72rem", display: "flex", alignItems: "center", gap: "0.3rem" }}>
              <span style={{ width: "0.45rem", height: "0.45rem", borderRadius: "999px", background: "#22c55e", display: "inline-block" }} />
              Always online
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            style={{
              background: "rgba(255,255,255,0.12)",
              border: "none",
              borderRadius: "999px",
              width: "2rem",
              height: "2rem",
              cursor: "pointer",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1rem",
              transition: "background 150ms",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.25)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.12)")}
          >
            ✕
          </button>
        </div>

        {/* Messages */}
        <div
          className="custom-scrollbar"
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "1rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.65rem",
            maxHeight: "320px",
            minHeight: "200px",
          }}
        >
          {messages.map((msg, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                justifyContent: msg.from === "user" ? "flex-end" : "flex-start",
                animation: "chatFadeIn 0.25s ease-out",
              }}
            >
              <div
                style={{
                  maxWidth: "82%",
                  padding: "0.6rem 0.9rem",
                  borderRadius: msg.from === "user" ? "1.2rem 1.2rem 0.3rem 1.2rem" : "1.2rem 1.2rem 1.2rem 0.3rem",
                  background:
                    msg.from === "user"
                      ? "linear-gradient(135deg, #4f46e5, #0ea5e9)"
                      : "var(--surface-3)",
                  color: msg.from === "user" ? "#fff" : "var(--text-main)",
                  fontSize: "0.84rem",
                  lineHeight: 1.55,
                  border: msg.from === "bot" ? "1px solid var(--border-soft)" : "none",
                  whiteSpace: "pre-wrap",
                }}
              >
                {msg.text}
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {isTyping && (
            <div style={{ display: "flex", justifyContent: "flex-start", animation: "chatFadeIn 0.2s ease-out" }}>
              <div
                style={{
                  padding: "0.6rem 1rem",
                  borderRadius: "1.2rem 1.2rem 1.2rem 0.3rem",
                  background: "var(--surface-3)",
                  border: "1px solid var(--border-soft)",
                  display: "flex",
                  gap: "0.3rem",
                  alignItems: "center",
                }}
              >
                {[0, 1, 2].map((d) => (
                  <span
                    key={d}
                    style={{
                      width: "0.45rem",
                      height: "0.45rem",
                      borderRadius: "999px",
                      background: "var(--accent)",
                      display: "inline-block",
                      animation: `typingDot 1.2s ease-in-out infinite`,
                      animationDelay: `${d * 0.2}s`,
                    }}
                  />
                ))}
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Suggestions */}
        <div
          style={{
            padding: "0.5rem 1rem 0.6rem",
            display: "flex",
            gap: "0.4rem",
            flexWrap: "wrap",
            borderTop: "1px solid var(--border-soft)",
            background: "var(--surface-2)",
          }}
        >
          {SUGGESTIONS.slice(0, 4).map((s) => (
            <button
              key={s}
              onClick={() => sendMessage(s)}
              style={{
                padding: "0.3rem 0.7rem",
                borderRadius: "999px",
                border: "1px solid var(--border-strong)",
                background: "var(--surface-soft)",
                color: "var(--accent)",
                fontSize: "0.72rem",
                fontWeight: 600,
                cursor: "pointer",
                transition: "background 150ms, transform 150ms",
                whiteSpace: "nowrap",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(99,102,241,0.15)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "var(--surface-soft)"; e.currentTarget.style.transform = "none"; }}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Input */}
        <form
          onSubmit={handleSubmit}
          style={{
            display: "flex",
            gap: "0.5rem",
            padding: "0.75rem 1rem",
            background: "var(--surface-1)",
            borderTop: "1px solid var(--border-soft)",
          }}
        >
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask me anything..."
            style={{
              flex: 1,
              padding: "0.6rem 0.9rem",
              borderRadius: "999px",
              border: "1px solid var(--border-soft)",
              background: "var(--surface-3)",
              color: "var(--text-main)",
              fontSize: "0.84rem",
              outline: "none",
              transition: "border-color 150ms",
            }}
            onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
            onBlur={(e) => (e.target.style.borderColor = "var(--border-soft)")}
          />
          <button
            type="submit"
            disabled={!input.trim()}
            style={{
              width: "2.4rem",
              height: "2.4rem",
              borderRadius: "999px",
              background: input.trim() ? "linear-gradient(135deg, #4f46e5, #0ea5e9)" : "var(--surface-3)",
              border: "none",
              cursor: input.trim() ? "pointer" : "not-allowed",
              color: input.trim() ? "#fff" : "var(--text-soft)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "background 200ms, transform 150ms",
              flexShrink: 0,
            }}
            onMouseEnter={(e) => { if (input.trim()) e.currentTarget.style.transform = "scale(1.08)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </form>
      </div>

      {/* ── Floating Bubble Button ───────────────────────────── */}
      <button
        onClick={() => setIsOpen((v) => !v)}
        style={{
          position: "fixed",
          bottom: "1.5rem",
          right: "1.5rem",
          zIndex: 9999,
          width: "3.6rem",
          height: "3.6rem",
          borderRadius: "999px",
          background: "linear-gradient(135deg, #4f46e5, #0ea5e9)",
          border: "none",
          cursor: "pointer",
          boxShadow: "0 8px 30px rgba(79,70,229,0.45), 0 2px 8px rgba(0,0,0,0.3)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "transform 200ms cubic-bezier(.34,1.56,.64,1), box-shadow 200ms",
          fontSize: "1.5rem",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.12)"; e.currentTarget.style.boxShadow = "0 12px 40px rgba(79,70,229,0.55)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.boxShadow = "0 8px 30px rgba(79,70,229,0.45), 0 2px 8px rgba(0,0,0,0.3)"; }}
        title="SecureVote Assistant"
      >
        {isOpen ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          <span style={{ lineHeight: 1 }}>💬</span>
        )}

        {/* Unread badge */}
        {hasUnread && !isOpen && (
          <span
            style={{
              position: "absolute",
              top: "0.15rem",
              right: "0.15rem",
              width: "0.9rem",
              height: "0.9rem",
              borderRadius: "999px",
              background: "#ef4444",
              border: "2px solid white",
            }}
          />
        )}
      </button>

      {/* ── Keyframe styles injected once ───────────────────── */}
      <style>{`
        @keyframes chatFadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes typingDot {
          0%, 100% { opacity: 0.3; transform: translateY(0); }
          50%       { opacity: 1;   transform: translateY(-4px); }
        }
      `}</style>
    </>
  );
}
