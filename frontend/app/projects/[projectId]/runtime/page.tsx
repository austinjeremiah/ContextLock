'use client';

/**
 * Runtime (spec §24).
 *
 * Operate the containerized agent process without confusing process state with
 * financial authority.
 *
 * Rules encoded here:
 *  - A running process with a broken dependency is DEGRADED, not healthy.
 *  - Every stop-type control states plainly that it does not disable on-chain
 *    financial authority.
 *  - After a revision switch the old runtime credential must be fenced, and the
 *    page shows that verification rather than assuming it.
 */
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { GitCompare, Pause, Play, RotateCcw, ScrollText, Square, Undo2 } from 'lucide-react';
import { StudioPage } from '@/components/studio/PageScaffold';
import {
  Badge,
  BlockerBanner,
  Card,
  FreshnessBadge,
  KeyValue,
  Section,
  StatusBadge,
  TimeAgo,
} from '@/components/studio/primitives';
import { SecurityConfirmation, StandardConfirmation } from '@/components/studio/dialogs';
import { useWorkbench } from '@/lib/studio/workbench';
import { useControlRequest } from '@/lib/studio/control-bridge';
import { PROJECT, agentBySlug } from '@/lib/studio/mock/core';
import { POLICY, RUNTIME } from '@/lib/studio/mock/operate';
import type { RuntimeRevisionRow, Status } from '@/lib/studio/types';

export default function RuntimePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { openBottom, pushToast } = useWorkbench();

  const agentSlug = searchParams.get('agent') ?? PROJECT.agents[0].slug;
  const agent = agentBySlug(agentSlug);

  const [state, setState] = useState<Status>(RUNTIME.state);
  const [confirm, setConfirm] = useState<null | 'stop' | 'restart'>(null);
  const [rollbackTo, setRollbackTo] = useState<RuntimeRevisionRow | null>(null);

  useControlRequest('PAUSE_RUNTIME', () => pushToast('Pause is available from the controls below'));

  const running = state === 'HEALTHY' || state === 'DEGRADED' || state === 'READY';

  /* A running process whose dependencies are broken is DEGRADED, not healthy. */
  const degraded = RUNTIME.dependencies.some((d) => d.status === 'DEGRADED' || d.status === 'UNAVAILABLE');

  return (
    <StudioPage
      segment="runtime"
      live
      badges={
        <>
          <Badge tone="neutral">{agent.name}</Badge>
          <StatusBadge status={state} large />
          <Badge tone="neutral">Runtime r{RUNTIME.revision}</Badge>
          {degraded && running ? <Badge tone="warn">Dependency degraded</Badge> : null}
        </>
      }
      actions={
        <>
          {state === 'STOPPED' ? (
            <button
              type="button"
              className="cl-btn cl-btn-primary"
              onClick={() => {
                setState('HEALTHY');
                pushToast('Runtime starting');
              }}
            >
              <Play size={13} aria-hidden />
              Start Runtime
            </button>
          ) : state === 'PAUSED' ? (
            <button
              type="button"
              className="cl-btn cl-btn-primary"
              onClick={() => {
                setState('HEALTHY');
                pushToast('Runtime resumed');
              }}
            >
              <Play size={13} aria-hidden />
              Resume Runtime
            </button>
          ) : (
            <button
              type="button"
              className="cl-btn"
              onClick={() => {
                setState('PAUSED');
                pushToast('Runtime paused — financial authority is unchanged');
              }}
            >
              <Pause size={13} aria-hidden />
              Pause Runtime
            </button>
          )}
          <button type="button" className="cl-btn" onClick={() => setConfirm('restart')} disabled={state === 'STOPPED'}>
            <RotateCcw size={13} aria-hidden />
            Restart Runtime
          </button>
          <button type="button" className="cl-btn cl-btn-danger" onClick={() => setConfirm('stop')} disabled={state === 'STOPPED'}>
            <Square size={12} aria-hidden />
            Stop Runtime
          </button>
          <button
            type="button"
            className="cl-btn"
            onClick={() => setRollbackTo(RUNTIME.revisions.find((r) => !r.current && r.compatible) ?? null)}
          >
            <Undo2 size={13} aria-hidden />
            Rollback Runtime
          </button>
          <button type="button" className="cl-btn" onClick={() => openBottom('output')}>
            <ScrollText size={13} aria-hidden />
            Open Logs
          </button>
        </>
      }
      banners={
        <BlockerBanner
          tone="warn"
          title="Runtime controls are not the financial kill switch"
          actions={
            <button
              type="button"
              className="cl-btn cl-btn-sm"
              onClick={() => router.push(`/projects/${PROJECT.id}/policies?agent=${agentSlug}`)}
            >
              Open Policies
            </button>
          }
        >
          Pausing or stopping the runtime stops agent processing. It does not by itself disable on-chain financial
          authority — the policy stays in whatever state the chain reports, currently {POLICY.observed}. Capabilities
          already issued remain valid until they expire.
        </BlockerBanner>
      }
    >
      <div className="cl-grid cl-grid-2">
        <Section label="Runtime status">
          <Card>
            <KeyValue
              rows={[
                { label: 'State', value: <StatusBadge status={state} /> },
                { label: 'Revision', value: `r${RUNTIME.revision}` },
                { label: 'Image digest', value: RUNTIME.imageDigest, mono: true },
                {
                  label: 'Started at',
                  value: RUNTIME.startedAt ? <TimeAgo iso={RUNTIME.startedAt} /> : 'not started',
                },
                { label: 'Broker connectivity', value: <StatusBadge status={RUNTIME.brokerConnectivity} /> },
                { label: 'Model gateway', value: <StatusBadge status={RUNTIME.modelGateway} /> },
                { label: 'Event cursor', value: RUNTIME.eventCursor, mono: true },
                { label: 'Credential validity', value: <StatusBadge status={RUNTIME.credentialValidity} /> },
                { label: 'Restart count', value: String(RUNTIME.restartCount) },
              ]}
            />
            <div style={{ marginTop: 12 }}>
              <FreshnessBadge freshness={RUNTIME.heartbeat} />
            </div>
          </Card>
        </Section>

        <Section label="Resource metrics">
          <Card>
            <KeyValue
              rows={[
                { label: 'CPU', value: `${RUNTIME.metrics.cpuPercent}%` },
                {
                  label: 'Memory',
                  value: `${RUNTIME.metrics.memoryMb} MB of ${RUNTIME.metrics.memoryLimitMb} MB`,
                },
                {
                  label: 'Uptime',
                  value: RUNTIME.metrics.uptimeSeconds === 0 ? 'not running' : `${Math.round(RUNTIME.metrics.uptimeSeconds / 60)} min`,
                },
                { label: 'Requests', value: RUNTIME.metrics.requests.toLocaleString('en-US') },
                { label: 'Errors', value: RUNTIME.metrics.errors.toLocaleString('en-US') },
              ]}
            />
            {state === 'STOPPED' ? (
              <p className="cl-meta" style={{ marginTop: 12 }}>
                Metrics read zero because the process is stopped. These are not last-known values presented as current.
              </p>
            ) : null}
          </Card>
        </Section>
      </div>

      {/* health dependencies */}
      <Section label="Health dependencies">
        <div className="cl-path">
          {RUNTIME.dependencies.map((dependency) => (
            <div className="cl-path-step" key={dependency.id}>
              <span className="cl-path-step-name">{dependency.name}</span>
              <StatusBadge status={dependency.status} />
              <span className="cl-path-step-detail">{dependency.detail}</span>
              <FreshnessBadge freshness={dependency.freshness} compact />
            </div>
          ))}
          <div className="cl-path-step" style={{ background: 'var(--cl-panel-2)' }}>
            <span className="cl-path-step-name cl-strong">Overall</span>
            <StatusBadge status={RUNTIME.overall} />
            <span className="cl-path-step-detail">
              A running process with a broken dependency is DEGRADED, never HEALTHY.
            </span>
          </div>
        </div>
      </Section>

      {/* revisions */}
      <Section
        label="Runtime revisions"
        actions={
          <button type="button" className="cl-btn cl-btn-sm" onClick={() => pushToast('Image revisions compared')}>
            <GitCompare size={11} aria-hidden />
            Compare Image Revision
          </button>
        }
      >
        <Card flush>
          <div className="cl-table-scroll">
            <table className="cl-table" style={{ minWidth: 900 }}>
              <thead>
                <tr>
                  <th style={{ width: 130 }}>Revision</th>
                  <th style={{ minWidth: 260 }}>Image digest</th>
                  <th style={{ width: 160 }}>Blueprint / build</th>
                  <th style={{ width: 130 }}>Created</th>
                  <th style={{ width: 120 }}>Status</th>
                  <th style={{ width: 150 }} />
                </tr>
              </thead>
              <tbody>
                {RUNTIME.revisions.map((revision) => (
                  <tr key={revision.revision} data-selected={revision.current}>
                    <td>
                      <span className="cl-row cl-row-wrap" style={{ gap: 7 }}>
                        <span className="cl-strong">r{revision.revision}</span>
                        {revision.current ? <Badge tone="pass">current</Badge> : null}
                      </span>
                    </td>
                    <td className="cl-mono" style={{ fontSize: 11 }}>
                      {revision.imageDigest}
                    </td>
                    <td className="cl-mono">
                      r{revision.blueprintRevision} / r{revision.buildRevision}
                    </td>
                    <td className="cl-meta">
                      <TimeAgo iso={revision.createdAt} />
                    </td>
                    <td>
                      <StatusBadge status={revision.status} />
                    </td>
                    <td>
                      {!revision.current ? (
                        <button
                          type="button"
                          className="cl-btn cl-btn-sm"
                          onClick={() => setRollbackTo(revision)}
                          disabled={!revision.compatible}
                          title={revision.compatible ? undefined : 'Incompatible with the current Blueprint'}
                        >
                          Roll back
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </Section>

      {/* credential fencing */}
      <Section label="Credential fencing">
        <Card>
          <div className="cl-row cl-row-wrap" style={{ gap: 10 }}>
            <StatusBadge status={RUNTIME.credentialFenced ? 'PASS' : 'FAIL'} large />
            <span style={{ fontSize: 13 }}>
              {RUNTIME.credentialFenced
                ? 'The previous runtime revision’s credential has been fenced and verified as unusable.'
                : 'The previous revision’s credential has not been confirmed fenced.'}
            </span>
          </div>
          <p className="cl-meta" style={{ marginTop: 10 }}>
            After a revision switch the old runtime must lose its credential, otherwise two revisions could act at
            once. This is shown as a verified result rather than assumed from the switch succeeding.
          </p>
        </Card>
      </Section>

      {/* stop / restart */}
      <SecurityConfirmation
        open={confirm !== null}
        onClose={() => setConfirm(null)}
        onConfirm={() => {
          if (confirm === 'stop') {
            setState('STOPPED');
            pushToast('Runtime stopped — financial authority is unchanged');
          } else {
            pushToast('Runtime restarting');
          }
          setConfirm(null);
        }}
        action={confirm === 'stop' ? 'Stop runtime' : 'Restart runtime'}
        currentState={<StatusBadge status={state} />}
        requestedState={<StatusBadge status={confirm === 'stop' ? 'STOPPED' : 'RUNNING'} />}
        network="Off-chain · container runtime"
        resource={`Runtime r${RUNTIME.revision} · ${RUNTIME.imageDigest.slice(0, 21)}…`}
        extraRows={[
          {
            label: 'Effect on financial authority',
            value: (
              <span className="cl-row" style={{ gap: 7 }}>
                <Badge tone="warn">None</Badge>
                <span className="cl-meta">Policy remains {POLICY.observed}</span>
              </span>
            ),
          },
        ]}
        consequence={
          confirm === 'stop'
            ? 'Agent processing stops. On-chain financial authority is not affected, and capabilities already issued remain valid until they expire.'
            : 'The process restarts from the current event cursor. Processing pauses briefly; authority is unaffected.'
        }
        actionLabel={confirm === 'stop' ? 'Stop Runtime' : 'Restart Runtime'}
      />

      {/* rollback */}
      <StandardConfirmation
        open={rollbackTo !== null}
        onClose={() => setRollbackTo(null)}
        onConfirm={() => {
          pushToast(`Rolled back to runtime r${rollbackTo?.revision}. Old credential fenced.`);
          setRollbackTo(null);
        }}
        title={`Roll back to runtime r${rollbackTo?.revision ?? ''}`}
        consequence={
          rollbackTo
            ? `Current r${RUNTIME.revision} (${RUNTIME.imageDigest.slice(0, 19)}…) is replaced by r${rollbackTo.revision} (${rollbackTo.imageDigest.slice(0, 19)}…). Compatibility with Blueprint r${rollbackTo.blueprintRevision} has been checked. The outgoing revision's credential is fenced and the fence is verified before the rollback is reported complete.`
            : ''
        }
        resource={`Runtime r${rollbackTo?.revision ?? ''}`}
        actionLabel="Roll Back Runtime"
      />
    </StudioPage>
  );
}
