/**
 * Safety Reports & Evidence (spec §28).
 *
 * A report states what the agent was built to do and what was *actually*
 * tested. Two rules shape every row here:
 *
 *  - A simulated result is labelled simulated. The CRE evidence report says
 *    official simulation YES and DON / consensus / TEE NO, because that is
 *    what the run produced.
 *  - Nothing is downloadable or shareable until secret scanning has passed.
 *    An unscanned report is not "probably fine" — it is UNSCANNED, and the
 *    download stays unavailable.
 */
import type { Report } from '../types';
import { NOW } from './core';

function isoAgo(seconds: number): string {
  return new Date(NOW.getTime() - seconds * 1000).toISOString();
}

export const REPORTS: Report[] = [
  {
    id: 'rep_safety_8',
    type: 'agent-safety',
    title: 'Agent Safety Report',
    revision: 8,
    generatedAt: isoAgo(5400),
    hash: '0x8a31c7f4e0d962b5178c3a4e0f7b2d95c81e64a3f0b7d25e9c4a1f8b360d7e2c',
    current: true,
    privacy: 'SECRET_FREE',
    secretScan: 'PASS',
    sections: [
      {
        title: 'Agent goal',
        rows: [
          {
            label: 'Objective',
            value:
              'Prevent liquidation of the treasury Aave position by repaying debt when the health factor falls below 1.25.',
          },
          { label: 'Organization', value: 'treasury.ctxlock.eth' },
          { label: 'Execution class', value: 'WRITE_CAPABLE · testnet only' },
        ],
      },
      {
        title: 'Blueprint & Strategy hashes',
        rows: [
          { label: 'Blueprint r8', value: '0x4f2a9c18e07b3d65a1c84f0e29b7d536c0a8e14f7b29d63c5e081a4f7c2b9d60', mono: true },
          { label: 'Strategy r8', value: '0xd71b4e0a96c38f25a0e7c194b83d6f2a0c57e91b4d38a6c0f295e7183b4c6d02', mono: true },
        ],
      },
      {
        title: 'ENS identity',
        rows: [
          { label: 'Name', value: 'guardian.treasury.ctxlock.eth' },
          { label: 'Node', value: '0x2b91f47c05e8a3d6791b4c0e8f25a73d96c14b08e5f7a2d93c60b18e4f7a5c23', mono: true },
          { label: 'State', value: 'ACTIVE' },
          { label: 'Financial authority', value: 'Not stored in ENS — held by the ContextLock policy' },
        ],
      },
      {
        title: 'Permissions',
        rows: [
          { label: 'Autonomous per action', value: '≤ $1,000' },
          { label: 'Escalation band', value: '$1,000 – $5,000 · human approval required' },
          { label: 'Hard ceiling', value: 'Above $5,000 — never permitted' },
          { label: 'Recipients', value: 'Aave v3 Pool (allowlisted) only' },
          { label: 'Denied', value: 'Borrow, withdraw collateral, external recipient, mainnet write' },
        ],
      },
      {
        title: 'Execution testnets',
        rows: [
          { label: 'Execution network', value: 'Ethereum Sepolia (chainId 11155111)' },
          { label: 'Reality source', value: 'Ethereum Mainnet · READ ONLY' },
        ],
      },
      {
        title: 'Production write boundary',
        rows: [
          { label: 'Production-chain execution', value: 'DISABLED' },
          {
            label: 'Enforcement',
            value: 'Execution network guard denies a mainnet write with MAINNET_WRITE_PROHIBITED. Proved by attack run.',
          },
        ],
      },
      {
        title: 'Adapters & versions',
        rows: [
          { label: 'Chainlink Data Feeds 1.4.0', value: 'VERIFIED_ORACLE · HEALTHY' },
          { label: 'Aave v3 1.2.1', value: 'PROTOCOL · HEALTHY' },
          { label: 'Sepolia RPC 1.0.3', value: 'RPC · HEALTHY' },
          { label: 'The Graph 0.9.4', value: 'INDEXED · UNAVAILABLE — credential missing' },
        ],
      },
      {
        title: 'CRE evidence classification',
        rows: [
          { label: 'Official CRE simulation', value: 'YES — official CRE CLI simulator' },
          { label: 'Real DON execution', value: 'NO' },
          { label: 'DON consensus', value: 'NO' },
          { label: 'Hardware TEE attestation', value: 'NO' },
          { label: 'CRE workflow hash', value: '0x6b1f83c4a09e27d5b8f1c4a70e3d96b2f5a8c1e04d7b3f6a9c2e5b8d1f4a7c0e', mono: true },
        ],
      },
      {
        title: 'Runtime',
        rows: [
          { label: 'Image digest', value: 'sha256:9f4c72be18d305a7c6e94b2f0d81a35c7e46b9f2a0c85d13e7b6a4f90c21ab5d', mono: true },
          { label: 'Observed state', value: 'STOPPED' },
        ],
      },
      {
        title: 'Simulations',
        rows: [
          { label: 'Scenarios run', value: '24 built against Blueprint r8' },
          { label: 'Result', value: '23 passed · 1 failed (DATA_SOURCE_UNAVAILABLE)' },
          { label: 'Mandatory coverage', value: '18 of 18 mandatory scenarios executed' },
        ],
      },
      {
        title: 'Attacks',
        rows: [
          { label: 'Attack scenarios run', value: '9' },
          { label: 'Stopped at policy layer', value: '7 — capability never issued' },
          { label: 'Stopped at network guard', value: '2 — MAINNET_WRITE_PROHIBITED' },
          { label: 'Succeeded', value: 'None' },
        ],
      },
      {
        title: 'Deployment receipts',
        rows: [
          { label: 'Deployment r3', value: 'Ethereum Sepolia · READY · policy begins DISABLED' },
          { label: 'Policy Registry', value: '0xCBd9417e2c8b05d3f6a91e4c7b2d8f0a5e937F24', mono: true },
        ],
      },
      {
        title: 'Blockers & findings',
        rows: [
          { label: 'Open · HIGH', value: 'The Graph data source UNAVAILABLE — indexed history not served, not substituted' },
          { label: 'Open · MEDIUM', value: 'Historical Replay LIMITED — no archive RPC registered' },
          { label: 'Deployment gate', value: 'Requires a clean security regression; 1 scenario currently failing' },
        ],
      },
    ],
  },
  {
    id: 'rep_deploy_3',
    type: 'deployment-receipt',
    title: 'Deployment Receipt',
    revision: 3,
    generatedAt: isoAgo(7200),
    hash: '0x1c78b3e0a45f92d6c803b7e14a9f256d0b83c7e21f4a95d6083b2c7e14f9a05d',
    current: true,
    privacy: 'SECRET_FREE',
    secretScan: 'PASS',
  },
  {
    id: 'rep_sim_8',
    type: 'simulation',
    title: 'Simulation Report',
    revision: 8,
    generatedAt: isoAgo(1500),
    hash: '0x93a0c74e18b5d26f07c3a9e45b81d720f6c34a8e09b7d15c2e60a4f83b9d7c15',
    current: true,
    privacy: 'SECRET_FREE',
    secretScan: 'PASS',
  },
  {
    id: 'rep_attack_8',
    type: 'attack-lab',
    title: 'Attack Lab Report',
    revision: 8,
    generatedAt: isoAgo(2400),
    hash: '0x57e2b1c840a97d3f6b05e8c247a1f930d6b84c05e39a72f18d40b6c295e70a3f',
    current: true,
    privacy: 'SECRET_FREE',
    secretScan: 'PASS',
  },
  {
    /* Built against r7 while the Blueprint is at r8 — stale, and stale is said
       out loud rather than the report quietly being treated as current. */
    id: 'rep_reality_7',
    type: 'reality-fork',
    title: 'Reality / Fork Report',
    revision: 7,
    generatedAt: isoAgo(96000),
    hash: '0xa41f07c8b59e2d6304a7f1b8c05e93d27a6b0f4c81e5d39a07b2c64f8e1a5d03',
    current: false,
    privacy: 'SECRET_FREE',
    secretScan: 'PASS',
  },
  {
    id: 'rep_cre_8',
    type: 'cre-evidence',
    title: 'CRE Simulation Evidence',
    revision: 8,
    generatedAt: isoAgo(3000),
    hash: '0x2f60a83c17b94e0d5a28c7f31b6e04a95d7c82b013f6a4e97c05d2b8a4f16e70',
    current: true,
    privacy: 'SECRET_FREE',
    secretScan: 'PASS',
  },
  {
    /* Never generated. An ungenerated report has no hash and no scan result —
       it is not an empty pass. */
    id: 'rep_tests_8',
    type: 'test-results',
    title: 'Test Results',
    revision: 8,
    generatedAt: null,
    hash: null,
    current: false,
    privacy: 'UNSCANNED',
    secretScan: 'UNKNOWN',
  },
];

export const REPORT_TYPE_LABEL: Record<Report['type'], string> = {
  'agent-safety': 'Agent safety',
  'deployment-receipt': 'Deployment receipt',
  simulation: 'Simulation',
  'attack-lab': 'Attack lab',
  'reality-fork': 'Reality / fork',
  'cre-evidence': 'CRE evidence',
  'test-results': 'Test results',
};

/** Evidence bundle backing the reports (spec §28, Evidence tab). */
export interface EvidenceItem {
  id: string;
  name: string;
  kind: 'artifact' | 'receipt' | 'run-log' | 'attestation' | 'snapshot';
  producedAt: string;
  hash: string;
  sizeLabel: string;
  /** What this proves — stated plainly, never inflated. */
  proves: string;
  /** Present only where the evidence is of a simulated run. */
  simulated?: boolean;
}

export const EVIDENCE: EvidenceItem[] = [
  {
    id: 'ev_wasm_r7',
    name: 'cre-workflow.wasm',
    kind: 'artifact',
    producedAt: isoAgo(5600),
    hash: '0x6b1f83c4a09e27d5b8f1c4a70e3d96b2f5a8c1e04d7b3f6a9c2e5b8d1f4a7c0e',
    sizeLabel: '284 KB',
    proves: 'The exact workflow binary the simulator executed. Hash matches the one in the deployment receipt.',
  },
  {
    id: 'ev_cre_run',
    name: 'cre-simulator-run.jsonl',
    kind: 'run-log',
    producedAt: isoAgo(3000),
    hash: '0xb05c87e2a13f49d06b7e2c85a0f1d374b9c6e08a25f7d13b46c09e8a2f5b07d1',
    sizeLabel: '1.2 MB',
    proves: 'Step-by-step output of the official CRE CLI simulator run.',
    simulated: true,
  },
  {
    id: 'ev_sim_runs',
    name: 'simulation-runs-r8.json',
    kind: 'run-log',
    producedAt: isoAgo(1500),
    hash: '0x93a0c74e18b5d26f07c3a9e45b81d720f6c34a8e09b7d15c2e60a4f83b9d7c15',
    sizeLabel: '412 KB',
    proves: 'Deterministic inputs, expected results and actual results for all 24 scenarios.',
    simulated: true,
  },
  {
    id: 'ev_attack_runs',
    name: 'attack-runs-r8.json',
    kind: 'run-log',
    producedAt: isoAgo(2400),
    hash: '0x57e2b1c840a97d3f6b05e8c247a1f930d6b84c05e39a72f18d40b6c295e70a3f',
    sizeLabel: '188 KB',
    proves: 'For each attack, the layer that stopped it and whether a capability was ever issued.',
    simulated: true,
  },
  {
    id: 'ev_deploy_receipt',
    name: 'deployment-r3-receipt.json',
    kind: 'receipt',
    producedAt: isoAgo(7200),
    hash: '0x1c78b3e0a45f92d6c803b7e14a9f256d0b83c7e21f4a95d6083b2c7e14f9a05d',
    sizeLabel: '24 KB',
    proves: 'Contract addresses and transaction hashes as observed on Ethereum Sepolia at deploy time.',
  },
  {
    id: 'ev_snapshot',
    name: 'reality-snapshot-anchor.json',
    kind: 'snapshot',
    producedAt: isoAgo(96000),
    hash: '0xa41f07c8b59e2d6304a7f1b8c05e93d27a6b0f4c81e5d39a07b2c64f8e1a5d03',
    sizeLabel: '61 KB',
    proves: 'Anchor block and per-source freshness for the market snapshot the runs were built on.',
  },
];

export const EVIDENCE_KIND_LABEL: Record<EvidenceItem['kind'], string> = {
  artifact: 'Artifact',
  receipt: 'Receipt',
  'run-log': 'Run log',
  attestation: 'Attestation',
  snapshot: 'Snapshot',
};
