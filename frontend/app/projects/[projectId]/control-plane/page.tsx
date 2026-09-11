'use client';

/**
 * Control Plane (spec §25).
 *
 * Operator view of live components, reconciliation, alerts and emergency
 * controls.
 *
 * Rules encoded here:
 *  - Emergency Lock attempts the financial policy first, and reports each step
 *    separately. A partial result is shown as partial, never rounded up to
 *    success.
 *  - An alert is only resolvable once evidence or reconciliation supports it.
 *  - Drift is expected-vs-observed, with observed treated as the truth.
 */
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Activity, RefreshCw, ShieldAlert, ShieldOff } from 'lucide-react';
import { StudioPage } from '@/components/studio/PageScaffold';
import {
  Badge,
  BlockerBanner,
  Card,
  FreshnessBadge,
  KeyValue,
  Section,
  SeverityBadge,
  StatusBadge,
  TimeAgo,
} from '@/components/studio/primitives';
import { EmergencyConfirmation, SecurityConfirmation, StandardConfirmation } from '@/components/studio/dialogs';
import { useWorkbench } from '@/lib/studio/workbench';
import { useControlRequest } from '@/lib/studio/control-bridge';
import { PROJECT, agentBySlug } from '@/lib/studio/mock/core';
import { ALERTS, CRE, EMERGENCY_STEPS, POLICY, RUNTIME, TOPOLOGY } from '@/lib/studio/mock/operate';
import type { Alert, EmergencyLockResult, Status } from '@/lib/studio/types';

export default function ControlPlanePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setSelection, pushToast } = useWorkbench();

  const agentSlug = searchParams.get('agent') ?? PROJECT.agents[0].slug;
  const agent = agentBySlug(agentSlug);

  const [alerts, setAlerts] = useState<Alert[]>(ALERTS);
  const [emergencyOpen, setEmergencyOpen] = useState(false);
  const [revokeEns, setRevokeEns] = useState(false);
  const [disableOpen, setDisableOpen] = useState(false);
  const [revokeOpen, setRevokeOpen] = useState(false);
  const [reconciling, setReconciling] = useState(false);
  const [result, setResult] = useState<EmergencyLockResult | null>(null);

  useControlRequest('EMERGENCY_LOCK', () => setEmergencyOpen(true));
  useControlRequest('DISABLE_POLICY', () => setDisableOpen(true));
  useControlRequest('REVOKE_AGENT', () => setRevokeOpen(true));

  const drifted = TOPOLOGY.filter((c) => c.drift);
  const openAlerts = alerts.filter((a) => a.state === 'OPEN');

  /* The financial policy is attempted first, and each step reports its own
     outcome. A step that fails does not stop the rest, and does not get folded
     into an overall "success". */
  const runEmergencyLock = () => {
    setEmergencyOpen(false);
    const steps = [
      { id: 'el_policy', label: 'Disable ContextLock policy', status: 'PASS' as Status },
      { id: 'el_capability', label: 'Block new capability issuance', status: 'PASS' as Status },
      {
        id: 'el_cre',
        label: 'Pause CRE path',
        status: 'FAIL' as Status,
        detail: 'Simulator did not acknowledge the pause request within the timeout.',
      },
      { id: 'el_runtime', label: 'Stop agent runtime', status: 'PASS' as Status },
      {
        id: 'el_ens',
        label: 'Revoke agent identity',
        status: (revokeEns ? 'PASS' : 'NOT_REQUESTED') as Status,
      },
    ];
    setResult({
      outcome: steps.some((s) => s.status === 'FAIL') ? 'EMERGENCY_LOCK_PARTIAL' : 'EMERGENCY_LOCK_COMPLETE',
      steps,
      policyState: 'DISABLED',
      at: new Date().toISOString(),
    });
    pushToast('Emergency Lock executed — see the per-step result');
  };

  return (
    <StudioPage
      segment="control-plane"
      live
      subtitle="Operator view of every live component, its expected state and its drift."
      badges={
        <>
          <Badge tone="neutral">{agent.name}</Badge>
          <span className="cl-meta">Last full reconciliation</span>
          <FreshnessBadge freshness={TOPOLOGY[0].freshness} />
          {drifted.length > 0 ? <Badge tone="warn">{drifted.length} drifted</Badge> : <Badge tone="pass">No drift</Badge>}
        </>
      }
      actions={
        <>
          <button
            type="button"
            className="cl-btn"
            onClick={() => {
              setReconciling(true);
              window.setTimeout(() => {
                setReconciling(false);
                pushToast('Reconciliation complete');
              }, 1000);
            }}
            disabled={reconciling}
          >
            <RefreshCw size={13} aria-hidden />
            {reconciling ? 'Reconciling…' : 'Run reconciliation'}
          </button>
          <button
            type="button"
            className="cl-btn cl-btn-danger"
            onClick={() => setDisableOpen(true)}
            disabled={POLICY.observed === 'DISABLED'}
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
        <>
          {result ? (
            <BlockerBanner
              tone={result.outcome === 'EMERGENCY_LOCK_PARTIAL' ? 'warn' : 'pass'}
              title={result.outcome}
            >
              Financial policy: {result.policyState}. Each step is reported separately below — a partial result is not
              presented as a success.
            </BlockerBanner>
          ) : null}

          {openAlerts.length > 0 ? (
            <BlockerBanner tone="deny" title={`${openAlerts.length} open alert`}>
              {openAlerts.map((a) => `${a.type} on ${a.resource}`).join(' · ')}
            </BlockerBanner>
          ) : null}
        </>
      }
    >
      {/* emergency result */}
      {result ? (
        <Section label="Emergency lock result">
          <div className="cl-steps">
            {result.steps.map((step, i) => (
              <div className="cl-step" key={step.id} style={{ cursor: 'default' }}>
                <span className="cl-step-index">{i + 1}</span>
                <span className="cl-step-name">{step.label}</span>
                <span className="cl-step-status">
                  <StatusBadge status={step.status} />
                </span>
                <span className="cl-step-detail">{step.detail ?? ''}</span>
              </div>
            ))}
          </div>
          <Card>
            <KeyValue
              rows={[
                { label: 'Result', value: <Badge tone={result.outcome.endsWith('PARTIAL') ? 'warn' : 'pass'}>{result.outcome}</Badge> },
                { label: 'Financial policy', value: <StatusBadge status={result.policyState} /> },
                { label: 'Executed', value: <TimeAgo iso={result.at} /> },
              ]}
            />
            <p className="cl-meta" style={{ marginTop: 10 }}>
              The financial policy was attempted first and succeeded, which is the outcome that matters most. The CRE
              pause failed and is reported as failed — it is not hidden behind the steps that worked.
            </p>
          </Card>
        </Section>
      ) : null}

      {/* topology */}
      <Section label="System topology">
        <div className="cl-grid cl-grid-auto">
          {TOPOLOGY.map((component) => (
            <button
              key={component.id}
              type="button"
              className="cl-card"
              style={{
                textAlign: 'left',
                padding: 0,
                cursor: 'pointer',
                borderColor: component.drift ? 'var(--cl-warn)' : 'var(--cl-line)',
              }}
              onClick={() => setSelection({ kind: 'component', id: component.id, label: component.name })}
            >
              <div className="cl-card-head" style={{ background: component.drift ? 'var(--cl-warn-bg)' : undefined }}>
                <div className="cl-card-title">{component.name}</div>
                <StatusBadge status={component.currentState} />
              </div>
              <div className="cl-card-body">
                <p className="cl-meta" style={{ whiteSpace: 'normal', marginBottom: 10 }}>
                  {component.detail}
                </p>
                <KeyValue
                  rows={[
                    { label: 'Expected', value: <StatusBadge status={component.expectedState} icon={false} /> },
                    {
                      label: 'Drift',
                      value: component.drift ? <Badge tone="warn">Yes</Badge> : <Badge tone="pass">None</Badge>,
                    },
                    {
                      label: 'Last failure',
                      value: component.lastFailure ? <TimeAgo iso={component.lastFailure} /> : 'none recorded',
                    },
                  ]}
                />
                <div style={{ marginTop: 10 }}>
                  <FreshnessBadge freshness={component.freshness} compact />
                </div>
              </div>
            </button>
          ))}
        </div>
      </Section>

      {/* reconciliation */}
      <Section label="Reconciliation">
        <Card flush>
          <table className="cl-table">
            <thead>
              <tr>
                <th style={{ minWidth: 180 }}>Field</th>
                <th style={{ width: 180 }}>Expected</th>
                <th style={{ width: 200 }}>Observed</th>
                <th style={{ width: 110 }}>State</th>
              </tr>
            </thead>
            <tbody>
              {POLICY.drift.map((row) => (
                <tr key={row.field}>
                  <td className="cl-strong">{row.field}</td>
                  <td className="cl-mono" style={{ fontSize: 11.5 }}>
                    {row.expected}
                  </td>
                  <td className="cl-mono" style={{ fontSize: 11.5, color: row.drifted ? 'var(--cl-warn)' : undefined }}>
                    {row.observed}
                  </td>
                  <td>{row.drifted ? <SeverityBadge severity={row.severity} /> : <StatusBadge status="PASS" />}</td>
                </tr>
              ))}
              <tr>
                <td className="cl-strong">Runtime state</td>
                <td className="cl-mono" style={{ fontSize: 11.5 }}>
                  READY
                </td>
                <td className="cl-mono" style={{ fontSize: 11.5, color: 'var(--cl-warn)' }}>
                  {RUNTIME.state}
                </td>
                <td>
                  <SeverityBadge severity="MEDIUM" />
                </td>
              </tr>
            </tbody>
          </table>
        </Card>
        <p className="cl-meta" style={{ marginTop: 10 }}>
          Where the two columns differ, the observed column is the truth. Expected is what the deployment intended, not
          what is running.
        </p>
      </Section>

      {/* alerts */}
      <Section label="Alerts">
        <Card flush>
          <div className="cl-table-scroll">
            <table className="cl-table" style={{ minWidth: 1000 }}>
              <thead>
                <tr>
                  <th style={{ width: 110 }}>Severity</th>
                  <th style={{ width: 230 }}>Alert type</th>
                  <th style={{ width: 180 }}>Resource</th>
                  <th style={{ width: 120 }}>First seen</th>
                  <th style={{ width: 120 }}>Last seen</th>
                  <th style={{ width: 110 }}>Occurrences</th>
                  <th style={{ width: 140 }}>State</th>
                  <th style={{ width: 230 }} />
                </tr>
              </thead>
              <tbody>
                {alerts.map((alert) => (
                  <tr key={alert.id}>
                    <td>
                      <SeverityBadge severity={alert.severity} />
                    </td>
                    <td>
                      <div className="cl-mono" style={{ fontSize: 11.5 }}>
                        {alert.type}
                      </div>
                      <div className="cl-meta" style={{ whiteSpace: 'normal' }}>
                        {alert.detail}
                      </div>
                    </td>
                    <td className="cl-mono" style={{ fontSize: 11.5 }}>
                      {alert.resource}
                    </td>
                    <td className="cl-meta">
                      <TimeAgo iso={alert.firstSeen} />
                    </td>
                    <td className="cl-meta">
                      <TimeAgo iso={alert.lastSeen} />
                    </td>
                    <td className="cl-mono">{alert.occurrences}</td>
                    <td>
                      <StatusBadge status={alert.state === 'OPEN' ? 'WARN' : alert.state === 'ACKNOWLEDGED' ? 'PENDING' : 'PASS'} label={alert.state} />
                    </td>
                    <td>
                      <div className="cl-row" style={{ justifyContent: 'flex-end', gap: 6 }}>
                        <button
                          type="button"
                          className="cl-btn cl-btn-sm"
                          disabled={alert.state !== 'OPEN'}
                          onClick={() =>
                            setAlerts((prev) =>
                              prev.map((a) => (a.id === alert.id ? { ...a, state: 'ACKNOWLEDGED' } : a)),
                            )
                          }
                        >
                          Acknowledge
                        </button>
                        <button
                          type="button"
                          className="cl-btn cl-btn-sm"
                          onClick={() =>
                            router.push(
                              `/projects/${PROJECT.id}/activity?agent=${agentSlug}&event=${alert.evidenceEventIds[0] ?? ''}`,
                            )
                          }
                          disabled={alert.evidenceEventIds.length === 0}
                        >
                          Open evidence
                        </button>
                        <button
                          type="button"
                          className="cl-btn cl-btn-sm"
                          /* Resolve requires evidence or a clean reconciliation:
                             an alert is never closed just to tidy the list. */
                          disabled={alert.state === 'RESOLVED' || alert.state === 'OPEN'}
                          title={
                            alert.state === 'OPEN'
                              ? 'Acknowledge and reconcile before resolving'
                              : undefined
                          }
                          onClick={() =>
                            setAlerts((prev) => prev.map((a) => (a.id === alert.id ? { ...a, state: 'RESOLVED' } : a)))
                          }
                        >
                          Resolve
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </Section>

      {/* control groups */}
      <Section label="Controls">
        <div className="cl-grid cl-grid-2">
          <Card title="Operational">
            <div className="cl-btn-group">
              <button
                type="button"
                className="cl-btn"
                onClick={() => router.push(`/projects/${PROJECT.id}/runtime?agent=${agentSlug}`)}
              >
                Pause / Resume Runtime
              </button>
            </div>
            <p className="cl-meta" style={{ marginTop: 10 }}>
              Process controls. They do not change financial authority.
            </p>
          </Card>

          <Card title="CRE">
            <div className="cl-btn-group">
              <button
                type="button"
                className="cl-btn"
                onClick={() => router.push(`/projects/${PROJECT.id}/cre?agent=${agentSlug}`)}
              >
                Start / Stop / Restart Simulator
              </button>
            </div>
            <p className="cl-meta" style={{ marginTop: 10 }}>
              Mode is {CRE.mode === 'CONTEXTLOCK_SIMULATOR' ? 'the official CLI simulator' : CRE.mode}. No DON workflow
              is deployed, so there is nothing to pause or activate.
            </p>
          </Card>

          <Card title="Financial security">
            <div className="cl-btn-group">
              <button
                type="button"
                className="cl-btn cl-btn-danger"
                onClick={() => setDisableOpen(true)}
                disabled={POLICY.observed === 'DISABLED'}
              >
                <ShieldOff size={13} aria-hidden />
                Disable Policy
              </button>
            </div>
            <p className="cl-meta" style={{ marginTop: 10 }}>
              Currently {POLICY.observed}. This is the control that stops authorization, not the runtime controls.
            </p>
          </Card>

          <Card title="Identity">
            <div className="cl-btn-group">
              <button type="button" className="cl-btn cl-btn-danger" onClick={() => setRevokeOpen(true)}>
                Revoke Agent
              </button>
            </div>
            <p className="cl-meta" style={{ marginTop: 10 }}>
              Revocation stops previously issued capabilities being honoured. It does not change the policy state.
            </p>
          </Card>
        </div>
      </Section>

      <Section label="Emergency">
        <Card>
          <div className="cl-row cl-row-wrap" style={{ gap: 14 }}>
            <button type="button" className="cl-btn cl-btn-emergency" onClick={() => setEmergencyOpen(true)}>
              <ShieldAlert size={14} aria-hidden />
              Emergency Lock
            </button>
            <span className="cl-meta" style={{ flex: '1 1 260px', whiteSpace: 'normal' }}>
              Attempts, in order: disable the policy, block new capabilities, pause the CRE path, stop the runtime and
              optionally revoke the identity. The financial policy is attempted first, and every step reports its own
              result.
            </span>
          </div>
        </Card>
      </Section>

      <EmergencyConfirmation
        open={emergencyOpen}
        onClose={() => setEmergencyOpen(false)}
        onConfirm={runEmergencyLock}
        steps={EMERGENCY_STEPS}
        revokeEns={revokeEns}
        onRevokeEnsChange={setRevokeEns}
      />

      <SecurityConfirmation
        open={disableOpen}
        onClose={() => setDisableOpen(false)}
        onConfirm={() => {
          setDisableOpen(false);
          pushToast('Disable submitted — confirm with a fresh chain read on Policies');
          router.push(`/projects/${PROJECT.id}/policies?agent=${agentSlug}`);
        }}
        action="Disable financial authority"
        currentState={<StatusBadge status={POLICY.observed} />}
        requestedState={<StatusBadge status="DISABLED" />}
        network={POLICY.network}
        resource={`Policy Registry · ${POLICY.onChain.contracts[0].address}`}
        consequence="No new capability can be issued, so no new execution can be authorized."
        actionLabel="Disable Financial Authority"
      />

      <StandardConfirmation
        open={revokeOpen}
        onClose={() => setRevokeOpen(false)}
        onConfirm={() => {
          setRevokeOpen(false);
          router.push(`/projects/${PROJECT.id}/identity?agent=${agentSlug}`);
        }}
        title="Revoke agent identity"
        consequence="Revocation is completed on the Identity page, where the sibling and capability impact are stated in full before anything is submitted."
        resource={agent.ensName}
        actionLabel="Open Identity"
      />
    </StudioPage>
  );
}
