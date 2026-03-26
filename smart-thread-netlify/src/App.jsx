import { useState, useEffect, useRef } from "react";

// ════════════════════════════════════════════════════════════
// CONSTANTS
// ════════════════════════════════════════════════════════════

const RW_LIMIT = 10;
const GEN_LIMIT = 5;
const MAX_C = 280;
const STORE_KEY = "sthread_v4";

const PROFILE_ICONS = [
  { id: "bolt", label: "Bolt" },
  { id: "flame", label: "Flame" },
  { id: "diamond", label: "Diamond" },
  { id: "target", label: "Target" },
  { id: "crown", label: "Crown" },
  { id: "compass", label: "Compass" },
  { id: "feather", label: "Feather" },
  { id: "aperture", label: "Aperture" },
];

function ProfileIconSvg({ id, size = 18 }) {
  const s = { width: size, height: size };
  const p = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" };
  switch (id) {
    case "bolt": return <svg viewBox="0 0 24 24" style={s} {...p}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>;
    case "flame": return <svg viewBox="0 0 24 24" style={s} {...p}><path d="M8.5 14.5A2.5 2.5 0 0011 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 11-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 002.5 2.5z" /></svg>;
    case "diamond": return <svg viewBox="0 0 24 24" style={s} {...p}><path d="M2.7 10.3a2.41 2.41 0 000 3.41l7.59 7.59a2.41 2.41 0 003.41 0l7.59-7.59a2.41 2.41 0 000-3.41L13.7 2.71a2.41 2.41 0 00-3.41 0L2.7 10.3z" /></svg>;
    case "target": return <svg viewBox="0 0 24 24" style={s} {...p}><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></svg>;
    case "crown": return <svg viewBox="0 0 24 24" style={s} {...p}><path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7z" /><path d="M5 16h14v4H5z" /></svg>;
    case "compass": return <svg viewBox="0 0 24 24" style={s} {...p}><circle cx="12" cy="12" r="10" /><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" /></svg>;
    case "feather": return <svg viewBox="0 0 24 24" style={s} {...p}><path d="M20.24 12.24a6 6 0 00-8.49-8.49L5 10.5V19h8.5z" /><line x1="16" y1="8" x2="2" y2="22" /><line x1="17.5" y1="15" x2="9" y2="15" /></svg>;
    case "aperture": return <svg viewBox="0 0 24 24" style={s} {...p}><circle cx="12" cy="12" r="10" /><line x1="14.31" y1="8" x2="20.05" y2="17.94" /><line x1="9.69" y1="8" x2="21.17" y2="8" /><line x1="7.38" y1="12" x2="13.12" y2="2.06" /><line x1="9.69" y1="16" x2="3.95" y2="6.06" /><line x1="14.31" y1="16" x2="2.83" y2="16" /><line x1="16.62" y1="12" x2="10.88" y2="21.94" /></svg>;
    default: return <svg viewBox="0 0 24 24" style={s} {...p}><circle cx="12" cy="12" r="4" /><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" /></svg>;
  }
}

const HOOKS = {
  story: {
    label: "Story", desc: "Personal moment",
    formulas: [
      { t: "I was {doing} when {event}...", f: [{ k: "doing", l: "What were you doing?", s: ["scrolling Twitter", "about to quit my job", "in a meeting"] }, { k: "event", l: "What happened?", s: ["I got a DM", "everything changed", "I saw a number that scared me"] }] },
      { t: "3 years ago I {action}. Today, {result}.", f: [{ k: "action", l: "What did you do?", s: ["started posting daily", "quit my 9-5", "launched a product"] }, { k: "result", l: "What's the result?", s: ["6-figure business", "50K followers", "never looked back"] }] },
      { t: "Nobody told me {truth} when I started {activity}.", f: [{ k: "truth", l: "What truth?", s: ["it would take 2 years", "the first 100 are hardest", "most advice is wrong"] }, { k: "activity", l: "Started what?", s: ["building in public", "freelancing", "creating content"] }] },
      { t: "I lost {something} before I figured out {lesson}.", f: [{ k: "something", l: "Lost what?", s: ["$10K", "6 months", "my biggest client"] }, { k: "lesson", l: "Learned what?", s: ["how to grow", "what really matters", "the one thing that works"] }] },
      { t: "The day I {moment}, everything clicked.", f: [{ k: "moment", l: "What moment?", s: ["stopped copying others", "deleted my calendar", "got my first client"] }] },
    ]
  },
  bold: {
    label: "Bold claim", desc: "Hot take",
    formulas: [
      { t: "{claim}. And I'll prove it.", f: [{ k: "claim", l: "Your bold claim?", s: ["Most marketing advice is garbage", "You don't need a niche", "Consistency is overrated"] }] },
      { t: "{thing} is dead. Here's what replaced it.", f: [{ k: "thing", l: "What's dead?", s: ["Content calendars", "SEO blogging", "Cold outreach"] }] },
      { t: "Stop {bad}. It's costing you {cost}.", f: [{ k: "bad", l: "Stop what?", s: ["posting without strategy", "chasing followers"] }, { k: "cost", l: "Costing?", s: ["real growth", "thousands of dollars", "your credibility"] }] },
      { t: "Unpopular opinion: {opinion}.", f: [{ k: "opinion", l: "Your opinion?", s: ["Post less, not more", "Engagement pods destroy reach", "Followers don't equal revenue"] }] },
      { t: "Delete {thing} from your strategy. Thank me later.", f: [{ k: "thing", l: "Delete what?", s: ["your content calendar", "hashtags", "follow-for-follow"] }] },
    ]
  },
  question: {
    label: "Question", desc: "Open with curiosity",
    formulas: [
      { t: "Why do {people} keep {mistake}?", f: [{ k: "people", l: "Who?", s: ["creators", "founders", "marketers"] }, { k: "mistake", l: "Keep doing what?", s: ["undercharging", "ignoring DMs", "posting without a goal"] }] },
      { t: "What if {assumption} is actually wrong?", f: [{ k: "assumption", l: "What assumption?", s: ["posting daily grows you", "you need a big audience", "niching down limits you"] }] },
      { t: "Have you noticed {observation}? There's a reason.", f: [{ k: "observation", l: "What?", s: ["top creators post less now", "engagement is dropping everywhere"] }] },
      { t: "Why does nobody talk about {topic}?", f: [{ k: "topic", l: "What topic?", s: ["mental health of building in public", "how much luck matters"] }] },
      { t: "Is {thing} even worth it anymore?", f: [{ k: "thing", l: "What?", s: ["Twitter/X", "building a newsletter", "long-form content"] }] },
    ]
  },
  stat: {
    label: "Data point", desc: "Hook with a number",
    formulas: [
      { t: "{stat}. Here's what nobody tells you.", f: [{ k: "stat", l: "Your stat?", s: ["73% of startups fail in year 1", "The average creator makes $0"] }] },
      { t: "I tracked {metric} for {time}. Results surprised me.", f: [{ k: "metric", l: "Metric?", s: ["my engagement", "every post", "my income sources"] }, { k: "time", l: "How long?", s: ["30 days", "6 months", "a year"] }] },
      { t: "I went from {before} to {after} in {time}.", f: [{ k: "before", l: "From?", s: ["0", "500 followers", "$0/mo"] }, { k: "after", l: "To?", s: ["10K", "$10K/mo", "fully booked"] }, { k: "time", l: "In?", s: ["6 months", "90 days"] }] },
      { t: "This one change gave me {result}. The data:", f: [{ k: "result", l: "What result?", s: ["3x more replies", "doubled followers", "first $5K month"] }] },
      { t: "{time} of data. {number} posts. Here's what works.", f: [{ k: "time", l: "How long?", s: ["1 year", "6 months"] }, { k: "number", l: "How many?", s: ["500+", "300", "1000+"] }] },
    ]
  },
  contrarian: {
    label: "Contrarian", desc: "Challenge the norm",
    formulas: [
      { t: "Everyone says {common}. They're wrong.", f: [{ k: "common", l: "Common belief?", s: ["post every day", "niche down", "follow trends"] }] },
      { t: "Worst advice I followed: \"{advice}\"", f: [{ k: "advice", l: "What advice?", s: ["Fake it till you make it", "Just provide value", "Be consistent"] }] },
      { t: "I stopped {action} and {result}.", f: [{ k: "action", l: "Stopped what?", s: ["posting daily", "using hashtags", "caring about likes"] }, { k: "result", l: "What happened?", s: ["growth exploded", "got best clients", "found my voice"] }] },
      { t: "You don't need {thing}. You need {real}.", f: [{ k: "thing", l: "Don't need?", s: ["more followers", "a fancy website", "another course"] }, { k: "real", l: "Actually need?", s: ["one clear offer", "10 real fans", "to just start"] }] },
      { t: "{popular} is a trap. Do {alt} instead.", f: [{ k: "popular", l: "What's a trap?", s: ["Engagement pods", "Viral content", "Hustle mentality"] }, { k: "alt", l: "Do what?", s: ["build in silence", "focus on depth", "rest more"] }] },
    ]
  },
};

const LENGTHS = [
  { id: "single", label: "Single", desc: "1 tweet" },
  { id: "short", label: "Short", desc: "3-5" },
  { id: "medium", label: "Medium", desc: "6-8" },
  { id: "long", label: "Long", desc: "9-12" },
];

const CTAS = [
  { id: "follow", label: "Get follows" },
  { id: "engage", label: "Drive replies" },
  { id: "link", label: "Click a link" },
  { id: "save", label: "Bookmarks" },
  { id: "share", label: "Reposts" },
  { id: "none", label: "No CTA" },
];

const PET_PEEVES = [
  "Corporate jargon", "Too many questions", "Generic advice",
  "Starting with \"I\"", "Overusing stats", "Sounding preachy",
  "Clickbait energy", "Hashtag spam", "Cliche metaphors",
  "Humble bragging", "Thread bro tone", "Filler words",
];

const SYS = `You are a ghostwriter. Sound like a REAL HUMAN, not AI.
BANNED: delve, tapestry, vibrant, crucial, pivotal, intricate, meticulous, foster, garner, underscore, testament, landscape, nestled, groundbreaking, renowned, showcasing, exemplifies, diverse array, enduring legacy, serves as, stands as, highlights the importance
BANNED patterns: "not just X but also Y", rule-of-three, excess em dashes, Additionally/Moreover/Furthermore, -ing analyses, vague attributions, hedging, generic summaries
HUMAN: Simple words. Fragments ok. Contractions. Varied sentences. Real examples. Opinions. Humor.
FORMAT: Return ONLY a valid JSON array of strings. Each under 280 chars. No hashtags. No markdown fences. No explanation. Just the array.`;

const PQ = [
  { key: "icon", q: "Pick an icon for this profile", why: "A quick visual to tell your profiles apart." },
  { key: "name", q: "Name this profile", why: "A label for this voice. You can have multiple profiles for different brands.", ph: "e.g. My personal brand", req: true },
  { key: "handle", q: "Your X handle", why: "We won't post anything. Just keeps things organized.", ph: "@yourhandle", req: true },
  { key: "niche", q: "Your niche or topic area", why: "This tells the AI what language and references feel natural in your space.", ph: "e.g. SaaS marketing, Arabic for expats", req: true },
  { key: "audience", q: "Target audience", why: "A thread for CEOs reads differently than one for students. Changes tone and depth.", ph: "e.g. Founders building in public", req: true },
  { key: "voice", q: "Your writing voice", why: "The more specific, the less it sounds like a machine. How would your followers describe your style?", ph: "e.g. Casual but sharp, like a smart friend", req: true },
  { key: "avoid", q: "What to avoid", why: "Pick pet peeves or type your own.", ph: "e.g. Corporate jargon, clickbait", req: false },
  { key: "example", q: "Example of your voice", why: "Paste a tweet you wrote, or a URL to a tweet you love. We'll learn from the style.", ph: "Paste a tweet or thread text...", req: false, multi: true },
];

// ════════════════════════════════════════════════════════════
// STORAGE
// ════════════════════════════════════════════════════════════

function loadStore() {
  try { return JSON.parse(localStorage.getItem(STORE_KEY) || "{}"); }
  catch { return {}; }
}

function saveStore(updates) {
  localStorage.setItem(STORE_KEY, JSON.stringify({ ...loadStore(), ...updates }));
}

function getDailyRewrites() {
  const d = loadStore();
  const today = new Date().toDateString();
  if (d.rwDate !== today) {
    saveStore({ rw: 0, rwDate: today });
    return 0;
  }
  return d.rw || 0;
}

// ════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════════════════

export default function SmartThread() {
  const [view, setView] = useState("home");
  const [profiles, setProfiles] = useState(loadStore().profiles || []);
  const [activeProfile, setActiveProfile] = useState(null);
  const [drafts, setDrafts] = useState(loadStore().drafts || []);
  const [history, setHistory] = useState(loadStore().history || []);

  // Onboarding
  const [obStep, setObStep] = useState(0);
  const [obData, setObData] = useState({});

  // Compose
  const [topic, setTopic] = useState("");
  const [hookId, setHookId] = useState(null);
  const [formulaIdx, setFormulaIdx] = useState(0);
  const [hookFields, setHookFields] = useState({});
  const [threadLen, setThreadLen] = useState(null);
  const [ctaType, setCtaType] = useState(null);
  const [ctaLink, setCtaLink] = useState("");

  // Result
  const [tweets, setTweets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copiedIdx, setCopiedIdx] = useState(null);
  const [rewritingIdx, setRewritingIdx] = useState(null);
  const [showPreview, setShowPreview] = useState(false);

  // Limits
  const [gens, setGens] = useState(loadStore().gens || 0);
  const [rw, setRw] = useState(getDailyRewrites());

  const canGen = gens < GEN_LIMIT;
  const canRw = rw < RW_LIMIT;

  useEffect(() => {
    const p = loadStore().profiles || [];
    if (p.length === 0) {
      setView("onboarding");
    } else {
      setActiveProfile(p[0]);
      setView("home");
    }
  }, []);

  // ── Onboarding ──
  function finishOnboarding() {
    const p = { id: Date.now(), ...obData, createdAt: new Date().toISOString() };
    const updated = [...profiles, p];
    setProfiles(updated);
    saveStore({ profiles: updated });
    setActiveProfile(p);
    setObData({});
    setObStep(0);
    setView("home");
  }

  // ── Generate ──
  async function generate() {
    if (!canGen) return;
    setLoading(true);
    setError(null);
    setTweets([]);
    setView("result");

    const lenMap = { single: "exactly 1", short: "3-5", medium: "6-8", long: "9-12" };
    const ctaStr = ctaType === "none"
      ? "No CTA."
      : `Last tweet CTA: ${ctaType}${ctaType === "link" && ctaLink ? `. Link: ${ctaLink}` : ""}`;

    const prof = activeProfile;
    let voiceStr = "";
    if (prof) {
      voiceStr = `\nPROFILE:\n- Niche: ${prof.niche || "general"}\n- Audience: ${prof.audience || "general"}\n- Voice: ${prof.voice || "casual"}\n- Avoid: ${prof.avoid || "nothing"}`;
      if (prof.example) voiceStr += `\n- Style example: "${prof.example.slice(0, 300)}"`;
      voiceStr += "\nWrite AS this person.";
    }

    const hd = hookId ? HOOKS[hookId] : null;
    const formula = hd ? hd.formulas[formulaIdx] : null;
    let hookStr = "";
    if (formula) {
      let filled = formula.t;
      formula.f.forEach(field => {
        if (hookFields[field.k]) {
          filled = filled.replace(`{${field.k}}`, hookFields[field.k]);
        }
      });
      hookStr = `Hook formula: "${filled}"`;
    }

    const prompt = [
      `Write a Twitter/X thread about: "${topic}"`,
      hookStr,
      `Length: ${lenMap[threadLen]} tweets`,
      ctaStr,
      voiceStr,
      "",
      "Return ONLY a JSON array of tweet strings. Example: [\"first tweet\", \"second tweet\"]",
    ].filter(Boolean).join("\n");

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 40000);

      const res = await fetch("/api/generate", {
        method: "POST",
        signal: controller.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 2000,
          system: SYS,
          messages: [{ role: "user", content: prompt }],
        }),
      });

      clearTimeout(timeout);

      if (!res.ok) {
        let errMsg = `API error ${res.status}`;
        try {
          const errData = await res.json();
          errMsg = errData?.error?.message || errMsg;
        } catch {}
        throw new Error(errMsg);
      }

      const data = await res.json();
      const rawText = (data.content || [])
        .filter(block => block.type === "text")
        .map(block => block.text)
        .join("");

      if (!rawText.trim()) {
        throw new Error("Empty response from API");
      }

      const cleaned = rawText
        .replace(/```json\s*/gi, "")
        .replace(/```\s*/gi, "")
        .trim();

      const parsed = JSON.parse(cleaned);

      if (!Array.isArray(parsed) || parsed.length === 0) {
        throw new Error("Response was not a valid tweet array");
      }

      setTweets(parsed);

      const newGens = gens + 1;
      setGens(newGens);
      saveStore({ gens: newGens });

      // Save to history
      const entry = {
        id: Date.now(),
        topic,
        hookId,
        threadLen,
        ctaType,
        tweets: parsed,
        profileId: prof?.id,
        profileName: prof?.name,
        createdAt: new Date().toISOString(),
        status: "drafted",
      };
      const newHistory = [entry, ...history].slice(0, 50);
      setHistory(newHistory);
      saveStore({ history: newHistory });

    } catch (err) {
      const msg = err.name === "AbortError"
        ? "Request timed out. Try a shorter topic."
        : (err.message || "Something went wrong");
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  // ── Rewrite ──
  async function rewriteTweet(idx) {
    if (!canRw) return;
    setRewritingIdx(idx);
    try {
      const prof = activeProfile;
      const voiceHint = prof?.voice ? `Match this voice: ${prof.voice}` : "Be casual and direct.";
      const prompt = `Rewrite this tweet. Same idea, completely different words and structure. Under 280 chars.\n\nOriginal: "${tweets[idx]}"\n${voiceHint}\n\nReturn ONLY the new tweet text. No quotes around it. No explanation.`;

      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 400,
          system: SYS,
          messages: [{ role: "user", content: prompt }],
        }),
      });

      const data = await res.json();
      const newText = (data.content || [])
        .filter(b => b.type === "text")
        .map(b => b.text)
        .join("")
        .replace(/^["']|["']$/g, "")
        .trim();

      if (newText) {
        const updated = [...tweets];
        updated[idx] = newText;
        setTweets(updated);
      }

      const newRw = rw + 1;
      setRw(newRw);
      saveStore({ rw: newRw, rwDate: new Date().toDateString() });
    } catch {} finally {
      setRewritingIdx(null);
    }
  }

  // ── Helpers ──
  function copyTweet(text, idx) {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 1500);
  }

  function copyAll() {
    const full = tweets.map((t, i) => `${i + 1}/${tweets.length}\n${t}`).join("\n\n");
    navigator.clipboard.writeText(full);
    setCopiedIdx(-1);
    setTimeout(() => setCopiedIdx(null), 1500);
  }

  function updateHistoryStatus(id, status) {
    const updated = history.map(h => h.id === id ? { ...h, status } : h);
    setHistory(updated);
    saveStore({ history: updated });
  }

  function deleteProfile(id) {
    const updated = profiles.filter(p => p.id !== id);
    setProfiles(updated);
    saveStore({ profiles: updated });
    if (activeProfile?.id === id) setActiveProfile(updated[0] || null);
    if (updated.length === 0) setView("onboarding");
  }

  function resetCompose() {
    setTopic("");
    setHookId(null);
    setFormulaIdx(0);
    setHookFields({});
    setThreadLen(null);
    setCtaType(null);
    setCtaLink("");
    setTweets([]);
    setError(null);
    setShowPreview(false);
  }

  const ready = topic.trim() && hookId && threadLen && ctaType;
  const hookData = hookId ? HOOKS[hookId] : null;
  const curFormula = hookData ? hookData.formulas[formulaIdx] : null;

  // ════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════

  return (
    <div style={{ minHeight: "100vh", background: "#07070a", color: "#e4e4e8" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Satoshi:wght@400;500;600;700;800&family=Instrument+Serif:ital@0;1&family=JetBrains+Mono:wght@400;500&display=swap');
        :root {
          --ui: 'Satoshi', sans-serif;
          --serif: 'Instrument Serif', serif;
          --mono: 'JetBrains Mono', monospace;
          --bg: #07070a;
          --card: rgba(255,255,255,0.025);
          --border: rgba(255,255,255,0.06);
          --text: #e4e4e8;
          --sub: rgba(255,255,255,0.32);
          --accent: #d4553a;
          --accent-bg: rgba(212,85,58,0.08);
          --green: #34c472;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: var(--bg); }
        textarea:focus, input:focus { outline: none; }
        ::selection { background: rgba(212,85,58,0.25); }
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.05); border-radius: 2px; }
        @keyframes fi { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
        .fi { animation: fi 0.3s ease both; }
        .fid1 { animation: fi 0.3s 0.05s ease both; }
        .fid2 { animation: fi 0.3s 0.1s ease both; }
        .fid3 { animation: fi 0.3s 0.15s ease both; }
        .glass { background: rgba(255,255,255,0.025); backdrop-filter: blur(12px); border: 1px solid rgba(255,255,255,0.06); }
      `}</style>

      <div style={{ maxWidth: 520, margin: "0 auto", padding: "16px 18px 100px" }}>

        {/* ═══ HEADER ═══ */}
        {view !== "onboarding" && (
          <header className="fi" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, paddingTop: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: "linear-gradient(135deg, #d4553a, #e88a3a)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v8" /><circle cx="12" cy="14" r="4" /><path d="M12 18v4" /></svg>
              </div>
              <span style={{ fontFamily: "var(--ui)", fontWeight: 800, fontSize: 16, letterSpacing: "-0.4px" }}>Smart Thread</span>
            </div>
            <nav style={{ display: "flex", gap: 3 }}>
              {[
                { label: "New", v: "home", onClick: () => { resetCompose(); setView("home"); } },
                { label: "History", v: "history", onClick: () => setView("history") },
                { label: "Profiles", v: "profiles", onClick: () => setView("profiles") },
              ].map(tab => (
                <button key={tab.v} onClick={tab.onClick} style={{
                  padding: "6px 13px", borderRadius: 7, fontSize: 12, fontFamily: "var(--ui)", fontWeight: 500,
                  border: `1px solid ${view === tab.v ? "var(--accent)" : "var(--border)"}`,
                  background: view === tab.v ? "var(--accent-bg)" : "transparent",
                  color: view === tab.v ? "var(--accent)" : "var(--sub)", cursor: "pointer",
                  transition: "all 0.15s ease",
                }}>{tab.label}</button>
              ))}
            </nav>
          </header>
        )}

        {/* ═══ ONBOARDING ═══ */}
        {view === "onboarding" && (
          <div className="fi" style={{ paddingTop: 50 }}>
            <div style={{ textAlign: "center", marginBottom: 36 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: "linear-gradient(135deg, #d4553a, #e88a3a)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", margin: "0 auto 16px" }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v8" /><circle cx="12" cy="14" r="4" /><path d="M12 18v4" /></svg>
              </div>
              <h1 style={{ fontFamily: "var(--ui)", fontWeight: 800, fontSize: 22, letterSpacing: "-0.5px" }}>Smart Thread</h1>
              <p style={{ fontFamily: "var(--serif)", fontSize: 15, color: "var(--sub)", fontStyle: "italic", marginTop: 4 }}>Set up your brand voice first.</p>
            </div>

            {/* Progress */}
            <div style={{ display: "flex", gap: 2, marginBottom: 24 }}>
              {PQ.map((_, i) => (
                <div key={i} style={{ flex: 1, height: 2, borderRadius: 1, background: i <= obStep ? "var(--accent)" : "var(--border)", transition: "background 0.2s" }} />
              ))}
            </div>

            <div key={obStep} className="fi">
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 14, fontWeight: 700, fontFamily: "var(--ui)" }}>{PQ[obStep].q}</div>
                <div style={{ fontSize: 11, color: "var(--sub)", fontFamily: "var(--mono)", marginTop: 2 }}>{obStep + 1} of {PQ.length}</div>
              </div>
              <p style={{ fontSize: 13, fontFamily: "var(--serif)", color: "var(--sub)", lineHeight: 1.5, marginBottom: 16, fontStyle: "italic" }}>{PQ[obStep].why}</p>

              {/* Icon picker */}
              {PQ[obStep].key === "icon" && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
                  {PROFILE_ICONS.map(ic => (
                    <button key={ic.id} onClick={() => setObData({ ...obData, icon: ic.id })} style={{
                      aspectRatio: "1", borderRadius: 14, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4,
                      border: `1.5px solid ${obData.icon === ic.id ? "var(--accent)" : "var(--border)"}`,
                      background: obData.icon === ic.id ? "var(--accent-bg)" : "var(--card)",
                      color: obData.icon === ic.id ? "var(--accent)" : "var(--sub)", cursor: "pointer", transition: "all 0.15s",
                    }}>
                      <ProfileIconSvg id={ic.id} size={22} />
                      <span style={{ fontSize: 9, fontFamily: "var(--mono)" }}>{ic.label}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Pet peeves chips */}
              {PQ[obStep].key === "avoid" && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 12 }}>
                  {PET_PEEVES.map(p => {
                    const sel = (obData.avoid || "").toLowerCase().includes(p.toLowerCase());
                    return (
                      <button key={p} onClick={() => {
                        if (sel) {
                          const r = new RegExp(`,?\\s*${p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, "gi");
                          setObData({ ...obData, avoid: (obData.avoid || "").replace(r, "").replace(/^,\s*/, "").trim() });
                        } else {
                          setObData({ ...obData, avoid: obData.avoid ? `${obData.avoid}, ${p}` : p });
                        }
                      }} style={{
                        padding: "5px 11px", borderRadius: 7, fontSize: 11, fontFamily: "var(--ui)", fontWeight: 500, cursor: "pointer",
                        border: `1.5px solid ${sel ? "var(--accent)" : "var(--border)"}`,
                        background: sel ? "var(--accent-bg)" : "transparent",
                        color: sel ? "var(--accent)" : "var(--sub)", transition: "all 0.15s",
                      }}>{sel ? "x " : ""}{p}</button>
                    );
                  })}
                </div>
              )}

              {/* Text field */}
              {PQ[obStep].key !== "icon" && (
                PQ[obStep].multi ? (
                  <textarea
                    value={obData[PQ[obStep].key] || ""}
                    onChange={e => setObData({ ...obData, [PQ[obStep].key]: e.target.value })}
                    placeholder={PQ[obStep].ph}
                    rows={3}
                    style={{ width: "100%", padding: "12px 14px", borderRadius: 10, background: "var(--card)", border: "1.5px solid var(--border)", color: "var(--text)", fontSize: 14, fontFamily: "var(--serif)", lineHeight: 1.5, resize: "vertical" }}
                  />
                ) : (
                  <input
                    value={obData[PQ[obStep].key] || ""}
                    onChange={e => setObData({ ...obData, [PQ[obStep].key]: e.target.value })}
                    placeholder={PQ[obStep].ph}
                    style={{ width: "100%", padding: "12px 14px", borderRadius: 10, background: "var(--card)", border: "1.5px solid var(--border)", color: "var(--text)", fontSize: 14, fontFamily: "var(--serif)" }}
                  />
                )
              )}
            </div>

            {/* Nav */}
            <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
              {obStep > 0 && (
                <button onClick={() => setObStep(obStep - 1)} style={{ padding: "12px 20px", borderRadius: 10, fontSize: 13, fontFamily: "var(--ui)", fontWeight: 600, border: "1.5px solid var(--border)", background: "transparent", color: "var(--sub)", cursor: "pointer" }}>Back</button>
              )}
              <button onClick={() => { if (obStep < PQ.length - 1) setObStep(obStep + 1); else finishOnboarding(); }}
                disabled={PQ[obStep].key === "icon" ? !obData.icon : (PQ[obStep].req && !obData[PQ[obStep].key]?.trim())}
                style={{ flex: 1, padding: "12px 20px", borderRadius: 10, fontSize: 13, fontFamily: "var(--ui)", fontWeight: 700, border: "none", background: "linear-gradient(135deg, #d4553a, #e88a3a)", color: "#fff", cursor: "pointer", opacity: (PQ[obStep].key === "icon" ? !obData.icon : (PQ[obStep].req && !obData[PQ[obStep].key]?.trim())) ? 0.4 : 1 }}>
                {obStep === PQ.length - 1 ? "Create profile" : "Next"}
              </button>
            </div>
            {!PQ[obStep].req && obStep >= 6 && (
              <button onClick={finishOnboarding} style={{ display: "block", margin: "12px auto 0", background: "none", border: "none", color: "var(--sub)", fontSize: 11, fontFamily: "var(--ui)", cursor: "pointer", textDecoration: "underline" }}>Skip, finish setup</button>
            )}
          </div>
        )}

        {/* ═══ HOME / COMPOSE ═══ */}
        {view === "home" && (
          <div className="fi">
            {/* Profile card */}
            {activeProfile && (
              <div className="glass" style={{ borderRadius: 12, padding: "14px 16px", marginBottom: 20, display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg, #d4553a, #e88a3a)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", flexShrink: 0 }}>
                  <ProfileIconSvg id={activeProfile.icon} size={18} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, color: "var(--sub)", fontFamily: "var(--mono)", textTransform: "uppercase", letterSpacing: 0.5 }}>Profile</div>
                  <div style={{ fontSize: 14, fontWeight: 700, fontFamily: "var(--ui)" }}>{activeProfile.name}</div>
                </div>
                {profiles.length > 1 && (
                  <select value={activeProfile.id} onChange={e => setActiveProfile(profiles.find(p => p.id === +e.target.value))} style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 7, padding: "5px 8px", color: "var(--text)", fontSize: 11, fontFamily: "var(--ui)" }}>
                    {profiles.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                )}
              </div>
            )}

            {/* Limits */}
            <div style={{ display: "flex", gap: 16, marginBottom: 24 }}>
              {[{ used: gens, total: GEN_LIMIT, label: "Generations" }, { used: rw, total: RW_LIMIT, label: "Rewrites today" }].map(bar => {
                const left = bar.total - bar.used;
                const low = left <= 1;
                return (
                  <div key={bar.label} style={{ flex: 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontSize: 10, fontFamily: "var(--mono)", color: "var(--sub)" }}>{bar.label}</span>
                      <span style={{ fontSize: 10, fontFamily: "var(--mono)", color: low ? "var(--accent)" : "var(--sub)", fontWeight: low ? 700 : 400 }}>{left} left</span>
                    </div>
                    <div style={{ height: 3, borderRadius: 2, background: "var(--border)" }}>
                      <div style={{ height: "100%", borderRadius: 2, background: low ? "var(--accent)" : "var(--green)", width: `${(left / bar.total) * 100}%`, transition: "width 0.3s" }} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Form */}
            <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>

              {/* Topic */}
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, fontFamily: "var(--ui)", marginBottom: 8 }}>Topic</div>
                <textarea value={topic} onChange={e => setTopic(e.target.value)} placeholder="What's the core idea or story?" rows={3} style={{ width: "100%", padding: "12px 14px", borderRadius: 10, background: "var(--card)", border: "1.5px solid var(--border)", color: "var(--text)", fontSize: 14, fontFamily: "var(--serif)", lineHeight: 1.5, resize: "vertical" }} />
              </div>

              {/* Hook */}
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, fontFamily: "var(--ui)", marginBottom: 4 }}>Hook style</div>
                <div style={{ fontSize: 11, color: "var(--sub)", fontFamily: "var(--serif)", marginBottom: 10 }}>Pick a hook, then choose a formula</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                  {Object.entries(HOOKS).map(([id, h]) => (
                    <button key={id} onClick={() => { setHookId(id); setFormulaIdx(0); setHookFields({}); }} style={{
                      padding: "12px 14px", textAlign: "left", borderRadius: 10, cursor: "pointer", transition: "all 0.15s",
                      background: hookId === id ? "var(--accent-bg)" : "var(--card)",
                      border: `1.5px solid ${hookId === id ? "var(--accent)" : "var(--border)"}`,
                      color: "var(--text)",
                    }}>
                      <div style={{ fontSize: 13, fontWeight: 600, fontFamily: "var(--ui)" }}>{h.label}</div>
                      <div style={{ fontSize: 11, color: "var(--sub)", fontFamily: "var(--ui)" }}>{h.desc}</div>
                    </button>
                  ))}
                </div>

                {/* Formula panel */}
                {hookData && curFormula && (
                  <div className="fi glass" style={{ borderRadius: 10, padding: 14, marginTop: 10 }}>
                    <div style={{ fontSize: 10, fontFamily: "var(--mono)", color: "var(--sub)", textTransform: "uppercase", letterSpacing: 0.3, marginBottom: 8 }}>Formula {formulaIdx + 1} / {hookData.formulas.length}</div>
                    <div style={{ fontSize: 14, fontFamily: "var(--mono)", color: "var(--accent)", marginBottom: 12, lineHeight: 1.5 }}>{curFormula.t}</div>

                    {/* Formula dots */}
                    <div style={{ display: "flex", gap: 4, marginBottom: 14, flexWrap: "wrap" }}>
                      {hookData.formulas.map((_, i) => (
                        <button key={i} onClick={() => { setFormulaIdx(i); setHookFields({}); }} style={{
                          width: 24, height: 24, borderRadius: 6, fontSize: 10, fontFamily: "var(--mono)",
                          display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
                          border: `1px solid ${formulaIdx === i ? "var(--accent)" : "var(--border)"}`,
                          background: formulaIdx === i ? "var(--accent-bg)" : "transparent",
                          color: formulaIdx === i ? "var(--accent)" : "var(--sub)",
                        }}>{i + 1}</button>
                      ))}
                    </div>

                    {/* Fill-in fields */}
                    {curFormula.f.map(field => (
                      <div key={field.k} style={{ marginBottom: 12 }}>
                        <div style={{ fontSize: 11, fontWeight: 600, fontFamily: "var(--ui)", color: "var(--sub)", marginBottom: 5 }}>{field.l} <span style={{ fontWeight: 400, fontStyle: "italic", opacity: 0.7 }}>(optional)</span></div>
                        {field.s && (
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 6 }}>
                            {field.s.map(sug => (
                              <button key={sug} onClick={() => setHookFields({ ...hookFields, [field.k]: sug })} style={{
                                padding: "4px 10px", borderRadius: 6, fontSize: 11, fontFamily: "var(--ui)", cursor: "pointer",
                                border: `1px solid ${hookFields[field.k] === sug ? "var(--accent)" : "var(--border)"}`,
                                background: hookFields[field.k] === sug ? "var(--accent-bg)" : "transparent",
                                color: hookFields[field.k] === sug ? "var(--accent)" : "var(--sub)",
                              }}>{sug}</button>
                            ))}
                          </div>
                        )}
                        <input value={hookFields[field.k] || ""} onChange={e => setHookFields({ ...hookFields, [field.k]: e.target.value })} placeholder="Or type your own..." style={{ width: "100%", padding: "8px 12px", borderRadius: 8, background: "rgba(255,255,255,0.02)", border: "1px solid var(--border)", color: "var(--text)", fontSize: 12, fontFamily: "var(--serif)" }} />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Length */}
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, fontFamily: "var(--ui)", marginBottom: 8 }}>Length</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
                  {LENGTHS.map(l => (
                    <button key={l.id} onClick={() => setThreadLen(l.id)} style={{
                      padding: "10px 6px", textAlign: "center", borderRadius: 10, cursor: "pointer",
                      background: threadLen === l.id ? "var(--accent-bg)" : "var(--card)",
                      border: `1.5px solid ${threadLen === l.id ? "var(--accent)" : "var(--border)"}`, color: "var(--text)",
                    }}>
                      <div style={{ fontSize: 13, fontWeight: 600, fontFamily: "var(--ui)" }}>{l.label}</div>
                      <div style={{ fontSize: 10, color: "var(--sub)", fontFamily: "var(--ui)" }}>{l.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* CTA */}
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, fontFamily: "var(--ui)", marginBottom: 8 }}>Call to action</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
                  {CTAS.map(c => (
                    <button key={c.id} onClick={() => setCtaType(c.id)} style={{
                      padding: "10px 6px", textAlign: "center", borderRadius: 10, cursor: "pointer",
                      background: ctaType === c.id ? "var(--accent-bg)" : "var(--card)",
                      border: `1.5px solid ${ctaType === c.id ? "var(--accent)" : "var(--border)"}`, color: "var(--text)",
                    }}>
                      <div style={{ fontSize: 12, fontWeight: 600, fontFamily: "var(--ui)" }}>{c.label}</div>
                    </button>
                  ))}
                </div>
                {ctaType === "link" && (
                  <div className="fi" style={{ marginTop: 8 }}>
                    <input value={ctaLink} onChange={e => setCtaLink(e.target.value)} placeholder="https://your-link.com" style={{ width: "100%", padding: "11px 14px", borderRadius: 10, background: "var(--card)", border: "1.5px solid var(--border)", color: "var(--text)", fontSize: 13, fontFamily: "var(--mono)" }} />
                  </div>
                )}
              </div>

              {/* Generate */}
              <button onClick={generate} disabled={!ready || !canGen} style={{
                width: "100%", padding: "14px 20px", borderRadius: 12, fontSize: 14, fontFamily: "var(--ui)", fontWeight: 700,
                border: "none", cursor: (!ready || !canGen) ? "not-allowed" : "pointer",
                background: (!ready || !canGen) ? "var(--card)" : "linear-gradient(135deg, #d4553a, #e88a3a)",
                color: (!ready || !canGen) ? "var(--sub)" : "#fff",
                transition: "all 0.2s", boxShadow: (ready && canGen) ? "0 4px 24px rgba(212,85,58,0.2)" : "none",
              }}>
                {!canGen ? "Free limit reached" : "Generate thread"}
              </button>
            </div>
          </div>
        )}

        {/* ═══ RESULT ═══ */}
        {view === "result" && !showPreview && (
          <div className="fi">
            <div style={{ marginBottom: 16 }}>
              <h2 style={{ fontFamily: "var(--ui)", fontWeight: 800, fontSize: 18 }}>{loading ? "Generating..." : "Your thread"}</h2>
              {!loading && tweets.length > 0 && (
                <p style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--sub)", marginTop: 2 }}>{tweets.length} tweet{tweets.length > 1 ? "s" : ""}</p>
              )}
            </div>

            {/* Loading */}
            {loading && (
              <div style={{ textAlign: "center", padding: "50px 0" }}>
                <div style={{ width: 32, height: 32, border: "2px solid var(--border)", borderTopColor: "var(--accent)", borderRadius: "50%", animation: "spin 0.7s linear infinite", margin: "0 auto 16px" }} />
                <p style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--sub)" }}>Writing your thread...</p>
              </div>
            )}

            {/* Error */}
            {error && !loading && (
              <div style={{ textAlign: "center", padding: "40px 0" }}>
                <div style={{ fontSize: 14, fontWeight: 600, fontFamily: "var(--ui)", marginBottom: 6 }}>Generation failed</div>
                <p style={{ fontSize: 13, fontFamily: "var(--serif)", color: "var(--sub)", marginBottom: 20, lineHeight: 1.5 }}>{error}</p>
                <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                  <button onClick={() => { setError(null); generate(); }} style={{ padding: "10px 20px", borderRadius: 10, fontSize: 13, fontFamily: "var(--ui)", fontWeight: 600, border: "none", background: "var(--accent)", color: "#fff", cursor: "pointer" }}>Retry</button>
                  <button onClick={() => { setError(null); setView("home"); }} style={{ padding: "10px 20px", borderRadius: 10, fontSize: 13, fontFamily: "var(--ui)", fontWeight: 600, border: "1.5px solid var(--border)", background: "transparent", color: "var(--sub)", cursor: "pointer" }}>Back</button>
                </div>
              </div>
            )}

            {/* Tweets */}
            {tweets.length > 0 && !loading && (
              <>
                <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 16 }}>
                  {[
                    { label: copiedIdx === -1 ? "Copied!" : "Copy all", onClick: copyAll },
                    { label: "Preview", onClick: () => setShowPreview(true) },
                    { label: "New thread", onClick: () => { resetCompose(); setView("home"); } },
                  ].map(btn => (
                    <button key={btn.label} onClick={btn.onClick} style={{ padding: "6px 13px", borderRadius: 7, fontSize: 12, fontFamily: "var(--ui)", fontWeight: 500, border: "1px solid var(--border)", background: "transparent", color: "var(--sub)", cursor: "pointer" }}>{btn.label}</button>
                  ))}
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {tweets.map((tw, i) => (
                    <div key={`${i}-${tw.slice(0, 10)}`} className={i < 4 ? `fid${i}` : "fi"} style={{ borderRadius: 12, padding: 16 }} className="glass">
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                        <span style={{ fontSize: 10, fontFamily: "var(--mono)", color: "var(--accent)", textTransform: "uppercase", letterSpacing: 0.3 }}>
                          {i === 0 ? "Hook" : i === tweets.length - 1 && ctaType !== "none" ? "CTA" : `${i + 1}/${tweets.length}`}
                        </span>
                        <span style={{ fontSize: 10, fontFamily: "var(--mono)", color: tw.length > MAX_C ? "var(--accent)" : "var(--sub)" }}>{tw.length}/{MAX_C}</span>
                      </div>
                      <p style={{ fontSize: 14, lineHeight: 1.65, fontFamily: "var(--serif)", margin: "0 0 14px", whiteSpace: "pre-wrap" }}>{tw}</p>
                      <div style={{ display: "flex", gap: 5, justifyContent: "flex-end", alignItems: "center" }}>
                        <span style={{ fontSize: 9, fontFamily: "var(--mono)", color: "var(--sub)", marginRight: "auto" }}>{RW_LIMIT - rw} rewrites left</span>
                        <button onClick={() => rewriteTweet(i)} disabled={rewritingIdx === i || !canRw} style={{ padding: "5px 11px", borderRadius: 6, fontSize: 11, fontFamily: "var(--ui)", fontWeight: 500, border: "1px solid var(--border)", background: "transparent", color: "var(--sub)", cursor: (rewritingIdx === i || !canRw) ? "default" : "pointer", opacity: (rewritingIdx === i || !canRw) ? 0.35 : 1 }}>{rewritingIdx === i ? "..." : "Rewrite"}</button>
                        <button onClick={() => copyTweet(tw, i)} style={{ padding: "5px 11px", borderRadius: 6, fontSize: 11, fontFamily: "var(--ui)", fontWeight: 500, border: `1px solid ${copiedIdx === i ? "var(--accent)" : "var(--border)"}`, background: copiedIdx === i ? "var(--accent-bg)" : "transparent", color: copiedIdx === i ? "var(--accent)" : "var(--sub)", cursor: "pointer" }}>{copiedIdx === i ? "Copied!" : "Copy"}</button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* ═══ PREVIEW ═══ */}
        {view === "result" && showPreview && (
          <div className="fi">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
              <h2 style={{ fontFamily: "var(--ui)", fontWeight: 800, fontSize: 18 }}>Preview</h2>
              <button onClick={() => setShowPreview(false)} style={{ padding: "6px 13px", borderRadius: 7, fontSize: 12, fontFamily: "var(--ui)", fontWeight: 500, border: "1px solid var(--border)", background: "transparent", color: "var(--sub)", cursor: "pointer" }}>Back</button>
            </div>
            {tweets.map((tw, i) => (
              <div key={i} style={{ display: "flex", gap: 14 }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                  <div style={{ width: 30, height: 30, borderRadius: "50%", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontFamily: "var(--mono)", color: "var(--sub)", fontWeight: 600 }}>{i + 1}</div>
                  {i < tweets.length - 1 && <div style={{ width: 1, flex: 1, background: "var(--border)", marginTop: 4, minHeight: 16 }} />}
                </div>
                <div style={{ paddingTop: 5, paddingBottom: 18, flex: 1 }}>
                  <p style={{ fontSize: 14, lineHeight: 1.6, fontFamily: "var(--serif)" }}>{tw}</p>
                  <span style={{ fontSize: 10, fontFamily: "var(--mono)", color: "var(--sub)" }}>{tw.length} chars</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ═══ HISTORY ═══ */}
        {view === "history" && (
          <div className="fi">
            <h2 style={{ fontFamily: "var(--ui)", fontWeight: 800, fontSize: 18, marginBottom: 18 }}>History</h2>
            {history.length === 0 ? (
              <p style={{ fontFamily: "var(--serif)", fontSize: 14, color: "var(--sub)", fontStyle: "italic" }}>No threads generated yet.</p>
            ) : history.map(h => (
              <div key={h.id} className="glass" style={{ borderRadius: 12, padding: 16, marginBottom: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, fontFamily: "var(--ui)" }}>{h.topic?.slice(0, 60)}{h.topic?.length > 60 ? "..." : ""}</div>
                    <div style={{ fontSize: 10, fontFamily: "var(--mono)", color: "var(--sub)", marginTop: 2 }}>
                      {h.tweets?.length} tweets · {new Date(h.createdAt).toLocaleDateString()} · {h.profileName || ""}
                    </div>
                  </div>
                  <span style={{
                    fontSize: 9, fontFamily: "var(--mono)", padding: "3px 8px", borderRadius: 6, textTransform: "uppercase", letterSpacing: 0.3,
                    background: h.status === "posted" ? "rgba(52,196,114,0.1)" : h.status === "viral" ? "rgba(212,85,58,0.1)" : "var(--card)",
                    color: h.status === "posted" ? "var(--green)" : h.status === "viral" ? "var(--accent)" : "var(--sub)",
                    border: `1px solid ${h.status === "posted" ? "rgba(52,196,114,0.15)" : h.status === "viral" ? "rgba(212,85,58,0.15)" : "var(--border)"}`,
                  }}>{h.status}</span>
                </div>

                {/* First tweet preview */}
                {h.tweets?.[0] && (
                  <p style={{ fontSize: 12, fontFamily: "var(--serif)", color: "var(--sub)", lineHeight: 1.5, marginBottom: 10, fontStyle: "italic" }}>"{h.tweets[0].slice(0, 100)}{h.tweets[0].length > 100 ? "..." : ""}"</p>
                )}

                {/* Follow-up actions */}
                <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                  <button onClick={() => { setTweets(h.tweets); setTopic(h.topic); setCtaType(h.ctaType || "none"); setView("result"); }} style={{ padding: "5px 11px", borderRadius: 6, fontSize: 11, fontFamily: "var(--ui)", fontWeight: 500, border: "1px solid var(--border)", background: "transparent", color: "var(--sub)", cursor: "pointer" }}>Open</button>
                  {h.status === "drafted" && (
                    <button onClick={() => updateHistoryStatus(h.id, "posted")} style={{ padding: "5px 11px", borderRadius: 6, fontSize: 11, fontFamily: "var(--ui)", fontWeight: 500, border: "1px solid rgba(52,196,114,0.2)", background: "rgba(52,196,114,0.05)", color: "var(--green)", cursor: "pointer" }}>I posted this</button>
                  )}
                  {h.status === "posted" && (
                    <button onClick={() => updateHistoryStatus(h.id, "viral")} style={{ padding: "5px 11px", borderRadius: 6, fontSize: 11, fontFamily: "var(--ui)", fontWeight: 500, border: "1px solid rgba(212,85,58,0.2)", background: "rgba(212,85,58,0.05)", color: "var(--accent)", cursor: "pointer" }}>It went viral!</button>
                  )}
                  {h.status === "posted" && (
                    <button onClick={() => updateHistoryStatus(h.id, "flopped")} style={{ padding: "5px 11px", borderRadius: 6, fontSize: 11, fontFamily: "var(--ui)", fontWeight: 500, border: "1px solid var(--border)", background: "transparent", color: "var(--sub)", cursor: "pointer" }}>Didn't perform</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ═══ PROFILES ═══ */}
        {view === "profiles" && (
          <div className="fi">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
              <h2 style={{ fontFamily: "var(--ui)", fontWeight: 800, fontSize: 18 }}>Profiles</h2>
              <button onClick={() => { setObData({}); setObStep(0); setView("onboarding"); }} style={{ padding: "6px 13px", borderRadius: 7, fontSize: 12, fontFamily: "var(--ui)", fontWeight: 500, border: "1px solid var(--border)", background: "transparent", color: "var(--sub)", cursor: "pointer" }}>+ Add</button>
            </div>
            {profiles.map(p => (
              <div key={p.id} className="glass" style={{
                borderRadius: 12, padding: 16, marginBottom: 8,
                borderColor: activeProfile?.id === p.id ? "var(--accent)" : undefined,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                    background: activeProfile?.id === p.id ? "linear-gradient(135deg, #d4553a, #e88a3a)" : "var(--card)",
                    color: activeProfile?.id === p.id ? "#fff" : "var(--sub)",
                    border: activeProfile?.id === p.id ? "none" : "1px solid var(--border)",
                  }}>
                    <ProfileIconSvg id={p.icon} size={18} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, fontFamily: "var(--ui)" }}>{p.name || "Untitled"}</div>
                    {p.handle && <div style={{ fontSize: 11, fontFamily: "var(--mono)", color: "var(--sub)" }}>{p.handle}</div>}
                  </div>
                  {activeProfile?.id === p.id && <span style={{ fontSize: 9, fontFamily: "var(--mono)", color: "var(--accent)", background: "var(--accent-bg)", padding: "2px 8px", borderRadius: 5, textTransform: "uppercase" }}>active</span>}
                </div>
                {p.voice && <div style={{ fontSize: 12, color: "var(--sub)", fontFamily: "var(--serif)", marginBottom: 8, fontStyle: "italic" }}>{p.voice}</div>}
                <div style={{ display: "flex", gap: 5 }}>
                  {activeProfile?.id !== p.id && (
                    <button onClick={() => setActiveProfile(p)} style={{ padding: "5px 11px", borderRadius: 6, fontSize: 11, fontFamily: "var(--ui)", fontWeight: 500, border: "1px solid var(--border)", background: "transparent", color: "var(--sub)", cursor: "pointer" }}>Set active</button>
                  )}
                  <button onClick={() => deleteProfile(p.id)} style={{ padding: "5px 11px", borderRadius: 6, fontSize: 11, fontFamily: "var(--ui)", fontWeight: 500, border: "1px solid var(--border)", background: "transparent", color: "var(--sub)", cursor: "pointer" }}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
