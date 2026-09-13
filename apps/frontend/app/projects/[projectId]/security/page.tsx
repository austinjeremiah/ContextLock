'use client';

/**
 * Permissions & Security (spec §14).
 *
 * The clearest possible answer to: what can this agent do, and what can it
 * never do? Enabling or disabling authority is deliberately NOT offered here —
 * that belongs to Policies / Control Plane behind a typed confirmation.
 */
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Download, FileDiff, GitCompare, Play, ShieldCheck } from 'lucide-react';
import { StudioPage } from '@/components/studio/PageScaffold';
import {
  Badge,
  BlockerBanner,
  Card,
  Section,
  StatusBadge,
  VerdictBadge,
} from '@/components/studio/primitives';
import { Modal } from '@/components/studio/dialogs';
import { useWorkbench } from '@/lib/studio/workbench';
import { PROJECT } from '@/lib/studio/mock/core';
import { AUTHORITY_DIFF, PERMISSIONS } from '@/lib/studio/mock/design';
import type { Verdict } from '@/lib/studio/types';

const COLUMNS: { verdict: Verdict; tone: 'pass' | 'warn' | 'deny'; blurb: string }[] = [
  { verdict: 'ALLOW', tone: 'pass', blurb: 'Performed autonomously, with no human in the loop.' },
  { verdict: 'ESCALATE', tone: 'warn', blurb: 'Refused autonomously. Requires an explicit human approval.' },
  { verdict: 'DENY', tone: 'deny', blurb: 'Never permitted. No approval path exists.' },
];

export default function PermissionsPage() {
  const router = useRouter();
  const { setSelection, pushToast } = useWorkbench();
  const [expansionsOpen, setExpansionsOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  const grouped = useMemo(
    () =>
      COLUMNS.map((column) => ({
        ...column,
        rules: PERMISSIONS.rules.filter((rule) => rule.verdict === column.verdict),
      })),
    [],
  );

  const expansions = AUTHORITY_DIFF.filter((d) => d.expansion);
  const go = (segment: string, qs = '') => router.push(`/projects/${PROJECT.id}/${segment}${qs}`);

  return (
    <StudioPage
      segment="security"
      subtitle="What can this agent do, and what can it never do?"
      actions={
        <>
          <button type="button" className="cl-btn" onClick={() => go('policies')}>
            <ShieldCheck size={13} aria-hidden />
            Open Policy
          </button>
          <button type="button" className="cl-btn" onClick={() => go('blueprint', '?compare=1')}>
            <GitCompare size={13} aria-hidden />
            Compare revisions
          </button>
          <button type="button" className="cl-btn" onClick={() => go('simulation', '?group=policy-boundaries&run=1')}>
            <Play size={13} aria-hidden />
            Run boundary simulations
          </button>
          <button type="button" className="cl-btn" onClick={() => setExportOpen(true)}>
            <Download size={13} aria-hidden />
            Export permission summary
          </button>
          <button type="button" className="cl-btn cl-btn-primary" onClick={() => go('blueprint')}>
            Create policy revision
          </button>
        </>
      }
      banners={
        expansions.length > 0 ? (
          <BlockerBanner
            tone="warn"
            title={`${expansions.length} authority increase${expansions.length === 1 ? '' : 's'} in the open draft`}
            actions={
              <button type="button" className="cl-btn cl-btn-sm" onClick={() => setExpansionsOpen(true)}>
                <FileDiff size={12} aria-hidden />
                Review
              </button>
            }
          >
            The matrix below reflects the live policy revision {PERMISSIONS.policyRevision}. The open Blueprint draft
            would widen it.
          </BlockerBanner>
        ) : null
      }
    >
      {/* security posture summary */}
      <Section label="Security posture">
        <Card>
          <div className="cl-grid cl-grid-4" style={{ gap: 18 }}>
            <PostureItem label="Security posture" value={<StatusBadge status={PERMISSIONS.posture} large />} />
            <PostureItem label="Execution" value={<Badge tone="sim" large>{PERMISSIONS.executionSummary}</Badge>} />
            <PostureItem label="Mainnet writes" value={<Badge tone="deny" large>{PERMISSIONS.mainnetWrites}</Badge>} />
            <PostureItem
              label="Policy"
              value={<Badge tone="neutral" large>{`revision ${PERMISSIONS.policyRevision}`}</Badge>}
            />
          </div>
        </Card>
      </Section>

      {/* ALLOW / ESCALATE / DENY */}
      <Section label="Authority boundaries">
        <div className="cl-matrix">
          {grouped.map((column) => (
            <div className="cl-matrix-col" data-tone={column.tone} key={column.verdict}>
              <div className="cl-matrix-col-head">
                {column.verdict}
                <span style={{ marginLeft: 8, opacity: 0.75, textTransform: 'none', letterSpacing: 0 }}>
                  {column.rules.length}
                </span>
              </div>
              <div style={{ padding: '9px 14px', borderBottom: '1px solid var(--cl-line)' }}>
                <span className="cl-meta" style={{ whiteSpace: 'normal' }}>
                  {column.blurb}
                </span>
              </div>
              {column.rules.map((rule) => (
                <button
                  key={rule.id}
                  type="button"
                  className="cl-matrix-item"
                  style={{ width: '100%', textAlign: 'left', cursor: 'pointer', display: 'block' }}
                  onClick={() => setSelection({ kind: 'permission-rule', id: rule.id, label: rule.label })}
                >
                  <div className="cl-strong">{rule.label}</div>
                  <div className="cl-meta" style={{ marginTop: 3, whiteSpace: 'normal' }}>
                    {rule.detail}
                  </div>
                  <div className="cl-row cl-row-wrap" style={{ gap: 5, marginTop: 6 }}>
                    <span className="cl-mono" style={{ fontSize: 11 }}>
                      {rule.policyRef}
                    </span>
                    <span
                      className="cl-badge"
                      data-tone="neutral"
                      title={`Proved by ${rule.provenSimulationIds.length} simulation(s)`}
                      onClick={(e) => {
                        e.stopPropagation();
                        go('simulation', `?scenario=${rule.provenSimulationIds[0]}`);
                      }}
                      style={{ cursor: 'pointer' }}
                    >
                      {rule.provenSimulationIds.length} proof{rule.provenSimulationIds.length === 1 ? '' : 's'}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          ))}
        </div>
      </Section>

      {/* supporting panels */}
      <Section label="Constraints">
        <div className="cl-grid cl-grid-2">
          {PERMISSIONS.panels.map((panel) => (
            <Card key={panel.id} title={panel.title}>
              <p className="cl-meta" style={{ marginBottom: 10, whiteSpace: 'normal' }}>
                {panel.description}
              </p>
              <dl className="cl-kv">
                {panel.items.map((item) => (
                  <div key={item.label} style={{ display: 'contents' }}>
                    <dt>{item.label}</dt>
                    <dd className={item.mono ? 'cl-mono' : undefined}>
                      {item.tone ? <Badge tone={item.tone}>{item.value}</Badge> : item.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </Card>
          ))}
        </div>
      </Section>

      <BlockerBanner tone="neutral" title="Changing authority happens elsewhere, on purpose">
        This page states the boundary; it does not move it. Enabling or disabling financial authority is done on the
        Policies page behind a typed confirmation that shows the current state, the requested state, the network and the
        consequence.
      </BlockerBanner>

      {/* authority increases */}
      <Modal
        open={expansionsOpen}
        onClose={() => setExpansionsOpen(false)}
        title="Authority increases since the live revision"
        wide
        footer={
          <>
            <button type="button" className="cl-btn" onClick={() => setExpansionsOpen(false)}>
              Close
            </button>
            <button
              type="button"
              className="cl-btn cl-btn-primary"
              onClick={() => {
                setExpansionsOpen(false);
                go('blueprint', '?compare=1');
              }}
            >
              Open full comparison
            </button>
          </>
        }
      >
        <div className="cl-col" style={{ gap: 10 }}>
          {AUTHORITY_DIFF.map((diff) => (
            <div className="cl-card" key={diff.field}>
              <div className="cl-card-head" style={{ background: diff.expansion ? 'var(--cl-warn-bg)' : undefined }}>
                <div className="cl-card-title">{diff.label}</div>
                {diff.expansion ? <Badge tone="warn">Authority expansion</Badge> : <Badge tone="pass">Tightening</Badge>}
              </div>
              <div className="cl-card-body">
                <div style={{ fontSize: 13.5 }}>
                  <span style={{ color: 'var(--cl-ink-3)', textDecoration: 'line-through' }}>{diff.before}</span>
                  {'  →  '}
                  <span className="cl-strong">{diff.after}</span>
                </div>
                <p className="cl-meta" style={{ marginTop: 6, whiteSpace: 'normal' }}>
                  {diff.note}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Modal>

      {/* export */}
      <Modal
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        title="Export permission summary"
        subtitle="A secret-free statement of this agent's authority boundary."
        footer={
          <>
            <button type="button" className="cl-btn" onClick={() => setExportOpen(false)}>
              Cancel
            </button>
            <button
              type="button"
              className="cl-btn cl-btn-primary"
              onClick={() => {
                setExportOpen(false);
                pushToast('Permission summary exported');
              }}
            >
              Download summary
            </button>
          </>
        }
      >
        <dl className="cl-statechange">
          <div className="cl-statechange-row">
            <dt>Contents</dt>
            <dd>Authority matrix, capability bindings, recipient restrictions, data trust and organization aggregate</dd>
          </div>
          <div className="cl-statechange-row">
            <dt>Revision</dt>
            <dd>Policy revision {PERMISSIONS.policyRevision}</dd>
          </div>
          <div className="cl-statechange-row">
            <dt>Confidential values</dt>
            <dd>Excluded — hash-only disclosure</dd>
          </div>
          <div className="cl-statechange-row">
            <dt>Secret scan</dt>
            <dd>
              <StatusBadge status="PASS" />
            </dd>
          </div>
        </dl>
      </Modal>
    </StudioPage>
  );
}

function PostureItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="cl-label" style={{ marginBottom: 7 }}>
        {label}
      </div>
      {value}
    </div>
  );
}
