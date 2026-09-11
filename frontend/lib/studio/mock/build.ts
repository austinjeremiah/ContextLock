/**
 * Mock backend — Composer / build pipeline.
 *
 * The parser output is explicitly DRAFT until a deterministic Requirements
 * artifact exists, and a missing financial ceiling stays REQUIRED rather than
 * being invented.
 */
import type { Status } from '../types';

export interface DetectedRequirement {
  id: string;
  label: string;
  value: string;
  status: Status;
  note?: string;
}

export interface BuildStage {
  id: string;
  name: string;
  status: Status;
  detail: string;
  /** Which bottom-panel tab this stage's detail belongs to. */
  panel: 'output' | 'tests' | 'problems';
}

export const COMPOSER_EXAMPLES: { id: string; title: string; body: string }[] = [
  {
    id: 'ex_guardian',
    title: 'Aave liquidation guardian',
    body:
      'Build an Aave guardian for my Sepolia treasury. Watch the health factor on my Aave v3 position. If it falls below 1.25, repay USDC debt from the treasury until the health factor is back above 1.30. Never repay more than $1,000 in a single action, require my approval between $1,000 and $5,000, and never act above $5,000. Only use verified Chainlink prices no older than 60 seconds. Never borrow, never withdraw collateral, and never send funds to any address other than the Aave pool.',
  },
  {
    id: 'ex_rebalancer',
    title: 'Collateral rebalancer',
    body:
      'Keep my collateral ratio between 180% and 220% on Sepolia. Rebalance through Uniswap v3 using only the approved USDC/WETH pool. Cap each rebalance at $500 and cap the day at $2,500. Escalate anything larger. Never touch assets outside USDC and WETH.',
  },
  {
    id: 'ex_reporter',
    title: 'Read-only treasury reporter',
    body:
      'Produce a daily summary of my treasury position: collateral, debt, health factor and realized changes. This agent must have no execution authority at all — it should never be able to submit a transaction.',
  },
];

export const COMPOSER_SLASH_HELPERS: { command: string; description: string; insert: string }[] = [
  {
    command: '/limits',
    description: 'State the autonomous limit, escalation band and hard ceiling.',
    insert:
      'Limits: autonomous up to $___ per action; escalate between $___ and $___; never act above $___ under any circumstances.',
  },
  {
    command: '/protocol',
    description: 'Name the protocols and the exact venues allowed.',
    insert: 'Protocols: ___ (only the ___ market). No other venue may be used.',
  },
  {
    command: '/data',
    description: 'State required data sources, trust class and freshness.',
    insert: 'Data: use verified Chainlink price feeds no older than ___ seconds. Refuse to act on stale data.',
  },
  {
    command: '/forbid',
    description: 'State the actions that must never be possible.',
    insert: 'Never: borrow, withdraw collateral, send funds to any address outside the allowlist, or write to mainnet.',
  },
];

export const DETECTED_REQUIREMENTS: DetectedRequirement[] = [
  { id: 'req_objective', label: 'Objective', value: 'Prevent liquidation of the Aave v3 position', status: 'PASS' },
  { id: 'req_protocol', label: 'Protocol', value: 'Aave v3 · Sepolia', status: 'PASS' },
  { id: 'req_trigger', label: 'Trigger', value: 'Health factor < 1.25', status: 'PASS' },
  { id: 'req_action', label: 'Action', value: 'Repay USDC debt from treasury', status: 'PASS' },
  { id: 'req_data', label: 'Data requirement', value: 'Chainlink ETH/USD · VERIFIED_ORACLE · ≤ 60s', status: 'PASS' },
  { id: 'req_autonomous', label: 'Autonomous limit', value: '$1,000 per action', status: 'PASS' },
  { id: 'req_escalation', label: 'Escalation band', value: '$1,000 – $5,000', status: 'PASS' },
  {
    id: 'req_ceiling',
    label: 'Hard deny ceiling',
    value: 'Not stated',
    status: 'REQUIRED',
    note: 'A hard ceiling must be stated explicitly. It is never inferred from the other limits.',
  },
  { id: 'req_recipients', label: 'Recipient restriction', value: 'Aave v3 Pool only', status: 'PASS' },
  {
    id: 'req_forbidden',
    label: 'Forbidden actions',
    value: 'Borrow · withdraw collateral · external recipient',
    status: 'PASS',
  },
  {
    id: 'req_window',
    label: 'Rolling window budget',
    value: 'Not stated',
    status: 'WARN',
    note: 'Without a window budget, repeated actions inside the autonomous limit are unbounded over time.',
  },
];

export const BUILD_STAGES: BuildStage[] = [
  { id: 'stg_requirements', name: 'Requirements', status: 'PASS', detail: 'Requirements r6 produced and validated.', panel: 'output' },
  { id: 'stg_blueprint', name: 'Blueprint', status: 'PASS', detail: 'Blueprint r8 generated from requirements r6.', panel: 'output' },
  { id: 'stg_security', name: 'Security Review', status: 'PASS', detail: 'Deterministic invariants checked; 0 critical findings.', panel: 'problems' },
  { id: 'stg_user', name: 'User Review', status: 'PASS', detail: 'Blueprint r8 accepted by operator@treasury.', panel: 'output' },
  { id: 'stg_build', name: 'Build', status: 'PASS', detail: 'Build r7 produced 24 files and a CRE workflow binary.', panel: 'output' },
  {
    id: 'stg_tests',
    name: 'Tests',
    status: 'WARN',
    detail: '23 of 24 mandatory security scenarios passed; 1 failed with DATA_SOURCE_UNAVAILABLE.',
    panel: 'tests',
  },
];

export const COMPOSER_DRAFT = COMPOSER_EXAMPLES[0].body;

export const QUOTA = { used: 47, limit: 200, window: 'today' };

/* ---------------------------------------------------------- clarification */

/**
 * A question the agent asks to close a gap in the requirements (spec §10, §30).
 *
 * The distinguishing rule of this product lives in `userMustDecide`. The agent
 * conducts the whole interview, but for the fields that bound money it asks and
 * then refuses to answer — it will not offer a figure, will not suggest a
 * "typical" value and will not infer one from the other limits. Every other AI
 * builder would happily propose $5,000 here; proposing it is precisely the
 * failure this product exists to argue against.
 *
 * When the backend lands, `respond()` returns these instead of the static list.
 * The component does not care where they came from.
 */
export interface ClarifyingQuestion {
  /** The requirement this answer closes. */
  requirementId: string;
  question: string;
  /** Why the answer matters — shown under the question, never as a hint. */
  why: string;
  /**
   * True for financial boundaries. The agent may not supply a value, and the
   * UI says so rather than leaving the absence unexplained.
   */
  userMustDecide: boolean;
  placeholder: string;
  /** Non-financial fields may carry candidates parsed from the description. */
  suggestions?: string[];
}

export const CLARIFYING_QUESTIONS: ClarifyingQuestion[] = [
  {
    requirementId: 'req_ceiling',
    question: 'Above what amount should this agent never act, whatever happens?',
    why:
      'This is the hard ceiling. It is the one limit that holds even when every other check has been satisfied, and it is never inferred from the autonomous limit or the escalation band.',
    userMustDecide: true,
    placeholder: 'e.g. $5,000',
  },
  {
    requirementId: 'req_window',
    question: 'How much may it spend in total over a rolling window, and how long is that window?',
    why:
      'Without this, repeated actions each inside the per-action limit are unbounded over time. Ten permitted $900 repayments is $9,000.',
    userMustDecide: true,
    placeholder: 'e.g. $5,000 per 24 hours',
  },
  {
    requirementId: 'req_autonomous',
    question: 'What is the largest single action it may take without asking a human?',
    why: 'Above this, the action escalates for approval instead of executing.',
    userMustDecide: true,
    placeholder: 'e.g. $1,000 per action',
  },
  {
    requirementId: 'req_recipients',
    question: 'Which addresses or contracts may it pay?',
    why: 'An allowlist is what makes a recipient-mutation attack fail at the policy layer rather than on-chain.',
    userMustDecide: false,
    placeholder: 'e.g. the Aave v3 Pool only',
    suggestions: ['Aave v3 Pool only', 'Aave v3 Pool + treasury safe'],
  },
  {
    requirementId: 'req_data',
    question: 'Which data source decides the trigger, and how fresh must it be?',
    why: 'A decision made on stale or unverified data is refused rather than taken on old numbers.',
    userMustDecide: false,
    placeholder: 'e.g. Chainlink ETH/USD, no older than 60s',
    suggestions: ['Chainlink ETH/USD · VERIFIED_ORACLE · ≤ 60s', 'Chainlink ETH/USD · VERIFIED_ORACLE · ≤ 30s'],
  },
  {
    requirementId: 'req_forbidden',
    question: 'What must this agent never be able to do?',
    why: 'Stated forbidden actions become deny rules in the policy, not guidance in a prompt.',
    userMustDecide: false,
    placeholder: 'e.g. borrow, withdraw collateral, pay an external address',
    suggestions: ['Borrow · withdraw collateral · external recipient'],
  },
];

/** Questions for the gaps that are actually open, most severe first. */
export function questionsFor(requirements: DetectedRequirement[]): ClarifyingQuestion[] {
  const open = new Map(requirements.filter((r) => r.status === 'REQUIRED' || r.status === 'WARN').map((r) => [r.id, r]));
  return CLARIFYING_QUESTIONS.filter((q) => open.has(q.requirementId)).sort((a, b) => {
    const rank = (id: string) => (open.get(id)?.status === 'REQUIRED' ? 0 : 1);
    return rank(a.requirementId) - rank(b.requirementId);
  });
}
