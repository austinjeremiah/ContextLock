'use client';

/**
 * Overview (spec §21).
 *
 * The post-deployment status page for ordinary users.
 *
 * Rules encoded here:
 *  - Never "LIVE" unqualified. The header states the execution network, the
 *    read-only market source, the CRE mode and that production-chain execution
 *    is disabled.
 *  - Every tile carries its own last-verified time. A tile with no fresh
 *    observation says UNKNOWN rather than showing its last good value.
 *  - Disable Policy and Emergency Lock go through their own typed dialogs.
 */
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Activity as ActivityIcon, Pause, Play, ShieldAlert, ShieldOff, Swords } from 'lucide-react';
import { StudioPage } from '@/components/studio/PageScaffold';
import {
  Badge,
  BlockerBanner,
  Card,
  FreshnessBadge,
  KeyValue,
  ReasonCode,
  Section,
  StatusBadge,
  TimeAgo,
  TrustClassBadge,
  VerdictBadge,
  formatUsd,
} from '@/components/studio/primitives';
import { SecurityConfirmation, EmergencyConfirmation } from '@/components/studio/dialogs';
import { useWorkbench } from '@/lib/studio/workbench';
import { useControlRequest } from '@/lib/studio/control-bridge';
import { PROJECT, agentBySlug } from '@/lib/studio/mock/core';
import { ALERTS, CRE, DECISIONS, EMERGENCY_STEPS, IDENTITY, POLICY, RUNTIME } from '@/lib/studio/mock/operate';
import { SNAPSHOT } from '@/lib/studio/mock/test';
import { ADAPTERS } from '@/lib/studio/mock/engineering';

export default function OverviewPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { pushToast } = useWorkbench();

  const agentSlug = searchParams.get('agent') ?? PROJECT.agents[0].slug;
  const agent = agentBySlug(agentSlug);

  const [disableOpen, setDisableOpen] = useState(false);
  const [emergencyOpen, setEmergencyOpen] = useState(false);
  const [revokeEns, setRevokeEns] = useState(false);

  useControlRequest('DISABLE_POLICY', () => setDisableOpen(true));
  useControlRequest('EMERGENCY_LOCK', () => setEmergencyOpen(true));

  const go = (segment: string, qs = '') => router.push(`/projects/${PROJECT.id}/${segment}?agent=${agentSlug}${qs}`);

  const healthyAdapters = ADAPTERS.filter((a) => a.status === 'HEALTHY').length;
  const openAlerts = ALERTS.filter((a) => a.state === 'OPEN');
  const price = SNAPSHOT.sources.find((s) => s.id === 'src_chainlink_ethusd');

  return (
    <StudioPage
      segment="overview"
      live
      title={agent.name.toUpperCase()}
      subtitle={agent.objective}
      badges={
        <>
          {/* never "LIVE" on its own */}
          <Badge tone="pass" large>
            TESTNET LAB · DEPLOYED
          </Badge>
          <Badge tone="sim">Execution: {PROJECT.environment.executionNetwork}</Badge>
          <Badge tone="data">Reality: {PROJECT.environment.realitySource} · READ ONLY</Badge>
          <Badge tone="sim">CRE: Official CLI Simulator</Badge>
          <Badge tone="deny">Production-chain execution: DISABLED</Badge>
        </>
      }
      actions={
        <>
          <button type="button" className="cl-btn" onClick={() => go('activity')}>
            <ActivityIcon size={13} aria-hidden />
            Open Activity
          </button>
          <button type="button" className="cl-btn" onClick={() => go('simulation')}>
            <Play size={13} aria-hidden />
            Run Simulation
          </button>
          <button type="button" className="cl-btn" onClick={() => go('attacks')}>
            <Swords size={13} aria-hidden />
            Attack Test
          </button>
          <button
            type="button"
            className="cl-btn"
            onClick={() => go('runtime')}
            disabled={RUNTIME.state === 'STOPPED'}
            title={RUNTIME.state === 'STOPPED' ? 'Runtime is already stopped' : undefined}
          >
            <Pause size={13} aria-hidden />
            Pause Runtime
          </button>
          <button
            type="button"
            className="cl-btn cl-btn-danger"
            onClick={() => setDisableOpen(true)}
            disabled={POLICY.observed === 'DISABLED'}
            title={POLICY.observed === 'DISABLED' ? 'Financial authority is already disabled' : undefined}
          >
            <ShieldOff size={13} aria-hidden />
            Disable Policy
          </button>
          <button type="button" className="cl-btn cl-btn-emergency" onClick={() => setEmergencyOpen(true)}>
            <ShieldAlert size={13} aria-hidden />
            Emergency Lock
          </button>
        </>
      }
      banners={
        openAlerts.length > 0 ? (
          <BlockerBanner
            tone="deny"
            title={`${openAlerts.length} open alert`}
            actions={
              <button type="button" className="cl-btn cl-btn-sm" onClick={() => go('control-plane')}>
                Open Control Plane
              </button>
            }
          >
            {openAlerts.map((a) => `${a.type}: ${a.detail}`).join(' ')}
          </BlockerBanner>
        ) : null
      }
    >
      {/* status strip — every tile carries its own freshness */}
      <Section label="Observed state">
        <div className="cl-grid cl-grid-4">
          <Tile label="Policy" value={<StatusBadge status={POLICY.observed} large />} freshness={POLICY.onChain.freshness} onClick={() => go('policies')} />
          <Tile label="Runtime" value={<StatusBadge status={RUNTIME.state} large />} freshness={RUNTIME.heartbeat} onClick={() => go('runtime')} />
          <Tile
            label="CRE"
            value={<Badge tone="sim" large>Official CLI Simulator</Badge>}
            freshness={CRE.freshness}
            onClick={() => go('cre')}
          />
          <Tile
            label="ENS identity"
            value={<StatusBadge status={IDENTITY.state} large />}
            freshness={IDENTITY.freshness}
            onClick={() => go('identity')}
          />
          <Tile
            label="Required adapters"
            value={
              <Badge tone={healthyAdapters === ADAPTERS.length ? 'pass' : 'warn'} large>
                {healthyAdapters} of {ADAPTERS.length} healthy
              </Badge>
            }
            freshness={ADAPTERS[0].freshness}
            onClick={() => go('integrations')}
          />
          <Tile
            label="Current revision"
            value={<Badge tone="neutral" large>{`Deploy r${PROJECT.revisions.deployment} · Blueprint r${PROJECT.revisions.blueprint}`}</Badge>}
            freshness={POLICY.onChain.freshness}
            onClick={() => go('deployments')}
          />
          <Tile
            label="Alerts"
            value={
              openAlerts.length > 0 ? (
                <Badge tone="deny" large>{`${openAlerts.length} open`}</Badge>
              ) : (
                <Badge tone="pass" large>None open</Badge>
              )
            }
            freshness={POLICY.onChain.freshness}
            onClick={() => go('control-plane')}
          />
        </div>
        <p className="cl-meta" style={{ marginTop: 10 }}>
          The deployed revision is r{PROJECT.revisions.deployment}. Blueprint r{PROJECT.revisions.blueprint} exists but
          is not what is running — a draft never replaces the observed live revision here.
        </p>
      </Section>

      {/* authority usage */}
      <Section label="Authority usage">
        <div className="cl-grid cl-grid-2">
          <Card>
            <KeyValue
              rows={[
                { label: 'Autonomous limit', value: `${formatUsd(agent.budget.autonomousPerAction)} per action` },
                {
                  label: 'Used in window',
                  value: `${formatUsd(agent.budget.windowUsed)} of ${formatUsd(agent.budget.windowLimit)} · ${agent.budget.window}`,
                },
                { label: 'Escalation band', value: `${formatUsd(1000)} – ${formatUsd(5000)} · human approval required` },
                { label: 'Hard deny ceiling', value: <Badge tone="deny">{`Above ${formatUsd(5000)} — never permitted`}</Badge> },
              ]}
            />
            <div style={{ marginTop: 14 }}>
              <div className="cl-label" style={{ marginBottom: 6 }}>
                Window consumption
              </div>
              <div style={{ height: 8, background: 'var(--cl-line)', overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${(agent.budget.windowUsed / agent.budget.windowLimit) * 100}%`,
                    background: 'var(--cl-ink)',
                  }}
                />
              </div>
            </div>
          </Card>

          <Card title="Market context">
            <KeyValue
              rows={[
                { label: 'Snapshot age', value: `${SNAPSHOT.ageSeconds}s` },
                { label: 'Verified price', value: price?.value ?? '—', mono: true },
                {
                  label: 'Source / trust',
                  value: price ? (
                    <span className="cl-row" style={{ gap: 6 }}>
                      {price.provider}
                      <TrustClassBadge trust={price.trustClass} />
                    </span>
                  ) : (
                    '—'
                  ),
                },
                { label: 'Access', value: <Badge tone="data">MAINNET · READ ONLY</Badge> },
              ]}
            />
            {price ? (
              <div style={{ marginTop: 12 }}>
                <FreshnessBadge freshness={price.freshness} />
              </div>
            ) : null}
          </Card>
        </div>
      </Section>

      {/* live architecture, compact */}
      <Section
        label="Live architecture"
        actions={
          <button type="button" className="cl-btn cl-btn-sm" onClick={() => go('architecture')}>
            Open Architecture
          </button>
        }
      >
        <Card>
          <div className="cl-row cl-row-wrap" style={{ gap: 6 }}>
            {[
              { label: 'Trigger', status: RUNTIME.state === 'STOPPED' ? 'STOPPED' : 'HEALTHY' },
              { label: 'Data', status: 'DEGRADED' },
              { label: 'Strategy', status: RUNTIME.state === 'STOPPED' ? 'STOPPED' : 'HEALTHY' },
              { label: 'CRE', status: 'SIMULATED' },
              { label: 'Policy', status: POLICY.observed },
              { label: 'Capability', status: 'NOT_ISSUED' },
              { label: 'Executor', status: 'READY' },
              { label: 'Aave v3', status: 'HEALTHY' },
            ].map((node, i, all) => (
              <span key={node.label} className="cl-row" style={{ gap: 6 }}>
                <span
                  style={{
                    display: 'inline-flex',
                    flexDirection: 'column',
                    gap: 4,
                    padding: '8px 11px',
                    border: '1px solid var(--cl-line)',
                    background: 'var(--cl-panel-2)',
                    minWidth: 0,
                  }}
                >
                  <span className="cl-strong" style={{ fontSize: 12 }}>
                    {node.label}
                  </span>
                  <StatusBadge status={node.status} icon={false} />
                </span>
                {i < all.length - 1 ? <span className="cl-dim">→</span> : null}
              </span>
            ))}
          </div>
          <p className="cl-meta" style={{ marginTop: 10 }}>
            Observed state on the deployed path. With the policy disabled no capability can be issued, so nothing
            downstream of it can execute.
          </p>
        </Card>
      </Section>

      {/* recent decisions */}
      <Section
        label="Recent decisions"
        actions={
          <button type="button" className="cl-btn cl-btn-sm" onClick={() => go('activity')}>
            Open Activity
          </button>
        }
      >
        <Card flush>
          <div className="cl-table-scroll">
            <table className="cl-table" style={{ minWidth: 880 }}>
              <thead>
                <tr>
                  <th style={{ width: 120 }}>Time</th>
                  <th style={{ width: 120 }}>Verdict</th>
                  <th style={{ minWidth: 170 }}>Action</th>
                  <th style={{ width: 100 }}>Amount</th>
                  <th style={{ minWidth: 230 }}>Reason</th>
                  <th style={{ width: 130 }}>Execution</th>
                </tr>
              </thead>
              <tbody>
                {DECISIONS.map((decision) => (
                  <tr
                    key={decision.id}
                    data-clickable="true"
                    onClick={() => go('activity', `&correlation=${decision.correlationId}`)}
                  >
                    <td className="cl-meta">
                      <TimeAgo iso={decision.at} />
                    </td>
                    <td>
                      <VerdictBadge verdict={decision.verdict} />
                    </td>
                    <td>{decision.action}</td>
                    <td className="cl-mono">{decision.amount}</td>
                    <td>
                      <div style={{ fontSize: 12.5 }}>{decision.reason}</div>
                      {decision.reasonCode ? (
                        <div style={{ marginTop: 4 }} onClick={(e) => e.stopPropagation()}>
                          <ReasonCode
                            code={decision.reasonCode}
                            verdict={decision.verdict}
                            onOpenPolicy={() => go('policies')}
                          />
                        </div>
                      ) : null}
                    </td>
                    <td>
                      <StatusBadge status={decision.executionResult} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </Section>

      {/* disable policy */}
      <SecurityConfirmation
        open={disableOpen}
        onClose={() => setDisableOpen(false)}
        onConfirm={() => {
          setDisableOpen(false);
          pushToast('Disable submitted. State stays DISABLING until a fresh chain read confirms it.');
          go('policies');
        }}
        action="Disable financial authority"
        currentState={<StatusBadge status={POLICY.observed} />}
        requestedState={<StatusBadge status="DISABLED" />}
        network={POLICY.network}
        resource={`Policy Registry · ${POLICY.onChain.contracts[0].address}`}
        consequence="No new capability can be issued, so no new execution can be authorized. Work already in flight is unaffected until its capability expires."
        actionLabel="Disable Financial Authority"
      />

      {/* emergency lock */}
      <EmergencyConfirmation
        open={emergencyOpen}
        onClose={() => setEmergencyOpen(false)}
        onConfirm={() => {
          setEmergencyOpen(false);
          pushToast('Emergency Lock submitted — see Control Plane for per-step results');
          go('control-plane');
        }}
        steps={EMERGENCY_STEPS}
        revokeEns={revokeEns}
        onRevokeEnsChange={setRevokeEns}
      />
    </StudioPage>
  );
}

function Tile({
  label,
  value,
  freshness,
  onClick,
}: {
  label: string;
  value: React.ReactNode;
  freshness: Parameters<typeof FreshnessBadge>[0]['freshness'];
  onClick: () => void;
}) {
  return (
    <button type="button" className="cl-card" style={{ textAlign: 'left', padding: 0, cursor: 'pointer' }} onClick={onClick}>
      <div className="cl-card-body">
        <div className="cl-label" style={{ marginBottom: 8 }}>
          {label}
        </div>
        {value}
        <div style={{ marginTop: 10 }}>
          <FreshnessBadge freshness={freshness} compact />
        </div>
      </div>
    </button>
  );
}
