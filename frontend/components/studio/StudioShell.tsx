'use client';

/**
 * Assembles the workbench live-state envelope from the data layer and renders
 * the shell. When a real backend arrives this is where the queries go — the
 * shell itself only consumes the typed envelope.
 */
import { useMemo, type ReactNode } from 'react';
import { Workbench, type WorkbenchLiveState } from './shell/Workbench';
import type { NavBadge } from './shell/LeftWorkbench';
import { PROBLEMS, PROJECT, PROJECT_LIST, TEST_RESULTS } from '@/lib/studio/mock/core';
import { CRE, EVENTS, LIVE_SYNC_SECONDS, POLICY, RUNTIME } from '@/lib/studio/mock/operate';

export function StudioShell({ children }: { children: ReactNode }) {
  const live = useMemo<WorkbenchLiveState>(() => {
    const failingTests = TEST_RESULTS.filter((t) => t.status === 'FAIL').length;

    // Navigation badges never rely on colour alone — each carries text + title.
    const navBadges: Record<string, NavBadge[]> = {
      integrations: [{ label: 'BLOCKED', tone: 'blocked', title: 'The Graph adapter is UNAVAILABLE' }],
      reality: [{ label: 'LIMITED', tone: 'warn', title: 'Historical Replay is limited without an archive RPC' }],
      simulation: failingTests
        ? [{ label: `${failingTests}`, tone: 'deny', title: `${failingTests} failing security regression scenario` }]
        : [],
      overview: [{ label: 'LIVE', tone: 'pass', title: 'Showing observed runtime state' }],
      activity: [{ label: 'LIVE', tone: 'pass', title: 'Streaming RuntimeEvents' }],
      cre: [{ label: 'SIM', tone: 'sim', title: 'Official CLI simulator — no DON, no TEE evidence' }],
      runtime: [{ label: 'STOPPED', tone: 'blocked', title: 'Runtime r3 is stopped' }],
      policies: [{ label: 'DISABLED', tone: 'blocked', title: 'Financial authority is disabled' }],
      'control-plane': [{ label: '1 alert', tone: 'deny', title: '1 open HIGH alert' }],
      code: [{ label: 'STALE', tone: 'warn', title: 'Build r7 trails Blueprint r8' }],
    };

    return {
      policyState: POLICY.transitional ?? POLICY.observed,
      policyFreshness: POLICY.onChain.freshness,
      runtimeState: RUNTIME.state,
      creStatus: CRE.status,
      syncSeconds: LIVE_SYNC_SECONDS,
      buildStatus: { label: 'Build r7 · findings', status: 'WARN' },
      navBadges,
      events: EVENTS,
      problemCount: PROBLEMS.length,
    };
  }, []);

  return (
    <Workbench project={PROJECT} projects={PROJECT_LIST} live={live}>
      {children}
    </Workbench>
  );
}
