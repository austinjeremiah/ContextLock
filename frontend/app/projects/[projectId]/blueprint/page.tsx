'use client';

/**
 * Blueprint (spec §12).
 *
 * Human-readable and machine-precise view of the canonical agent Blueprint.
 * Editing never mutates the live revision — it opens a draft. Changed fields
 * carry a change marker, and any change that widens authority is called out as
 * an AUTHORITY EXPANSION with the concrete consequence spelled out.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Check,
  ChevronRight,
  Copy,
  Download,
  FileJson,
  GitCompare,
  Pencil,
  Trash2,
  TriangleAlert,
  Workflow,
} from 'lucide-react';
import { StudioPage } from '@/components/studio/PageScaffold';
import {
  Badge,
  BlockerBanner,
  Card,
  CopyButton,
  DraftAheadBanner,
  Section,
  SeverityBadge,
  StatusBadge,
} from '@/components/studio/primitives';
import { Modal, StandardConfirmation } from '@/components/studio/dialogs';
import { useWorkbench } from '@/lib/studio/workbench';
import { PROJECT } from '@/lib/studio/mock/core';
import {
  AUTHORITY_DIFF,
  BLUEPRINT,
  BLUEPRINT_DRAFT,
  STALE_ON_BLUEPRINT_CHANGE,
  VALIDATION_GROUP_LABEL,
} from '@/lib/studio/mock/design';
import type { BlueprintField, BlueprintSection, ValidationFinding } from '@/lib/studio/types';

export default function BlueprintPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setSelection, openBottom, pushToast } = useWorkbench();

  const [editing, setEditing] = useState(false);
  const [raw, setRaw] = useState(false);
  const [compareOpen, setCompareOpen] = useState(searchParams.get('compare') === '1');
  const [discardOpen, setDiscardOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [validated, setValidated] = useState<null | 'running' | 'done'>(null);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [focusField, setFocusField] = useState<string | null>(null);
  const fieldRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const blueprint = editing ? BLUEPRINT_DRAFT : BLUEPRINT;
  const deployedRevision = PROJECT.revisions.deployment ?? 0;
  const liveBlueprintRevision = BLUEPRINT.revision;

  /* Draft edits layer over the draft revision without touching the live one. */
  const sections = useMemo<BlueprintSection[]>(
    () =>
      blueprint.sections.map((section) => ({
        ...section,
        fields: section.fields.map((field) =>
          edits[field.key] !== undefined ? { ...field, value: edits[field.key] } : field,
        ),
      })),
    [blueprint.sections, edits],
  );

  const findingsByGroup = useMemo(() => {
    const groups = new Map<string, ValidationFinding[]>();
    for (const finding of blueprint.findings) {
      groups.set(finding.group, [...(groups.get(finding.group) ?? []), finding]);
    }
    return [...groups.entries()];
  }, [blueprint.findings]);

  const changedFields = useMemo(
    () => sections.flatMap((s) => s.fields.filter((f) => f.previousValue || edits[f.key] !== undefined)),
    [sections, edits],
  );
  const expansions = changedFields.filter((f) => f.authorityExpansion);

  const jumpToField = useCallback((fieldKey: string) => {
    setFocusField(fieldKey);
    const node = fieldRefs.current[fieldKey];
    node?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    window.setTimeout(() => setFocusField(null), 2200);
  }, []);

  useEffect(() => {
    if (validated !== 'running') return;
    const handle = window.setTimeout(() => {
      setValidated('done');
      openBottom('problems');
    }, 700);
    return () => window.clearTimeout(handle);
  }, [validated, openBottom]);

  const rawJson = useMemo(
    () =>
      JSON.stringify(
        {
          revision: blueprint.revision,
          status: blueprint.status,
          baseRevision: blueprint.baseRevision,
          agent: 'guardian',
          sections: sections.map((s) => ({
            id: s.id,
            title: s.title,
            fields: Object.fromEntries(s.fields.map((f) => [f.key, f.value])),
          })),
        },
        null,
        2,
      ),
    [blueprint, sections],
  );

  return (
    <StudioPage
      segment="blueprint"
      stale={editing}
      badges={
        <>
          <Badge tone={editing ? 'warn' : 'neutral'}>
            Blueprint r{blueprint.revision}
            {editing ? ' · draft' : ''}
          </Badge>
          <StatusBadge status={blueprint.status} />
          {editing ? <Badge tone="sim">Based on r{blueprint.baseRevision}</Badge> : null}
          {blueprint.findings.length > 0 ? (
            <button
              type="button"
              className="cl-badge"
              data-tone="warn"
              style={{ cursor: 'pointer' }}
              onClick={() => document.getElementById('cl-validation')?.scrollIntoView({ behavior: 'smooth' })}
            >
              {blueprint.findings.length} finding{blueprint.findings.length === 1 ? '' : 's'}
            </button>
          ) : null}
        </>
      }
      actions={
        <>
          {!editing ? (
            <button type="button" className="cl-btn" onClick={() => setEditing(true)}>
              <Pencil size={13} aria-hidden />
              Edit Blueprint
            </button>
          ) : (
            <>
              <button
                type="button"
                className="cl-btn"
                onClick={() => pushToast(`Draft r${BLUEPRINT_DRAFT.revision} saved`)}
              >
                Save Draft
              </button>
              <button type="button" className="cl-btn" onClick={() => setValidated('running')}>
                {validated === 'running' ? 'Validating…' : 'Validate'}
              </button>
              <button type="button" className="cl-btn cl-btn-danger" onClick={() => setDiscardOpen(true)}>
                <Trash2 size={13} aria-hidden />
                Discard Draft
              </button>
            </>
          )}
          <button type="button" className="cl-btn" onClick={() => setCompareOpen(true)}>
            <GitCompare size={13} aria-hidden />
            Compare Revision
          </button>
          <button type="button" className="cl-btn" onClick={() => setRaw((v) => !v)} aria-pressed={raw}>
            <FileJson size={13} aria-hidden />
            Raw JSON
          </button>
          {editing ? (
            /* Publishing an already-built agent creates a revision; it never "saves over" one. */
            <button type="button" className="cl-btn cl-btn-primary" onClick={() => setCreateOpen(true)}>
              Create Revision
            </button>
          ) : (
            <button
              type="button"
              className="cl-btn cl-btn-primary"
              onClick={() => router.push(`/projects/${PROJECT.id}/architecture`)}
            >
              <Workflow size={13} aria-hidden />
              Generate Architecture
            </button>
          )}
        </>
      }
      banners={
        <>
          {editing ? (
            <DraftAheadBanner
              draftRevision={BLUEPRINT_DRAFT.revision}
              deployedRevision={deployedRevision}
              onCompare={() => setCompareOpen(true)}
              onDeploy={() => router.push(`/projects/${PROJECT.id}/deploy`)}
            />
          ) : null}
          {expansions.length > 0 ? (
            <BlockerBanner
              tone="warn"
              title={`${expansions.length} authority-increasing change${expansions.length === 1 ? '' : 's'} in this draft`}
              actions={
                <button type="button" className="cl-btn cl-btn-sm" onClick={() => setCompareOpen(true)}>
                  Review changes
                </button>
              }
            >
              An authority expansion widens what the agent can do without a human. Simulations proving the previous
              boundary become stale and must be re-run.
            </BlockerBanner>
          ) : null}
        </>
      }
    >
      {raw ? (
        <Section
          label="Raw JSON"
          actions={
            <div className="cl-row" style={{ gap: 6 }}>
              <CopyButton value={rawJson} label="Copy JSON" />
              <button
                type="button"
                className="cl-btn cl-btn-sm"
                onClick={() => {
                  const blob = new Blob([rawJson], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `blueprint-r${blueprint.revision}.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                  pushToast('Blueprint exported');
                }}
              >
                <Download size={12} aria-hidden />
                Export Blueprint
              </button>
            </div>
          }
        >
          <Card flush>
            <pre
              className="cl-mono"
              style={{ margin: 0, padding: 14, whiteSpace: 'pre-wrap', lineHeight: 1.6, maxHeight: 560, overflow: 'auto' }}
            >
              {rawJson}
            </pre>
          </Card>
        </Section>
      ) : (
        sections.map((section) => (
          <Section key={section.id} label={`${section.index}. ${section.title}`}>
            <Card>
              <p className="cl-meta" style={{ marginBottom: 12 }}>
                {section.summary}
              </p>
              <div className="cl-col" style={{ gap: 0 }}>
                {section.fields.map((field) => (
                  <FieldRow
                    key={field.key}
                    field={field}
                    editing={editing}
                    focused={focusField === field.key}
                    registerRef={(el) => {
                      fieldRefs.current[field.key] = el;
                    }}
                    onChange={(value) => setEdits((prev) => ({ ...prev, [field.key]: value }))}
                    onSelect={() =>
                      setSelection({ kind: 'blueprint-field', id: field.key, label: `${section.title} · ${field.label}` })
                    }
                  />
                ))}
              </div>
            </Card>
          </Section>
        ))
      )}

      {/* validation panel */}
      <div id="cl-validation">
        <Section
          label="Validation"
          actions={
            <span className="cl-meta">
              {blueprint.findings.length === 0
                ? 'No findings'
                : `${blueprint.findings.length} finding${blueprint.findings.length === 1 ? '' : 's'}`}
            </span>
          }
        >
          {blueprint.findings.length === 0 ? (
            <Card>
              <p className="cl-meta">
                The deterministic validator reports no schema, security-invariant, trust or adapter findings for this
                revision.
              </p>
            </Card>
          ) : (
            <div className="cl-col" style={{ gap: 12 }}>
              {findingsByGroup.map(([group, findings]) => (
                <Card key={group} title={VALIDATION_GROUP_LABEL[group] ?? group} flush>
                  <ul>
                    {findings.map((finding) => (
                      <li key={finding.id}>
                        <button
                          type="button"
                          className="cl-list-row"
                          style={{ width: '100%', textAlign: 'left', alignItems: 'flex-start' }}
                          onClick={() => {
                            if (finding.fieldKey) jumpToField(finding.fieldKey);
                            setSelection({ kind: 'validation-finding', id: finding.id, label: finding.id });
                          }}
                        >
                          <SeverityBadge severity={finding.severity} />
                          <span style={{ flex: '1 1 auto', minWidth: 0 }}>
                            <span className="cl-row" style={{ gap: 8 }}>
                              <span className="cl-mono" style={{ fontSize: 11.5 }}>
                                {finding.id}
                              </span>
                              <span className="cl-strong">{finding.message}</span>
                            </span>
                            <span className="cl-meta" style={{ display: 'block', marginTop: 3, whiteSpace: 'normal' }}>
                              {finding.detail}
                            </span>
                          </span>
                          <ChevronRight size={13} aria-hidden style={{ opacity: 0.5, marginTop: 3 }} />
                        </button>
                      </li>
                    ))}
                  </ul>
                </Card>
              ))}
            </div>
          )}
        </Section>
      </div>

      {/* compare revisions */}
      <Modal
        open={compareOpen}
        onClose={() => setCompareOpen(false)}
        title={`Compare r${BLUEPRINT.revision} → r${BLUEPRINT_DRAFT.revision}`}
        subtitle="Authority-increasing changes are listed first."
        wide
        footer={
          <button type="button" className="cl-btn cl-btn-primary" onClick={() => setCompareOpen(false)}>
            Close
          </button>
        }
      >
        <div className="cl-col" style={{ gap: 10 }}>
          {[...AUTHORITY_DIFF].sort((a, b) => Number(b.expansion) - Number(a.expansion)).map((diff) => (
            <div
              className="cl-card"
              key={diff.field}
              style={{ borderColor: diff.expansion ? 'var(--cl-warn)' : 'var(--cl-line)' }}
            >
              <div className="cl-card-head" style={{ background: diff.expansion ? 'var(--cl-warn-bg)' : undefined }}>
                <div className="cl-card-title">{diff.label}</div>
                {diff.expansion ? <Badge tone="warn">Authority expansion</Badge> : <Badge tone="pass">Tightening</Badge>}
              </div>
              <div className="cl-card-body">
                <div className="cl-mono" style={{ fontSize: 11.5, marginBottom: 6 }}>
                  {diff.field}
                </div>
                <div style={{ fontSize: 13.5 }}>
                  <span style={{ color: 'var(--cl-deny)', textDecoration: 'line-through' }}>{diff.before}</span>
                  {'  →  '}
                  <span style={{ color: diff.expansion ? 'var(--cl-warn)' : 'var(--cl-pass)' }}>{diff.after}</span>
                </div>
                <p className="cl-meta" style={{ marginTop: 7, whiteSpace: 'normal' }}>
                  {diff.note}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 18 }}>
          <div className="cl-label" style={{ marginBottom: 8 }}>
            What becomes stale if this is applied
          </div>
          <div className="cl-path">
            {STALE_ON_BLUEPRINT_CHANGE.map((row) => (
              <div className="cl-path-step" key={row.surface}>
                <span className="cl-path-step-name">{row.surface}</span>
                <StatusBadge status={row.surface === 'Deployment' ? 'READY' : 'STALE'} />
                <span className="cl-path-step-detail">{row.detail}</span>
              </div>
            ))}
          </div>
        </div>
      </Modal>

      {/* discard draft */}
      <StandardConfirmation
        open={discardOpen}
        onClose={() => setDiscardOpen(false)}
        onConfirm={() => {
          setEdits({});
          setEditing(false);
          setDiscardOpen(false);
          pushToast('Draft discarded');
        }}
        title="Discard draft"
        consequence={`Draft r${BLUEPRINT_DRAFT.revision} and its unsaved edits are removed. The live Blueprint r${liveBlueprintRevision} and the active deployment are unaffected.`}
        resource={`Blueprint draft r${BLUEPRINT_DRAFT.revision}`}
        actionLabel="Discard Draft"
      />

      {/* create revision */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title={`Create Blueprint revision r${BLUEPRINT_DRAFT.revision}`}
        subtitle="This publishes a new revision. It does not deploy anything."
        wide
        footer={
          <>
            <button type="button" className="cl-btn" onClick={() => setCreateOpen(false)}>
              Cancel
            </button>
            <button
              type="button"
              className="cl-btn cl-btn-primary"
              onClick={() => {
                setCreateOpen(false);
                setEditing(false);
                pushToast(`Blueprint r${BLUEPRINT_DRAFT.revision} created`);
              }}
            >
              Create Revision r{BLUEPRINT_DRAFT.revision}
            </button>
          </>
        }
      >
        {expansions.length > 0 ? (
          <BlockerBanner tone="warn" title="This revision increases authority">
            {expansions.map((f) => f.authorityNote).filter(Boolean).join(' ')}
          </BlockerBanner>
        ) : null}
        <dl className="cl-statechange">
          <div className="cl-statechange-row">
            <dt>Current revision</dt>
            <dd>r{liveBlueprintRevision}</dd>
          </div>
          <div className="cl-statechange-row">
            <dt>New revision</dt>
            <dd>r{BLUEPRINT_DRAFT.revision}</dd>
          </div>
          <div className="cl-statechange-row">
            <dt>Changed fields</dt>
            <dd>{AUTHORITY_DIFF.length}</dd>
          </div>
          <div className="cl-statechange-row">
            <dt>Active deployment</dt>
            <dd>
              Stays on r{deployedRevision} until you deploy again
            </dd>
          </div>
          <div className="cl-statechange-row">
            <dt>Becomes stale</dt>
            <dd>Strategy, build, simulations and generated code</dd>
          </div>
        </dl>
      </Modal>
    </StudioPage>
  );
}

/* ------------------------------------------------------------------ field */

function FieldRow({
  field,
  editing,
  focused,
  onChange,
  onSelect,
  registerRef,
}: {
  field: BlueprintField;
  editing: boolean;
  focused: boolean;
  onChange: (value: string) => void;
  onSelect: () => void;
  registerRef: (el: HTMLDivElement | null) => void;
}) {
  const changed = Boolean(field.previousValue);
  const canEdit = editing && field.editable;

  return (
    <div
      ref={registerRef}
      onClick={onSelect}
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(150px, 230px) minmax(0, 1fr)',
        gap: 14,
        alignItems: 'baseline',
        padding: '9px 0 9px 12px',
        borderBottom: '1px solid var(--cl-line)',
        /* left-side change marker (spec §12) */
        borderLeft: changed ? '2px solid var(--cl-warn)' : '2px solid transparent',
        background: focused ? 'rgba(0, 66, 175, 0.09)' : undefined,
        transition: 'background 0.4s ease',
        scrollMarginTop: 90,
      }}
    >
      <div style={{ fontSize: 12.5, color: 'var(--cl-ink-3)' }}>
        {field.label}
        {field.hint ? (
          <div className="cl-meta" style={{ marginTop: 2, whiteSpace: 'normal' }}>
            {field.hint}
          </div>
        ) : null}
      </div>

      <div style={{ minWidth: 0 }}>
        {canEdit ? (
          <input
            className="cl-input"
            value={field.value}
            onChange={(e) => onChange(e.target.value)}
            aria-label={field.label}
          />
        ) : (
          <div className={field.mono ? 'cl-mono' : undefined} style={{ fontSize: 13.5, overflowWrap: 'anywhere' }}>
            {field.value}
          </div>
        )}

        {changed ? (
          <div style={{ marginTop: 6 }}>
            <div style={{ fontSize: 12.5 }}>
              <span style={{ color: 'var(--cl-ink-3)', textDecoration: 'line-through' }}>{field.previousValue}</span>
              {'  →  '}
              <span className="cl-strong">{field.value}</span>
            </div>
            {field.authorityExpansion ? (
              <div
                style={{
                  marginTop: 6,
                  padding: '7px 10px',
                  border: '1px solid var(--cl-warn)',
                  background: 'var(--cl-warn-bg)',
                }}
              >
                <span className="cl-row" style={{ gap: 7 }}>
                  <TriangleAlert size={13} aria-hidden style={{ color: 'var(--cl-warn)' }} />
                  <span
                    className="cl-strong"
                    style={{ color: 'var(--cl-warn)', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase' }}
                  >
                    Authority expansion
                  </span>
                </span>
                {field.authorityNote ? (
                  <div style={{ fontSize: 12.5, marginTop: 4 }}>{field.authorityNote}</div>
                ) : null}
              </div>
            ) : field.authorityNote ? (
              <div className="cl-row" style={{ gap: 7, marginTop: 5 }}>
                <Check size={12} aria-hidden style={{ color: 'var(--cl-pass)' }} />
                <span className="cl-meta">{field.authorityNote}</span>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
