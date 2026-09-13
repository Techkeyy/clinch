// Production semantic acquisition (P12). Port of the P5B-proven general
// compiler: scenario-independent templates + dependency DAG + action-aware
// effects + terminal absorption. No scenario IDs, no oracle, no hand answers.
import { SEMANTICS_VERSION } from "../config/thresholds";
import type { Candidate } from "./kernel";

export interface RawFacts {
  action: string; read: string;
  spot: Record<string, string>; positioning: Record<string, string>;
  data: Record<string, string>; resolved: string[];
}
interface Outcome { key: string; label: string; enter: string; exit: string; terminal?: boolean }
interface Template {
  id: string; topic: string; family: string | null;
  when: (s: RawFacts) => string[] | null; // null = not fired, else firing facts
  question: string; why: string; outcomes: Outcome[]; dataNeeded?: string;
}
const inSet = (v: string | undefined, xs: string[]) => !!v && xs.includes(v);

const TEMPLATES: Template[] = [
  { id: "T-REALITY", topic: "move-reality", family: "spot-structure",
    when: (s) => {
      if (s.action !== "enter-now") return null;
      if (!["sharp-up-20min", "spike"].includes(s.spot.move ?? "")) return null;
      if (!(s.spot.book === "thin" || s.spot.spread === "wide")) return null;
      return [`action=${s.action}`, `spot.move=${s.spot.move}`, `book=${s.spot.book}/spread=${s.spot.spread}`];
    },
    question: "Is this a real move or a thin-liquidity print?",
    why: "A spread-driven artifact kills the entry before any other question matters.",
    outcomes: [
      { key: "thin-artifact", label: "thin print, no follow-through", enter: "wait", exit: "wait", terminal: true },
      { key: "genuine-move", label: "real move on rebuilding depth", enter: "enter-now", exit: "wait" },
    ] },
  { id: "T-STRUCT", topic: "structure-direction", family: "spot-structure",
    when: (s) => {
      if (!["enter-now", "exit-now"].includes(s.action)) return null;
      if (!(s.spot.drift === "down-quiet" || ["holding", "broken", "testing"].includes(s.spot.support ?? ""))) return null;
      return [`action=${s.action}`, `drift=${s.spot.drift}/support=${s.spot.support}`];
    },
    question: "Is this drift exhausted (setup) or a new leg down?",
    why: "Direction decides whether any entry logic exists at all.",
    outcomes: [
      { key: "breakdown", label: "breakdown on expanding volume", enter: "stand-aside", exit: "exit-now", terminal: true },
      { key: "exhaustion", label: "exhaustion, support holding", enter: "enter-now", exit: "wait" },
    ] },
  { id: "T-CROWD", topic: "crowd-timing", family: "perp-positioning",
    when: (s) => {
      if (!(["extreme", "elevated"].includes(s.positioning.funding ?? "") || s.positioning.oi === "surging")) return null;
      return [`funding=${s.positioning.funding}/oi=${s.positioning.oi}`];
    },
    question: "Does leveraged crowding change the timing of this action?",
    why: "Crowded positioning can flip entry timing around the decision point.",
    outcomes: [
      { key: "crowded", label: "extreme crowding", enter: "wait", exit: "exit-now" },
      { key: "calm", label: "normal positioning", enter: "enter-now", exit: "wait" },
    ] },
  { id: "T-DISLOC", topic: "dislocation", family: "perp-positioning",
    when: (s) => {
      if (s.positioning.dislocation !== "wide") return null;
      return [`dislocation=${s.positioning.dislocation}`];
    },
    question: "Is this a tradeable dislocation or a quoting mirage?",
    why: "The gap is the entire trade; nothing else matters until it is judged real.",
    outcomes: [
      { key: "mirage", label: "mirage, quotes normalize", enter: "wait", exit: "wait", terminal: true },
      { key: "persistent", label: "persistent, hedgeable gap", enter: "enter-now", exit: "exit-now" },
    ] },
];

// Global dependency DAG: dependent topic -> prerequisite topics.
const DEPENDENCIES: Record<string, string[]> = {
  "crowd-timing": ["move-reality", "structure-direction"],
  "dislocation": ["move-reality"],
};
const FAMILY_RANK = ["spot-structure", "perp-positioning"];

function effectOf(o: Outcome, action: string, read: string): string {
  if (read === "stand-aside") return "stand-aside"; // R-ABSORB-TERMINAL
  return action === "exit-now" ? o.exit : o.enter;
}

export interface CompiledPackage {
  candidates: Candidate[];
  derivation: string[];
  semanticsVersion: string;
}

export function compileSemantics(raw: RawFacts): CompiledPackage {
  const resolved: string[] = raw.resolved || [];
  const questions: Candidate[] = [];
  const derivation: string[] = [];
  let fired = 0;
  for (const t of TEMPLATES) {
    if (resolved.includes(t.topic)) continue;
    const facts = t.when(raw);
    if (!facts) continue;
    fired++;
    const rank = FAMILY_RANK.indexOf(t.family ?? "");
    const qid = `q-${rank < 0 ? "z" : String.fromCharCode(97 + rank)}-${t.topic}`;
    questions.push({
      id: qid, topic: t.topic, q: t.question, families: t.family ? [t.family] : [],
      prunes: [],
      branches: t.outcomes.map((o) => ({ outcome: `${o.label} [${o.key}]`, action: effectOf(o, raw.action, raw.read), ...(o.terminal ? { moots: [] as string[] } : {}) })),
    });
    derivation.push(`${t.id} fired on {${facts.join("; ")}}`);
  }
  const byTopic: Record<string, Candidate> = {};
  for (const q of questions) if (q.topic) byTopic[q.topic] = q;
  for (const q of questions) {
    const prunes: string[] = [];
    for (const [dependent, prereqs] of Object.entries(DEPENDENCIES)) {
      if (prereqs.includes(q.topic ?? "") && byTopic[dependent]) prunes.push(byTopic[dependent].id);
    }
    q.prunes = prunes;
    if (prunes.length) derivation.push(`prune: ${q.id} -> ${prunes.join(",")} via dependencies DAG`);
    for (const b of q.branches) {
      const src = (TEMPLATES.find((t) => q.topic === t.topic)?.outcomes.find((o) => b.outcome.includes(`[${o.key}]`)));
      if (src?.terminal) {
        for (const [dependent, prereqs] of Object.entries(DEPENDENCIES)) {
          if (prereqs.includes(q.topic ?? "") && byTopic[dependent] && !(b.moots || []).includes(byTopic[dependent].id)) {
            (b.moots as string[]).push(byTopic[dependent].id);
          }
        }
        if ((b.moots || []).length) derivation.push(`moot: ${q.id}#${src.key} -> ${(b.moots || []).join(",")} (terminal outcome)`);
      }
    }
  }
  for (const topic of resolved) {
    if (byTopic[topic]) continue;
    const fam = topic === "crowd-timing" || topic === "dislocation" ? "perp-positioning" : "spot-structure";
    questions.push({ id: `q-${topic}-settled`, topic, q: `(settled earlier: ${topic})`,
      families: [fam], resolved: true, resolution: "settled before this step", prunes: [],
      branches: [{ outcome: "settled (known)", action: raw.read === "undecided" ? "undecided" : raw.read }] });
    derivation.push(`prior settlement passed through: ${topic}`);
  }
  if (questions.filter((q) => !q.resolved).length === 0 && raw.read === "undecided") {
    questions.push({ id: "q-unresolved-market", topic: "unresolved-market-question",
      q: "Is there enough supported market evidence to act on?", families: [], prunes: [],
      dataNeeded: "fresh spot structure or stock-perp positioning evidence",
      branches: [
        { outcome: "supported market evidence found", action: raw.action === "exit-now" ? "wait" : "enter-now" },
        { outcome: "no supported market evidence", action: "wait" },
      ] });
    derivation.push("T-UNRESOLVED fired (nothing else matched, read undecided)");
  }
  return { candidates: questions, derivation, semanticsVersion: SEMANTICS_VERSION };
}
