'use client';

/**
 * Simulation Center (spec §15).
 *
 * Deterministic ContextLock simulations plus official CRE workflow simulations,
 * reported with their exact reason codes.
 *
 * Two rules the page will not bend:
 *  - A run built against an older Blueprint is shown STALE. An old passing
 *    result is never presented as current.
 *  - The expected result is fixed by the scenario. Nothing here edits it to make
 *    a failing test green.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Copy, GitCompare, Plus, RotateCcw, Play, Radio, Square } from 'lucide-react';
import { StudioPage } from '@/components/studio/PageScaffold';
import {
  Badge,
  Card,
  KeyValue,
  LogMessage,
  ReasonCode,
  SecurityPath,
  Section,
  StaleBanner,
  StatusBadge,
  TimeAgo,
} from '@/components/studio/primitives';
import { Modal, StandardConfirmation } from '@/components/studio/dialogs';
import { useWorkbench } from '@/lib/studio/workbench';
import { PROJECT, agentBySlug } from '@/lib/studio/mock/core';
import { SCENARIOS, SCENARIO_GROUPS } from '@/lib/studio/mock/test';
import type { SimulationScenario, Status } from '@/lib/studio/types';

type RunState = Record<string, Status | undefined>;

export default function SimulationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setSelection, openBottom, pushToast } = useWorkbench();

  const agentSlug = searchParams.get('agent') ?? PROJECT.agents[0].slug;
  const agent = agentBySlug(agentSlug);
  const currentBlueprint = PROJECT.revisions.blueprint ?? 0;

  const [selectedId, setSelectedId] = useState<string>(searchParams.get('scenario') ?? SCENARIOS[0].id);
  const [checked, setChecked] = useState<string[]>([]);
  const [running, setRunning] = useState<string[]>([]);
  const [runResults, setRunResults] = useState<RunState>({});
  const [createOpen, setCreateOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);
  const timers = useRef<number[]>([]);

  useEffect(
    () => () => {
      timers.current.forEach((t) => window.clearTimeout(t));
    },
    [],
  );

  const selected = SCENARIOS.find((s) => s.id === selectedId) ?? SCENARIOS[0];
  const selectedResult = runResults[selected.id] ?? selected.result;
  const isStale = selected.builtAgainstBlueprint !== null && selected.builtAgainstBlueprint < currentBlueprint;

  const grouped = useMemo(
    () =>
      SCENARIO_GROUPS.map((group) => ({
        ...group,
        scenarios: SCENARIOS.filter((s) => s.group === group.id),
      })).filter((g) => g.scenarios.length > 0),
    [],
  );

  const failing = SCENARIOS.filter((s) => (runResults[s.id] ?? s.result) === 'FAIL');
  const mandatoryCount = SCENARIOS.filter((s) => s.mandatory).length;

  /** Simulated run. A real backend streams these over SSE. */
  const run = (ids: string[]) => {
    if (ids.length === 0) return;
    setRunning(ids);
    setRunResults((prev) => {
      const next = { ...prev };
      ids.forEach((id) => {
        delete next[id];
      });
      return next;
    });
    openBottom('tests');

    ids.forEach((id, index) => {
      const handle = window.setTimeout(
        () => {
          const scenario = SCENARIOS.find((s) => s.id === id);
          setRunResults((prev) => ({ ...prev, [id]: scenario?.result ?? 'PASS' }));
          setRunning((prev) => prev.filter((r) => r !== id));
        },
        320 + index * 220,
      );
      timers.current.push(handle);
    });
  };

  const stop = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
    setRunning([]);
    pushToast('Run stopped. Completed results were kept.');
  };

  const select = (scenario: SimulationScenario) => {
    setSelectedId(scenario.id);
    setSelection({ kind: 'simulation-scenario', id: scenario.id, label: scenario.name });
  };

  return (
    <StudioPage
      segment="simulation"
      bleed
      banners={
        <div className="cl-row cl-row-wrap" style={{ marginBottom: 12, gap: 8 }}>
          <span className="cl-page-title" style={{ fontSize: 22, marginRight: 8 }}>
            Simulation Center
          </span>
          <Badge tone="neutral">{agent.name}</Badge>
          <Badge tone="neutral">{SCENARIOS.length} scenarios</Badge>
          <Badge tone="neutral">{mandatoryCount} mandatory</Badge>
          {failing.length > 0 ? (
            <Badge tone="deny">
              {failing.length} failing
            </Badge>
          ) : (
            <Badge tone="pass">All passing</Badge>
          )}
          <span className="cl-spacer" />

          <div className="cl-btn-group">
            {running.length > 0 ? (
              <button type="button" className="cl-btn cl-btn-sm cl-btn-danger" onClick={stop}>
                <Square size={11} aria-hidden />
                Stop Run
              </button>
            ) : (
              <>
                <button
                  type="button"
                  className="cl-btn cl-btn-sm"
                  onClick={() => run(checked.length > 0 ? checked : [selected.id])}
                  title={checked.length > 0 ? `Run ${checked.length} selected` : 'Run the open scenario'}
                >
                  <Play size={11} aria-hidden />
                  Run Selected{checked.length > 0 ? ` (${checked.length})` : ''}
                </button>
                <button
                  type="button"
                  className="cl-btn cl-btn-sm cl-btn-primary"
                  onClick={() => run(SCENARIOS.map((s) => s.id))}
                  title={`Runs all ${SCENARIOS.length} scenarios. Mandatory security regression does not consume the user run allowance.`}
                >
                  <Play size={11} aria-hidden />
                  Run All ({SCENARIOS.length})
                </button>
              </>
            )}
            <button type="button" className="cl-btn cl-btn-sm" onClick={() => setCompareOpen(true)}>
              <GitCompare size={11} aria-hidden />
              Compare Runs
            </button>
            <button type="button" className="cl-btn cl-btn-sm" onClick={() => setCreateOpen(true)}>
              <Plus size={11} aria-hidden />
              Create Scenario
            </button>
          </div>
        </div>
      }
    >
      <div className="cl-split" style={{ borderTop: '1px solid var(--cl-line)' }}>
        {/* scenario list */}
        <div className="cl-split-side" style={{ flex: '0 0 320px' }}>
          {grouped.map((group) => (
            <div key={group.id}>
              <div className="cl-explorer-group" style={{ paddingTop: 12 }}>
                <span className="cl-label">{group.label}</span>
              </div>
              <ul>
                {group.scenarios.map((scenario) => {
                  const result = running.includes(scenario.id) ? 'RUNNING' : (runResults[scenario.id] ?? scenario.result);
                  const stale =
                    scenario.builtAgainstBlueprint !== null && scenario.builtAgainstBlueprint < currentBlueprint;
                  return (
                    <li key={scenario.id}>
                      <div
                        className="cl-list-row"
                        data-selected={scenario.id === selectedId}
                        onClick={() => select(scenario)}
                        style={{ alignItems: 'flex-start' }}
                      >
                        <input
                          type="checkbox"
                          checked={checked.includes(scenario.id)}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) =>
                            setChecked((prev) =>
                              e.target.checked ? [...prev, scenario.id] : prev.filter((id) => id !== scenario.id),
                            )
                          }
                          style={{ marginTop: 3, accentColor: 'var(--cl-ink)' }}
                          aria-label={`Select ${scenario.name}`}
                        />
                        <span style={{ flex: '1 1 auto', minWidth: 0 }}>
                          <span style={{ display: 'block' }}>{scenario.name}</span>
                          <span className="cl-meta" style={{ display: 'block', marginTop: 3 }}>
                            {scenario.lastRun ? <TimeAgo iso={scenario.lastRun} /> : 'never run'} · r
                            {scenario.builtAgainstBlueprint ?? '—'}
                            {scenario.mandatory ? ' · mandatory' : ''}
                          </span>
                        </span>
                        <span className="cl-col" style={{ gap: 3, alignItems: 'flex-end' }}>
                          {result ? <StatusBadge status={result} /> : <StatusBadge status="UNKNOWN" />}
                          {stale ? <StatusBadge status="STALE" icon={false} /> : null}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>

        {/* scenario detail */}
        <div className="cl-split-main">
          <div className="cl-page-pad" style={{ maxWidth: 940 }}>
            {isStale ? (
              <StaleBanner
                what="SIMULATION"
                builtAgainst={selected.builtAgainstBlueprint ?? 0}
                current={currentBlueprint}
                onRerun={() => run([selected.id])}
              />
            ) : null}

            <header className="cl-page-head">
              <div className="cl-page-head-main">
                <h1 className="cl-page-title" style={{ fontSize: 24 }}>
                  {selected.name}
                </h1>
                <p className="cl-page-sub">{selected.description}</p>
                <div className="cl-row cl-row-wrap" style={{ marginTop: 10 }}>
                  {running.includes(selected.id) ? (
                    <StatusBadge status="RUNNING" large />
                  ) : selectedResult ? (
                    <StatusBadge status={selectedResult} large />
                  ) : (
                    <StatusBadge status="UNKNOWN" large />
                  )}
                  <Badge tone="neutral">{selected.id}</Badge>
                  {selected.mandatory ? <Badge tone="neutral">Mandatory</Badge> : null}
                  {selected.isCre ? <Badge tone="sim">CRE</Badge> : null}
                </div>
              </div>
              <div className="cl-page-actions">
                <button type="button" className="cl-btn cl-btn-sm" onClick={() => run([selected.id])}>
                  <Play size={11} aria-hidden />
                  Run
                </button>
                {selected.isCre ? (
                  <button
                    type="button"
                    className="cl-btn cl-btn-sm"
                    onClick={() => router.push(`/projects/${PROJECT.id}/cre?agent=${agentSlug}`)}
                  >
                    <Radio size={11} aria-hidden />
                    Run CRE Simulation
                  </button>
                ) : null}
                <button type="button" className="cl-btn cl-btn-sm" onClick={() => pushToast('Scenario duplicated as a draft')}>
                  <Copy size={11} aria-hidden />
                  Duplicate
                </button>
                <button type="button" className="cl-btn cl-btn-sm" onClick={() => setResetOpen(true)}>
                  <RotateCcw size={11} aria-hidden />
                  Reset to Template
                </button>
              </div>
            </header>

            <Section label="Deterministic inputs">
              <Card>
                <KeyValue rows={selected.inputs.map((i) => ({ label: i.key, value: i.value, mono: true }))} />
                {selected.mutation ? (
                  <div style={{ marginTop: 14, border: '1px solid var(--cl-line-strong)', background: 'var(--cl-raised)' }}>
                    <div className="cl-card-head" style={{ background: 'var(--cl-warn-bg)' }}>
                      <div className="cl-card-title" style={{ color: 'var(--cl-warn)' }}>
                        Mutation · {selected.mutation.field}
                      </div>
                    </div>
                    <div className="cl-card-body">
                      <KeyValue
                        rows={[
                          { label: 'Original', value: selected.mutation.original, mono: true },
                          { label: 'Injected', value: selected.mutation.injected, mono: true },
                        ]}
                      />
                    </div>
                  </div>
                ) : null}
              </Card>
            </Section>

            <Section label="Expected vs actual">
              <Card>
                <KeyValue
                  rows={[
                    { label: 'Expected', value: selected.expected },
                    {
                      label: 'Actual',
                      value:
                        selected.actual === null ? (
                          <span className="cl-meta">Not run</span>
                        ) : (
                          <span style={{ color: selectedResult === 'FAIL' ? 'var(--cl-deny)' : undefined }}>
                            {selected.actual}
                          </span>
                        ),
                    },
                    {
                      label: 'Reason code',
                      value: selected.reasonCode ? (
                        <ReasonCode
                          code={selected.reasonCode}
                          verdict={selectedResult === 'FAIL' ? 'FAIL' : undefined}
                          onOpenPolicy={() => router.push(`/projects/${PROJECT.id}/policies?agent=${agentSlug}`)}
                        />
                      ) : (
                        <span className="cl-meta">none</span>
                      ),
                    },
                    {
                      label: 'Changed fields',
                      value:
                        selected.changedFields.length === 0 ? (
                          <span className="cl-meta">none</span>
                        ) : (
                          <span className="cl-row cl-row-wrap" style={{ gap: 5 }}>
                            {selected.changedFields.map((f) => (
                              <Badge key={f} tone="warn">
                                {f}
                              </Badge>
                            ))}
                          </span>
                        ),
                    },
                    { label: 'Layers evaluated', value: selected.layersEvaluated.join(' · ') },
                    { label: 'Timing', value: selected.durationMs === null ? '—' : `${selected.durationMs} ms` },
                    { label: 'Built against', value: `Blueprint r${selected.builtAgainstBlueprint ?? '—'}` },
                  ]}
                />

                {selectedResult === 'FAIL' ? (
                  <div className="cl-row" style={{ marginTop: 12 }}>
                    <button
                      type="button"
                      className="cl-btn cl-btn-sm cl-btn-danger"
                      onClick={() => openBottom('tests')}
                    >
                      Open failed assertion
                    </button>
                  </div>
                ) : null}
              </Card>
            </Section>

            <Section label="Security path">
              <SecurityPath
                steps={selected.path}
                onReasonCode={() => router.push(`/projects/${PROJECT.id}/policies?agent=${agentSlug}`)}
              />
            </Section>

            <Section label="Run log">
              <Card flush>
                <div className="cl-log cl-log-rows">
                  {selected.logs.map((line, i) => (
                    <div className="cl-log-line" data-level="info" key={i} style={{ gridTemplateColumns: '32px minmax(0, 1fr)' }}>
                      <span className="cl-log-time" style={{ textAlign: 'right' }}>
                        {i + 1}
                      </span>
                      <span className="cl-log-msg">
                        <LogMessage text={line} />
                      </span>
                    </div>
                  ))}
                </div>
              </Card>
            </Section>
          </div>
        </div>
      </div>

      {/* create scenario */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Create scenario"
        subtitle="A scenario fixes its inputs and its expected result up front."
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
                pushToast('Scenario created as a draft');
              }}
            >
              Create Scenario
            </button>
          </>
        }
      >
        <div className="cl-field">
          <label className="cl-field-label" htmlFor="sc-name">
            Name
          </label>
          <input id="sc-name" className="cl-input" placeholder="Amount just above the escalation band" autoComplete="off" />
        </div>
        <div className="cl-field">
          <label className="cl-field-label" htmlFor="sc-group">
            Group
          </label>
          <select id="sc-group" className="cl-select" defaultValue="policy-boundaries">
            {SCENARIO_GROUPS.map((g) => (
              <option key={g.id} value={g.id}>
                {g.label}
              </option>
            ))}
          </select>
        </div>
        <div className="cl-field">
          <label className="cl-field-label" htmlFor="sc-expected">
            Expected result
          </label>
          <input id="sc-expected" className="cl-input" placeholder="DENY · AMOUNT_ABOVE_CEILING" autoComplete="off" />
          <span className="cl-field-hint">
            The expected result is fixed when the scenario is written. It is never edited afterwards to make a failing
            run pass.
          </span>
        </div>
      </Modal>

      {/* reset to template */}
      <StandardConfirmation
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        onConfirm={() => {
          setResetOpen(false);
          pushToast('Scenario reset to its template');
        }}
        title="Reset scenario to template"
        consequence="Inputs, mutation and expected result return to the values this scenario shipped with. Recorded run history is not removed."
        resource={selected.name}
        actionLabel="Reset to Template"
      />

      {/* compare runs */}
      <Modal
        open={compareOpen}
        onClose={() => setCompareOpen(false)}
        title="Compare runs"
        subtitle={selected.name}
        wide
        footer={
          <button type="button" className="cl-btn cl-btn-primary" onClick={() => setCompareOpen(false)}>
            Close
          </button>
        }
      >
        <table className="cl-table">
          <thead>
            <tr>
              <th>Run</th>
              <th style={{ width: 110 }}>Result</th>
              <th style={{ width: 120 }}>Blueprint</th>
              <th style={{ width: 110 }}>Duration</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <TimeAgo iso={selected.lastRun} /> · current
              </td>
              <td>{selectedResult ? <StatusBadge status={selectedResult} /> : '—'}</td>
              <td className="cl-mono">r{selected.builtAgainstBlueprint ?? '—'}</td>
              <td className="cl-mono">{selected.durationMs ?? '—'} ms</td>
            </tr>
            <tr>
              <td>
                <TimeAgo iso={new Date(new Date(selected.lastRun ?? Date.now()).getTime() - 86_400_000).toISOString()} />
              </td>
              <td>
                <StatusBadge status="PASS" />
              </td>
              <td className="cl-mono">r7</td>
              <td className="cl-mono">{(selected.durationMs ?? 100) + 38} ms</td>
            </tr>
          </tbody>
        </table>
        <p className="cl-meta" style={{ marginTop: 12 }}>
          A run recorded against an earlier Blueprint is evidence about that revision, not about the current one.
        </p>
      </Modal>
    </StudioPage>
  );
}
