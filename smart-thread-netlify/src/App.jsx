import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "./supabaseClient";

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
    label: "Story", desc: "Personal moment", tier: "seed",
    formulas: [
      { t: "I was {doing} when {event}...", f: [{ k: "doing", l: "What were you doing?", s: ["scrolling Twitter", "about to quit my job", "in a meeting"] }, { k: "event", l: "What happened?", s: ["I got a DM", "everything changed", "I saw a number that scared me"] }] },
      { t: "3 years ago I {action}. Today, {result}.", f: [{ k: "action", l: "What did you do?", s: ["started posting daily", "quit my 9-5", "launched a product"] }, { k: "result", l: "What's the result?", s: ["6-figure business", "50K followers", "never looked back"] }] },
      { t: "Nobody told me {truth} when I started {activity}.", f: [{ k: "truth", l: "What truth?", s: ["it would take 2 years", "the first 100 are hardest", "most advice is wrong"] }, { k: "activity", l: "Started what?", s: ["building in public", "freelancing", "creating content"] }] },
      { t: "I lost {something} before I figured out {lesson}.", f: [{ k: "something", l: "Lost what?", s: ["$10K", "6 months", "my biggest client"] }, { k: "lesson", l: "Learned what?", s: ["how to grow", "what really matters", "the one thing that works"] }] },
      { t: "The day I {moment}, everything clicked.", f: [{ k: "moment", l: "What moment?", s: ["stopped copying others", "deleted my calendar", "got my first client"] }] },
      { t: "Here's a secret about {topic}: {insight}.", f: [{ k: "topic", l: "Topic?", s: ["growing on X", "making money online", "building a brand"] }, { k: "insight", l: "The secret?", s: ["nobody talks about the boring middle", "it's simpler than you think", "most people overcomplicate it"] }] },
      { t: "I almost {gave_up} because {reason}. Glad I didn't.", f: [{ k: "gave_up", l: "Almost what?", s: ["quit", "deleted everything", "gave up on content"] }, { k: "reason", l: "Why?", s: ["no one was watching", "I felt like a fraud", "the algorithm buried me"] }] },
      { t: "My {person} told me \"{quote}\". It changed everything.", f: [{ k: "person", l: "Who?", s: ["mentor", "first customer", "cofounder"] }, { k: "quote", l: "What they said?", s: ["stop overthinking and ship it", "your audience is smaller than you think", "charge more"] }] },
      { t: "The biggest mistake I made in {year}: {mistake}.", f: [{ k: "year", l: "When?", s: ["2023", "my first year", "Q1"] }, { k: "mistake", l: "What mistake?", s: ["not starting sooner", "chasing vanity metrics", "copying competitors"] }] },
      { t: "This is the story of how I {achievement} with {constraint}.", f: [{ k: "achievement", l: "Did what?", s: ["built a 6-figure business", "grew to 10K", "landed my dream clients"] }, { k: "constraint", l: "With what limit?", s: ["zero budget", "no audience", "a full-time job"] }] },
    ]
  },
  bold: {
    label: "Bold claim", desc: "Hot take", tier: "seed",
    formulas: [
      { t: "{claim}. And I'll prove it.", f: [{ k: "claim", l: "Your bold claim?", s: ["Most marketing advice is garbage", "You don't need a niche", "Consistency is overrated"] }] },
      { t: "{thing} is dead. Here's what replaced it.", f: [{ k: "thing", l: "What's dead?", s: ["Content calendars", "SEO blogging", "Cold outreach"] }] },
      { t: "Stop {bad}. It's costing you {cost}.", f: [{ k: "bad", l: "Stop what?", s: ["posting without strategy", "chasing followers"] }, { k: "cost", l: "Costing?", s: ["real growth", "thousands of dollars", "your credibility"] }] },
      { t: "Unpopular opinion: {opinion}.", f: [{ k: "opinion", l: "Your opinion?", s: ["Post less, not more", "Engagement pods destroy reach", "Followers don't equal revenue"] }] },
      { t: "Delete {thing} from your strategy. Thank me later.", f: [{ k: "thing", l: "Delete what?", s: ["your content calendar", "hashtags", "follow-for-follow"] }] },
      { t: "If you're still {old_way}, you're leaving {value} on the table.", f: [{ k: "old_way", l: "Still doing?", s: ["posting without a hook", "writing threads manually", "ignoring DMs"] }, { k: "value", l: "Leaving what?", s: ["money", "growth", "opportunities"] }] },
      { t: "The {industry} industry doesn't want you to know {secret}.", f: [{ k: "industry", l: "Which industry?", s: ["coaching", "marketing", "SaaS"] }, { k: "secret", l: "What secret?", s: ["most courses are recycled content", "organic beats paid every time", "you only need 100 true fans"] }] },
      { t: "I'd rather {unpopular} than {popular}.", f: [{ k: "unpopular", l: "Rather do?", s: ["have 500 engaged followers", "post once a week well", "build slowly"] }, { k: "popular", l: "Than?", s: ["10K ghost followers", "post daily garbage", "go viral once and fade"] }] },
      { t: "{number}% of {group} fail because {reason}.", f: [{ k: "number", l: "What %?", s: ["90", "95", "80"] }, { k: "group", l: "Who?", s: ["creators", "startups", "newsletters"] }, { k: "reason", l: "Why?", s: ["they quit in month 3", "they never find their voice", "they copy instead of create"] }] },
      { t: "You don't have a {problem} problem. You have a {real} problem.", f: [{ k: "problem", l: "Not this?", s: ["content", "audience", "monetization"] }, { k: "real", l: "Actually this?", s: ["clarity", "positioning", "patience"] }] },
    ]
  },
  question: {
    label: "Question", desc: "Open with curiosity", tier: "grow",
    formulas: [
      { t: "Why do {people} keep {mistake}?", f: [{ k: "people", l: "Who?", s: ["creators", "founders", "marketers"] }, { k: "mistake", l: "Keep doing what?", s: ["undercharging", "ignoring DMs", "posting without a goal"] }] },
      { t: "What if {assumption} is actually wrong?", f: [{ k: "assumption", l: "What assumption?", s: ["posting daily grows you", "you need a big audience", "niching down limits you"] }] },
      { t: "Have you noticed {observation}? There's a reason.", f: [{ k: "observation", l: "What?", s: ["top creators post less now", "engagement is dropping everywhere"] }] },
      { t: "Why does nobody talk about {topic}?", f: [{ k: "topic", l: "What topic?", s: ["mental health of building in public", "how much luck matters"] }] },
      { t: "Is {thing} even worth it anymore?", f: [{ k: "thing", l: "What?", s: ["Twitter/X", "building a newsletter", "long-form content"] }] },
      { t: "What separates {winners} from {losers} in {space}?", f: [{ k: "winners", l: "Winners?", s: ["the top 1%", "creators who monetize", "viral accounts"] }, { k: "losers", l: "Everyone else?", s: ["everyone else", "the 99%", "burnout cases"] }, { k: "space", l: "What space?", s: ["content creation", "SaaS", "freelancing"] }] },
      { t: "Would you rather have {optionA} or {optionB}?", f: [{ k: "optionA", l: "Option A?", s: ["1M followers and $0", "one viral post", "a perfect funnel"] }, { k: "optionB", l: "Option B?", s: ["1K true fans who buy", "100 posts that convert", "10 paying clients"] }] },
      { t: "What's the one thing you'd tell your {past_self} about {topic}?", f: [{ k: "past_self", l: "Past self when?", s: ["day-1", "pre-launch", "broke"] }, { k: "topic", l: "About?", s: ["growing online", "building a business", "content strategy"] }] },
      { t: "Am I the only one who thinks {hot_take}?", f: [{ k: "hot_take", l: "Your hot take?", s: ["most threads are filler", "engagement bait is killing X", "AI content is obvious"] }] },
      { t: "How did {person_type} convince us that {myth}?", f: [{ k: "person_type", l: "Who?", s: ["gurus", "course sellers", "influencers"] }, { k: "myth", l: "What myth?", s: ["you need to post daily", "passive income is easy", "followers = success"] }] },
    ]
  },
  stat: {
    label: "Data point", desc: "Hook with a number", tier: "grow",
    formulas: [
      { t: "{stat}. Here's what nobody tells you.", f: [{ k: "stat", l: "Your stat?", s: ["73% of startups fail in year 1", "The average creator makes $0"] }] },
      { t: "I tracked {metric} for {time}. Results surprised me.", f: [{ k: "metric", l: "Metric?", s: ["my engagement", "every post", "my income sources"] }, { k: "time", l: "How long?", s: ["30 days", "6 months", "a year"] }] },
      { t: "I went from {before} to {after} in {time}.", f: [{ k: "before", l: "From?", s: ["0", "500 followers", "$0/mo"] }, { k: "after", l: "To?", s: ["10K", "$10K/mo", "fully booked"] }, { k: "time", l: "In?", s: ["6 months", "90 days"] }] },
      { t: "This one change gave me {result}. The data:", f: [{ k: "result", l: "What result?", s: ["3x more replies", "doubled followers", "first $5K month"] }] },
      { t: "{time} of data. {number} posts. Here's what works.", f: [{ k: "time", l: "How long?", s: ["1 year", "6 months"] }, { k: "number", l: "How many?", s: ["500+", "300", "1000+"] }] },
      { t: "I analyzed {number} {things}. The top {percent}% all did this:", f: [{ k: "number", l: "How many?", s: ["500", "1,000", "200"] }, { k: "things", l: "What?", s: ["viral tweets", "successful launches", "creator businesses"] }, { k: "percent", l: "Top %?", s: ["1", "5", "10"] }] },
      { t: "My {metric} was {bad}. {time} later, it's {good}. Here's the system:", f: [{ k: "metric", l: "What metric?", s: ["engagement rate", "MRR", "email open rate"] }, { k: "bad", l: "Started at?", s: ["0.5%", "$0", "12%"] }, { k: "time", l: "How long?", s: ["6 months", "1 year"] }, { k: "good", l: "Now?", s: ["8.2%", "$10K", "45%"] }] },
      { t: "{number} out of {total} {group} make this mistake:", f: [{ k: "number", l: "How many?", s: ["9", "8", "7"] }, { k: "total", l: "Out of?", s: ["10", "10", "10"] }, { k: "group", l: "Who?", s: ["founders", "freelancers", "content creators"] }] },
      { t: "The math behind {topic} that nobody shows you:", f: [{ k: "topic", l: "What topic?", s: ["a $10K/mo newsletter", "viral growth", "course launches"] }] },
      { t: "I spent {cost} on {thing}. ROI: {result}.", f: [{ k: "cost", l: "How much?", s: ["$500", "$2,000", "100 hours"] }, { k: "thing", l: "On what?", s: ["Twitter ads", "a ghostwriter", "a course"] }, { k: "result", l: "Return?", s: ["10x in 60 days", "50 new clients", "$0 (here's why)"] }] },
    ]
  },
  contrarian: {
    label: "Contrarian", desc: "Challenge the norm", tier: "grow",
    formulas: [
      { t: "Everyone says {common}. They're wrong.", f: [{ k: "common", l: "Common belief?", s: ["post every day", "niche down", "follow trends"] }] },
      { t: "Worst advice I followed: \"{advice}\"", f: [{ k: "advice", l: "What advice?", s: ["Fake it till you make it", "Just provide value", "Be consistent"] }] },
      { t: "I stopped {action} and {result}.", f: [{ k: "action", l: "Stopped what?", s: ["posting daily", "using hashtags", "caring about likes"] }, { k: "result", l: "What happened?", s: ["growth exploded", "got best clients", "found my voice"] }] },
      { t: "You don't need {thing}. You need {real}.", f: [{ k: "thing", l: "Don't need?", s: ["more followers", "a fancy website", "another course"] }, { k: "real", l: "Actually need?", s: ["one clear offer", "10 real fans", "to just start"] }] },
      { t: "{popular} is a trap. Do {alt} instead.", f: [{ k: "popular", l: "What's a trap?", s: ["Engagement pods", "Viral content", "Hustle mentality"] }, { k: "alt", l: "Do what?", s: ["build in silence", "focus on depth", "rest more"] }] },
      { t: "The {thing} everyone copies is actually {truth}.", f: [{ k: "thing", l: "What thing?", s: ["listicle format", "motivational posts", "DM funnels"] }, { k: "truth", l: "Actually?", s: ["the weakest strategy", "killing your brand", "outdated since 2022"] }] },
      { t: "Hot take: {belief} is doing more harm than {alternative}.", f: [{ k: "belief", l: "What belief?", s: ["hustle culture", "grow at all costs", "content batching"] }, { k: "alternative", l: "More harm than?", s: ["doing nothing", "posting randomly", "taking a break"] }] },
      { t: "I broke every \"rule\" of {space} and {outcome}.", f: [{ k: "space", l: "Which space?", s: ["content creation", "personal branding", "SaaS marketing"] }, { k: "outcome", l: "What happened?", s: ["tripled my income", "found my audience", "finally enjoyed the work"] }] },
      { t: "The {guru} playbook is broken. Here's proof:", f: [{ k: "guru", l: "Whose playbook?", s: ["growth hacker", "LinkedIn influencer", "productivity guru"] }] },
      { t: "Controversial: {stance}. And I have receipts.", f: [{ k: "stance", l: "Your stance?", s: ["Short-form content is a waste", "You should ignore engagement rate", "Building in public is overrated"] }] },
    ]
  },
  lesson: {
    label: "Lesson", desc: "Teach from experience", tier: "scale",
    formulas: [
      { t: "In {time} of {doing}, the biggest lesson: {lesson}.", f: [{ k: "time", l: "How long?", s: ["5 years", "3 years", "18 months"] }, { k: "doing", l: "Doing what?", s: ["running a business", "creating content", "freelancing"] }, { k: "lesson", l: "Biggest lesson?", s: ["simplicity wins", "distribution > creation", "relationships are everything"] }] },
      { t: "If I could only teach one thing about {topic}: {lesson}.", f: [{ k: "topic", l: "About?", s: ["growing online", "making money", "content"] }, { k: "lesson", l: "One thing?", s: ["be consistent for 6 months before judging", "your offer matters more than your content", "write for one person"] }] },
      { t: "{number} lessons from {source} that I wish I knew sooner:", f: [{ k: "number", l: "How many?", s: ["7", "10", "5"] }, { k: "source", l: "From?", s: ["building in public", "losing $50K", "interviewing 100 founders"] }] },
      { t: "The hard truth about {topic} nobody prepares you for:", f: [{ k: "topic", l: "What?", s: ["going viral", "quitting your job", "launching a product"] }] },
      { t: "After {milestone}, here's what I know for sure:", f: [{ k: "milestone", l: "After what?", s: ["10K followers", "hitting $10K MRR", "100 clients"] }] },
      { t: "I paid {cost} to learn this about {topic}:", f: [{ k: "cost", l: "What cost?", s: ["$20K", "2 years", "my reputation"] }, { k: "topic", l: "About what?", s: ["marketing", "hiring", "content strategy"] }] },
      { t: "Read this before you {action}. Seriously.", f: [{ k: "action", l: "Before?", s: ["launch your course", "quit your job", "hire a VA"] }] },
      { t: "The difference between {amateur} and {pro} in {field}:", f: [{ k: "amateur", l: "Amateurs?", s: ["beginners", "hobbyists", "wantrepreneurs"] }, { k: "pro", l: "Pros?", s: ["6-figure creators", "full-time freelancers", "profitable founders"] }, { k: "field", l: "In?", s: ["content", "business", "marketing"] }] },
      { t: "What {years} years in {industry} taught me about {truth}:", f: [{ k: "years", l: "How many?", s: ["3", "5", "10"] }, { k: "industry", l: "What?", s: ["tech", "marketing", "e-commerce"] }, { k: "truth", l: "About?", s: ["what actually moves the needle", "the only metric that matters", "building a real moat"] }] },
      { t: "Stop learning. Start {doing}. Here's why:", f: [{ k: "doing", l: "Start what?", s: ["shipping", "publishing", "selling"] }] },
    ]
  },
  framework: {
    label: "Framework", desc: "Give a system", tier: "scale",
    formulas: [
      { t: "The {name} framework for {goal}:", f: [{ k: "name", l: "Name it?", s: ["3-2-1", "FIRE", "ABS"] }, { k: "goal", l: "For what?", s: ["writing viral hooks", "growing to 10K", "monetizing your audience"] }] },
      { t: "How I {result} using a simple {number}-step system:", f: [{ k: "result", l: "Did what?", s: ["5x'd my engagement", "built a $10K/mo business", "grew 1K followers/week"] }, { k: "number", l: "Steps?", s: ["3", "5", "4"] }] },
      { t: "My {cadence} system for {outcome}. Steal it:", f: [{ k: "cadence", l: "What cadence?", s: ["daily", "weekly", "morning"] }, { k: "outcome", l: "For what?", s: ["never running out of content ideas", "consistent posting", "building in public"] }] },
      { t: "The exact template I use for every {content_type}:", f: [{ k: "content_type", l: "What type?", s: ["thread", "newsletter", "sales page", "cold DM"] }] },
      { t: "How to {goal} in {time} (step-by-step):", f: [{ k: "goal", l: "How to?", s: ["get your first 1K followers", "launch a product", "land freelance clients"] }, { k: "time", l: "In how long?", s: ["30 days", "one week", "90 days"] }] },
      { t: "I reverse-engineered {person}'s strategy. Here's the playbook:", f: [{ k: "person", l: "Whose?", s: ["the top creators", "every viral account", "7-figure course sellers"] }] },
      { t: "The {adjective} content system that {result}:", f: [{ k: "adjective", l: "What kind?", s: ["lazy", "1-hour/week", "no-BS"] }, { k: "result", l: "That does what?", s: ["grows you on autopilot", "converts followers to buyers", "saves 10 hours/week"] }] },
      { t: "My {tool} stack for {goal}. Total cost: {cost}.", f: [{ k: "tool", l: "What tools?", s: ["content", "marketing", "automation"] }, { k: "goal", l: "For?", s: ["running a one-person business", "growing on X", "managing clients"] }, { k: "cost", l: "Cost?", s: ["$0", "$47/mo", "under $100"] }] },
      { t: "The {concept} method: How I {result} without {sacrifice}.", f: [{ k: "concept", l: "Name it?", s: ["compounding", "minimum viable", "80/20"] }, { k: "result", l: "Did what?", s: ["doubled revenue", "hit 10K followers", "went full-time"] }, { k: "sacrifice", l: "Without?", s: ["burnout", "ads", "a team"] }] },
      { t: "Blueprint: {goal} from scratch in {time}.", f: [{ k: "goal", l: "What?", s: ["Profitable newsletter", "Personal brand", "Course business"] }, { k: "time", l: "Timeline?", s: ["90 days", "6 months", "one quarter"] }] },
    ]
  },
  vulnerability: {
    label: "Vulnerable", desc: "Radical honesty", tier: "scale",
    formulas: [
      { t: "I'm going to be honest about {topic} even if it hurts:", f: [{ k: "topic", l: "About what?", s: ["my revenue", "my mental health", "my failures this year"] }] },
      { t: "I pretended to {facade} but the truth is {reality}.", f: [{ k: "facade", l: "Pretended to?", s: ["have it figured out", "love the hustle", "be confident"] }, { k: "reality", l: "Truth?", s: ["I was drowning", "I was faking it", "I almost quit"] }] },
      { t: "Behind every {success} is {struggle} nobody sees.", f: [{ k: "success", l: "Success?", s: ["viral post", "sold-out launch", "revenue milestone"] }, { k: "struggle", l: "Struggle?", s: ["months of silence", "3 failed attempts", "crippling self-doubt"] }] },
      { t: "Confession: I {admission}. Here's what I learned.", f: [{ k: "admission", l: "What?", s: ["burned out and disappeared for 3 months", "launched and got zero sales", "had an audience but no income"] }] },
      { t: "I need to talk about the {dark_side} of {glamorous}.", f: [{ k: "dark_side", l: "Dark side?", s: ["loneliness", "anxiety", "financial stress"] }, { k: "glamorous", l: "Of what?", s: ["solopreneurship", "building in public", "creator life"] }] },
      { t: "Everyone shows the wins. Here's my {failure} story:", f: [{ k: "failure", l: "What failure?", s: ["biggest", "most embarrassing", "most expensive"] }] },
      { t: "I was {state} when I wrote this. And that's okay.", f: [{ k: "state", l: "What state?", s: ["scared", "uncertain about everything", "questioning all my choices"] }] },
      { t: "The part about {journey} nobody posts about:", f: [{ k: "journey", l: "What journey?", s: ["quitting your 9-5", "going from 0 to 10K", "your first $100K year"] }] },
      { t: "My {thing} isn't perfect. Neither am I. Thread:", f: [{ k: "thing", l: "What thing?", s: ["business", "content", "routine", "marriage"] }] },
      { t: "This will probably lose me followers. But {topic}.", f: [{ k: "topic", l: "But what?", s: ["someone needs to hear it", "I can't stay silent", "honesty > growth hacks"] }] },
    ]
  },
  listicle: {
    label: "Listicle", desc: "Numbered value bombs", tier: "dominate",
    formulas: [
      { t: "{number} {things} that will {outcome} in {time}:", f: [{ k: "number", l: "How many?", s: ["10", "7", "15"] }, { k: "things", l: "What?", s: ["tools", "habits", "strategies"] }, { k: "outcome", l: "Outcome?", s: ["10x your output", "change your business", "save you hours"] }, { k: "time", l: "When?", s: ["2025", "this quarter", "30 days"] }] },
      { t: "{number} {things} I'd tell my {self} about {topic}:", f: [{ k: "number", l: "How many?", s: ["10", "7", "5"] }, { k: "things", l: "What?", s: ["rules", "truths", "pieces of advice"] }, { k: "self", l: "Which self?", s: ["younger self", "day-1 self", "broke self"] }, { k: "topic", l: "About?", s: ["money", "content", "building a brand"] }] },
      { t: "Bookmark this: {number} {resources} for {audience}.", f: [{ k: "number", l: "How many?", s: ["20", "15", "12"] }, { k: "resources", l: "What?", s: ["free tools", "websites", "accounts to follow"] }, { k: "audience", l: "For who?", s: ["creators", "founders", "freelancers"] }] },
      { t: "{number} ways to {goal} (most people only know 2):", f: [{ k: "number", l: "How many?", s: ["8", "10", "6"] }, { k: "goal", l: "Goal?", s: ["monetize your X account", "get inbound leads", "repurpose one piece of content"] }] },
      { t: "I spent {time} compiling {number} {things}. Here they are:", f: [{ k: "time", l: "How long?", s: ["50 hours", "a month", "all year"] }, { k: "number", l: "How many?", s: ["100", "50", "30"] }, { k: "things", l: "What?", s: ["growth hacks", "tweet templates", "business lessons"] }] },
      { t: "The {number} non-negotiables of {topic}:", f: [{ k: "number", l: "How many?", s: ["5", "7", "3"] }, { k: "topic", l: "Of what?", s: ["a profitable personal brand", "a high-converting thread", "a sustainable content habit"] }] },
      { t: "{number} signs you're {state}. And what to do:", f: [{ k: "number", l: "How many?", s: ["7", "5", "10"] }, { k: "state", l: "What state?", s: ["burning out", "stuck in a rut", "undercharging"] }] },
      { t: "The only {number} {things} you need to {goal}:", f: [{ k: "number", l: "How many?", s: ["3", "5", "4"] }, { k: "things", l: "What?", s: ["tools", "skills", "habits"] }, { k: "goal", l: "To?", s: ["go full-time creator", "hit $10K/mo", "build a real audience"] }] },
      { t: "{number} underrated {things} that {benefit}:", f: [{ k: "number", l: "How many?", s: ["8", "12", "6"] }, { k: "things", l: "What?", s: ["content strategies", "free tools", "growth tactics"] }, { k: "benefit", l: "That?", s: ["nobody talks about", "actually work in 2025", "I use daily"] }] },
      { t: "Save this thread. {number} {things} you'll need for {goal}:", f: [{ k: "number", l: "How many?", s: ["15", "10", "20"] }, { k: "things", l: "What?", s: ["prompts", "templates", "scripts"] }, { k: "goal", l: "For?", s: ["writing better hooks", "closing clients", "launching products"] }] },
    ]
  },
  metaphor: {
    label: "Metaphor", desc: "Unexpected analogy", tier: "dominate",
    formulas: [
      { t: "Building a brand is like {metaphor}. Here's why:", f: [{ k: "metaphor", l: "Like what?", s: ["planting a garden", "cooking a meal", "training for a marathon"] }] },
      { t: "{concept} is the {metaphor} of {space}.", f: [{ k: "concept", l: "What concept?", s: ["Content", "Your network", "Distribution"] }, { k: "metaphor", l: "The what?", s: ["compound interest", "cheat code", "secret weapon"] }, { k: "space", l: "Of what?", s: ["personal branding", "startups", "the creator economy"] }] },
      { t: "Your {thing} is a {object}. Most people use it wrong.", f: [{ k: "thing", l: "Your what?", s: ["bio", "content strategy", "DMs"] }, { k: "object", l: "A what?", s: ["storefront window", "GPS", "Swiss Army knife"] }] },
      { t: "Think of {concept} like a {metaphor}:", f: [{ k: "concept", l: "What?", s: ["the algorithm", "audience building", "pricing"] }, { k: "metaphor", l: "Like a?", s: ["first date", "campfire", "snowball"] }] },
      { t: "Imagine {scenario}. That's exactly what {reality} feels like.", f: [{ k: "scenario", l: "Imagine?", s: ["shouting in an empty room", "building a plane mid-flight", "cooking with no recipe"] }, { k: "reality", l: "What's like that?", s: ["posting with no strategy", "launching a startup", "creating content daily"] }] },
      { t: "{activity} taught me everything about {business_thing}.", f: [{ k: "activity", l: "What activity?", s: ["Chess", "Running", "Cooking"] }, { k: "business_thing", l: "About?", s: ["strategy", "building a brand", "patience in business"] }] },
      { t: "Your {business_thing} is either a {good} or a {bad}. Choose.", f: [{ k: "business_thing", l: "Your what?", s: ["content", "offer", "brand"] }, { k: "good", l: "Either a?", s: ["magnet", "lighthouse", "bridge"] }, { k: "bad", l: "Or a?", s: ["megaphone into the void", "locked door", "wall"] }] },
      { t: "Stop building a {wrong}. Start building a {right}.", f: [{ k: "wrong", l: "Stop building?", s: ["resume", "billboard", "factory"] }, { k: "right", l: "Start building?", s: ["playground", "community", "conversation"] }] },
      { t: "The {field} world has a {object} problem:", f: [{ k: "field", l: "What field?", s: ["creator", "startup", "coaching"] }, { k: "object", l: "What problem?", s: ["microwave", "treadmill", "echo chamber"] }] },
      { t: "{concept} is not a sprint. It's a {metaphor}.", f: [{ k: "concept", l: "What?", s: ["Growth", "Brand building", "Content"] }, { k: "metaphor", l: "It's a?", s: ["jazz solo", "garden", "slow burn"] }] },
    ]
  },
  reveal: {
    label: "Cultural reveal", desc: "You did X. You missed Y.", tier: "grow",
    formulas: [
      { t: "You {action} to {person}. They {response}. Polite. Forgettable. But what they actually {did} was {deeper}. And you missed it.", f: [{ k: "action", l: "You did what?", s: ["said thank you", "introduced yourself", "sent a message"] }, { k: "person", l: "To who?", s: ["your colleague", "the host", "a new contact"] }, { k: "response", l: "They what?", s: ["smiled", "nodded", "replied politely"] }, { k: "did", l: "Actually did?", s: ["said", "meant", "offered"] }, { k: "deeper", l: "What deeper?", s: ["a blessing", "an invitation", "a test"] }] },
      { t: "You walk into {place}. You {mistake}. Nobody says anything. But everyone noticed. And not understanding this is costing you {cost}.", f: [{ k: "place", l: "Where?", s: ["a meeting", "someone's home", "a networking event"] }, { k: "mistake", l: "You do what?", s: ["skip the greeting", "sit in the wrong seat", "check your phone"] }, { k: "cost", l: "Costing you?", s: ["trust", "relationships", "opportunities"] }] },
      { t: "{person} has known you for {time}. You're {quality}. But one day you {action}. And something shifts. I've watched this happen dozens of times.", f: [{ k: "person", l: "Who?", s: ["Your boss", "Your client", "Your neighbor"] }, { k: "time", l: "How long?", s: ["two years", "months", "a while"] }, { k: "quality", l: "You're?", s: ["reliable", "professional", "competent"] }, { k: "action", l: "You do what?", s: ["speak their language", "remember a detail about their family", "show up with a thoughtful gift"] }] },
      { t: "You say '{phrase}' to {person}. They smile. Nod. Move on. Polite. Expected. You said the words. But you didn't say anything. Here's what actually lands:", f: [{ k: "phrase", l: "What phrase?", s: ["thank you", "nice to meet you", "congratulations"] }, { k: "person", l: "To who?", s: ["a local", "your host", "a new contact"] }] },
      { t: "{person} tells you '{invite}'. You get excited. You wait. It never happens. You think they were being fake. They weren't. And not understanding this is one of the biggest mistakes {group} make.", f: [{ k: "person", l: "Who?", s: ["A local", "Your colleague", "A new friend"] }, { k: "invite", l: "They say?", s: ["you must come for dinner", "let's do coffee sometime", "we should collaborate"] }, { k: "group", l: "Who makes this mistake?", s: ["newcomers", "expats", "outsiders"] }] },
      { t: "Your {person} just {event}. You send a text: '{message}.' They reply: 'Thank you.' That's it. But if you knew what {culture} actually say, that text becomes {deeper}.", f: [{ k: "person", l: "Who?", s: ["colleague", "neighbor", "friend"] }, { k: "event", l: "What happened?", s: ["had a baby", "got promoted", "got married"] }, { k: "message", l: "Your text?", s: ["Congratulations!", "So happy for you!", "Amazing news!"] }, { k: "culture", l: "Who?", s: ["locals", "the culture", "people here"] }, { k: "deeper", l: "Becomes?", s: ["a blessing", "an honor", "something they remember"] }] },
      { t: "You've been doing {thing} for {time}. {audience} don't do it that way. Here's what they actually do:", f: [{ k: "thing", l: "Doing what?", s: ["greeting people", "saying yes", "making small talk"] }, { k: "time", l: "For how long?", s: ["years", "months", "your whole life"] }, { k: "audience", l: "Who doesn't?", s: ["Locals", "The culture", "People here"] }] },
      { t: "{group} name their {things} after {surprising}. Not as {wrong}. As {right}. And once you understand why, you'll never {action} the same way again.", f: [{ k: "group", l: "Who?", s: ["Arabs", "Japanese", "Brazilians"] }, { k: "things", l: "Name what?", s: ["their kids", "their businesses", "their traditions"] }, { k: "surprising", l: "After what?", s: ["animals", "elements", "ancestors"] }, { k: "wrong", l: "Not as?", s: ["insults", "jokes", "random choices"] }, { k: "right", l: "But as?", s: ["aspirations", "blessings", "legacies"] }, { k: "action", l: "Never what?", s: ["hear these names", "see this tradition", "think about it"] }] },
      { t: "You {simple_action}. Technically correct. But it lands flat. There's a {thing} that carries {weight} of meaning. And it changes everything.", f: [{ k: "simple_action", l: "You do what?", s: ["call them by name", "say good morning", "make your introduction"] }, { k: "thing", l: "A what?", s: ["word", "gesture", "phrase"] }, { k: "weight", l: "Carries what?", s: ["centuries", "generations", "layers"] }] },
      { t: "Before {modern}, '{wordA}' and '{wordB}' were {connection}. Some things don't need explanation.", f: [{ k: "modern", l: "Before what?", s: ["the modern era", "things changed", "we forgot"] }, { k: "wordA", l: "Word A?", s: ["partner", "home", "heart"] }, { k: "wordB", l: "Word B?", s: ["soul", "peace", "love"] }, { k: "connection", l: "Were what?", s: ["written the same way", "the same word", "interchangeable"] }] },
    ]
  },
  reframe: {
    label: "Reframe", desc: "Flip their assumption", tier: "scale",
    formulas: [
      { t: "You think {assumption}. But actually {truth}. And this changes everything about how you should {action}.", f: [{ k: "assumption", l: "They think?", s: ["it's about the words", "more is better", "speed matters most"] }, { k: "truth", l: "Actually?", s: ["it's about the timing", "less hits harder", "patience is the edge"] }, { k: "action", l: "How to?", s: ["approach this", "build your strategy", "show up"] }] },
      { t: "Everyone focuses on the {obvious}. The real {thing} happens in the {hidden}.", f: [{ k: "obvious", l: "The obvious?", s: ["content", "pitch", "first impression"] }, { k: "thing", l: "Real what?", s: ["connection", "deal", "trust"] }, { k: "hidden", l: "In the?", s: ["follow-up", "silence after", "small details"] }] },
      { t: "You didn't {fail}. You {reframe}. And there's a massive difference.", f: [{ k: "fail", l: "Didn't what?", s: ["get ignored", "lose the client", "fail to grow"] }, { k: "reframe", l: "You actually?", s: ["filtered out the wrong people", "dodged a bullet", "planted a seed"] }] },
      { t: "The {thing} isn't what you think. It's not about {wrong}. It's about {right}.", f: [{ k: "thing", l: "The what?", s: ["algorithm", "networking", "personal brand"] }, { k: "wrong", l: "Not about?", s: ["going viral", "knowing people", "looking polished"] }, { k: "right", l: "About?", s: ["being remembered", "being useful", "being real"] }] },
      { t: "There are two types of {thing}: {typeA} and {typeB}. Most people do {typeA}. The {winners} do {typeB}.", f: [{ k: "thing", l: "Two types of?", s: ["networkers", "content creators", "leaders"] }, { k: "typeA", l: "Type A?", s: ["collectors", "broadcasters", "managers"] }, { k: "typeB", l: "Type B?", s: ["connectors", "conversationalists", "builders"] }, { k: "winners", l: "Who wins?", s: ["ones who last", "top 1%", "ones you remember"] }] },
      { t: "We've been measuring {thing} all wrong. It's not about {metric}. It's about {real_metric}.", f: [{ k: "thing", l: "Measuring what?", s: ["success", "engagement", "influence"] }, { k: "metric", l: "Not about?", s: ["followers", "likes", "revenue"] }, { k: "real_metric", l: "About?", s: ["replies from strangers", "DMs that start with 'this changed my thinking'", "repeat buyers"] }] },
      { t: "You don't need more {thing}. You need better {real}. Here's the difference:", f: [{ k: "thing", l: "More what?", s: ["content", "followers", "leads"] }, { k: "real", l: "Better what?", s: ["context", "conversations", "positioning"] }] },
      { t: "What looks like {negative} is actually {positive}. Let me explain:", f: [{ k: "negative", l: "Looks like?", s: ["low engagement", "slow growth", "silence"] }, { k: "positive", l: "Actually?", s: ["a loyal audience forming", "deep roots taking hold", "people processing your ideas"] }] },
      { t: "The moment you stop {chasing} and start {building}, {result}.", f: [{ k: "chasing", l: "Stop chasing?", s: ["virality", "new followers", "trends"] }, { k: "building", l: "Start building?", s: ["depth", "trust", "a body of work"] }, { k: "result", l: "What happens?", s: ["the right people find you", "growth becomes inevitable", "everything compounds"] }] },
      { t: "Counterintuitive: the best way to {goal} is to {opposite}.", f: [{ k: "goal", l: "Best way to?", s: ["get more followers", "close more deals", "grow faster"] }, { k: "opposite", l: "Is to?", s: ["post less", "talk about them, not you", "slow down and go deep"] }] },
    ]
  },
};

// Tier hierarchy for hook unlocking
const TIER_ORDER = ["seed", "grow", "scale", "dominate", "forever"];
function isTierUnlocked(userPlan, requiredTier) {
  return TIER_ORDER.indexOf(userPlan) >= TIER_ORDER.indexOf(requiredTier);
}

// ════════════════════════════════════════════════════════════
// LICENSE KEY SYSTEM — self-hosted, no Gumroad API needed
// Format: ST-{TIER}{DAYS}-{RANDOM6}-{CHECK2}
// Example: ST-GR030-A7K9M2-X4 (Grow, 30 days)
//          ST-FV000-B3H8N5-Y2 (Forever, permanent)
// ════════════════════════════════════════════════════════════

const TIER_CODES = { GR: "grow", SC: "scale", DM: "dominate", FV: "forever" };
const TIER_CODES_REV = { grow: "GR", scale: "SC", dominate: "DM", forever: "FV" };

function generateLicenseKey(tier, days) {
  const tc = TIER_CODES_REV[tier] || "GR";
  const dd = String(days).padStart(3, "0");
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let rand = "";
  for (let i = 0; i < 6; i++) rand += chars[Math.floor(Math.random() * chars.length)];
  // Simple checksum: sum of all char codes mod 32, mapped to 2 chars
  const all = `ST-${tc}${dd}-${rand}`;
  const sum = [...all].reduce((a, c) => a + c.charCodeAt(0), 0);
  const c1 = chars[sum % chars.length];
  const c2 = chars[(sum * 7) % chars.length];
  return `${all}-${c1}${c2}`;
}

function decodeLicenseKey(key) {
  // Validate format: ST-XX999-AAAAAA-AA
  const match = key.match(/^ST-([A-Z]{2})(\d{3})-([A-Z0-9]{6})-([A-Z0-9]{2})$/);
  if (!match) return null;
  const [, tierCode, daysStr, rand, check] = match;
  // Verify checksum
  const all = `ST-${tierCode}${daysStr}-${rand}`;
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const sum = [...all].reduce((a, c) => a + c.charCodeAt(0), 0);
  const c1 = chars[sum % chars.length];
  const c2 = chars[(sum * 7) % chars.length];
  if (check !== `${c1}${c2}`) return null;
  const tier = TIER_CODES[tierCode];
  if (!tier) return null;
  const days = parseInt(daysStr, 10);
  return { tier, days, isPermanent: days === 0 };
}

const LENGTHS = [
  { id: "single", label: "Single", desc: "1 tweet" },
  { id: "short", label: "Short", desc: "3-5" },
  { id: "medium", label: "Medium", desc: "6-8" },
  { id: "long", label: "Long", desc: "9-12" },
];

// ════════════════════════════════════════════════════════════
// PLANS & TIERS
// ════════════════════════════════════════════════════════════

const PLANS = {
  seed: {
    id: "seed",
    label: "Seed",
    color: "var(--sub)",
    bg: "var(--card)",
    border: "var(--border)",
    gens: 5,
    rewrites: 3,
    profiles: 1,
    features: ["5 generations/mo", "3 rewrites/day", "1 profile", "Basic hooks"],
    gumroadInstructions: [
      "1. Seed is the free starter tier — no purchase needed",
      "2. Create an account and start generating threads",
      "3. Upgrade anytime to unlock more power",
    ],
  },
  grow: {
    id: "grow",
    label: "Grow",
    color: "#34c472",
    bg: "rgba(52,196,114,0.08)",
    border: "rgba(52,196,114,0.2)",
    gens: 50,
    rewrites: 15,
    profiles: 3,
    features: ["50 generations/mo", "15 rewrites/day", "3 profiles", "All hook styles"],
    gumroadInstructions: [
      "1. Purchase the Grow plan on Gumroad",
      "2. Check your email for the license key",
      "3. Copy the key (format: XXXXX-XXXXX-XXXXX-XXXXX)",
      "4. Paste it in the License Key field above",
      "5. Click Activate — limits unlock instantly",
    ],
  },
  scale: {
    id: "scale",
    label: "Scale",
    color: "#e88a3a",
    bg: "rgba(232,138,58,0.08)",
    border: "rgba(232,138,58,0.2)",
    gens: 200,
    rewrites: 50,
    profiles: -1,
    features: ["200 generations/mo", "50 rewrites/day", "Unlimited profiles", "All hooks + priority"],
    gumroadInstructions: [
      "1. Purchase the Scale plan on Gumroad",
      "2. Check your email (including spam) for the receipt",
      "3. Your license key is on the receipt & in your Gumroad Library",
      "4. Copy the key (format: XXXXX-XXXXX-XXXXX-XXXXX)",
      "5. Paste it above and hit Activate",
      "6. Scale unlocks 200 gens/mo and unlimited profiles",
    ],
  },
  dominate: {
    id: "dominate",
    label: "Dominate",
    color: "#d4553a",
    bg: "rgba(212,85,58,0.08)",
    border: "rgba(212,85,58,0.2)",
    gens: 500,
    rewrites: -1,
    profiles: -1,
    features: ["500 generations/mo", "Unlimited rewrites", "Unlimited profiles", "Priority support"],
    gumroadInstructions: [
      "1. Purchase the Dominate plan on Gumroad",
      "2. Your license key is in your email receipt & Gumroad Library",
      "3. Copy: XXXXX-XXXXX-XXXXX-XXXXX",
      "4. Paste and Activate here",
      "5. Dominate = 500 gens/mo, unlimited rewrites & profiles",
    ],
  },
  forever: {
    id: "forever",
    label: "Forever",
    color: "#a855f7",
    bg: "rgba(168,85,247,0.08)",
    border: "rgba(168,85,247,0.2)",
    gens: -1,
    rewrites: -1,
    profiles: -1,
    features: ["Unlimited generations", "Unlimited rewrites", "Unlimited profiles", "Lifetime access"],
    gumroadInstructions: [
      "1. Purchase the Forever (lifetime) plan on Gumroad",
      "2. One-time payment — yours forever, no subscriptions",
      "3. License key arrives via email & your Gumroad Library",
      "4. Copy: XXXXX-XXXXX-XXXXX-XXXXX",
      "5. Paste and Activate — everything unlocked, forever",
    ],
  },
};

const GUMROAD_URL = "https://geebereal.gumroad.com/l/smartthread";

const SHARE_CAPTION = "I use Smart Thread to write viral X/Threads posts in seconds. The hook formulas are insane.\n\nTry it free → smartthread.net";

const REWARD_TASKS = [
  {
    id: "share_x",
    label: "Share on X",
    desc: "Post about Smart Thread on X (daily)",
    reward: 5,
    icon: "𝕏",
    shareUrl: `https://twitter.com/intent/tweet?text=${encodeURIComponent(SHARE_CAPTION)}`,
    daily: true,
  },
  {
    id: "share_threads",
    label: "Share on Threads",
    desc: "Post about Smart Thread on Threads (daily)",
    reward: 5,
    icon: "🧵",
    shareUrl: null,
    daily: true,
  },
  {
    id: "follow_threads",
    label: "Follow @geebereal",
    desc: "Follow the creator on Threads",
    reward: 10,
    icon: "✦",
    shareUrl: "https://www.threads.com/@geebereal",
    daily: true,
  },
];

const LANGUAGES = [
  { id: "en", label: "English", flag: "🇬🇧" },
  { id: "ar", label: "العربية", flag: "🇦🇪" },
  { id: "id", label: "Bahasa", flag: "🇮🇩" },
  { id: "es", label: "Español", flag: "🇪🇸" },
  { id: "fr", label: "Français", flag: "🇫🇷" },
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
// STORAGE — Hybrid: Supabase cloud + localStorage fallback
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

// Cloud sync helpers
async function cloudSaveAccount(userId, data) {
  if (!supabase || !userId) return;
  try {
    await supabase.from("user_accounts").update(data).eq("id", userId);
  } catch (e) { console.warn("Cloud save failed:", e); }
}

async function cloudLoadAccount(userId) {
  if (!supabase || !userId) return null;
  try {
    const { data } = await supabase.from("user_accounts").select("*").eq("id", userId).single();
    return data;
  } catch { return null; }
}

async function cloudSaveProfiles(userId, profiles) {
  if (!supabase || !userId) return;
  try {
    // Delete existing and re-insert (simple sync strategy)
    await supabase.from("profiles").delete().eq("user_id", userId);
    if (profiles.length > 0) {
      const rows = profiles.map(p => ({
        user_id: userId,
        name: p.name || null,
        handle: p.handle || null,
        niche: p.niche || null,
        audience: p.audience || null,
        voice: p.voice || null,
        avoid: p.avoid || null,
        example: p.example || null,
        icon: p.icon || "bolt",
      }));
      await supabase.from("profiles").insert(rows);
    }
  } catch (e) { console.warn("Cloud profiles save failed:", e); }
}

async function cloudLoadProfiles(userId) {
  if (!supabase || !userId) return null;
  try {
    const { data } = await supabase.from("profiles").select("*").eq("user_id", userId).order("created_at", { ascending: true });
    return data?.map(p => ({
      id: p.id,
      name: p.name,
      handle: p.handle,
      niche: p.niche,
      audience: p.audience,
      voice: p.voice,
      avoid: p.avoid,
      example: p.example,
      icon: p.icon,
      createdAt: p.created_at,
    })) || null;
  } catch { return null; }
}

async function cloudSaveHistory(userId, historyEntries) {
  if (!supabase || !userId) return;
  try {
    await supabase.from("thread_history").delete().eq("user_id", userId);
    if (historyEntries.length > 0) {
      const rows = historyEntries.slice(0, 50).map(h => ({
        user_id: userId,
        topic: h.topic || null,
        hook_id: h.hookId || null,
        thread_len: h.threadLen || null,
        cta_type: h.ctaType || null,
        tweets: h.tweets || [],
        profile_name: h.profileName || null,
        status: h.status || "drafted",
      }));
      await supabase.from("thread_history").insert(rows);
    }
  } catch (e) { console.warn("Cloud history save failed:", e); }
}

async function cloudLoadHistory(userId) {
  if (!supabase || !userId) return null;
  try {
    const { data } = await supabase.from("thread_history").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(50);
    return data?.map(h => ({
      id: h.id,
      topic: h.topic,
      hookId: h.hook_id,
      threadLen: h.thread_len,
      ctaType: h.cta_type,
      tweets: h.tweets,
      profileName: h.profile_name,
      status: h.status,
      createdAt: h.created_at,
    })) || null;
  } catch { return null; }
}


// ════════════════════════════════════════════════════════════
// AUTH SCREEN COMPONENT
// ════════════════════════════════════════════════════════════

function AuthScreen({ onAuth, theme, guestHitLimit, onBack }) {
  const [mode, setMode] = useState("login"); // login | signup | magic
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [magicSent, setMagicSent] = useState(false);

  const isDark = theme === "dark";

  // Detect in-app browsers (Threads, Instagram, Facebook, TikTok, etc.)
  const ua = typeof navigator !== "undefined" ? navigator.userAgent || "" : "";
  const isInAppBrowser = /Instagram|FBAN|FBAV|Threads|Line|Twitter|TikTok/i.test(ua);

  async function handleEmailAuth(e) {
    e.preventDefault();
    if (!supabase) return;
    setLoading(true);
    setError(null);
    try {
      let result;
      if (mode === "signup") {
        result = await supabase.auth.signUp({ email, password });
        if (result.error) throw result.error;
        if (result.data?.user && !result.data.session) {
          setError("Check your email to confirm your account, then log in.");
          setMode("login");
          setLoading(false);
          return;
        }
      } else {
        result = await supabase.auth.signInWithPassword({ email, password });
        if (result.error) throw result.error;
      }
      if (result.data?.session) onAuth(result.data.session);
    } catch (err) {
      setError(err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleMagicLink(e) {
    e.preventDefault();
    if (!supabase) return;
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithOtp({ email });
      if (error) throw error;
      setMagicSent(true);
    } catch (err) {
      setError(err.message || "Failed to send magic link");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    if (!supabase) return;
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.origin },
      });
      if (error) throw error;
    } catch (err) {
      setError(err.message || "Google sign-in failed");
      setLoading(false);
    }
  }

  const inputStyle = {
    width: "100%", padding: "12px 14px", borderRadius: 10, fontSize: 14,
    fontFamily: "'Satoshi', sans-serif",
    background: isDark ? "rgba(255,255,255,0.025)" : "rgba(0,0,0,0.03)",
    border: `1.5px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.08)"}`,
    color: isDark ? "#e4e4e8" : "#1a1a1e",
  };

  const btnPrimary = {
    width: "100%", padding: "13px 20px", borderRadius: 10, fontSize: 14,
    fontFamily: "'Satoshi', sans-serif", fontWeight: 700, border: "none",
    background: "linear-gradient(135deg, #d4553a, #e88a3a)", color: "#fff",
    cursor: loading ? "default" : "pointer", opacity: loading ? 0.6 : 1,
    boxShadow: "0 4px 24px rgba(212,85,58,0.2)",
  };

  const btnSecondary = {
    width: "100%", padding: "12px 20px", borderRadius: 10, fontSize: 13,
    fontFamily: "'Satoshi', sans-serif", fontWeight: 600,
    border: `1.5px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.08)"}`,
    background: "transparent", color: isDark ? "rgba(255,255,255,0.32)" : "rgba(0,0,0,0.4)",
    cursor: "pointer",
  };

  const linkStyle = {
    background: "none", border: "none", fontSize: 12,
    fontFamily: "'Satoshi', sans-serif", color: "#d4553a",
    cursor: "pointer", textDecoration: "underline",
  };

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: isDark ? "#07070a" : "#f5f3ef",
      color: isDark ? "#e4e4e8" : "#1a1a1e",
      padding: 20,
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Satoshi:wght@400;500;600;700;800&family=Instrument+Serif:ital@0;1&family=JetBrains+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        textarea:focus, input:focus { outline: none; }
        @keyframes fi { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .fi { animation: fi 0.3s ease both; }
      `}</style>

      <div className="fi" style={{ width: "100%", maxWidth: 380 }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center",
            background: "linear-gradient(135deg, #d4553a, #e88a3a)", margin: "0 auto 16px", overflow: "hidden",
          }}>
            <img src="/logo.png" alt="Smart Thread" style={{ width: 34, height: 34, filter: "brightness(0) invert(1)" }} />
          </div>
          <h1 style={{ fontFamily: "'Satoshi', sans-serif", fontWeight: 800, fontSize: 22, letterSpacing: "-0.5px" }}>Smart Thread</h1>
          <p style={{ fontFamily: "'Satoshi', sans-serif", fontSize: 15, marginTop: 4, color: isDark ? "rgba(255,255,255,0.32)" : "rgba(0,0,0,0.4)" }}>
            {guestHitLimit
              ? "Sign in to keep generating"
              : mode === "signup" ? "Create your account" : mode === "magic" ? "Sign in with email link" : "Welcome back"
            }
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="fi" style={{
            padding: "10px 14px", borderRadius: 10, marginBottom: 16, fontSize: 12,
            fontFamily: "'Satoshi', sans-serif", lineHeight: 1.5,
            background: "rgba(212,85,58,0.08)", border: "1px solid rgba(212,85,58,0.2)", color: "#d4553a",
          }}>
            {error}
          </div>
        )}

        {/* Magic link sent */}
        {magicSent && mode === "magic" ? (
          <div className="fi" style={{ textAlign: "center" }}>
            <div style={{
              width: 56, height: 56, borderRadius: 16, margin: "0 auto 16px",
              background: "rgba(52,196,114,0.08)", border: "1px solid rgba(52,196,114,0.2)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#34c472" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" />
              </svg>
            </div>
            <p style={{ fontFamily: "'Satoshi', sans-serif", fontWeight: 600, fontSize: 15, marginBottom: 6 }}>Check your inbox</p>
            <p style={{ fontFamily: "'Satoshi', sans-serif", fontSize: 13, color: isDark ? "rgba(255,255,255,0.32)" : "rgba(0,0,0,0.4)", lineHeight: 1.5 }}>
              We sent a magic link to <strong style={{ color: isDark ? "#e4e4e8" : "#1a1a1e" }}>{email}</strong>. Click it to sign in.
            </p>
            <button onClick={() => { setMagicSent(false); setMode("login"); }} style={{ ...linkStyle, marginTop: 16 }}>Back to login</button>
          </div>
        ) : (
          <>
            {/* Guest hit limit message */}
            {guestHitLimit && (
              <div style={{
                padding: "14px 16px", borderRadius: 10, marginBottom: 16, fontSize: 13,
                fontFamily: "'Satoshi', sans-serif", lineHeight: 1.6, textAlign: "center",
                background: "rgba(212,85,58,0.06)", border: "1px solid rgba(212,85,58,0.15)", color: isDark ? "#e88a3a" : "#d4553a",
              }}>
                You've used all 5 free generations! Sign in to unlock more and sync your threads across devices.
              </div>
            )}

            {/* Back button for voluntary sign-in */}
            {onBack && (
              <button onClick={onBack} style={{
                marginBottom: 12, background: "none", border: "none", fontSize: 12, fontFamily: "'Satoshi', sans-serif",
                color: isDark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.35)", cursor: "pointer", padding: 0,
              }}>
                ← Back to app
              </button>
            )}

            {/* In-app browser warning */}
            {isInAppBrowser && (
              <div style={{
                padding: "12px 16px", borderRadius: 10, marginBottom: 16, fontSize: 12,
                fontFamily: "'Satoshi', sans-serif", lineHeight: 1.5,
                background: "rgba(232,138,58,0.08)", border: "1px solid rgba(232,138,58,0.2)", color: "#e88a3a",
              }}>
                You're in an in-app browser. For the best experience, open this page in Safari or Chrome. Tap ••• then "Open in Browser".
              </div>
            )}

            {/* Google OAuth — hidden in in-app browsers */}
            {!isInAppBrowser && (
              <>
                <button onClick={handleGoogle} disabled={loading} style={{
                  ...btnSecondary, display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 16,
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                  Continue with Google
                </button>

                {/* Divider */}
                <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "16px 0" }}>
                  <div style={{ flex: 1, height: 1, background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.08)" }} />
                  <span style={{ fontSize: 10, fontFamily: "'JetBrains Mono', monospace", color: isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.25)", textTransform: "uppercase", letterSpacing: 1 }}>or</span>
                  <div style={{ flex: 1, height: 1, background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.08)" }} />
                </div>
              </>
            )}

            {/* Email/Password or Magic Link form */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <input value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" type="email" style={inputStyle} />

              {mode !== "magic" && (
                <input value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" type="password" style={inputStyle} />
              )}

              {mode === "magic" ? (
                <button onClick={handleMagicLink} disabled={loading || !email.trim()} style={{ ...btnPrimary, opacity: (loading || !email.trim()) ? 0.5 : 1 }}>
                  {loading ? "Sending..." : "Send magic link"}
                </button>
              ) : (
                <button onClick={handleEmailAuth} disabled={loading || !email.trim() || !password} style={{ ...btnPrimary, opacity: (loading || !email.trim() || !password) ? 0.5 : 1 }}>
                  {loading ? "..." : (mode === "signup" ? "Create account" : "Sign in")}
                </button>
              )}
            </div>

            {/* Mode switchers */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, marginTop: 18 }}>
              {mode === "login" && (
                <>
                  <button onClick={() => setMode("magic")} style={linkStyle}>Sign in with magic link instead</button>
                  <span style={{ fontSize: 12, fontFamily: "'Satoshi', sans-serif", color: isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.3)" }}>
                    No account? <button onClick={() => setMode("signup")} style={linkStyle}>Sign up</button>
                  </span>
                </>
              )}
              {mode === "signup" && (
                <span style={{ fontSize: 12, fontFamily: "'Satoshi', sans-serif", color: isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.3)" }}>
                  Already have an account? <button onClick={() => setMode("login")} style={linkStyle}>Log in</button>
                </span>
              )}
              {mode === "magic" && (
                <button onClick={() => setMode("login")} style={linkStyle}>Back to password login</button>
              )}
            </div>

            {/* SEO info for new visitors */}
            <div style={{ marginTop: 28, padding: "18px 20px", borderRadius: 12, background: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)", border: `1px solid ${isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.05)"}` }}>
              <div style={{ fontSize: 13, fontFamily: "'Satoshi', sans-serif", fontWeight: 700, marginBottom: 8, color: isDark ? "#e4e4e8" : "#1a1a1e" }}>AI-powered thread writer</div>
              <div style={{ fontSize: 12, fontFamily: "'Satoshi', sans-serif", color: isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.45)", lineHeight: 1.6 }}>
                Write viral X and Threads posts in seconds. 12 hook styles, 120+ proven formulas modeled after posts with millions of views. Pick a hook, fill in your angle, generate.
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
                {["12 hook styles", "120+ formulas", "AI generation", "Cloud sync", "Free to start"].map(tag => (
                  <span key={tag} style={{ fontSize: 9, fontFamily: "'JetBrains Mono', monospace", padding: "3px 8px", borderRadius: 5, background: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)", color: isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.35)" }}>{tag}</span>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════════════════

export default function SmartThread() {
  // ── Auth ──
  const [session, setSession] = useState(undefined); // undefined = loading, null = no session / local mode
  const [authChecked, setAuthChecked] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const userId = session?.user?.id || null;
  const userEmail = session?.user?.email || null;
  const isCloud = !!userId;

  const [view, setView] = useState("home");
  const [profiles, setProfiles] = useState(loadStore().profiles || []);
  const [activeProfile, setActiveProfile] = useState(null);
  const [drafts, setDrafts] = useState(loadStore().drafts || []);
  const [history, setHistory] = useState(loadStore().history || []);

  // Onboarding
  const [obStep, setObStep] = useState(0);
  const [obData, setObData] = useState({});
  const [editingProfileId, setEditingProfileId] = useState(null);

  // Compose
  const [topic, setTopic] = useState("");
  const [hookId, setHookId] = useState(null);
  const [formulaIdx, setFormulaIdx] = useState(0);
  const [hookFields, setHookFields] = useState({});
  const [threadLen, setThreadLen] = useState(null);
  const [ctaType, setCtaType] = useState(null);
  const [ctaLink, setCtaLink] = useState("");
  const [useHook, setUseHook] = useState(false);
  const [threadLang, setThreadLang] = useState("en");

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

  // Settings
  const [theme, setTheme] = useState(loadStore().theme || "light");
  const [licenseKey, setLicenseKey] = useState(loadStore().licenseKey || "");
  const [licenseInput, setLicenseInput] = useState("");
  const [licenseStatus, setLicenseStatus] = useState(loadStore().licenseStatus || "none");
  const [plan, setPlan] = useState(loadStore().plan || "seed");
  const [accountEmail, setAccountEmail] = useState(loadStore().accountEmail || "");
  const [emailInput, setEmailInput] = useState("");
  const [emailSaved, setEmailSaved] = useState(false);
  const [planExpired, setPlanExpired] = useState(false);
  const [licenseExpiry, setLicenseExpiry] = useState(loadStore().licenseExpiry || null); // ISO date string or null for permanent
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackSending, setFeedbackSending] = useState(false);
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [adminKeyTier, setAdminKeyTier] = useState("grow");
  const [adminKeyDays, setAdminKeyDays] = useState(30);
  const [adminGeneratedKey, setAdminGeneratedKey] = useState("");
  const [adminKeyCopied, setAdminKeyCopied] = useState(false);
  const [adminStats, setAdminStats] = useState(null);
  const [adminClaimedKeys, setAdminClaimedKeys] = useState([]); // all issued keys with claim status // { totalUsers, activeUsers, totalThreads }
  const [role, setRole] = useState(loadStore().role || "user"); // user | beta | admin
  const [giftedPlan, setGiftedPlan] = useState(loadStore().giftedPlan || null);
  const [bonusGens, setBonusGens] = useState(loadStore().bonusGens || 0);

  // Rewards
  const [rewardProofUrl, setRewardProofUrl] = useState("");
  const [rewardSubmitting, setRewardSubmitting] = useState(false);
  const [rewardSubmitted, setRewardSubmitted] = useState(null); // task id just submitted
  const [completedRewards, setCompletedRewards] = useState(loadStore().completedRewards || []);
  const [pendingRewards, setPendingRewards] = useState([]); // admin: all pending claims
  const [activeRewardTask, setActiveRewardTask] = useState(null); // which task user is submitting proof for
  const [showAuthWall, setShowAuthWall] = useState(false); // shows login screen when triggered

  // Effective plan: gifted plan overrides purchased plan, admin gets forever
  const effectivePlan = role === "admin" ? "forever" : (giftedPlan || plan);
  const currentPlan = PLANS[effectivePlan] || PLANS.seed;
  const isAdmin = role === "admin";
  const isBeta = role === "beta" || role === "admin";

  const planGenLimit = currentPlan.gens === -1 ? Infinity : (currentPlan.gens + bonusGens);
  const planRwLimit = currentPlan.rewrites === -1 ? Infinity : currentPlan.rewrites;
  const canGen = gens < planGenLimit;
  const canRw = rw < planRwLimit;

  // ── Auth listener ──
  useEffect(() => {
    if (!supabase) {
      setSession(null);
      setAuthChecked(true);
      return;
    }

    // Handle OAuth callback (token in URL hash after redirect)
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const hasAuthCallback = hashParams.has("access_token") || window.location.search.includes("code=");

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setAuthChecked(true);
      // Clean up URL hash after OAuth callback
      if (hasAuthCallback && s) {
        window.history.replaceState(null, "", window.location.pathname);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      setAuthChecked(true);
      // Clean up URL after successful sign in
      if (event === "SIGNED_IN" && s) {
        window.history.replaceState(null, "", window.location.pathname);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // ── Cloud sync: pull data when session established ──
  const syncFromCloud = useCallback(async () => {
    if (!userId) return;
    setSyncing(true);
    try {
      // Load account settings
      const acc = await cloudLoadAccount(userId);
      if (acc) {
        setPlan(acc.plan || "seed");
        setTheme(acc.theme || "dark");
        setLicenseKey(acc.license_key || "");
        setLicenseStatus(acc.license_status || "none");
        setGens(acc.gens_used || 0);
        setRw(acc.rw_used || 0);
        setAccountEmail(acc.email || "");
        setRole(acc.role || "user");
        setGiftedPlan(acc.gifted_plan || null);
        setLicenseExpiry(acc.license_expiry || null);
        saveStore({
          plan: acc.plan || "seed", theme: acc.theme || "dark", licenseKey: acc.license_key || "",
          licenseStatus: acc.license_status || "none", gens: acc.gens_used || 0,
          rw: acc.rw_used || 0, rwDate: acc.rw_date || null, accountEmail: acc.email || "",
          role: acc.role || "user", giftedPlan: acc.gifted_plan || null, licenseExpiry: acc.license_expiry || null,
        });

        // Re-verify license with Gumroad on every login
        // Skip for: seed, forever, admin, beta, or gifted plans
        const skipVerify = !acc.license_key || acc.plan === "seed" || acc.plan === "forever"
          || acc.role === "admin" || acc.role === "beta" || acc.gifted_plan;
        if (!skipVerify && acc.license_status === "valid") {
          try {
            const verifyRes = await fetch("/api/verify-license", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ license_key: acc.license_key }),
            });
            const verifyData = await verifyRes.json();
            if (!verifyData.success) {
              // Subscription lapsed — downgrade to seed
              setPlan("seed");
              setLicenseStatus("none");
              setPlanExpired(true);
              saveStore({ plan: "seed", licenseStatus: "none" });
              cloudSaveAccount(userId, { plan: "seed", license_status: "none" });
            } else {
              // Update tier in case they upgraded on Gumroad
              const newTier = verifyData.tier || acc.plan;
              if (newTier !== acc.plan) {
                setPlan(newTier);
                saveStore({ plan: newTier });
                cloudSaveAccount(userId, { plan: newTier });
              }
            }
          } catch {
            // API unreachable — keep current plan, don't punish the user
          }
        }
      }

      // Load profiles
      const cloudProfiles = await cloudLoadProfiles(userId);
      if (cloudProfiles && cloudProfiles.length > 0) {
        setProfiles(cloudProfiles);
        setActiveProfile(cloudProfiles[0]);
        saveStore({ profiles: cloudProfiles });
      }

      // Load history
      const cloudHistory = await cloudLoadHistory(userId);
      if (cloudHistory) {
        setHistory(cloudHistory);
        saveStore({ history: cloudHistory });
      }
    } catch (e) {
      console.warn("Cloud sync failed, using local data:", e);
    } finally {
      setSyncing(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) syncFromCloud();
  }, [userId, syncFromCloud]);

  // ── Initialize view after auth and after cloud sync ──
  useEffect(() => {
    if (!authChecked) return;
    if (session === undefined) return;
    if (syncing) return; // wait for sync to finish
    const p = profiles;
    if (p.length === 0) {
      setView("onboarding");
    } else {
      if (!activeProfile) setActiveProfile(p[0]);
      if (view === "onboarding" || view === "home") setView("home");
    }
  }, [authChecked, syncing, profiles.length]);

  // ── License expiry check — only on initial load ──
  const expiryChecked = useRef(false);
  useEffect(() => {
    if (expiryChecked.current) return;
    if (licenseExpiry && licenseStatus === "valid" && new Date(licenseExpiry) < new Date()) {
      expiryChecked.current = true;
      setPlan("seed");
      setLicenseKey("");
      setLicenseInput("");
      setLicenseStatus("none");
      setLicenseExpiry(null);
      setPlanExpired(true);
      saveStore({ plan: "seed", licenseKey: "", licenseStatus: "none", licenseExpiry: null });
      if (isCloud) cloudSaveAccount(userId, { plan: "seed", license_key: "", license_status: "none", license_expiry: null });
    }
  }, []);

  // ── Load admin data when settings opens ──
  useEffect(() => {
    if (view === "settings" && isAdmin) { loadAdminStats(); loadPendingRewards(); loadClaimedKeys(); }
  }, [view, isAdmin]);

  // ── Load user rewards when settings opens ──
  useEffect(() => {
    if (userId && view === "settings") loadCompletedRewards();
  }, [userId, view]);

  // ── Helper: save to both local + cloud ──
  function hybridSaveAccount(data) {
    saveStore(data);
    if (isCloud) {
      const cloudData = {};
      if ("plan" in data) cloudData.plan = data.plan;
      if ("theme" in data) cloudData.theme = data.theme;
      if ("licenseKey" in data) cloudData.license_key = data.licenseKey;
      if ("licenseStatus" in data) cloudData.license_status = data.licenseStatus;
      if ("gens" in data) cloudData.gens_used = data.gens;
      if ("rw" in data) cloudData.rw_used = data.rw;
      if ("rwDate" in data) cloudData.rw_date = data.rwDate;
      if ("accountEmail" in data) cloudData.email = data.accountEmail;
      if ("licenseExpiry" in data) cloudData.license_expiry = data.licenseExpiry;
      if (Object.keys(cloudData).length > 0) cloudSaveAccount(userId, cloudData);
    }
  }

  function hybridSaveProfiles(updatedProfiles) {
    saveStore({ profiles: updatedProfiles });
    if (isCloud) cloudSaveProfiles(userId, updatedProfiles);
  }

  function hybridSaveHistory(updatedHistory) {
    saveStore({ history: updatedHistory });
    if (isCloud) cloudSaveHistory(userId, updatedHistory);
  }

  // ── Show auth screen if Supabase is configured and no session ──
  if (supabase && !authChecked) {
    // Check if we're in the middle of an OAuth callback
    const isCallback = window.location.hash.includes("access_token") || window.location.search.includes("code=");
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: theme === "dark" ? "#07070a" : "#f5f3ef" }}>
        <div style={{ width: 24, height: 24, border: "2px solid rgba(255,255,255,0.06)", borderTopColor: "#d4553a", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
        {isCallback && <p style={{ marginTop: 12, fontSize: 12, fontFamily: "'Satoshi', sans-serif", color: "rgba(255,255,255,0.3)" }}>Signing you in...</p>}
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // Show auth wall: when user clicks Sign In, or when guest hits gen limit
  const guestHitLimit = !isCloud && gens >= 5;
  if (supabase && session === null && (showAuthWall || guestHitLimit)) {
    return <AuthScreen onAuth={(s) => {
      if (s) {
        setSession(s);
        setShowAuthWall(false);
      }
    }} theme={theme} guestHitLimit={guestHitLimit} onBack={guestHitLimit ? null : () => setShowAuthWall(false)} />;
  }

  // ── Onboarding ──
  function finishOnboarding() {
    if (editingProfileId) {
      // Editing existing profile
      const updated = profiles.map(p => p.id === editingProfileId ? { ...p, ...obData } : p);
      setProfiles(updated);
      hybridSaveProfiles(updated);
      const edited = updated.find(p => p.id === editingProfileId);
      if (edited) setActiveProfile(edited);
      setEditingProfileId(null);
    } else {
      // Creating new profile
      const p = { id: Date.now(), ...obData, createdAt: new Date().toISOString() };
      const updated = [...profiles, p];
      setProfiles(updated);
      hybridSaveProfiles(updated);
      setActiveProfile(p);
    }
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

    const langName = LANGUAGES.find(l => l.id === threadLang)?.label || "English";
    const langInstruction = threadLang !== "en" ? `\nIMPORTANT: Write the entire thread in ${langName}. All tweets must be in ${langName}.` : "";

    const prompt = [
      `Write a Twitter/X thread about: "${topic}"`,
      hookStr,
      `Length: ${lenMap[threadLen]} tweets`,
      ctaStr,
      voiceStr,
      langInstruction,
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
      hybridSaveAccount({ gens: newGens });

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
      hybridSaveHistory(newHistory);

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
      const rwLangName = LANGUAGES.find(l => l.id === threadLang)?.label || "English";
      const rwLangHint = threadLang !== "en" ? `\nIMPORTANT: Write in ${rwLangName}.` : "";
      const prompt = `Rewrite this tweet. Same idea, completely different words and structure. Under 280 chars.\n\nOriginal: "${tweets[idx]}"\n${voiceHint}${rwLangHint}\n\nReturn ONLY the new tweet text. No quotes around it. No explanation.`;

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
      hybridSaveAccount({ rw: newRw, rwDate: new Date().toDateString() });
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
    hybridSaveHistory(updated);
  }

  function deleteHistoryItem(id) {
    const updated = history.filter(h => h.id !== id);
    setHistory(updated);
    hybridSaveHistory(updated);
  }

  function deleteProfile(id) {
    const updated = profiles.filter(p => p.id !== id);
    setProfiles(updated);
    hybridSaveProfiles(updated);
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
    setUseHook(false);
    setThreadLang("en");
    setTweets([]);
    setError(null);
    setShowPreview(false);
  }

  // ── Settings helpers ──
  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    hybridSaveAccount({ theme: next });
  }

  async function activateLicense() {
    const key = licenseInput.trim().toUpperCase();
    if (!key) return;
    setLicenseStatus("checking");

    // Decode the key locally — no API call needed
    const decoded = decodeLicenseKey(key);

    if (!decoded) {
      setLicenseStatus("invalid");
      return;
    }

    const { tier, days, isPermanent } = decoded;
    const expiry = isPermanent ? null : new Date(Date.now() + days * 86400000).toISOString();

    setLicenseKey(key);
    setLicenseStatus("valid");
    setPlan(tier);
    setLicenseExpiry(expiry);
    setPlanExpired(false);
    hybridSaveAccount({
      licenseKey: key, licenseStatus: "valid", plan: tier,
      licenseExpiry: expiry,
    });

    // Mark key as claimed in the license_keys table
    if (supabase) {
      try {
        await supabase.from("license_keys").update({
          status: "claimed",
          claimed_by: userEmail || accountEmail || userId,
          claimed_at: new Date().toISOString(),
        }).eq("key_code", key);
      } catch {}
    }
  }

  // Check license expiry on load
  function deactivateLicense() {
    setLicenseKey("");
    setLicenseInput("");
    setLicenseStatus("none");
    setPlan("seed");
    setLicenseExpiry(null);
    hybridSaveAccount({ licenseKey: "", licenseStatus: "none", plan: "seed", licenseExpiry: null });
  }

  function saveEmail() {
    if (!emailInput.trim()) return;
    setAccountEmail(emailInput.trim());
    hybridSaveAccount({ accountEmail: emailInput.trim() });
    setEmailSaved(true);
    setTimeout(() => setEmailSaved(false), 2000);
  }

  async function handleLogout() {
    if (supabase) {
      await supabase.auth.signOut();
    }
    // Clear skipAuth so auth screen shows again
    const store = loadStore();
    delete store.skipAuth;
    localStorage.setItem(STORE_KEY, JSON.stringify(store));
    setSession(null);
  }

  async function sendFeedback() {
    if (!feedbackText.trim()) return;
    setFeedbackSending(true);
    try {
      await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: feedbackText.trim(),
          email: userEmail || accountEmail || "anonymous",
          plan: plan,
          timestamp: new Date().toISOString(),
        }),
      });
      setFeedbackSent(true);
      setFeedbackText("");
      setTimeout(() => setFeedbackSent(false), 3000);
    } catch {
      // Silently fail — feedback isn't critical
    } finally {
      setFeedbackSending(false);
    }
  }

  async function loadAdminStats() {
    if (!supabase || !isAdmin) return;
    try {
      const { count: totalUsers } = await supabase.from("user_accounts").select("*", { count: "exact", head: true });
      const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
      const { count: activeUsers } = await supabase.from("user_accounts").select("*", { count: "exact", head: true }).gte("updated_at", thirtyDaysAgo);
      const { count: totalThreads } = await supabase.from("thread_history").select("*", { count: "exact", head: true });
      // Fetch all users with their plans for the tier breakdown
      const { data: allUsers } = await supabase.from("user_accounts").select("email, plan, role, gifted_plan, license_key, updated_at").order("updated_at", { ascending: false });
      setAdminStats({
        totalUsers: totalUsers || 0, activeUsers: activeUsers || 0, totalThreads: totalThreads || 0,
        users: allUsers || [],
      });
    } catch (e) {
      console.warn("Failed to load admin stats:", e);
    }
  }

  async function saveGeneratedKey(key, tier, days) {
    if (!supabase || !isAdmin) return;
    try {
      await supabase.from("license_keys").insert({
        key_code: key,
        tier,
        duration_days: days,
        created_by: userId,
        status: "issued",
      });
    } catch (e) { console.warn("Failed to save key:", e); }
  }

  async function loadClaimedKeys() {
    if (!supabase || !isAdmin) return;
    try {
      const { data, error } = await supabase.from("license_keys").select("*").order("created_at", { ascending: false }).limit(50);
      if (error) { console.warn("Keys query failed:", error.message); return; }
      setAdminClaimedKeys(data || []);
    } catch {}
  }

  async function revokeKey(keyId, keyCode) {
    if (!supabase || !isAdmin) return;
    try {
      await supabase.from("license_keys").update({ status: "revoked" }).eq("id", keyId);
      const { data: users } = await supabase.from("user_accounts").select("id").eq("license_key", keyCode);
      if (users && users.length > 0) {
        for (const u of users) {
          await supabase.from("user_accounts").update({
            plan: "seed", license_key: "", license_status: "none", license_expiry: null,
          }).eq("id", u.id);
        }
      }
      loadClaimedKeys();
    } catch (e) {
      console.warn("Revoke failed:", e);
    }
  }

  async function resetUserByEmail(email) {
    if (!supabase || !isAdmin || !email) return;
    try {
      await supabase.from("user_accounts").update({
        plan: "seed", license_key: "", license_status: "none", license_expiry: null,
      }).eq("email", email);
      loadClaimedKeys();
      loadAdminStats();
    } catch (e) {
      console.warn("Reset user failed:", e);
    }
  }

  // Load admin stats when settings view opens
  // ── Rewards system ──
  async function submitRewardProof(taskId) {
    if (!rewardProofUrl.trim() || !supabase || !userId) return;
    setRewardSubmitting(true);
    try {
      const { error } = await supabase.from("reward_claims").insert({
        user_id: userId,
        task_id: taskId,
        proof_url: rewardProofUrl.trim(),
        status: "pending",
        reward_amount: REWARD_TASKS.find(t => t.id === taskId)?.reward || 0,
      });
      if (error) { console.warn("Reward submit failed:", error.message); return; }
      setRewardSubmitted(taskId);
      setRewardProofUrl("");
      setActiveRewardTask(null);
      setTimeout(() => setRewardSubmitted(null), 3000);
    } catch (e) {
      console.warn("Reward submission failed:", e);
    } finally {
      setRewardSubmitting(false);
    }
  }

  async function loadPendingRewards() {
    if (!supabase || !isAdmin) return;
    try {
      const { data, error } = await supabase.from("reward_claims").select("*, user_accounts(email)").eq("status", "pending").order("created_at", { ascending: false });
      if (error) { console.warn("Pending rewards query failed:", error.message); return; }
      setPendingRewards(data || []);
    } catch {}
  }

  async function approveReward(claimId, claimUserId, amount) {
    if (!supabase || !isAdmin) return;
    try {
      // Mark as approved
      await supabase.from("reward_claims").update({ status: "approved" }).eq("id", claimId);
      // Add bonus gens to user
      const { data: userAcc } = await supabase.from("user_accounts").select("gens_used").eq("id", claimUserId).single();
      if (userAcc) {
        const newGens = Math.max(0, (userAcc.gens_used || 0) - amount);
        await supabase.from("user_accounts").update({ gens_used: newGens }).eq("id", claimUserId);
      }
      // Refresh
      loadPendingRewards();
    } catch (e) {
      console.warn("Approve failed:", e);
    }
  }

  async function rejectReward(claimId) {
    if (!supabase || !isAdmin) return;
    try {
      await supabase.from("reward_claims").update({ status: "rejected" }).eq("id", claimId);
      loadPendingRewards();
    } catch {}
  }

  // Load user's completed rewards on sync — daily reset
  async function loadCompletedRewards() {
    if (!supabase || !userId) return;
    try {
      const today = new Date().toISOString().split("T")[0];
      const { data, error } = await supabase.from("reward_claims").select("task_id, status, created_at, reward_amount").eq("user_id", userId);
      if (error) { console.warn("Rewards query failed:", error.message); return; }
      const todayClaims = (data || []).filter(r => r.created_at?.startsWith(today));
      const completed = todayClaims.filter(r => r.status === "approved").map(r => r.task_id);
      const pending = todayClaims.filter(r => r.status === "pending").map(r => r.task_id);
      setCompletedRewards([...completed, ...pending.map(p => `pending_${p}`)]);
      const totalBonus = (data || []).filter(r => r.status === "approved").reduce((sum, r) => sum + (r.reward_amount || 0), 0);
      setBonusGens(totalBonus);
      saveStore({ completedRewards: completed, bonusGens: totalBonus });
    } catch {}
  }

  const ready = topic.trim() && (useHook ? hookId : true) && threadLen && ctaType;
  const hookData = hookId ? HOOKS[hookId] : null;
  const curFormula = hookData ? hookData.formulas[formulaIdx] : null;

  // ════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════

  return (
    <div style={{ minHeight: "100vh", background: theme === "dark" ? "#07070a" : "#f5f3ef", color: theme === "dark" ? "#e4e4e8" : "#1a1a1e", transition: "background 0.3s, color 0.3s" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Satoshi:wght@400;500;600;700;800&family=Instrument+Serif:ital@0;1&family=JetBrains+Mono:wght@400;500&display=swap');
        :root {
          --ui: 'Satoshi', sans-serif;
          --serif: 'Instrument Serif', serif;
          --mono: 'JetBrains Mono', monospace;
          --bg: ${theme === "dark" ? "#07070a" : "#f5f3ef"};
          --card: ${theme === "dark" ? "rgba(255,255,255,0.025)" : "rgba(0,0,0,0.03)"};
          --border: ${theme === "dark" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.08)"};
          --text: ${theme === "dark" ? "#e4e4e8" : "#1a1a1e"};
          --sub: ${theme === "dark" ? "rgba(255,255,255,0.32)" : "rgba(0,0,0,0.4)"};
          --accent: #d4553a;
          --accent-bg: ${theme === "dark" ? "rgba(212,85,58,0.08)" : "rgba(212,85,58,0.06)"};
          --green: #34c472;
          --green-bg: ${theme === "dark" ? "rgba(52,196,114,0.08)" : "rgba(52,196,114,0.06)"};
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: var(--bg); }
        textarea:focus, input:focus { outline: none; }
        ::selection { background: rgba(212,85,58,0.25); }
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-thumb { background: ${theme === "dark" ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.08)"}; border-radius: 2px; }
        @keyframes fi { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        .fi { animation: fi 0.3s ease both; }
        .fid1 { animation: fi 0.3s 0.05s ease both; }
        .fid2 { animation: fi 0.3s 0.1s ease both; }
        .fid3 { animation: fi 0.3s 0.15s ease both; }
        .glass { background: ${theme === "dark" ? "rgba(255,255,255,0.025)" : "rgba(255,255,255,0.7)"}; backdrop-filter: blur(12px); border: 1px solid ${theme === "dark" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}; }
        .settings-section { border-radius: 14px; padding: 20px; margin-bottom: 14px; }
        .settings-divider { height: 1px; background: var(--border); margin: 6px 0; }
        @media (min-width: 640px) {
          body { font-size: 16px; }
        }
        .locked-hook { position: relative; opacity: 0.45; pointer-events: none; }
        .locked-hook::after { content: '🔒'; position: absolute; top: 8px; right: 10px; font-size: 14px; }
        .nav-full { display: none; }
        .nav-short { display: inline; font-size: 15px; }
        .logo-text { display: none; }
        @media (min-width: 540px) {
          .nav-full { display: inline; }
          .nav-short { display: none; }
          .logo-text { display: inline; }
        }
      `}</style>

      <div style={{ maxWidth: 760, margin: "0 auto", padding: "20px 28px 100px" }}>

        {/* ═══ HEADER ═══ */}
        {view !== "onboarding" && (
          <header className="fi" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, paddingTop: 8, gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg, #d4553a, #e88a3a)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                <img src="/logo.png" alt="Smart Thread" style={{ width: 22, height: 22, filter: "brightness(0) invert(1)" }} />
              </div>
              <div className="logo-text">
                <span style={{ fontFamily: "var(--ui)", fontWeight: 800, fontSize: 18, letterSpacing: "-0.4px", display: "block", lineHeight: 1.1 }}>Smart Thread</span>
                <span style={{ fontFamily: "var(--ui)", fontSize: 10, color: "var(--sub)", letterSpacing: 0.3 }}>AI Thread Writer for X & Threads</span>
              </div>
            </div>
            <nav style={{ display: "flex", gap: 2, alignItems: "center", flexWrap: "nowrap" }}>
              {[
                { label: "New", short: "✦", v: "home", onClick: () => { resetCompose(); setView("home"); } },
                { label: "History", short: "↻", v: "history", onClick: () => setView("history") },
                { label: "Profiles", short: "◉", v: "profiles", onClick: () => setView("profiles") },
                { label: "Settings", short: "⚙︎", v: "settings", onClick: () => setView("settings") },
              ].map(tab => (
                <button key={tab.v} onClick={tab.onClick} style={{
                  padding: "7px 10px", borderRadius: 8, fontSize: 13, fontFamily: "var(--ui)", fontWeight: 500,
                  border: `1px solid ${view === tab.v ? "var(--accent)" : "var(--border)"}`,
                  background: view === tab.v ? "var(--accent-bg)" : "transparent",
                  color: view === tab.v ? "var(--accent)" : "var(--sub)", cursor: "pointer",
                  transition: "all 0.15s ease", whiteSpace: "nowrap",
                }}>
                  <span className="nav-short" style={{ fontSize: 14 }}>{tab.short}</span>
                  <span className="nav-full">{tab.label}</span>
                </button>
              ))}
              <button onClick={toggleTheme} style={{
                padding: "7px 9px", borderRadius: 8, border: "1px solid var(--border)",
                background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                color: "var(--sub)", transition: "all 0.15s", flexShrink: 0,
              }}>
                {theme === "dark" ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" /><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" /></svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" /></svg>
                )}
              </button>
              {!isCloud && supabase && (
                <button onClick={() => setShowAuthWall(true)} style={{
                  padding: "7px 12px", borderRadius: 8, fontSize: 12, fontFamily: "var(--ui)", fontWeight: 600,
                  border: "none", background: "linear-gradient(135deg, #d4553a, #e88a3a)", color: "#fff",
                  cursor: "pointer", flexShrink: 0, whiteSpace: "nowrap",
                }}>
                  <span className="nav-short">→</span>
                  <span className="nav-full">Sign in</span>
                </button>
              )}
            </nav>
          </header>
        )}

        {/* ═══ ONBOARDING ═══ */}
        {view === "onboarding" && (
          <div className="fi" style={{ paddingTop: 50 }}>
            <div style={{ textAlign: "center", marginBottom: 36 }}>
              <div style={{ width: 72, height: 72, borderRadius: 20, background: "linear-gradient(135deg, #d4553a, #e88a3a)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", overflow: "hidden" }}>
                <img src="/logo.png" alt="Smart Thread" style={{ width: 44, height: 44, filter: "brightness(0) invert(1)" }} />
              </div>
              <h1 style={{ fontFamily: "var(--ui)", fontWeight: 800, fontSize: 26, letterSpacing: "-0.5px" }}>Smart Thread</h1>
              <p style={{ fontFamily: "var(--ui)", fontSize: 15, color: "var(--sub)", marginTop: 4 }}>Set up your brand voice first.</p>
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
              <p style={{ fontSize: 13, fontFamily: "var(--ui)", color: "var(--sub)", lineHeight: 1.5, marginBottom: 16,  }}>{PQ[obStep].why}</p>

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
                    style={{ width: "100%", padding: "12px 14px", borderRadius: 10, background: "var(--card)", border: "1.5px solid var(--border)", color: "var(--text)", fontSize: 15, fontFamily: "var(--ui)", lineHeight: 1.5, resize: "vertical" }}
                  />
                ) : (
                  <input
                    value={obData[PQ[obStep].key] || ""}
                    onChange={e => setObData({ ...obData, [PQ[obStep].key]: e.target.value })}
                    placeholder={PQ[obStep].ph}
                    style={{ width: "100%", padding: "12px 14px", borderRadius: 10, background: "var(--card)", border: "1.5px solid var(--border)", color: "var(--text)", fontSize: 15, fontFamily: "var(--ui)" }}
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
            {/* Plan expired banner */}
            {planExpired && (
              <div className="glass" style={{ borderRadius: 12, padding: "12px 16px", marginBottom: 16, borderColor: "var(--accent)", display: "flex", alignItems: "center", gap: 10 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                <span style={{ fontSize: 12, fontFamily: "var(--ui)", color: "var(--accent)", flex: 1 }}>Your plan expired — you're on Seed now.</span>
                <a href={GUMROAD_URL} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, fontFamily: "var(--ui)", fontWeight: 600, color: "var(--accent)", textDecoration: "underline" }}>Renew</a>
              </div>
            )}
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
              {[{ used: gens, total: planGenLimit === Infinity ? "∞" : planGenLimit, label: "Generations", isInf: planGenLimit === Infinity }, { used: rw, total: planRwLimit === Infinity ? "∞" : planRwLimit, label: "Rewrites today", isInf: planRwLimit === Infinity }].map(bar => {
                const left = bar.isInf ? "∞" : (typeof bar.total === "number" ? bar.total - bar.used : bar.total);
                const low = !bar.isInf && typeof left === "number" && left <= 1;
                return (
                  <div key={bar.label} style={{ flex: 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontSize: 10, fontFamily: "var(--mono)", color: "var(--sub)" }}>{bar.label}</span>
                      <span style={{ fontSize: 10, fontFamily: "var(--mono)", color: low ? "var(--accent)" : "var(--sub)", fontWeight: low ? 700 : 400 }}>{left} left</span>
                    </div>
                    <div style={{ height: 3, borderRadius: 2, background: "var(--border)" }}>
                      <div style={{ height: "100%", borderRadius: 2, background: bar.isInf ? "var(--green)" : (low ? "var(--accent)" : "var(--green)"), width: bar.isInf ? "100%" : `${(typeof left === "number" ? left / bar.total : 1) * 100}%`, transition: "width 0.3s" }} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Form */}
            <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>

              {/* Topic */}
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, fontFamily: "var(--ui)", marginBottom: 8 }}>Topic</div>
                <textarea value={topic} onChange={e => setTopic(e.target.value)} placeholder="What's the core idea or story?" rows={3} style={{ width: "100%", padding: "12px 14px", borderRadius: 10, background: "var(--card)", border: "1.5px solid var(--border)", color: "var(--text)", fontSize: 15, fontFamily: "var(--ui)", lineHeight: 1.5, resize: "vertical" }} />
              </div>

              {/* Language */}
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, fontFamily: "var(--ui)", marginBottom: 8 }}>Language</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {LANGUAGES.map(l => (
                    <button key={l.id} onClick={() => setThreadLang(l.id)} style={{
                      padding: "8px 14px", borderRadius: 8, fontSize: 13, fontFamily: "var(--ui)", fontWeight: 500,
                      border: `1.5px solid ${threadLang === l.id ? "var(--accent)" : "var(--border)"}`,
                      background: threadLang === l.id ? "var(--accent-bg)" : "var(--card)",
                      color: threadLang === l.id ? "var(--accent)" : "var(--sub)", cursor: "pointer",
                      transition: "all 0.15s", display: "flex", alignItems: "center", gap: 6,
                    }}>
                      <span>{l.flag}</span>
                      <span>{l.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Hook Toggle */}
              <div>
                <button onClick={() => { setUseHook(!useHook); if (!useHook) { setHookId(null); setFormulaIdx(0); setHookFields({}); } }} style={{
                  width: "100%", padding: "14px 16px", borderRadius: 10, fontSize: 14, fontFamily: "var(--ui)", fontWeight: 600,
                  border: `1.5px solid ${useHook ? "var(--accent)" : "var(--border)"}`,
                  background: useHook ? "var(--accent-bg)" : "var(--card)",
                  color: useHook ? "var(--accent)" : "var(--sub)", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  transition: "all 0.15s",
                }}>
                  <span>{useHook ? "Hook style selected" : "Need a hook?"}</span>
                  <span style={{ fontSize: 12, opacity: 0.7 }}>{useHook ? "▲ collapse" : "▼ choose one"}</span>
                </button>
              </div>

              {/* Hook */}
              {useHook && (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, fontFamily: "var(--ui)" }}>Hook style</div>
                  <button onClick={() => {
                    const unlocked = Object.entries(HOOKS).filter(([, h]) => isTierUnlocked(isBeta ? "forever" : effectivePlan, h.tier));
                    if (unlocked.length === 0) return;
                    const t = topic.trim().toLowerCase();
                    // Smart matching: analyze topic to suggest the best hook
                    let picked;
                    if (!t) {
                      // No topic yet — truly random
                      picked = unlocked[Math.floor(Math.random() * unlocked.length)];
                    } else {
                      const scores = unlocked.map(([id, h]) => {
                        let score = Math.random() * 2; // base randomness
                        if ((t.includes("mistake") || t.includes("fail") || t.includes("lost") || t.includes("struggle")) && (id === "story" || id === "vulnerability")) score += 5;
                        if ((t.includes("tip") || t.includes("how to") || t.includes("step") || t.includes("guide") || t.includes("system")) && (id === "framework" || id === "listicle")) score += 5;
                        if ((t.includes("data") || t.includes("number") || t.includes("track") || t.includes("%") || t.includes("result")) && id === "stat") score += 5;
                        if ((t.includes("wrong") || t.includes("myth") || t.includes("stop") || t.includes("overrated") || t.includes("bad advice")) && (id === "contrarian" || id === "bold")) score += 5;
                        if ((t.includes("why") || t.includes("what if") || t.includes("anyone") || t.includes("?")) && id === "question") score += 5;
                        if ((t.includes("learn") || t.includes("lesson") || t.includes("realize") || t.includes("taught")) && id === "lesson") score += 5;
                        if ((t.includes("like") || t.includes("imagine") || t.includes("think of") || t.includes("similar")) && id === "metaphor") score += 5;
                        if ((t.includes("honest") || t.includes("confess") || t.includes("truth") || t.includes("behind")) && id === "vulnerability") score += 5;
                        if ((t.includes("story") || t.includes("happened") || t.includes("ago") || t.includes("remember")) && id === "story") score += 4;
                        if ((t.includes("culture") || t.includes("local") || t.includes("expat") || t.includes("greeting") || t.includes("tradition") || t.includes("arab") || t.includes("language")) && id === "reveal") score += 6;
                        if ((t.includes("actually") || t.includes("think") || t.includes("assume") || t.includes("flip") || t.includes("opposite") || t.includes("not about")) && id === "reframe") score += 5;
                        return { id, h, score };
                      });
                      scores.sort((a, b) => b.score - a.score);
                      picked = [scores[0].id, scores[0].h];
                    }
                    const [rId, rHook] = picked;
                    const rFormula = Math.floor(Math.random() * rHook.formulas.length);
                    setHookId(rId); setFormulaIdx(rFormula); setHookFields({});
                  }} style={{
                    padding: "6px 14px", borderRadius: 8, fontSize: 13, fontFamily: "var(--ui)", fontWeight: 600,
                    border: "1px solid var(--accent)", background: "var(--accent-bg)",
                    color: "var(--accent)", cursor: "pointer", transition: "all 0.15s",
                  }}>
                    ✦ Surprise me
                  </button>
                </div>
                <div style={{ fontSize: 12, color: "var(--sub)", fontFamily: "var(--ui)", marginBottom: 10 }}>Pick a hook, then choose a formula · 10 formulas each</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                  {Object.entries(HOOKS).map(([id, h]) => {
                    const isLocked = !isTierUnlocked(isBeta ? "forever" : effectivePlan, h.tier);
                    return (
                      <button key={id} onClick={() => {
                        if (isLocked) return;
                        setHookId(id); setFormulaIdx(0); setHookFields({});
                      }} className={isLocked ? "locked-hook" : ""} style={{
                        padding: "12px 14px", textAlign: "left", borderRadius: 10,
                        cursor: isLocked ? "default" : "pointer", transition: "all 0.15s",
                        background: hookId === id ? "var(--accent-bg)" : "var(--card)",
                        border: `1.5px solid ${hookId === id ? "var(--accent)" : "var(--border)"}`,
                        color: "var(--text)", position: "relative",
                      }}>
                        <div style={{ fontSize: 14, fontWeight: 600, fontFamily: "var(--ui)" }}>{h.label}</div>
                        <div style={{ fontSize: 12, color: "var(--sub)", fontFamily: "var(--ui)" }}>{h.desc}</div>
                        {isLocked && <div style={{ fontSize: 9, fontFamily: "var(--mono)", color: PLANS[h.tier]?.color || "var(--accent)", marginTop: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>{PLANS[h.tier]?.label}+</div>}
                      </button>
                    );
                  })}
                </div>
                {effectivePlan === "seed" && role === "user" && (
                  <div style={{ marginTop: 8, padding: "8px 12px", borderRadius: 8, background: "var(--accent-bg)", border: "1px solid rgba(212,85,58,0.15)", fontSize: 11, fontFamily: "var(--ui)", color: "var(--accent)" }}>
                    Upgrade to unlock more hook styles — 10 formulas each →
                  </div>
                )}

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
                        <div style={{ fontSize: 11, fontWeight: 600, fontFamily: "var(--ui)", color: "var(--sub)", marginBottom: 5 }}>{field.l} <span style={{ fontWeight: 400, opacity: 0.7 }}>(optional)</span></div>
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
                        <input value={hookFields[field.k] || ""} onChange={e => setHookFields({ ...hookFields, [field.k]: e.target.value })} placeholder="Or type your own..." style={{ width: "100%", padding: "8px 12px", borderRadius: 8, background: "rgba(255,255,255,0.02)", border: "1px solid var(--border)", color: "var(--text)", fontSize: 13, fontFamily: "var(--ui)" }} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
              )}

              {/* Length */}
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, fontFamily: "var(--ui)", marginBottom: 8 }}>Length</div>
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
                <div style={{ fontSize: 14, fontWeight: 700, fontFamily: "var(--ui)", marginBottom: 8 }}>Call to action</div>
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
                {!canGen ? `${currentPlan.label} limit reached` : "Generate thread"}
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
                <p style={{ fontSize: 13, fontFamily: "var(--ui)", color: "var(--sub)", marginBottom: 20, lineHeight: 1.5 }}>{error}</p>
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
                    <div key={`${i}-${tw.slice(0, 10)}`} className={`glass ${i < 4 ? `fid${i}` : "fi"}`} style={{ borderRadius: 12, padding: 16 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                        <span style={{ fontSize: 10, fontFamily: "var(--mono)", color: "var(--accent)", textTransform: "uppercase", letterSpacing: 0.3 }}>
                          {i === 0 ? "Hook" : i === tweets.length - 1 && ctaType !== "none" ? "CTA" : `${i + 1}/${tweets.length}`}
                        </span>
                        <span style={{ fontSize: 10, fontFamily: "var(--mono)", color: tw.length > MAX_C ? "var(--accent)" : "var(--sub)" }}>{tw.length}/{MAX_C}</span>
                      </div>
                      <p style={{ fontSize: 15, lineHeight: 1.7, fontFamily: "var(--ui)", fontWeight: 400, margin: "0 0 14px", whiteSpace: "pre-wrap" }}>{tw}</p>
                      <div style={{ display: "flex", gap: 5, justifyContent: "flex-end", alignItems: "center" }}>
                        <span style={{ fontSize: 9, fontFamily: "var(--mono)", color: "var(--sub)", marginRight: "auto" }}>{planRwLimit === Infinity ? "∞" : (planRwLimit - rw)} rewrites left</span>
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
                  <p style={{ fontSize: 15, lineHeight: 1.7, fontFamily: "var(--ui)", fontWeight: 400 }}>{tw}</p>
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
              <p style={{ fontFamily: "var(--ui)", fontSize: 14, color: "var(--sub)",  }}>No threads generated yet.</p>
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
                  <p style={{ fontSize: 12, fontFamily: "var(--ui)", color: "var(--sub)", lineHeight: 1.5, marginBottom: 10,  }}>"{h.tweets[0].slice(0, 100)}{h.tweets[0].length > 100 ? "..." : ""}"</p>
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
                  <button onClick={() => deleteHistoryItem(h.id)} style={{ padding: "5px 11px", borderRadius: 6, fontSize: 11, fontFamily: "var(--ui)", fontWeight: 500, border: "1px solid var(--border)", background: "transparent", color: "var(--sub)", cursor: "pointer", marginLeft: "auto" }}>Delete</button>
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
              <button onClick={() => { setEditingProfileId(null); setObData({}); setObStep(0); setView("onboarding"); }} style={{ padding: "6px 13px", borderRadius: 7, fontSize: 12, fontFamily: "var(--ui)", fontWeight: 500, border: "1px solid var(--border)", background: "transparent", color: "var(--sub)", cursor: "pointer" }}>+ Add</button>
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
                {p.voice && <div style={{ fontSize: 12, color: "var(--sub)", fontFamily: "var(--ui)", marginBottom: 8,  }}>{p.voice}</div>}
                <div style={{ display: "flex", gap: 5 }}>
                  {activeProfile?.id !== p.id && (
                    <button onClick={() => setActiveProfile(p)} style={{ padding: "5px 11px", borderRadius: 6, fontSize: 11, fontFamily: "var(--ui)", fontWeight: 500, border: "1px solid var(--border)", background: "transparent", color: "var(--sub)", cursor: "pointer" }}>Set active</button>
                  )}
                  <button onClick={() => { setEditingProfileId(p.id); setObData({ ...p }); setObStep(0); setView("onboarding"); }} style={{ padding: "5px 11px", borderRadius: 6, fontSize: 11, fontFamily: "var(--ui)", fontWeight: 500, border: "1px solid var(--border)", background: "transparent", color: "var(--sub)", cursor: "pointer" }}>Edit</button>
                  <button onClick={() => deleteProfile(p.id)} style={{ padding: "5px 11px", borderRadius: 6, fontSize: 11, fontFamily: "var(--ui)", fontWeight: 500, border: "1px solid var(--border)", background: "transparent", color: "var(--sub)", cursor: "pointer" }}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ═══ SETTINGS / ACCOUNT ═══ */}
        {view === "settings" && (
          <div className="fi">
            <h2 style={{ fontFamily: "var(--ui)", fontWeight: 800, fontSize: 18, marginBottom: 6 }}>Settings</h2>
            <p style={{ fontFamily: "var(--ui)", fontSize: 13, color: "var(--sub)", marginBottom: 22 }}>Manage your account, plan & preferences.</p>

            {/* ── Account / Sync Status ── */}
            <div className="glass settings-section" style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, fontFamily: "var(--ui)", marginBottom: 3 }}>Account</div>
                  {isCloud ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 8, height: 8, borderRadius: 4, background: syncing ? "#e88a3a" : "var(--green)", animation: syncing ? "pulse 1s infinite" : "none" }} />
                      <span style={{ fontSize: 13, fontFamily: "var(--mono)", color: "var(--sub)" }}>
                        {syncing ? "Syncing..." : "☁ Synced"} · {userEmail}
                      </span>
                    </div>
                  ) : (
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 8, height: 8, borderRadius: 4, background: "var(--sub)", opacity: 0.5 }} />
                      <span style={{ fontSize: 13, fontFamily: "var(--mono)", color: "var(--sub)" }}>
                        💾 Local only — data stays on this device
                      </span>
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={handleLogout} style={{
                    padding: "6px 14px", borderRadius: 7, fontSize: 11, fontFamily: "var(--ui)", fontWeight: 500,
                    border: "1px solid var(--border)", background: "transparent",
                    color: "var(--sub)", cursor: "pointer",
                  }}>
                    Log out
                  </button>
                </div>
              </div>
            </div>

            {/* ── Current Plan Badge ── */}
            <div className="glass settings-section" style={{ position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: 0, right: 0, width: 120, height: 120, background: `radial-gradient(circle at top right, ${currentPlan.bg}, transparent)`, pointerEvents: "none" }} />
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                <div style={{
                  padding: "4px 12px", borderRadius: 8, fontSize: 11, fontFamily: "var(--mono)", fontWeight: 700,
                  textTransform: "uppercase", letterSpacing: 0.8,
                  background: currentPlan.bg, color: currentPlan.color, border: `1px solid ${currentPlan.border}`,
                }}>
                  {currentPlan.label}
                </div>
                {role !== "user" && (
                  <div style={{
                    padding: "4px 10px", borderRadius: 8, fontSize: 10, fontFamily: "var(--mono)", fontWeight: 700,
                    textTransform: "uppercase", letterSpacing: 0.8,
                    background: role === "admin" ? "rgba(212,85,58,0.1)" : "rgba(168,85,247,0.1)",
                    color: role === "admin" ? "#d4553a" : "#a855f7",
                    border: `1px solid ${role === "admin" ? "rgba(212,85,58,0.2)" : "rgba(168,85,247,0.2)"}`,
                  }}>
                    {role === "admin" ? "Admin" : "Beta"}
                  </div>
                )}
                {giftedPlan && (
                  <div style={{
                    padding: "4px 10px", borderRadius: 8, fontSize: 10, fontFamily: "var(--mono)", fontWeight: 700,
                    textTransform: "uppercase", letterSpacing: 0.8,
                    background: "rgba(52,196,114,0.1)", color: "#34c472", border: "1px solid rgba(52,196,114,0.2)",
                  }}>
                    Gifted
                  </div>
                )}
                <span style={{ fontSize: 11, fontFamily: "var(--ui)", color: "var(--sub)" }}>Current plan</span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
                {currentPlan.features.map((f, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={currentPlan.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                    <span style={{ fontSize: 11, fontFamily: "var(--ui)", color: "var(--sub)" }}>{f}</span>
                  </div>
                ))}
              </div>

              {effectivePlan === "seed" && role === "user" && (
                <a href={GUMROAD_URL} target="_blank" rel="noopener noreferrer" style={{
                  display: "block", textAlign: "center", padding: "12px 20px", borderRadius: 10, fontSize: 13,
                  fontFamily: "var(--ui)", fontWeight: 700, textDecoration: "none",
                  background: "linear-gradient(135deg, #d4553a, #e88a3a)", color: "#fff",
                  boxShadow: "0 4px 24px rgba(212,85,58,0.2)", transition: "transform 0.15s",
                }}>
                  Upgrade on Gumroad →
                </a>
              )}
              {effectivePlan !== "seed" && (
                <div style={{ display: "flex", gap: 8 }}>
                  <a href={GUMROAD_URL} target="_blank" rel="noopener noreferrer" style={{
                    padding: "8px 16px", borderRadius: 8, fontSize: 12, fontFamily: "var(--ui)", fontWeight: 600,
                    textDecoration: "none", border: `1px solid ${currentPlan.border}`, background: currentPlan.bg,
                    color: currentPlan.color, transition: "all 0.15s",
                  }}>
                    Manage on Gumroad
                  </a>
                  <button onClick={deactivateLicense} style={{
                    padding: "8px 16px", borderRadius: 8, fontSize: 12, fontFamily: "var(--ui)", fontWeight: 500,
                    border: "1px solid var(--border)", background: "transparent", color: "var(--sub)", cursor: "pointer",
                  }}>
                    Downgrade to Free
                  </button>
                </div>
              )}
            </div>

            {/* ── Earn Free Credits ── */}
            <div className="glass settings-section">
              <div style={{ fontSize: 14, fontWeight: 700, fontFamily: "var(--ui)", marginBottom: 4 }}>Earn free generations</div>
              <p style={{ fontSize: 12, fontFamily: "var(--ui)", color: "var(--sub)", marginBottom: 14 }}>
                Complete tasks daily to earn bonus generations. Submit proof and get approved.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {REWARD_TASKS.map(task => {
                  const isDone = completedRewards.includes(task.id);
                  const isPending = completedRewards.includes(`pending_${task.id}`);
                  const isActive = activeRewardTask === task.id;
                  const justSubmitted = rewardSubmitted === task.id;

                  return (
                    <div key={task.id} style={{
                      borderRadius: 10, padding: "14px 16px",
                      background: isDone ? "rgba(52,196,114,0.04)" : "var(--card)",
                      border: `1px solid ${isDone ? "rgba(52,196,114,0.15)" : isPending ? "rgba(232,138,58,0.2)" : "var(--border)"}`,
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ fontSize: 20, width: 28, textAlign: "center" }}>{task.icon}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, fontFamily: "var(--ui)" }}>{task.label}</div>
                          <div style={{ fontSize: 11, fontFamily: "var(--ui)", color: "var(--sub)" }}>{task.desc}</div>
                        </div>
                        <div style={{
                          padding: "3px 10px", borderRadius: 6, fontSize: 11, fontFamily: "var(--mono)", fontWeight: 700,
                          background: isDone ? "rgba(52,196,114,0.1)" : isPending ? "rgba(232,138,58,0.1)" : "var(--accent-bg)",
                          color: isDone ? "var(--green)" : isPending ? "#e88a3a" : "var(--accent)",
                        }}>
                          {isDone ? "Done today ✓" : isPending ? "Pending review" : `+${task.reward} generate`}
                        </div>
                      </div>

                      {!isDone && !isPending && (
                        <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
                          <div style={{ display: "flex", gap: 6 }}>
                            {task.shareUrl && (
                              <a href={task.shareUrl} target="_blank" rel="noopener noreferrer" onClick={() => setActiveRewardTask(task.id)} style={{
                                padding: "6px 14px", borderRadius: 7, fontSize: 12, fontFamily: "var(--ui)", fontWeight: 600,
                                border: "1px solid var(--accent)", background: "var(--accent-bg)", color: "var(--accent)",
                                textDecoration: "none", cursor: "pointer",
                              }}>
                                {task.id === "follow_threads" ? "Open Threads →" : "Share now →"}
                              </a>
                            )}
                            {!task.shareUrl && (
                              <button onClick={() => {
                                navigator.clipboard.writeText(SHARE_CAPTION);
                                setActiveRewardTask(task.id);
                              }} style={{
                                padding: "6px 14px", borderRadius: 7, fontSize: 12, fontFamily: "var(--ui)", fontWeight: 600,
                                border: "1px solid var(--accent)", background: "var(--accent-bg)", color: "var(--accent)",
                                cursor: "pointer",
                              }}>
                                Copy caption & post →
                              </button>
                            )}
                            {!isActive && (
                              <button onClick={() => setActiveRewardTask(task.id)} style={{
                                padding: "6px 14px", borderRadius: 7, fontSize: 12, fontFamily: "var(--ui)", fontWeight: 500,
                                border: "1px solid var(--border)", background: "transparent", color: "var(--sub)",
                                cursor: "pointer",
                              }}>
                                Submit proof
                              </button>
                            )}
                          </div>
                          {isActive && (
                            <div className="fi" style={{ display: "flex", gap: 6 }}>
                              <input
                                value={rewardProofUrl}
                                onChange={e => setRewardProofUrl(e.target.value)}
                                placeholder="Paste link to your post..."
                                style={{
                                  flex: 1, padding: "8px 12px", borderRadius: 8, fontSize: 12, fontFamily: "var(--ui)",
                                  background: "var(--card)", border: "1.5px solid var(--border)", color: "var(--text)",
                                }}
                              />
                              <button onClick={() => submitRewardProof(task.id)} disabled={rewardSubmitting || !rewardProofUrl.trim()} style={{
                                padding: "8px 14px", borderRadius: 8, fontSize: 12, fontFamily: "var(--ui)", fontWeight: 700,
                                border: "none", background: (!rewardProofUrl.trim()) ? "var(--card)" : "linear-gradient(135deg, #d4553a, #e88a3a)",
                                color: (!rewardProofUrl.trim()) ? "var(--sub)" : "#fff", cursor: (!rewardProofUrl.trim()) ? "default" : "pointer",
                              }}>
                                {rewardSubmitting ? "..." : "Submit"}
                              </button>
                            </div>
                          )}
                          {justSubmitted && (
                            <div className="fi" style={{ fontSize: 11, fontFamily: "var(--ui)", color: "var(--green)" }}>
                              Submitted! We'll review and approve shortly.
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              {bonusGens > 0 && (
                <div style={{ marginTop: 10, padding: "8px 12px", borderRadius: 8, background: "rgba(52,196,114,0.06)", border: "1px solid rgba(52,196,114,0.15)", fontSize: 12, fontFamily: "var(--ui)", color: "var(--green)" }}>
                  You have {bonusGens} bonus generations from completed tasks
                </div>
              )}
            </div>

            {/* ── License Key ── */}
            <div className="glass settings-section">
              <div style={{ fontSize: 14, fontWeight: 700, fontFamily: "var(--ui)", marginBottom: 4 }}>License Key</div>
              <p style={{ fontSize: 12, fontFamily: "var(--ui)", color: "var(--sub)", marginBottom: 14 }}>
                Enter your license key to unlock your plan.
              </p>

              {licenseKey && licenseStatus === "valid" ? (
                <>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                    <div style={{
                      flex: 1, padding: "10px 14px", borderRadius: 8, fontFamily: "var(--mono)", fontSize: 13,
                      background: "var(--green-bg, rgba(52,196,114,0.08))", border: "1px solid rgba(52,196,114,0.2)",
                      color: "var(--green)", letterSpacing: 0.5,
                    }}>
                      {licenseKey}
                    </div>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                  </div>
                  {/* Expiry countdown */}
                  {licenseExpiry ? (
                    <div style={{ fontSize: 12, fontFamily: "var(--ui)", color: new Date(licenseExpiry) < new Date(Date.now() + 7 * 86400000) ? "var(--accent)" : "var(--sub)", marginBottom: 10 }}>
                      {new Date(licenseExpiry) > new Date() ? (
                        <>Expires: {new Date(licenseExpiry).toLocaleDateString()} ({Math.ceil((new Date(licenseExpiry) - new Date()) / 86400000)} days left)</>
                      ) : (
                        <span style={{ color: "var(--accent)" }}>Expired on {new Date(licenseExpiry).toLocaleDateString()}</span>
                      )}
                    </div>
                  ) : (
                    <div style={{ fontSize: 12, fontFamily: "var(--ui)", color: "var(--green)", marginBottom: 10 }}>
                      Lifetime access — never expires
                    </div>
                  )}
                </>
              ) : (
                <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                  <input
                    value={licenseInput}
                    onChange={e => { setLicenseInput(e.target.value.toUpperCase()); setLicenseStatus("none"); }}
                    placeholder="ST-XX000-XXXXXX-XX"
                    maxLength={20}
                    style={{
                      flex: 1, padding: "10px 14px", borderRadius: 8, fontFamily: "var(--mono)", fontSize: 13,
                      background: "var(--card)", color: "var(--text)", letterSpacing: 1,
                      border: `1.5px solid ${licenseStatus === "invalid" ? "var(--accent)" : "var(--border)"}`,
                    }}
                  />
                  <button onClick={activateLicense} disabled={licenseStatus === "checking"} style={{
                    padding: "10px 18px", borderRadius: 8, fontSize: 13, fontFamily: "var(--ui)", fontWeight: 700,
                    border: "none", background: "linear-gradient(135deg, #d4553a, #e88a3a)", color: "#fff",
                    cursor: licenseStatus === "checking" ? "default" : "pointer",
                    opacity: licenseStatus === "checking" ? 0.6 : 1,
                  }}>
                    {licenseStatus === "checking" ? "..." : "Activate"}
                  </button>
                </div>
              )}

              {licenseStatus === "invalid" && (
                <div className="fi" style={{ fontSize: 12, fontFamily: "var(--ui)", color: "var(--accent)", marginBottom: 8 }}>
                  Invalid key. Double-check the format: ST-XX000-XXXXXX-XX
                </div>
              )}

              {licenseStatus === "valid" && (
                <button onClick={deactivateLicense} style={{
                  padding: "6px 14px", borderRadius: 7, fontSize: 11, fontFamily: "var(--ui)", fontWeight: 500,
                  border: "1px solid var(--border)", background: "transparent", color: "var(--sub)", cursor: "pointer",
                }}>
                  Remove license
                </button>
              )}
            </div>

            {/* ── Gumroad Instructions (per-tier) ── */}
            {effectivePlan === "seed" && role === "user" && (
              <div className="glass settings-section fid1">
                <div style={{ fontSize: 14, fontWeight: 700, fontFamily: "var(--ui)", marginBottom: 4 }}>How to upgrade</div>
                <p style={{ fontSize: 11, fontFamily: "var(--ui)", color: "var(--sub)", marginBottom: 14 }}>
                  Pick a plan on Gumroad and activate your key here.
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {["grow", "scale", "dominate", "forever"].map(tier => {
                    const p = PLANS[tier];
                    return (
                      <details key={tier} style={{ borderRadius: 10, overflow: "hidden" }}>
                        <summary style={{
                          padding: "10px 14px", cursor: "pointer", display: "flex", alignItems: "center", gap: 8,
                          background: p.bg, border: `1px solid ${p.border}`, borderRadius: 10,
                          fontSize: 12, fontFamily: "var(--ui)", fontWeight: 600, color: p.color,
                          listStyle: "none",
                        }}>
                          <span style={{ fontFamily: "var(--mono)", fontSize: 10, textTransform: "uppercase", letterSpacing: 0.5 }}>{p.label}</span>
                          <span style={{ fontSize: 11, fontFamily: "var(--ui)", fontWeight: 400, color: "var(--sub)", marginLeft: "auto" }}>
                            {p.features[0]}
                          </span>
                        </summary>
                        <div style={{ padding: "12px 14px", background: "var(--card)", borderRadius: "0 0 10px 10px", borderTop: "none" }}>
                          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 }}>
                            {p.gumroadInstructions.map((step, i) => (
                              <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                                <span style={{ fontSize: 11, fontFamily: "var(--mono)", color: p.color, flexShrink: 0, width: 14, textAlign: "right" }}>{i + 1}.</span>
                                <span style={{ fontSize: 11, fontFamily: "var(--ui)", color: "var(--sub)", lineHeight: 1.5 }}>{step.replace(/^\d+\.\s*/, "")}</span>
                              </div>
                            ))}
                          </div>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                            {p.features.map((f, i) => (
                              <span key={i} style={{ fontSize: 10, fontFamily: "var(--mono)", padding: "3px 8px", borderRadius: 5, background: p.bg, color: p.color, border: `1px solid ${p.border}` }}>{f}</span>
                            ))}
                          </div>
                        </div>
                      </details>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Tier-specific instructions when already on a paid plan */}
            {effectivePlan !== "seed" && currentPlan.gumroadInstructions && (
              <div className="glass settings-section fid1" style={{ borderColor: currentPlan.border }}>
                <div style={{ fontSize: 14, fontWeight: 700, fontFamily: "var(--ui)", marginBottom: 4, color: currentPlan.color }}>
                  {currentPlan.label} Plan — Setup Reference
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 5, marginTop: 10 }}>
                  {currentPlan.gumroadInstructions.map((step, i) => (
                    <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                      <span style={{ fontSize: 11, fontFamily: "var(--mono)", color: currentPlan.color, flexShrink: 0, width: 14, textAlign: "right" }}>{i + 1}.</span>
                      <span style={{ fontSize: 11, fontFamily: "var(--ui)", color: "var(--sub)", lineHeight: 1.5 }}>{step.replace(/^\d+\.\s*/, "")}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Email ── */}
            <div className="glass settings-section fid2">
              <div style={{ fontSize: 14, fontWeight: 700, fontFamily: "var(--ui)", marginBottom: 4 }}>Email</div>
              <p style={{ fontSize: 11, fontFamily: "var(--ui)", color: "var(--sub)", marginBottom: 12 }}>
                Optional. Used for license recovery and updates.
              </p>

              {accountEmail ? (
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{
                    flex: 1, padding: "10px 14px", borderRadius: 8, fontFamily: "var(--mono)", fontSize: 12,
                    background: "var(--card)", border: "1px solid var(--border)", color: "var(--text)",
                  }}>
                    {accountEmail}
                  </div>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                  <button onClick={() => { setEmailInput(accountEmail); setAccountEmail(""); hybridSaveAccount({ accountEmail: "" }); }} style={{
                    padding: "6px 12px", borderRadius: 7, fontSize: 11, fontFamily: "var(--ui)", fontWeight: 500,
                    border: "1px solid var(--border)", background: "transparent", color: "var(--sub)", cursor: "pointer",
                  }}>
                    Edit
                  </button>
                </div>
              ) : (
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    value={emailInput}
                    onChange={e => setEmailInput(e.target.value)}
                    placeholder="you@example.com"
                    type="email"
                    style={{
                      flex: 1, padding: "10px 14px", borderRadius: 8, fontFamily: "var(--ui)", fontSize: 13,
                      background: "var(--card)", border: "1.5px solid var(--border)", color: "var(--text)",
                    }}
                  />
                  <button onClick={saveEmail} style={{
                    padding: "10px 16px", borderRadius: 8, fontSize: 12, fontFamily: "var(--ui)", fontWeight: 600,
                    border: "1px solid var(--border)", background: "var(--card)", color: "var(--text)", cursor: "pointer",
                  }}>
                    {emailSaved ? "Saved ✓" : "Save"}
                  </button>
                </div>
              )}
            </div>

            {/* ── Theme Toggle ── */}
            <div className="glass settings-section fid3">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, fontFamily: "var(--ui)" }}>Appearance</div>
                  <p style={{ fontSize: 11, fontFamily: "var(--ui)", color: "var(--sub)", marginTop: 2 }}>
                    {theme === "dark" ? "Dark mode" : "Light mode"} active
                  </p>
                </div>
                <button onClick={toggleTheme} style={{
                  width: 52, height: 28, borderRadius: 14, border: "1.5px solid var(--border)", padding: 3,
                  background: theme === "dark" ? "var(--accent-bg)" : "rgba(52,196,114,0.1)",
                  cursor: "pointer", position: "relative", transition: "background 0.2s",
                  display: "flex", alignItems: "center",
                }}>
                  <div style={{
                    width: 20, height: 20, borderRadius: 10, transition: "transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
                    background: theme === "dark" ? "var(--accent)" : "var(--green)",
                    transform: theme === "dark" ? "translateX(0)" : "translateX(22px)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    {theme === "dark" ? (
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" /></svg>
                    ) : (
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" /><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" /></svg>
                    )}
                  </div>
                </button>
              </div>
            </div>

            {/* ── App info ── */}

            {/* ── Plan Expired Notice ── */}
            {planExpired && (
              <div className="glass settings-section" style={{ borderColor: "var(--accent)", marginBottom: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, fontFamily: "var(--ui)", color: "var(--accent)" }}>Your plan has expired</div>
                    <p style={{ fontSize: 11, fontFamily: "var(--ui)", color: "var(--sub)", marginTop: 2 }}>Your subscription is no longer active. You've been moved to the Seed plan. Renew on Gumroad to restore your limits.</p>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                  <a href={GUMROAD_URL} target="_blank" rel="noopener noreferrer" style={{
                    padding: "8px 16px", borderRadius: 8, fontSize: 12, fontFamily: "var(--ui)", fontWeight: 700,
                    textDecoration: "none", background: "linear-gradient(135deg, #d4553a, #e88a3a)", color: "#fff",
                  }}>
                    Renew on Gumroad
                  </a>
                  <button onClick={() => setPlanExpired(false)} style={{
                    padding: "8px 16px", borderRadius: 8, fontSize: 12, fontFamily: "var(--ui)", fontWeight: 500,
                    border: "1px solid var(--border)", background: "transparent", color: "var(--sub)", cursor: "pointer",
                  }}>
                    Dismiss
                  </button>
                </div>
              </div>
            )}

            {/* ── About ── */}
            <div className="glass settings-section">
              <div style={{ fontSize: 14, fontWeight: 700, fontFamily: "var(--ui)", marginBottom: 10 }}>About Smart Thread</div>
              <div style={{ fontSize: 13, fontFamily: "var(--ui)", color: "var(--sub)", lineHeight: 1.7 }}>
                <p style={{ marginBottom: 10 }}>Smart Thread is an AI-powered thread writer that helps you create viral posts for X (Twitter) and Threads in seconds.</p>
                <p style={{ marginBottom: 10 }}>Instead of staring at a blank screen, you pick from 12 hook styles — each with 10 proven formulas modeled after posts that got millions of views. Fill in your angle, hit generate, and get a full thread written in your voice.</p>
                <p style={{ marginBottom: 10 }}>The AI doesn't just write generic content. It learns your niche, audience, and writing style through your profile, then generates threads that sound like you — not a robot.</p>
                <p style={{ marginBottom: 14 }}>Built by <a href="https://www.threads.com/@geebereal" target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)", textDecoration: "none", fontWeight: 600 }}>Gabriel F Harris</a> — creator, builder, and the person behind threads that reached 1.9M+ views.</p>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {["AI thread writer", "120+ hook formulas", "12 hook styles", "Cloud sync", "Multiple profiles"].map(tag => (
                    <span key={tag} style={{ fontSize: 10, fontFamily: "var(--mono)", padding: "3px 10px", borderRadius: 6, background: "var(--card)", border: "1px solid var(--border)", color: "var(--sub)" }}>{tag}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* ── Bug Report / Feedback ── */}
            <div className="glass settings-section">
              <div style={{ fontSize: 13, fontWeight: 700, fontFamily: "var(--ui)", marginBottom: 4 }}>Feedback & Bug Reports</div>
              <p style={{ fontSize: 11, fontFamily: "var(--ui)", color: "var(--sub)", marginBottom: 12 }}>
                Found a bug? Have an idea? Let us know — goes straight to the developer.
              </p>
              <textarea
                value={feedbackText}
                onChange={e => setFeedbackText(e.target.value)}
                placeholder="Describe the bug or share your idea..."
                rows={3}
                style={{
                  width: "100%", padding: "12px 14px", borderRadius: 10, fontSize: 13, fontFamily: "var(--ui)",
                  background: "var(--card)", border: "1.5px solid var(--border)", color: "var(--text)",
                  lineHeight: 1.5, resize: "vertical", marginBottom: 10,
                }}
              />
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <button onClick={sendFeedback} disabled={feedbackSending || !feedbackText.trim()} style={{
                  padding: "8px 18px", borderRadius: 8, fontSize: 12, fontFamily: "var(--ui)", fontWeight: 700,
                  border: "none", background: (feedbackSending || !feedbackText.trim()) ? "var(--card)" : "linear-gradient(135deg, #d4553a, #e88a3a)",
                  color: (feedbackSending || !feedbackText.trim()) ? "var(--sub)" : "#fff",
                  cursor: (feedbackSending || !feedbackText.trim()) ? "default" : "pointer",
                }}>
                  {feedbackSending ? "Sending..." : feedbackSent ? "Sent!" : "Send feedback"}
                </button>
                {feedbackSent && (
                  <span style={{ fontSize: 11, fontFamily: "var(--ui)", color: "var(--green)" }}>Thanks! We'll look into it.</span>
                )}
              </div>
            </div>

            {/* ── Admin: Analytics Dashboard ── */}
            {isAdmin && adminStats && (
              <div className="glass settings-section" style={{ borderColor: "rgba(212,85,58,0.3)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                  <div style={{ padding: "3px 8px", borderRadius: 6, fontSize: 9, fontFamily: "var(--mono)", fontWeight: 700, textTransform: "uppercase", background: "rgba(212,85,58,0.1)", color: "#d4553a", border: "1px solid rgba(212,85,58,0.2)" }}>Admin</div>
                  <div style={{ fontSize: 14, fontWeight: 700, fontFamily: "var(--ui)" }}>Dashboard</div>
                  <button onClick={loadAdminStats} style={{ marginLeft: "auto", padding: "4px 10px", borderRadius: 6, fontSize: 10, fontFamily: "var(--mono)", border: "1px solid var(--border)", background: "transparent", color: "var(--sub)", cursor: "pointer" }}>Refresh</button>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                  {[
                    { label: "Total users", value: adminStats.totalUsers, color: "#a855f7" },
                    { label: "Active (30d)", value: adminStats.activeUsers, color: "var(--green)" },
                    { label: "Threads made", value: adminStats.totalThreads, color: "var(--accent)" },
                  ].map(stat => (
                    <div key={stat.label} style={{
                      padding: "16px 14px", borderRadius: 10, textAlign: "center",
                      background: "var(--card)", border: "1px solid var(--border)",
                    }}>
                      <div style={{ fontSize: 28, fontWeight: 800, fontFamily: "var(--ui)", color: stat.color, lineHeight: 1 }}>
                        {stat.value}
                      </div>
                      <div style={{ fontSize: 11, fontFamily: "var(--mono)", color: "var(--sub)", marginTop: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>
                        {stat.label}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Reset user tool */}
                <div style={{ marginTop: 14, padding: "12px 14px", borderRadius: 8, background: "var(--card)", border: "1px solid var(--border)" }}>
                  <div style={{ fontSize: 11, fontFamily: "var(--ui)", color: "var(--sub)", marginBottom: 6 }}>Reset user's license (by email)</div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <input
                      id="admin-reset-email"
                      placeholder="user@example.com"
                      style={{ flex: 1, padding: "8px 12px", borderRadius: 8, fontSize: 12, fontFamily: "var(--mono)", background: "var(--card)", border: "1.5px solid var(--border)", color: "var(--text)" }}
                    />
                    <button onClick={() => {
                      const el = document.getElementById("admin-reset-email");
                      if (el?.value) { resetUserByEmail(el.value); el.value = ""; }
                    }} style={{
                      padding: "8px 14px", borderRadius: 8, fontSize: 12, fontFamily: "var(--ui)", fontWeight: 600,
                      border: "1px solid rgba(212,85,58,0.2)", background: "rgba(212,85,58,0.06)", color: "var(--accent)", cursor: "pointer",
                    }}>Reset to Seed</button>
                  </div>
                </div>

                {/* Active tier accounts */}
                {adminStats.users && adminStats.users.length > 0 && (
                  <div style={{ marginTop: 14 }}>
                    <div style={{ fontSize: 12, fontFamily: "var(--ui)", fontWeight: 600, color: "var(--sub)", marginBottom: 8 }}>All accounts by tier</div>
                    
                    {/* Tier summary pills */}
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
                      {["forever", "dominate", "scale", "grow", "seed"].map(t => {
                        const count = adminStats.users.filter(u => (u.gifted_plan || u.plan) === t).length;
                        if (count === 0) return null;
                        const p = PLANS[t];
                        return (
                          <span key={t} style={{ fontSize: 10, fontFamily: "var(--mono)", padding: "3px 10px", borderRadius: 6, background: p?.bg || "var(--card)", color: p?.color || "var(--sub)", border: `1px solid ${p?.border || "var(--border)"}` }}>
                            {p?.label || t}: {count}
                          </span>
                        );
                      })}
                    </div>

                    {/* User list — only show paid/gifted/admin users first, then seed */}
                    <div style={{ maxHeight: 300, overflowY: "auto", display: "flex", flexDirection: "column", gap: 4 }}>
                      {adminStats.users
                        .sort((a, b) => {
                          const order = { forever: 0, dominate: 1, scale: 2, grow: 3, seed: 4 };
                          return (order[a.gifted_plan || a.plan] || 4) - (order[b.gifted_plan || b.plan] || 4);
                        })
                        .map((u, i) => {
                          const effectPlan = u.gifted_plan || u.plan;
                          const p = PLANS[effectPlan];
                          return (
                            <div key={i} style={{
                              display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", borderRadius: 6,
                              background: effectPlan !== "seed" ? "var(--card)" : "transparent",
                              border: effectPlan !== "seed" ? `1px solid ${p?.border || "var(--border)"}` : "none",
                            }}>
                              <span style={{ fontSize: 11, fontFamily: "var(--mono)", color: "var(--sub)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.email}</span>
                              <span style={{ fontSize: 9, fontFamily: "var(--mono)", padding: "2px 7px", borderRadius: 5, textTransform: "uppercase", background: p?.bg || "var(--card)", color: p?.color || "var(--sub)", border: `1px solid ${p?.border || "var(--border)"}` }}>
                                {p?.label || effectPlan}
                              </span>
                              {u.role === "admin" && <span style={{ fontSize: 9, fontFamily: "var(--mono)", padding: "2px 6px", borderRadius: 5, background: "rgba(212,85,58,0.1)", color: "#d4553a" }}>admin</span>}
                              {u.role === "beta" && <span style={{ fontSize: 9, fontFamily: "var(--mono)", padding: "2px 6px", borderRadius: 5, background: "rgba(168,85,247,0.1)", color: "#a855f7" }}>beta</span>}
                              {u.gifted_plan && <span style={{ fontSize: 9, fontFamily: "var(--mono)", padding: "2px 6px", borderRadius: 5, background: "rgba(52,196,114,0.1)", color: "var(--green)" }}>gifted</span>}
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}
              </div>
            )}
            {isAdmin && pendingRewards.length > 0 && (
              <div className="glass settings-section" style={{ borderColor: "rgba(232,138,58,0.3)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <div style={{ padding: "3px 8px", borderRadius: 6, fontSize: 9, fontFamily: "var(--mono)", fontWeight: 700, textTransform: "uppercase", background: "rgba(232,138,58,0.1)", color: "#e88a3a", border: "1px solid rgba(232,138,58,0.2)" }}>Admin</div>
                  <div style={{ fontSize: 14, fontWeight: 700, fontFamily: "var(--ui)" }}>Pending Reward Claims ({pendingRewards.length})</div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {pendingRewards.map(claim => {
                    const task = REWARD_TASKS.find(t => t.id === claim.task_id);
                    return (
                      <div key={claim.id} style={{ padding: "12px 14px", borderRadius: 8, background: "var(--card)", border: "1px solid var(--border)" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                          <span style={{ fontSize: 14 }}>{task?.icon || "?"}</span>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 12, fontWeight: 600, fontFamily: "var(--ui)" }}>{task?.label || claim.task_id}</div>
                            <div style={{ fontSize: 10, fontFamily: "var(--mono)", color: "var(--sub)" }}>{claim.user_accounts?.email || "unknown"} · +{claim.reward_amount} gens</div>
                          </div>
                        </div>
                        <a href={claim.proof_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, fontFamily: "var(--mono)", color: "var(--accent)", wordBreak: "break-all" }}>{claim.proof_url}</a>
                        <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                          <button onClick={() => approveReward(claim.id, claim.user_id, claim.reward_amount)} style={{
                            padding: "5px 12px", borderRadius: 6, fontSize: 11, fontFamily: "var(--ui)", fontWeight: 600,
                            border: "1px solid rgba(52,196,114,0.3)", background: "rgba(52,196,114,0.06)", color: "var(--green)", cursor: "pointer",
                          }}>Approve</button>
                          <button onClick={() => rejectReward(claim.id)} style={{
                            padding: "5px 12px", borderRadius: 6, fontSize: 11, fontFamily: "var(--ui)", fontWeight: 500,
                            border: "1px solid var(--border)", background: "transparent", color: "var(--sub)", cursor: "pointer",
                          }}>Reject</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Admin: Key Generator ── */}
            {isAdmin && (
              <div className="glass settings-section" style={{ borderColor: "rgba(212,85,58,0.3)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <div style={{ padding: "3px 8px", borderRadius: 6, fontSize: 9, fontFamily: "var(--mono)", fontWeight: 700, textTransform: "uppercase", background: "rgba(212,85,58,0.1)", color: "#d4553a", border: "1px solid rgba(212,85,58,0.2)" }}>Admin</div>
                  <div style={{ fontSize: 14, fontWeight: 700, fontFamily: "var(--ui)" }}>License Key Generator</div>
                </div>

                <div style={{ display: "flex", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
                  <div style={{ flex: 1, minWidth: 140 }}>
                    <div style={{ fontSize: 11, fontFamily: "var(--ui)", color: "var(--sub)", marginBottom: 4 }}>Tier</div>
                    <select value={adminKeyTier} onChange={e => setAdminKeyTier(e.target.value)} style={{
                      width: "100%", padding: "8px 12px", borderRadius: 8, fontSize: 13, fontFamily: "var(--ui)",
                      background: "var(--card)", border: "1.5px solid var(--border)", color: "var(--text)",
                    }}>
                      <option value="grow">Grow</option>
                      <option value="scale">Scale</option>
                      <option value="dominate">Dominate</option>
                      <option value="forever">Forever</option>
                    </select>
                  </div>
                  <div style={{ flex: 1, minWidth: 140 }}>
                    <div style={{ fontSize: 11, fontFamily: "var(--ui)", color: "var(--sub)", marginBottom: 4 }}>Duration</div>
                    <select value={adminKeyDays} onChange={e => setAdminKeyDays(Number(e.target.value))} style={{
                      width: "100%", padding: "8px 12px", borderRadius: 8, fontSize: 13, fontFamily: "var(--ui)",
                      background: "var(--card)", border: "1.5px solid var(--border)", color: "var(--text)",
                    }}>
                      <option value={0}>Permanent (lifetime)</option>
                      <option value={30}>30 days</option>
                      <option value={90}>90 days</option>
                      <option value={180}>6 months</option>
                      <option value={365}>1 year</option>
                    </select>
                  </div>
                </div>

                <button onClick={() => {
                  const key = generateLicenseKey(adminKeyTier, adminKeyDays);
                  setAdminGeneratedKey(key);
                  setAdminKeyCopied(false);
                  saveGeneratedKey(key, adminKeyTier, adminKeyDays);
                }} style={{
                  padding: "10px 20px", borderRadius: 8, fontSize: 13, fontFamily: "var(--ui)", fontWeight: 700,
                  border: "none", background: "linear-gradient(135deg, #d4553a, #e88a3a)", color: "#fff",
                  cursor: "pointer", marginBottom: 12, width: "100%",
                }}>
                  Generate Key
                </button>

                {adminGeneratedKey && (
                  <div style={{ marginTop: 4 }}>
                    <div style={{
                      padding: "12px 16px", borderRadius: 8, fontFamily: "var(--mono)", fontSize: 15, fontWeight: 600,
                      background: "var(--card)", border: "1.5px solid var(--accent)", color: "var(--accent)",
                      letterSpacing: 1, textAlign: "center", marginBottom: 8, wordBreak: "break-all",
                    }}>
                      {adminGeneratedKey}
                    </div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <button onClick={() => {
                        navigator.clipboard.writeText(adminGeneratedKey);
                        setAdminKeyCopied(true);
                        setTimeout(() => setAdminKeyCopied(false), 2000);
                      }} style={{
                        padding: "6px 14px", borderRadius: 7, fontSize: 12, fontFamily: "var(--ui)", fontWeight: 600,
                        border: `1px solid ${adminKeyCopied ? "rgba(52,196,114,0.3)" : "var(--border)"}`,
                        background: adminKeyCopied ? "rgba(52,196,114,0.06)" : "transparent",
                        color: adminKeyCopied ? "var(--green)" : "var(--sub)", cursor: "pointer",
                      }}>
                        {adminKeyCopied ? "Copied!" : "Copy key"}
                      </button>
                      <span style={{ fontSize: 11, fontFamily: "var(--mono)", color: "var(--sub)" }}>
                        {PLANS[adminKeyTier]?.label} · {adminKeyDays === 0 ? "Lifetime" : `${adminKeyDays} days`}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── Admin: License Keys Log ── */}
            {isAdmin && (
              <div className="glass settings-section" style={{ borderColor: "rgba(212,85,58,0.3)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <div style={{ padding: "3px 8px", borderRadius: 6, fontSize: 9, fontFamily: "var(--mono)", fontWeight: 700, textTransform: "uppercase", background: "rgba(212,85,58,0.1)", color: "#d4553a", border: "1px solid rgba(212,85,58,0.2)" }}>Admin</div>
                  <div style={{ fontSize: 14, fontWeight: 700, fontFamily: "var(--ui)" }}>License Keys Log</div>
                  <button onClick={loadClaimedKeys} style={{ marginLeft: "auto", padding: "4px 10px", borderRadius: 6, fontSize: 10, fontFamily: "var(--mono)", border: "1px solid var(--border)", background: "transparent", color: "var(--sub)", cursor: "pointer" }}>Refresh</button>
                </div>

                {adminClaimedKeys.length === 0 ? (
                  <p style={{ fontSize: 12, fontFamily: "var(--ui)", color: "var(--sub)",  }}>No keys generated yet.</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {adminClaimedKeys.map(k => (
                      <div key={k.id} style={{
                        padding: "10px 14px", borderRadius: 8, background: "var(--card)",
                        border: `1px solid ${k.status === "claimed" ? "rgba(52,196,114,0.2)" : k.status === "revoked" ? "rgba(212,85,58,0.2)" : "var(--border)"}`,
                        opacity: k.status === "revoked" ? 0.5 : 1,
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                          <span style={{ fontFamily: "var(--mono)", fontSize: 12, fontWeight: 600, color: k.status === "claimed" ? "var(--green)" : k.status === "revoked" ? "var(--sub)" : "var(--accent)", letterSpacing: 0.5 }}>
                            {k.key_code}
                          </span>
                          <span style={{
                            fontSize: 9, fontFamily: "var(--mono)", padding: "2px 7px", borderRadius: 5,
                            textTransform: "uppercase", letterSpacing: 0.5,
                            background: k.status === "claimed" ? "rgba(52,196,114,0.08)" : k.status === "issued" ? "rgba(232,138,58,0.08)" : k.status === "revoked" ? "rgba(212,85,58,0.08)" : "var(--card)",
                            color: k.status === "claimed" ? "var(--green)" : k.status === "issued" ? "#e88a3a" : k.status === "revoked" ? "var(--accent)" : "var(--sub)",
                            border: `1px solid ${k.status === "claimed" ? "rgba(52,196,114,0.15)" : k.status === "issued" ? "rgba(232,138,58,0.15)" : k.status === "revoked" ? "rgba(212,85,58,0.15)" : "var(--border)"}`,
                          }}>
                            {k.status}
                          </span>
                          {k.status === "claimed" && (
                            <button onClick={() => revokeKey(k.id, k.key_code)} style={{
                              marginLeft: "auto", padding: "3px 10px", borderRadius: 5, fontSize: 10, fontFamily: "var(--ui)", fontWeight: 600,
                              border: "1px solid rgba(212,85,58,0.2)", background: "rgba(212,85,58,0.06)", color: "var(--accent)", cursor: "pointer",
                            }}>Revoke</button>
                          )}
                        </div>
                        <div style={{ fontSize: 11, fontFamily: "var(--mono)", color: "var(--sub)", display: "flex", gap: 12, flexWrap: "wrap" }}>
                          <span>{PLANS[k.tier]?.label || k.tier}</span>
                          <span>{k.duration_days === 0 ? "Lifetime" : `${k.duration_days}d`}</span>
                          <span>{new Date(k.created_at).toLocaleDateString()}</span>
                          {k.claimed_by && <span style={{ color: k.status === "revoked" ? "var(--accent)" : "var(--green)" }}>→ {k.claimed_by}</span>}
                          {k.claimed_at && <span>{new Date(k.claimed_at).toLocaleDateString()}</span>}
                          {k.status === "revoked" && <span style={{ color: "var(--accent)" }}>REVOKED</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

          </div>
        )}

      </div>

      {/* ═══ GLOBAL FOOTER ═══ */}
      {view !== "onboarding" && (
        <div style={{ textAlign: "center", padding: "0 20px 24px", maxWidth: 760, margin: "0 auto" }}>
          <div style={{ fontSize: 11, fontFamily: "var(--mono)", color: "var(--sub)", letterSpacing: 0.5, marginBottom: 6 }}>
            Smart Thread v1.0 · {isCloud ? "☁ Cloud synced" : "💾 Local storage"}
          </div>
          <div style={{ fontSize: 11, fontFamily: "var(--ui)", color: "var(--sub)" }}>
            Made by <a href="https://www.threads.com/@geebereal" target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)", textDecoration: "none", fontWeight: 600 }}>Gabriel F Harris</a>
          </div>
        </div>
      )}

    </div>
  );
}
