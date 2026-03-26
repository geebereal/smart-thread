import { useState, useEffect, useRef } from "react";

// ════════════════════════════════════════════════════════════
// CONSTANTS
// ════════════════════════════════════════════════════════════

const MAX_C = 280;
const STORE_KEY = "sthread_v5";

// Auto-detect environment: use Netlify function proxy if available, else direct API (Claude artifact)
const API_URL = typeof window !== "undefined" && window.location.hostname !== "localhost" && !window.location.hostname.includes("claude")
  ? "/.netlify/functions/ai"
  : "https://api.anthropic.com/v1/messages";

// gens/rw: -1 = unlimited, profiles: -1 = unlimited
const TIERS = {
  seed:     { id: "seed",     name: "Seed",     price: 0,   period: "",      gens: 5,   rw: 3,   profiles: 1,  aiSummary: false, label: "Free",      desc: "Just getting started" },
  grow:     { id: "grow",     name: "Grow",     price: 9,   period: "/mo",   gens: 50,  rw: 15,  profiles: 3,  aiSummary: false, label: "$9/mo",     desc: "Serious about content" },
  scale:    { id: "scale",    name: "Scale",    price: 49,  period: "/mo",   gens: 200, rw: 50,  profiles: -1, aiSummary: true,  label: "$49/mo",    desc: "Content is your growth engine" },
  dominate: { id: "dominate", name: "Dominate", price: 99,  period: "/mo",   gens: 500, rw: -1,  profiles: -1, aiSummary: true,  label: "$99/mo",    desc: "For agencies and ghostwriters" },
  forever:  { id: "forever",  name: "Forever",  price: 499, period: " once", gens: -1,  rw: -1,  profiles: -1, aiSummary: true,  label: "$499 once", desc: "Unlimited everything. Forever." },
};

const TIER_ORDER = ["seed", "grow", "scale", "dominate", "forever"];

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

function shuffle(arr) { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

const HOOKS = {
  story: {
    label: "Story", desc: "Personal moment",
    formulas: shuffle([
      { t: "I was {doing} when {event}...", f: [{ k: "doing", l: "What were you doing?", s: ["scrolling Twitter", "about to quit", "in a meeting"] }, { k: "event", l: "What happened?", s: ["I got a DM", "everything changed", "I saw a scary number"] }] },
      { t: "3 years ago I {action}. Today, {result}.", f: [{ k: "action", l: "What did you do?", s: ["started posting daily", "quit my 9-5", "launched a product"] }, { k: "result", l: "Result?", s: ["6-figure business", "50K followers", "never looked back"] }] },
      { t: "Nobody told me {truth} when I started {activity}.", f: [{ k: "truth", l: "What truth?", s: ["it takes 2 years", "the first 100 are hardest", "most advice is wrong"] }, { k: "activity", l: "Started what?", s: ["building in public", "freelancing", "content"] }] },
      { t: "I lost {something} before I figured out {lesson}.", f: [{ k: "something", l: "Lost what?", s: ["$10K", "6 months", "my biggest client"] }, { k: "lesson", l: "Learned?", s: ["how to grow", "what matters", "the one thing"] }] },
      { t: "The day I {moment}, everything clicked.", f: [{ k: "moment", l: "What moment?", s: ["stopped copying others", "deleted my calendar", "got my first client"] }] },
      { t: "My {person} told me \"{quote}\". They were {verdict}.", f: [{ k: "person", l: "Who?", s: ["boss", "mentor", "friend"] }, { k: "quote", l: "Said what?", s: ["this won't work", "you're wasting time", "get a real job"] }, { k: "verdict", l: "Right or wrong?", s: ["dead wrong", "half right", "more right than I wanted"] }] },
      { t: "I spent {time} doing {wrong}. Here's what I do now.", f: [{ k: "time", l: "How long?", s: ["6 months", "a full year", "way too long"] }, { k: "wrong", l: "Doing what wrong?", s: ["chasing vanity metrics", "copying formats", "overthinking"] }] },
      { t: "Last {when}, I {did}. Here's exactly what happened.", f: [{ k: "when", l: "When?", s: ["week", "month", "Tuesday"] }, { k: "did", l: "Did what?", s: ["ran an experiment", "changed my strategy", "posted something raw"] }] },
      { t: "I almost {near_miss}. Glad I didn't.", f: [{ k: "near_miss", l: "Almost what?", s: ["gave up", "took that job", "deleted my account"] }] },
      { t: "True story: {setup}. That's how I learned {lesson}.", f: [{ k: "setup", l: "What happened?", s: ["a stranger DMed me advice", "my worst post went viral", "I got rejected 12 times"] }, { k: "lesson", l: "The lesson?", s: ["consistency beats talent", "authenticity wins", "rejection is redirection"] }] },
    ])
  },
  bold: {
    label: "Bold claim", desc: "Hot take",
    formulas: shuffle([
      { t: "{claim}. And I'll prove it.", f: [{ k: "claim", l: "Your claim?", s: ["Most marketing advice is garbage", "You don't need a niche", "Consistency is overrated"] }] },
      { t: "{thing} is dead. Here's what replaced it.", f: [{ k: "thing", l: "What's dead?", s: ["Content calendars", "SEO blogging", "Cold outreach"] }] },
      { t: "Stop {bad}. It's costing you {cost}.", f: [{ k: "bad", l: "Stop what?", s: ["posting without strategy", "chasing followers", "copying competitors"] }, { k: "cost", l: "Costing?", s: ["real growth", "thousands of dollars", "your credibility"] }] },
      { t: "Unpopular opinion: {opinion}.", f: [{ k: "opinion", l: "Your take?", s: ["Post less not more", "Engagement pods destroy reach", "Followers don't equal money"] }] },
      { t: "Delete {thing} from your strategy. Thank me later.", f: [{ k: "thing", l: "Delete what?", s: ["your content calendar", "hashtags", "follow-for-follow"] }] },
      { t: "{pct}% of {people} get {topic} wrong.", f: [{ k: "pct", l: "Percentage?", s: ["90", "95", "80"] }, { k: "people", l: "Who?", s: ["creators", "founders", "freelancers"] }, { k: "topic", l: "Get what wrong?", s: ["pricing", "content strategy", "branding"] }] },
      { t: "I've {exp}. The biggest lie is {lie}.", f: [{ k: "exp", l: "Your experience?", s: ["built 3 businesses", "coached 200+ creators", "grown to 100K"] }, { k: "lie", l: "The lie?", s: ["you need money to start", "you need to be an expert", "virality matters"] }] },
      { t: "If you're still {action} in 2026, you're behind.", f: [{ k: "action", l: "Still doing what?", s: ["posting without analytics", "ignoring DMs", "not using AI"] }] },
      { t: "{wont} won't save your {goal}. {will} will.", f: [{ k: "wont", l: "What won't work?", s: ["More followers", "A new tool", "Posting daily"] }, { k: "goal", l: "Your goal?", s: ["business", "brand", "career"] }, { k: "will", l: "What works?", s: ["Clear positioning", "Real conversations", "Solving one problem"] }] },
      { t: "The {industry} doesn't want you to know this.", f: [{ k: "industry", l: "Which?", s: ["marketing industry", "coaching space", "SaaS world"] }] },
    ])
  },
  question: {
    label: "Question", desc: "Open with curiosity",
    formulas: shuffle([
      { t: "Why do {people} keep {mistake}?", f: [{ k: "people", l: "Who?", s: ["creators", "founders", "marketers"] }, { k: "mistake", l: "Keep doing what?", s: ["undercharging", "ignoring DMs", "posting without a goal"] }] },
      { t: "What if {assumption} is actually wrong?", f: [{ k: "assumption", l: "What assumption?", s: ["posting daily grows you", "you need a big audience", "niching down limits you"] }] },
      { t: "Have you noticed {observation}? There's a reason.", f: [{ k: "observation", l: "What?", s: ["top creators post less now", "engagement is dropping", "threads get less reach"] }] },
      { t: "Why does nobody talk about {topic}?", f: [{ k: "topic", l: "What topic?", s: ["mental health of building in public", "how much luck matters", "the plateau after 10K"] }] },
      { t: "Is {thing} even worth it anymore?", f: [{ k: "thing", l: "What?", s: ["Twitter/X", "newsletters", "long-form content"] }] },
      { t: "What separates {winners} from {losers}?", f: [{ k: "winners", l: "Winners?", s: ["top 1%", "creators who monetize", "brands that last"] }, { k: "losers", l: "Everyone else?", s: ["everyone else", "those who quit", "those who stay broke"] }] },
      { t: "Are you {real} or just {fake}?", f: [{ k: "real", l: "Actually doing?", s: ["building a business", "creating value", "growing"] }, { k: "fake", l: "Or just?", s: ["playing entrepreneur", "posting for likes", "staying busy"] }] },
      { t: "When was the last time you {action}?", f: [{ k: "action", l: "Did what?", s: ["questioned your strategy", "asked your audience", "took a real break"] }] },
      { t: "What would you do with {resource}?", f: [{ k: "resource", l: "What resource?", s: ["an extra hour a day", "1000 true fans", "$10K to invest"] }] },
      { t: "How did {subject} go from {start} to {end}?", f: [{ k: "subject", l: "Who?", s: ["I", "this brand", "that creator"] }, { k: "start", l: "From?", s: ["0 followers", "broke", "unknown"] }, { k: "end", l: "To?", s: ["100K", "6 figures", "fully booked"] }] },
    ])
  },
  stat: {
    label: "Data point", desc: "Hook with a number",
    formulas: shuffle([
      { t: "{stat}. Here's what nobody tells you.", f: [{ k: "stat", l: "Your stat?", s: ["73% of startups fail in year 1", "The average creator makes $0", "Only 4% of tweets get engagement"] }] },
      { t: "I tracked {metric} for {time}. Results surprised me.", f: [{ k: "metric", l: "Metric?", s: ["my engagement", "every post", "income sources"] }, { k: "time", l: "How long?", s: ["30 days", "6 months", "a year"] }] },
      { t: "I went from {before} to {after} in {time}.", f: [{ k: "before", l: "From?", s: ["0", "500 followers", "$0/mo"] }, { k: "after", l: "To?", s: ["10K", "$10K/mo", "fully booked"] }, { k: "time", l: "In?", s: ["6 months", "90 days"] }] },
      { t: "This one change gave me {result}.", f: [{ k: "result", l: "What result?", s: ["3x more replies", "doubled followers", "first $5K month"] }] },
      { t: "{time} of data. {number} posts. Here's what works.", f: [{ k: "time", l: "How long?", s: ["1 year", "6 months"] }, { k: "number", l: "How many?", s: ["500+", "300", "1000+"] }] },
      { t: "{action} = {result}. I have the numbers.", f: [{ k: "action", l: "What action?", s: ["Threads 3x/week", "Replying to 50/day", "Cutting content in half"] }, { k: "result", l: "Result?", s: ["+400% reach", "2x revenue", "10x engagement"] }] },
      { t: "Out of {total}, only {few} actually {outcome}.", f: [{ k: "total", l: "Out of?", s: ["1000 creators", "100 businesses", "every startup I've seen"] }, { k: "few", l: "How many?", s: ["3", "less than 10", "a handful"] }, { k: "outcome", l: "Actually?", s: ["make money", "last 2 years", "hit product-market fit"] }] },
      { t: "{metric} before: {before}. After: {after}.", f: [{ k: "metric", l: "Metric?", s: ["Engagement", "Revenue", "Followers/week"] }, { k: "before", l: "Before?", s: ["0.5%", "$500/mo", "2/week"] }, { k: "after", l: "After?", s: ["4.2%", "$8K/mo", "50/week"] }] },
      { t: "The top {pct} all do {thing}. Most don't know.", f: [{ k: "pct", l: "Top %?", s: ["1%", "5%", "10%"] }, { k: "thing", l: "Do what?", s: ["this one thing", "something counterintuitive", "the opposite of gurus"] }] },
      { t: "I analyzed {count} {things}. Here's the pattern.", f: [{ k: "count", l: "How many?", s: ["100", "500", "1000+"] }, { k: "things", l: "What?", s: ["viral threads", "top creators", "successful launches"] }] },
    ])
  },
  contrarian: {
    label: "Contrarian", desc: "Challenge the norm",
    formulas: shuffle([
      { t: "Everyone says {common}. They're wrong.", f: [{ k: "common", l: "Common belief?", s: ["post every day", "niche down", "follow trends"] }] },
      { t: "Worst advice I followed: \"{advice}\"", f: [{ k: "advice", l: "What advice?", s: ["Fake it till you make it", "Just provide value", "Be consistent"] }] },
      { t: "I stopped {action} and {result}.", f: [{ k: "action", l: "Stopped what?", s: ["posting daily", "using hashtags", "caring about likes"] }, { k: "result", l: "What happened?", s: ["growth exploded", "got best clients", "found my voice"] }] },
      { t: "You don't need {thing}. You need {real}.", f: [{ k: "thing", l: "Don't need?", s: ["more followers", "a fancy website", "another course"] }, { k: "real", l: "Need?", s: ["one clear offer", "10 real fans", "to just start"] }] },
      { t: "{popular} is a trap. Do {alt} instead.", f: [{ k: "popular", l: "Trap?", s: ["Engagement pods", "Viral content", "Hustle mentality"] }, { k: "alt", l: "Instead?", s: ["build in silence", "focus on depth", "rest more"] }] },
      { t: "Hot take: {opinion}.", f: [{ k: "opinion", l: "Hot take?", s: ["Threads are dying", "LinkedIn > Twitter for biz", "Courses are the laziest model"] }] },
      { t: "The {who} won't tell you this because {reason}.", f: [{ k: "who", l: "Who?", s: ["Gurus", "Course sellers", "Coaching industry"] }, { k: "reason", l: "Why?", s: ["it kills their model", "it's too simple", "they haven't done it"] }] },
      { t: "Doing {less} made me {more}.", f: [{ k: "less", l: "Less of?", s: ["less content", "less networking", "less planning"] }, { k: "more", l: "More of?", s: ["more money", "more growth", "more clarity"] }] },
      { t: "If {advice} worked, everyone would be {result}.", f: [{ k: "advice", l: "What advice?", s: ["\"be consistent\"", "\"follow the algorithm\"", "\"provide free value\""] }, { k: "result", l: "Be what?", s: ["rich", "famous", "making 6 figures"] }] },
      { t: "{guru} is wrong about {topic}. Here's why.", f: [{ k: "guru", l: "Who?", s: ["Every business guru", "Your favorite creator", "The algorithm chasers"] }, { k: "topic", l: "Wrong about?", s: ["growth", "monetization", "content strategy"] }] },
    ])
  },
  lesson: {
    label: "Lesson", desc: "Share what you learned",
    formulas: shuffle([
      { t: "{count} lessons from {experience}:", f: [{ k: "count", l: "How many?", s: ["5", "7", "10"] }, { k: "experience", l: "From what?", s: ["building my first product", "2 years of content", "failing publicly"] }] },
      { t: "I wish someone told me this about {topic} sooner.", f: [{ k: "topic", l: "About what?", s: ["growing on Twitter", "pricing your work", "building an audience"] }] },
      { t: "After {time} of {activity}, here's what I know.", f: [{ k: "time", l: "How long?", s: ["2 years", "6 months", "1000 hours"] }, { k: "activity", l: "Doing what?", s: ["creating content", "running a business", "coaching people"] }] },
      { t: "The hardest lesson from {experience}: {lesson}.", f: [{ k: "experience", l: "From?", s: ["my first startup", "going viral", "losing everything"] }, { k: "lesson", l: "The lesson?", s: ["speed beats perfection", "nobody cares until you prove it", "relationships > followers"] }] },
      { t: "What {years} years of {field} taught me:", f: [{ k: "years", l: "How many?", s: ["3", "5", "10"] }, { k: "field", l: "In what?", s: ["marketing", "freelancing", "building products"] }] },
      { t: "I've made every mistake in {field}. Save yourself the pain.", f: [{ k: "field", l: "What field?", s: ["content creation", "entrepreneurship", "personal branding"] }] },
      { t: "Things I'd tell my {time_ago} self about {topic}:", f: [{ k: "time_ago", l: "How long ago?", s: ["1-year-ago", "beginner", "day-one"] }, { k: "topic", l: "About?", s: ["building online", "making money", "growing an audience"] }] },
      { t: "The {adj} truth about {topic} nobody shares:", f: [{ k: "adj", l: "What kind?", s: ["uncomfortable", "honest", "ugly"] }, { k: "topic", l: "About?", s: ["making money online", "growing fast", "overnight success"] }] },
      { t: "Everything changed when I realized {insight}.", f: [{ k: "insight", l: "What insight?", s: ["less is more", "audience < community", "imperfect > unpublished"] }] },
      { t: "A thread on {topic} (from someone who learned the hard way).", f: [{ k: "topic", l: "What topic?", s: ["pricing", "client work", "building in public", "content strategy"] }] },
    ])
  },
  listicle: {
    label: "Listicle", desc: "Numbered breakdown",
    formulas: shuffle([
      { t: "{count} {things} that {outcome}:", f: [{ k: "count", l: "How many?", s: ["5", "7", "10"] }, { k: "things", l: "Things?", s: ["habits", "tools", "mistakes", "strategies"] }, { k: "outcome", l: "That?", s: ["changed my life", "10x'd my growth", "I wish I knew sooner"] }] },
      { t: "{count} signs you're {state}:", f: [{ k: "count", l: "How many?", s: ["5", "7", "9"] }, { k: "state", l: "What state?", s: ["ready to quit your job", "about to break through", "doing it wrong"] }] },
      { t: "The {count}-step system I used to {result}.", f: [{ k: "count", l: "Steps?", s: ["3", "4", "5"] }, { k: "result", l: "To do what?", s: ["get my first 1000 followers", "land 5 clients", "build a $10K/mo brand"] }] },
      { t: "{count} free {things} worth more than any {paid}:", f: [{ k: "count", l: "How many?", s: ["5", "7", "10"] }, { k: "things", l: "Free what?", s: ["tools", "resources", "strategies"] }, { k: "paid", l: "More than?", s: ["$500 course", "coaching program", "masterclass"] }] },
      { t: "My {adj} {count}-point checklist for {task}:", f: [{ k: "adj", l: "What kind?", s: ["no-BS", "brutally honest", "simple"] }, { k: "count", l: "Points?", s: ["5", "7", "10"] }, { k: "task", l: "For what?", s: ["writing viral threads", "landing clients", "growing fast"] }] },
      { t: "{count} things {people} do that {outcome}:", f: [{ k: "count", l: "How many?", s: ["5", "7"] }, { k: "people", l: "Who?", s: ["successful creators", "6-figure freelancers", "top founders"] }, { k: "outcome", l: "That?", s: ["most people don't", "look easy but aren't", "you should steal"] }] },
      { t: "Ranking {count} {things} from {worst} to {best}:", f: [{ k: "count", l: "How many?", s: ["5", "7", "10"] }, { k: "things", l: "What?", s: ["growth strategies", "content formats", "monetization models"] }, { k: "worst", l: "Worst?", s: ["overrated", "useless", "dead"] }, { k: "best", l: "Best?", s: ["underrated", "game-changing", "essential"] }] },
      { t: "{count} {things} I'd never do again as a {role}:", f: [{ k: "count", l: "How many?", s: ["5", "7"] }, { k: "things", l: "What?", s: ["mistakes", "decisions", "strategies"] }, { k: "role", l: "As a?", s: ["creator", "freelancer", "founder"] }] },
      { t: "A thread of {count} {things} that {outcome} (thread):", f: [{ k: "count", l: "How many?", s: ["10", "15", "20"] }, { k: "things", l: "What?", s: ["tweets", "ideas", "takes"] }, { k: "outcome", l: "That?", s: ["you can steal", "will make you think", "took me years to learn"] }] },
      { t: "{count} rules I follow that {people} think are crazy:", f: [{ k: "count", l: "How many?", s: ["3", "5", "7"] }, { k: "people", l: "Who?", s: ["most people", "other creators", "my friends"] }] },
    ])
  },
  howto: {
    label: "How-to", desc: "Step by step guide",
    formulas: shuffle([
      { t: "How to {goal} (step by step):", f: [{ k: "goal", l: "How to?", s: ["get your first 1000 followers", "land clients on Twitter", "write threads that convert"] }] },
      { t: "How I {achieved} in {time} (and how you can too):", f: [{ k: "achieved", l: "Achieved what?", s: ["hit 10K followers", "built a $5K/mo side hustle", "went viral 3 times"] }, { k: "time", l: "In?", s: ["3 months", "6 months", "1 year"] }] },
      { t: "The exact process I use to {task} every {freq}:", f: [{ k: "task", l: "Do what?", s: ["write threads", "find content ideas", "grow my audience"] }, { k: "freq", l: "How often?", s: ["week", "day", "month"] }] },
      { t: "A beginner's guide to {topic} (from someone who struggled):", f: [{ k: "topic", l: "Guide to?", s: ["personal branding", "monetizing Twitter", "building an audience"] }] },
      { t: "How to {goal} without {pain}:", f: [{ k: "goal", l: "Goal?", s: ["grow on Twitter", "make money online", "build a brand"] }, { k: "pain", l: "Without?", s: ["posting every day", "being salesy", "a huge following"] }] },
      { t: "Steal my {system} for {result}:", f: [{ k: "system", l: "What system?", s: ["content system", "writing process", "growth framework"] }, { k: "result", l: "For what?", s: ["consistent posting", "viral threads", "landing clients"] }] },
      { t: "The {adj} way to {goal} in {year}:", f: [{ k: "adj", l: "What kind?", s: ["fastest", "simplest", "laziest"] }, { k: "goal", l: "Goal?", s: ["grow your brand", "make money from content", "build authority"] }, { k: "year", l: "When?", s: ["2025", "2026"] }] },
      { t: "Copy my {thing}. It took me {time} to figure out.", f: [{ k: "thing", l: "What?", s: ["thread template", "content workflow", "growth playbook"] }, { k: "time", l: "How long?", s: ["6 months", "2 years", "100 failed attempts"] }] },
      { t: "How to go from {start} to {end} (a thread):", f: [{ k: "start", l: "From?", s: ["0 followers", "idea stage", "stuck"] }, { k: "end", l: "To?", s: ["monetized audience", "first $1K", "10K engaged followers"] }] },
      { t: "I'll teach you {skill} in one thread:", f: [{ k: "skill", l: "What skill?", s: ["copywriting", "thread writing", "building in public", "audience research"] }] },
    ])
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

  // Tier & Limits
  const [currentTier, setCurrentTier] = useState(loadStore().tier || "seed");
  const [gens, setGens] = useState(loadStore().gens || 0);
  const [rw, setRw] = useState(getDailyRewrites());
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [keyInput, setKeyInput] = useState("");
  const [keyError, setKeyError] = useState("");
  const [keyLoading, setKeyLoading] = useState(false);

  // Email gate
  const [userEmail, setUserEmail] = useState(loadStore().email || "");
  const [emailInput, setEmailInput] = useState("");
  const [showEmailGate, setShowEmailGate] = useState(false);
  const [showEmails, setShowEmails] = useState(false);

  // AI Profile Summary
  const [showProfileSummary, setShowProfileSummary] = useState(false);
  const [profileSummary, setProfileSummary] = useState("");
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [pendingProfile, setPendingProfile] = useState(null);

  const tier = TIERS[currentTier] || TIERS.seed;
  const canGen = tier.gens === -1 || gens < tier.gens;
  const canRw = tier.rw === -1 || rw < tier.rw;
  const maxProfiles = tier.profiles === -1 ? 999 : tier.profiles;

  // Secret admin: type /emails anywhere to see collected emails
  useEffect(() => {
    let buffer = "";
    function handleKey(e) {
      buffer += e.key;
      if (buffer.includes("/emails")) { setShowEmails(true); buffer = ""; }
      if (buffer.length > 20) buffer = buffer.slice(-10);
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  function submitEmail(email, isOptional) {
    if (!email || !email.includes("@")) return;
    const emails = loadStore().collectedEmails || [];
    if (!emails.includes(email)) {
      emails.push(email);
      saveStore({ collectedEmails: emails });
    }
    setUserEmail(email);
    saveStore({ email });
    setShowEmailGate(false);
    setEmailInput("");
    // If this was the limit gate, give 5 bonus gens
    if (!isOptional) {
      const newGens = Math.max(gens - 5, 0);
      setGens(newGens);
      saveStore({ gens: newGens });
    }
  }

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
    // Generate AI profile summary
    setPendingProfile(p);
    generateProfileSummary(p);
  }

  async function generateProfileSummary(prof) {
    setSummaryLoading(true);
    setShowProfileSummary(true);
    setProfileSummary("");

    const prompt = `You just onboarded a new content creator profile. Based on their details, write a short, energizing 2-3 sentence summary of their brand voice and content angle. Be specific to THEM — don't be generic. Sound like a smart creative director giving a quick brief.

Profile:
- Name: ${prof.name || "Unknown"}
- Handle: ${prof.handle || "N/A"}
- Niche: ${prof.niche || "general"}
- Audience: ${prof.audience || "general"}
- Voice: ${prof.voice || "casual"}
- Avoids: ${prof.avoid || "nothing"}
${prof.example ? `- Style example: "${prof.example.slice(0, 300)}"` : ""}

Return ONLY the summary text. No quotes, no explanation, no labels.`;

    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 300,
          system: "You are a creative director. Write concise, specific, energizing brand voice summaries. No fluff. Sound human.",
          messages: [{ role: "user", content: prompt }],
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const text = (data.content || [])
          .filter(b => b.type === "text")
          .map(b => b.text)
          .join("")
          .trim();
        if (text) {
          setProfileSummary(text);
          // Save summary to profile
          const withSummary = { ...prof, aiSummary: text };
          const updatedProfiles = profiles.map(p => p.id === prof.id ? withSummary : p);
          // Also check if it was the new one we just pushed
          const allProfiles = loadStore().profiles || [];
          const savedProfiles = allProfiles.map(p => p.id === prof.id ? withSummary : p);
          setProfiles(savedProfiles);
          saveStore({ profiles: savedProfiles });
          setActiveProfile(withSummary);
          setSummaryLoading(false);
          return;
        }
      }
      // Fallback: local summary
      setProfileSummary(`${prof.name || "Your profile"} is set up and ready to go. You're targeting ${prof.audience || "your audience"} with a ${prof.voice || "casual"} voice in the ${prof.niche || "general"} space.`);
    } catch {
      setProfileSummary(`${prof.name || "Your profile"} is set up and ready to go. You're targeting ${prof.audience || "your audience"} with a ${prof.voice || "casual"} voice in the ${prof.niche || "general"} space.`);
    } finally {
      setSummaryLoading(false);
    }
  }

  function dismissProfileSummary() {
    setShowProfileSummary(false);
    setProfileSummary("");
    setPendingProfile(null);
    // Now show email gate or go home
    if (!userEmail) {
      setShowEmailGate("optional");
    } else {
      setView("home");
    }
  }

  // ── License Key ──
  async function activateKey(tierId) {
    if (!keyInput.trim()) return;
    setKeyLoading(true);
    setKeyError("");
    try {
      // Validate against Gumroad's API
      const res = await fetch("https://api.gumroad.com/v2/licenses/verify", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          product_id: "REPLACE_WITH_YOUR_PRODUCT_ID",
          license_key: keyInput.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setCurrentTier(tierId || "grow");
        saveStore({ tier: tierId || "grow", licenseKey: keyInput.trim() });
        setShowUpgrade(false);
        setKeyInput("");
      } else {
        setKeyError("Invalid key. Double-check and try again.");
      }
    } catch {
      // Offline fallback — accept if key looks valid
      if (keyInput.trim().length >= 8) {
        setCurrentTier(tierId || "grow");
        saveStore({ tier: tierId || "grow", licenseKey: keyInput.trim() });
        setShowUpgrade(false);
        setKeyInput("");
      } else {
        setKeyError("Could not verify. Check your connection and try again.");
      }
    } finally {
      setKeyLoading(false);
    }
  }

  // ── Generate ──
  async function generate() {
    if (!canGen) {
      // If they haven't given email yet, ask for email first (gives 5 bonus gens)
      if (!userEmail) {
        setShowEmailGate("required");
        return;
      }
      // Already gave email, show upgrade
      setShowUpgrade(true);
      return;
    }
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

      const res = await fetch(API_URL, {
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

      const res = await fetch(API_URL, {
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

  const [theme, setTheme] = useState(() => {
    try { return loadStore().theme || "dark"; } catch { return "dark"; }
  });

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    saveStore({ theme: next });
  }

  const ready = topic.trim() && hookId && threadLen && ctaType;
  const hookData = hookId ? HOOKS[hookId] : null;
  const curFormula = hookData ? hookData.formulas[formulaIdx] : null;

  const isDark = theme === "dark";

  // ════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════

  return (
    <div style={{ minHeight: "100vh", background: isDark ? "#0b0b0f" : "#f6f5f1", color: isDark ? "#e8e8ec" : "#1a1a1e", transition: "background 0.3s, color 0.3s" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=General+Sans:wght@400;500;600;700&family=Lora:ital,wght@0,400;0,500;0,600;1,400&family=Fira+Code:wght@400;500&display=swap');
        :root {
          --ui: 'General Sans', -apple-system, sans-serif;
          --body: 'Lora', Georgia, serif;
          --mono: 'Fira Code', monospace;
          --bg: ${isDark ? "#0b0b0f" : "#f6f5f1"};
          --card: ${isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.025)"};
          --card-solid: ${isDark ? "#141418" : "#ffffff"};
          --border: ${isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.08)"};
          --text: ${isDark ? "#e8e8ec" : "#1a1a1e"};
          --sub: ${isDark ? "rgba(255,255,255,0.38)" : "rgba(0,0,0,0.4)"};
          --input-bg: ${isDark ? "rgba(255,255,255,0.04)" : "#ffffff"};
          --input-text: ${isDark ? "#e8e8ec" : "#1a1a1e"};
          --input-ph: ${isDark ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.3)"};
          --accent: ${isDark ? "#e0654a" : "#d4553a"};
          --accent-bg: ${isDark ? "rgba(224,101,74,0.1)" : "rgba(212,85,58,0.08)"};
          --accent-border: ${isDark ? "rgba(224,101,74,0.25)" : "rgba(212,85,58,0.2)"};
          --green: ${isDark ? "#3dd97a" : "#28a85c"};
          --green-bg: ${isDark ? "rgba(61,217,122,0.1)" : "rgba(40,168,92,0.08)"};
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: var(--bg); }
        textarea, input { font-family: var(--ui); }
        textarea:focus, input:focus { outline: none; border-color: var(--accent) !important; }
        textarea::placeholder, input::placeholder { color: var(--input-ph); }
        ::selection { background: rgba(212,85,58,0.2); }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.08)"}; border-radius: 2px; }
        @keyframes fi { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
        @keyframes pulse-ring { 0% { transform: scale(0.8); opacity: 0.5; } 100% { transform: scale(1.4); opacity: 0; } }
        @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
        @keyframes scale-in { from { opacity: 0; transform: scale(0.92); } to { opacity: 1; transform: scale(1); } }
        @keyframes slide-up { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes check-pop { 0% { transform: scale(0); } 50% { transform: scale(1.2); } 100% { transform: scale(1); } }
        @keyframes glow { 0%, 100% { box-shadow: 0 0 8px rgba(224,101,74,0.15); } 50% { box-shadow: 0 0 20px rgba(224,101,74,0.3); } }

        .fi { animation: fi 0.3s ease both; }
        .fid1 { animation: fi 0.3s 0.05s ease both; }
        .fid2 { animation: fi 0.3s 0.1s ease both; }
        .fid3 { animation: fi 0.3s 0.15s ease both; }
        .scale-in { animation: scale-in 0.3s ease both; }
        .slide-up { animation: slide-up 0.4s cubic-bezier(0.16, 1, 0.3, 1) both; }

        .glass { 
          background: var(--card-solid); border: 1px solid var(--border); 
          box-shadow: ${isDark ? "0 1px 3px rgba(0,0,0,0.3)" : "0 1px 3px rgba(0,0,0,0.04)"};
          transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
        }
        .glass:hover {
          transform: translateY(-1px);
          box-shadow: ${isDark ? "0 4px 12px rgba(0,0,0,0.4)" : "0 4px 12px rgba(0,0,0,0.06)"};
        }

        /* Button press effect */
        button { transition: all 0.15s ease; }
        button:active:not(:disabled) { transform: scale(0.97); }

        /* Chip/pill hover */
        .chip-hover:hover {
          border-color: var(--accent) !important;
          background: var(--accent-bg) !important;
          color: var(--accent) !important;
        }

        /* Card hover lift */
        .card-lift {
          transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
        }
        .card-lift:hover {
          transform: translateY(-2px);
          box-shadow: ${isDark ? "0 8px 24px rgba(0,0,0,0.4)" : "0 8px 24px rgba(0,0,0,0.06)"};
          border-color: var(--accent-border);
        }

        /* Generate button glow when ready */
        .gen-btn-ready {
          animation: glow 2s ease-in-out infinite;
        }
        .gen-btn-ready:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 28px rgba(212,85,58,0.3) !important;
        }

        /* Input focus glow */
        textarea:focus, input:focus {
          outline: none;
          border-color: var(--accent) !important;
          box-shadow: 0 0 0 3px ${isDark ? "rgba(224,101,74,0.08)" : "rgba(212,85,58,0.06)"};
        }

        /* Smooth modal backdrop */
        .modal-backdrop {
          animation: fi 0.2s ease both;
        }
        .modal-content {
          animation: scale-in 0.25s cubic-bezier(0.16, 1, 0.3, 1) both;
        }

        /* Loading shimmer */
        .shimmer {
          background: linear-gradient(90deg, var(--card) 25%, ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)"} 50%, var(--card) 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s ease-in-out infinite;
          border-radius: 8px;
        }

        /* Copy success flash */
        .copy-flash {
          animation: check-pop 0.3s ease both;
        }

        /* Icon float on profile card */
        .icon-float:hover svg {
          animation: float 1s ease infinite;
        }
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
            <nav style={{ display: "flex", gap: 3, alignItems: "center" }}>
              <button onClick={toggleTheme} style={{
                width: 32, height: 32, borderRadius: 8, border: "1px solid var(--border)",
                background: "var(--card)", color: "var(--sub)", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", marginRight: 4,
                transition: "all 0.2s",
              }}>
                {isDark ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>
                )}
              </button>
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
              <p style={{ fontFamily: "var(--body)", fontSize: 15, color: "var(--sub)", fontStyle: "italic", marginTop: 4 }}>Set up your brand voice first.</p>
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
              <p style={{ fontSize: 13, fontFamily: "var(--body)", color: "var(--sub)", lineHeight: 1.5, marginBottom: 16, fontStyle: "italic" }}>{PQ[obStep].why}</p>

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
                    style={{ width: "100%", padding: "12px 14px", borderRadius: 10, background: "var(--input-bg)", border: "1.5px solid var(--border)", color: "var(--input-text)", fontSize: 15, fontFamily: "var(--ui)", fontWeight: 400, letterSpacing: "-0.01em", lineHeight: 1.6, lineHeight: 1.5, resize: "vertical" }}
                  />
                ) : (
                  <input
                    value={obData[PQ[obStep].key] || ""}
                    onChange={e => setObData({ ...obData, [PQ[obStep].key]: e.target.value })}
                    placeholder={PQ[obStep].ph}
                    style={{ width: "100%", padding: "12px 14px", borderRadius: 10, background: "var(--input-bg)", border: "1.5px solid var(--border)", color: "var(--input-text)", fontSize: 15, fontFamily: "var(--ui)", fontWeight: 400, letterSpacing: "-0.01em", lineHeight: 1.6 }}
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
                <div className="icon-float" style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg, #d4553a, #e88a3a)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", flexShrink: 0 }}>
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

            {/* Tier badge + limits */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <span style={{ fontSize: 10, fontFamily: "var(--mono)", fontWeight: 700, color: currentTier === "seed" ? "var(--sub)" : "var(--accent)", textTransform: "uppercase", letterSpacing: 0.5, padding: "3px 8px", borderRadius: 6, background: currentTier === "seed" ? "var(--card)" : "var(--accent-bg)", border: `1px solid ${currentTier === "seed" ? "var(--border)" : "var(--accent-border)"}` }}>{tier.name}</span>
                {currentTier !== "forever" && (
                  <button onClick={() => setShowUpgrade(true)} style={{ fontSize: 10, fontFamily: "var(--ui)", color: "var(--accent)", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>Upgrade</button>
                )}
              </div>
              {tier.gens === -1 && tier.rw === -1 ? (
                <div style={{ fontSize: 11, fontFamily: "var(--ui)", color: "var(--sub)" }}>Unlimited generations and rewrites</div>
              ) : (
                <div style={{ display: "flex", gap: 16 }}>
                  {[
                    { used: gens, total: tier.gens, label: "Generations" },
                    { used: rw, total: tier.rw === -1 ? 999 : tier.rw, label: tier.rw === -1 ? "Rewrites (unlimited)" : "Rewrites today" },
                  ].map(bar => {
                    if (bar.total === 999) return (
                      <div key={bar.label} style={{ flex: 1 }}>
                        <div style={{ fontSize: 10, fontFamily: "var(--mono)", color: "var(--sub)" }}>{bar.label}</div>
                      </div>
                    );
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
              )}
            </div>

            {/* Form */}
            <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>

              {/* Topic */}
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, fontFamily: "var(--ui)", marginBottom: 8 }}>Topic</div>
                <textarea value={topic} onChange={e => setTopic(e.target.value)} placeholder="What's the core idea or story?" rows={3} style={{ width: "100%", padding: "12px 14px", borderRadius: 10, background: "var(--input-bg)", border: "1.5px solid var(--border)", color: "var(--input-text)", fontSize: 15, fontFamily: "var(--ui)", fontWeight: 400, letterSpacing: "-0.01em", lineHeight: 1.6, lineHeight: 1.5, resize: "vertical" }} />
              </div>

              {/* Hook */}
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, fontFamily: "var(--ui)", marginBottom: 4 }}>Hook style</div>
                <div style={{ fontSize: 11, color: "var(--sub)", fontFamily: "var(--body)", marginBottom: 10 }}>Pick a hook, then choose a formula</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                  {Object.entries(HOOKS).map(([id, h]) => (
                    <button key={id} className={hookId !== id ? "chip-hover" : ""} onClick={() => { setHookId(id); setFormulaIdx(0); setHookFields({}); }} style={{
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
                        <input value={hookFields[field.k] || ""} onChange={e => setHookFields({ ...hookFields, [field.k]: e.target.value })} placeholder="Or type your own..." style={{ width: "100%", padding: "8px 12px", borderRadius: 8, background: "rgba(255,255,255,0.02)", border: "1px solid var(--border)", color: "var(--text)", fontSize: 12, fontFamily: "var(--body)" }} />
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
              <button className={ready && canGen ? "gen-btn-ready" : ""} onClick={() => { if (!canGen) { setShowUpgrade(true); } else if (ready) { generate(); } }} disabled={!ready && canGen} style={{
                width: "100%", padding: "14px 20px", borderRadius: 12, fontSize: 14, fontFamily: "var(--ui)", fontWeight: 700,
                border: "none", cursor: (!ready && canGen) ? "not-allowed" : "pointer",
                background: (!ready && canGen) ? "var(--card)" : !canGen ? "var(--accent-bg)" : "linear-gradient(135deg, #d4553a, #e88a3a)",
                color: (!ready && canGen) ? "var(--sub)" : !canGen ? "var(--accent)" : "#fff",
                transition: "all 0.2s",
              }}>
                {!canGen ? "Upgrade to Pro" : "Generate thread"}
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
              <div className="slide-up" style={{ padding: "20px 0" }}>
                {/* Skeleton tweet cards */}
                {[0, 1, 2].map(i => (
                  <div key={i} style={{
                    borderRadius: 12, padding: 16, marginBottom: 8,
                    background: "var(--card-solid)", border: "1px solid var(--border)",
                    animation: `fi 0.3s ${i * 0.1}s ease both`, opacity: 0,
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                      <div className="shimmer" style={{ width: 50, height: 12 }} />
                      <div className="shimmer" style={{ width: 40, height: 12 }} />
                    </div>
                    <div className="shimmer" style={{ width: "100%", height: 14, marginBottom: 8 }} />
                    <div className="shimmer" style={{ width: "85%", height: 14, marginBottom: 8 }} />
                    <div className="shimmer" style={{ width: "60%", height: 14 }} />
                  </div>
                ))}
                <p style={{ textAlign: "center", fontFamily: "var(--mono)", fontSize: 11, color: "var(--sub)", marginTop: 16 }}>
                  Writing your thread...
                </p>
              </div>
            )}

            {/* Error */}
            {error && !loading && (
              <div style={{ textAlign: "center", padding: "40px 0" }}>
                <div style={{ fontSize: 14, fontWeight: 600, fontFamily: "var(--ui)", marginBottom: 6 }}>Generation failed</div>
                <p style={{ fontSize: 13, fontFamily: "var(--body)", color: "var(--sub)", marginBottom: 20, lineHeight: 1.5 }}>{error}</p>
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
                    <div key={`${i}-${tw.slice(0, 10)}`} className={`glass card-lift ${i < 4 ? "fid" + i : "fi"}`} style={{ borderRadius: 12, padding: 16 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                        <span style={{ fontSize: 10, fontFamily: "var(--mono)", color: "var(--accent)", textTransform: "uppercase", letterSpacing: 0.3 }}>
                          {i === 0 ? "Hook" : i === tweets.length - 1 && ctaType !== "none" ? "CTA" : `${i + 1}/${tweets.length}`}
                        </span>
                        <span style={{ fontSize: 10, fontFamily: "var(--mono)", color: tw.length > MAX_C ? "var(--accent)" : "var(--sub)" }}>{tw.length}/{MAX_C}</span>
                      </div>
                      <p style={{ fontSize: 14, lineHeight: 1.65, fontFamily: "var(--body)", margin: "0 0 14px", whiteSpace: "pre-wrap" }}>{tw}</p>
                      <div style={{ display: "flex", gap: 5, justifyContent: "flex-end", alignItems: "center" }}>
                        <span style={{ fontSize: 9, fontFamily: "var(--mono)", color: "var(--sub)", marginRight: "auto" }}>{tier.rw === -1 ? "∞" : Math.max(tier.rw - rw, 0)} rewrites left</span>
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
                  <p style={{ fontSize: 14, lineHeight: 1.6, fontFamily: "var(--body)" }}>{tw}</p>
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
              <p style={{ fontFamily: "var(--body)", fontSize: 14, color: "var(--sub)", fontStyle: "italic" }}>No threads generated yet.</p>
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
                  <p style={{ fontSize: 12, fontFamily: "var(--body)", color: "var(--sub)", lineHeight: 1.5, marginBottom: 10, fontStyle: "italic" }}>"{h.tweets[0].slice(0, 100)}{h.tweets[0].length > 100 ? "..." : ""}"</p>
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
                {p.voice && <div style={{ fontSize: 12, color: "var(--sub)", fontFamily: "var(--body)", marginBottom: 8, fontStyle: "italic" }}>{p.voice}</div>}
                {p.aiSummary && (
                  <div style={{ fontSize: 11, color: "var(--accent)", fontFamily: "var(--body)", marginBottom: 8, padding: "8px 10px", background: "var(--accent-bg)", borderRadius: 8, lineHeight: 1.5, fontStyle: "italic" }}>
                    {p.aiSummary}
                  </div>
                )}
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

        {/* ═══ AI PROFILE SUMMARY MODAL ═══ */}
        {showProfileSummary && (
          <div className="modal-backdrop" style={{
            position: "fixed", inset: 0, background: isDark ? "rgba(0,0,0,0.85)" : "rgba(0,0,0,0.5)",
            display: "flex", alignItems: "center", justifyContent: "center", zIndex: 150, padding: 20,
            backdropFilter: "blur(6px)",
          }}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{
              background: "var(--card-solid)", border: "1px solid var(--border)",
              borderRadius: 20, padding: 32, maxWidth: 420, width: "100%",
              boxShadow: isDark ? "0 24px 80px rgba(0,0,0,0.6)" : "0 24px 80px rgba(0,0,0,0.12)",
            }}>
              <div style={{ textAlign: "center", marginBottom: 20 }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, background: "linear-gradient(135deg, #d4553a, #e88a3a)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", color: "#fff" }}>
                  {pendingProfile && <ProfileIconSvg id={pendingProfile.icon} size={24} />}
                </div>
                <h3 style={{ fontFamily: "var(--ui)", fontWeight: 800, fontSize: 18, marginBottom: 4 }}>
                  {summaryLoading ? "Analyzing your voice..." : "Your brand voice"}
                </h3>
                {pendingProfile && (
                  <div style={{ fontSize: 11, fontFamily: "var(--mono)", color: "var(--sub)" }}>{pendingProfile.name}{pendingProfile.handle ? ` · ${pendingProfile.handle}` : ""}</div>
                )}
              </div>

              {summaryLoading ? (
                <div style={{ padding: "16px 0" }}>
                  <div className="shimmer" style={{ width: "100%", height: 14, marginBottom: 10, borderRadius: 6 }} />
                  <div className="shimmer" style={{ width: "85%", height: 14, marginBottom: 10, borderRadius: 6 }} />
                  <div className="shimmer" style={{ width: "70%", height: 14, borderRadius: 6 }} />
                </div>
              ) : (
                <div style={{
                  background: "var(--accent-bg)", border: "1px solid var(--accent-border)",
                  borderRadius: 12, padding: "16px 18px", marginBottom: 8,
                }}>
                  <p style={{ fontSize: 14, fontFamily: "var(--body)", lineHeight: 1.65, color: "var(--text)", margin: 0, fontStyle: "italic" }}>
                    {profileSummary}
                  </p>
                </div>
              )}

              {!summaryLoading && (
                <button onClick={dismissProfileSummary} style={{
                  display: "block", width: "100%", marginTop: 16,
                  padding: "13px 20px", borderRadius: 12, fontSize: 14,
                  fontFamily: "var(--ui)", fontWeight: 700, border: "none",
                  background: "linear-gradient(135deg, #d4553a, #e88a3a)", color: "#fff",
                  cursor: "pointer",
                }}>Start creating</button>
              )}
            </div>
          </div>
        )}

        {/* ═══ EMAIL GATE MODAL ═══ */}
        {showEmailGate && (
          <div style={{
            position: "fixed", inset: 0, background: isDark ? "rgba(0,0,0,0.85)" : "rgba(0,0,0,0.5)",
            display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 20,
            backdropFilter: "blur(6px)",
          }} onClick={() => { if (showEmailGate === "optional") { setShowEmailGate(false); setView("home"); } }}>
            <div onClick={e => e.stopPropagation()} style={{
              background: "var(--card-solid)", border: "1px solid var(--border)",
              borderRadius: 20, padding: 32, maxWidth: 400, width: "100%",
              boxShadow: isDark ? "0 24px 80px rgba(0,0,0,0.6)" : "0 24px 80px rgba(0,0,0,0.12)",
            }}>
              <div style={{ textAlign: "center", marginBottom: 24 }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, background: "linear-gradient(135deg, #d4553a, #e88a3a)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", color: "#fff", fontSize: 22 }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                </div>
                {showEmailGate === "optional" ? (
                  <>
                    <h3 style={{ fontFamily: "var(--ui)", fontWeight: 700, fontSize: 18, marginBottom: 6 }}>Stay in the loop</h3>
                    <p style={{ fontFamily: "var(--body)", fontSize: 14, color: "var(--sub)", lineHeight: 1.5 }}>
                      Get notified about new hooks, features, and creator tips. No spam, just useful stuff.
                    </p>
                  </>
                ) : (
                  <>
                    <h3 style={{ fontFamily: "var(--ui)", fontWeight: 700, fontSize: 18, marginBottom: 6 }}>Want 5 more free generations?</h3>
                    <p style={{ fontFamily: "var(--body)", fontSize: 14, color: "var(--sub)", lineHeight: 1.5 }}>
                      You've used your free threads. Enter your email to unlock 5 more — on the house.
                    </p>
                  </>
                )}
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <input
                  value={emailInput}
                  onChange={e => setEmailInput(e.target.value)}
                  placeholder="you@example.com"
                  type="email"
                  style={{
                    flex: 1, padding: "12px 14px", borderRadius: 10,
                    background: "var(--input-bg)", border: "1.5px solid var(--border)",
                    color: "var(--input-text)", fontSize: 14, fontFamily: "var(--ui)",
                  }}
                  onKeyDown={e => { if (e.key === "Enter") submitEmail(emailInput, showEmailGate === "optional"); }}
                />
                <button
                  onClick={() => submitEmail(emailInput, showEmailGate === "optional")}
                  disabled={!emailInput.includes("@")}
                  style={{
                    padding: "12px 20px", borderRadius: 10, fontSize: 13,
                    fontFamily: "var(--ui)", fontWeight: 700, border: "none",
                    background: "linear-gradient(135deg, #d4553a, #e88a3a)", color: "#fff",
                    cursor: !emailInput.includes("@") ? "not-allowed" : "pointer",
                    opacity: !emailInput.includes("@") ? 0.5 : 1,
                  }}
                >
                  {showEmailGate === "optional" ? "Join" : "Unlock"}
                </button>
              </div>

              {showEmailGate === "optional" && (
                <button onClick={() => { setShowEmailGate(false); setView("home"); }} style={{
                  display: "block", margin: "16px auto 0", background: "none", border: "none",
                  color: "var(--sub)", fontSize: 12, fontFamily: "var(--ui)", cursor: "pointer",
                }}>Skip for now</button>
              )}
            </div>
          </div>
        )}

        {/* ═══ ADMIN: COLLECTED EMAILS ═══ */}
        {showEmails && (
          <div style={{
            position: "fixed", inset: 0, background: isDark ? "rgba(0,0,0,0.85)" : "rgba(0,0,0,0.5)",
            display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 20,
          }} onClick={() => setShowEmails(false)}>
            <div onClick={e => e.stopPropagation()} style={{
              background: "var(--card-solid)", border: "1px solid var(--border)",
              borderRadius: 16, padding: 24, maxWidth: 400, width: "100%",
              maxHeight: "70vh", overflowY: "auto",
            }}>
              <h3 style={{ fontFamily: "var(--ui)", fontWeight: 700, fontSize: 16, marginBottom: 12 }}>Collected Emails</h3>
              {(loadStore().collectedEmails || []).length === 0 ? (
                <p style={{ fontFamily: "var(--body)", fontSize: 13, color: "var(--sub)", fontStyle: "italic" }}>No emails collected yet.</p>
              ) : (
                <>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 16 }}>
                    {(loadStore().collectedEmails || []).map((email, i) => (
                      <div key={i} style={{ fontSize: 13, fontFamily: "var(--mono)", color: "var(--text)", padding: "6px 10px", background: "var(--card)", borderRadius: 6 }}>{email}</div>
                    ))}
                  </div>
                  <button onClick={() => {
                    navigator.clipboard.writeText((loadStore().collectedEmails || []).join("\n"));
                  }} style={{
                    padding: "8px 16px", borderRadius: 8, fontSize: 12, fontFamily: "var(--ui)", fontWeight: 600,
                    border: "1px solid var(--border)", background: "var(--card)", color: "var(--text)", cursor: "pointer",
                  }}>Copy all</button>
                </>
              )}
              <button onClick={() => setShowEmails(false)} style={{
                display: "block", margin: "12px auto 0", background: "none", border: "none",
                color: "var(--sub)", fontSize: 12, fontFamily: "var(--ui)", cursor: "pointer",
              }}>Close</button>
            </div>
          </div>
        )}
        {showUpgrade && (
          <div style={{
            position: "fixed", inset: 0, background: isDark ? "rgba(0,0,0,0.85)" : "rgba(0,0,0,0.5)",
            display: "flex", alignItems: "flex-start", justifyContent: "center", zIndex: 100,
            padding: "40px 16px", overflowY: "auto", backdropFilter: "blur(6px)",
          }} onClick={() => setShowUpgrade(false)}>
            <div onClick={e => e.stopPropagation()} style={{
              background: "var(--card-solid)", border: "1px solid var(--border)",
              borderRadius: 20, padding: "32px 24px", maxWidth: 480, width: "100%",
              boxShadow: isDark ? "0 24px 80px rgba(0,0,0,0.6)" : "0 24px 80px rgba(0,0,0,0.12)",
            }}>
              <div style={{ textAlign: "center", marginBottom: 28 }}>
                <h2 style={{ fontFamily: "var(--ui)", fontWeight: 800, fontSize: 22, letterSpacing: "-0.5px", marginBottom: 6 }}>Choose your plan</h2>
                <p style={{ fontFamily: "var(--body)", fontSize: 14, color: "var(--sub)", lineHeight: 1.5 }}>
                  You're on <strong style={{ color: "var(--text)" }}>{tier.name}</strong>. Pick a plan that matches your pace.
                </p>
              </div>

              {/* Tier cards */}
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
                {TIER_ORDER.filter(id => id !== "seed").map(id => {
                  const t = TIERS[id];
                  const isCurrent = currentTier === id;
                  const isPopular = id === "scale";
                  return (
                    <div key={id} style={{
                      padding: "16px 18px", borderRadius: 14, position: "relative",
                      background: isCurrent ? "var(--accent-bg)" : "var(--card)",
                      border: `1.5px solid ${isCurrent ? "var(--accent)" : isPopular ? "var(--accent-border)" : "var(--border)"}`,
                    }}>
                      {isPopular && !isCurrent && (
                        <span style={{ position: "absolute", top: -9, right: 16, fontSize: 9, fontFamily: "var(--mono)", fontWeight: 700, color: "#fff", background: "var(--accent)", padding: "2px 10px", borderRadius: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>Popular</span>
                      )}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div>
                          <div style={{ fontSize: 15, fontWeight: 700, fontFamily: "var(--ui)", marginBottom: 2 }}>{t.name}</div>
                          <div style={{ fontSize: 12, color: "var(--sub)", fontFamily: "var(--body)", fontStyle: "italic" }}>{t.desc}</div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <span style={{ fontSize: 20, fontWeight: 800, fontFamily: "var(--ui)" }}>${t.price}</span>
                          <span style={{ fontSize: 11, color: "var(--sub)", fontFamily: "var(--ui)" }}>{t.period}</span>
                        </div>
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 12px", marginTop: 10 }}>
                        <span style={{ fontSize: 11, fontFamily: "var(--mono)", color: "var(--sub)" }}>{t.gens === -1 ? "Unlimited gens" : `${t.gens} gens/mo`}</span>
                        <span style={{ fontSize: 11, fontFamily: "var(--mono)", color: "var(--sub)" }}>{t.rw === -1 ? "Unlimited rewrites" : `${t.rw} rewrites/day`}</span>
                        <span style={{ fontSize: 11, fontFamily: "var(--mono)", color: "var(--sub)" }}>{t.profiles === -1 ? "Unlimited profiles" : `${t.profiles} profiles`}</span>
                        {t.aiSummary && <span style={{ fontSize: 11, fontFamily: "var(--mono)", color: "var(--accent)" }}>AI summary</span>}
                      </div>
                      {!isCurrent && (
                        <a href={`https://gumroad.com/l/REPLACE_${id.toUpperCase()}`} target="_blank" rel="noopener noreferrer" style={{
                          display: "block", textAlign: "center", marginTop: 12,
                          padding: "10px 16px", borderRadius: 10, fontSize: 12,
                          fontFamily: "var(--ui)", fontWeight: 700, textDecoration: "none",
                          background: isPopular ? "linear-gradient(135deg, #d4553a, #e88a3a)" : "var(--card)",
                          color: isPopular ? "#fff" : "var(--text)",
                          border: isPopular ? "none" : "1px solid var(--border)",
                          boxShadow: isPopular ? "0 3px 16px rgba(212,85,58,0.2)" : "none",
                        }}>
                          {id === "forever" ? "Get lifetime access" : `Get ${t.name}`}
                        </a>
                      )}
                      {isCurrent && (
                        <div style={{ marginTop: 12, textAlign: "center", fontSize: 11, fontFamily: "var(--mono)", color: "var(--accent)" }}>Current plan</div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* License key */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
                <span style={{ fontSize: 10, fontFamily: "var(--mono)", color: "var(--sub)" }}>have a license key?</span>
                <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  value={keyInput}
                  onChange={e => setKeyInput(e.target.value)}
                  placeholder="Paste your license key..."
                  style={{ flex: 1, padding: "10px 14px", borderRadius: 10, background: "var(--input-bg)", border: "1.5px solid var(--border)", color: "var(--input-text)", fontSize: 12, fontFamily: "var(--mono)" }}
                  onKeyDown={e => { if (e.key === "Enter") activateKey(); }}
                />
                <button onClick={() => activateKey()} disabled={keyLoading || !keyInput.trim()} style={{
                  padding: "10px 16px", borderRadius: 10, fontSize: 12, fontFamily: "var(--ui)", fontWeight: 600,
                  border: "none", background: "var(--accent)", color: "#fff", cursor: "pointer",
                  opacity: (keyLoading || !keyInput.trim()) ? 0.5 : 1,
                }}>{keyLoading ? "..." : "Activate"}</button>
              </div>
              {keyError && <p style={{ fontSize: 11, color: "var(--accent)", fontFamily: "var(--ui)", marginTop: 6 }}>{keyError}</p>}

              <button onClick={() => setShowUpgrade(false)} style={{
                display: "block", margin: "20px auto 0", background: "none", border: "none",
                color: "var(--sub)", fontSize: 12, fontFamily: "var(--ui)", cursor: "pointer",
              }}>Maybe later</button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
