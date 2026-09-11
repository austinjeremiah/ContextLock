'use client';

/**
 * Composer / Build (spec §10).
 *
 * The starting surface for natural-language agent creation and major revisions.
 * The live parser output is labelled DRAFT until a deterministic Requirements
 * artifact exists, and a missing hard cap stays REQUIRED — never invented.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FileInput, Lightbulb, Pause, Play, Sparkles, Square } from 'lucide-react';
import { StudioPage } from '@/components/studio/PageScaffold';
import { AgentPatchInbox } from '@/components/studio/AgentPatches';
import { RequirementInterview } from '@/components/studio/RequirementInterview';
import {
  Badge,
  BlockerBanner,
  Card,
  Section,
  StatusBadge,
  TimeAgo,
} from '@/components/studio/primitives';
import { Modal } from '@/components/studio/dialogs';
import { useWorkbench } from '@/lib/studio/workbench';
import { PROJECT } from '@/lib/studio/mock/core';
import {
  BUILD_STAGES,
  COMPOSER_DRAFT,
  COMPOSER_EXAMPLES,
  COMPOSER_SLASH_HELPERS,
  DETECTED_REQUIREMENTS,
  questionsFor,
  QUOTA,
  type BuildStage,
} from '@/lib/studio/mock/build';
import type { Status } from '@/lib/studio/types';

type ComposerState =
  | 'EMPTY'
  | 'DRAFT'
  | 'GENERATING'
  | 'REQUIREMENTS_INCOMPLETE'
  | 'AWAITING_REVIEW'
  | 'PAUSED_QUOTA'
  | 'FAILED'
  | 'COMPLETE';

const DRAFT_KEY = 'ctxlock.composer.draft';

export default function ComposerPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { openBottom, setSelection, pushToast } = useWorkbench();

  const isNew = searchParams.get('new') === '1';
  const [text, setText] = useState(isNew ? '' : COMPOSER_DRAFT);
  const [state, setState] = useState<ComposerState>(isNew ? 'EMPTY' : 'COMPLETE');
  const [stages, setStages] = useState<BuildStage[]>(isNew ? [] : BUILD_STAGES);
  const [examplesOpen, setExamplesOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [slashOpen, setSlashOpen] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const timerRef = useRef<number | null>(null);

  /* autosave draft — UI-local only, never sent anywhere on its own */
  useEffect(() => {
    const handle = window.setTimeout(() => {
      if (!text) return;
      try {
        window.localStorage.setItem(DRAFT_KEY, text);
        setSavedAt(new Date().toISOString());
      } catch {
        /* storage unavailable; the draft simply is not restored next session */
      }
    }, 700);
    return () => window.clearTimeout(handle);
  }, [text]);

  useEffect(() => {
    if (!isNew) return;
    /* A description typed in the New Project modal wins over a stale autosaved
       draft — it is the more recent intent. */
    const seed = searchParams.get('seed');
    if (seed) {
      setText(seed);
      setState('DRAFT');
      return;
    }
    try {
      const saved = window.localStorage.getItem(DRAFT_KEY);
      if (saved) {
        setText(saved);
        setState('DRAFT');
      }
    } catch {
      /* ignore */
    }
  }, [isNew, searchParams]);

  useEffect(() => () => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
  }, []);

  /* Answers given in the clarifying interview. They close the same gaps the
     parser left open, so a requirement satisfied by conversation is
     indistinguishable from one stated in the description. */
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const requirements = useMemo(() => {
    if (!text.trim()) return [];
    const mentionsCeiling = /(never|not).{0,40}(above|more than|exceed)/i.test(text) || /hard (cap|ceiling)/i.test(text);
    return DETECTED_REQUIREMENTS.map((r) => {
      const answered = answers[r.id];
      if (answered) return { ...r, value: answered, status: 'PASS' as Status, note: undefined };
      if (r.id === 'req_ceiling' && mentionsCeiling) {
        return { ...r, value: 'Stated in description', status: 'PASS' as Status, note: undefined };
      }
      return r;
    });
  }, [text, answers]);

  const openQuestions = useMemo(() => questionsFor(requirements), [requirements]);

  const missingRequired = requirements.filter((r) => r.status === 'REQUIRED');
  const isDeterministic = state === 'COMPLETE' || state === 'AWAITING_REVIEW';
  const generating = state === 'GENERATING';

  /* simulated build pipeline — replaced by the backend's SSE build stream */
  const runPipeline = () => {
    if (missingRequired.length > 0) {
      setState('REQUIREMENTS_INCOMPLETE');
      openBottom('problems');
      pushToast('Requirements incomplete — a hard ceiling is required');
      return;
    }

    const sequence: BuildStage[] = BUILD_STAGES.map((s) => ({ ...s, status: 'PENDING' as Status }));
    setStages(sequence);
    setState('GENERATING');

    let index = 0;
    const advance = () => {
      setStages((prev) =>
        prev.map((stage, i) =>
          i === index
            ? { ...stage, status: 'RUNNING' }
            : i < index
              ? { ...stage, status: BUILD_STAGES[i].status }
              : stage,
        ),
      );
      timerRef.current = window.setTimeout(() => {
        setStages((prev) => prev.map((stage, i) => (i === index ? { ...stage, status: BUILD_STAGES[i].status } : stage)));
        index += 1;
        if (index < sequence.length) {
          advance();
        } else {
          setState('COMPLETE');
          pushToast('Blueprint r8 generated');
        }
      }, 900);
    };
    advance();
  };

  const cancelBuild = () => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    setStages((prev) => prev.map((s) => (s.status === 'RUNNING' ? { ...s, status: 'STOPPED' } : s)));
    setState('DRAFT');
    pushToast('Build cancelled. Persisted artifacts were kept.');
  };

  const insertHelper = (insert: string) => {
    setText((prev) => `${prev}${prev.endsWith('\n') || !prev ? '' : '\n'}${insert}\n`);
    setSlashOpen(false);
    textareaRef.current?.focus();
  };

  const nearQuota = QUOTA.used / QUOTA.limit > 0.8;

  const statusLine =
    state === 'EMPTY'
      ? 'Draft · Blueprint not generated'
      : state === 'DRAFT'
        ? 'Draft · not yet generated'
        : state === 'GENERATING'
          ? 'Generating · build pipeline running'
          : state === 'REQUIREMENTS_INCOMPLETE'
            ? 'Requirements incomplete'
            : state === 'AWAITING_REVIEW'
              ? 'Awaiting user review'
              : state === 'PAUSED_QUOTA'
                ? 'Build paused by quota'
                : state === 'FAILED'
                  ? 'Build failed'
                  : `Complete · Blueprint r${PROJECT.revisions.blueprint}`;

  return (
    <StudioPage
      segment="build"
      subtitle="Describe what this agent should do and the boundaries it must obey."
      badges={
        <>
          <Badge tone={state === 'COMPLETE' ? 'pass' : state === 'GENERATING' ? 'sim' : 'neutral'}>{statusLine}</Badge>
          {savedAt ? (
            <span className="cl-meta">
              Draft autosaved <TimeAgo iso={savedAt} />
            </span>
          ) : null}
        </>
      }
      actions={
        <>
          <button type="button" className="cl-btn" onClick={() => setExamplesOpen(true)}>
            <Lightbulb size={13} aria-hidden />
            Examples
          </button>
          <button type="button" className="cl-btn" onClick={() => setImportOpen(true)}>
            <FileInput size={13} aria-hidden />
            Import Requirements
          </button>
          {generating ? (
            <button type="button" className="cl-btn cl-btn-danger" onClick={cancelBuild}>
              <Square size={12} aria-hidden />
              Cancel Build
            </button>
          ) : state === 'PAUSED_QUOTA' ? (
            <button type="button" className="cl-btn cl-btn-primary" onClick={runPipeline}>
              <Play size={12} aria-hidden />
              Resume Build
            </button>
          ) : (
            <button
              type="button"
              className="cl-btn cl-btn-primary"
              onClick={runPipeline}
              disabled={!text.trim()}
              title={!text.trim() ? 'Describe the agent first' : undefined}
            >
              <Sparkles size={13} aria-hidden />
              {isDeterministic ? 'Regenerate Blueprint' : 'Generate Blueprint'}
            </button>
          )}
        </>
      }
      banners={
        <>
          {state === 'REQUIREMENTS_INCOMPLETE' ? (
            <BlockerBanner
              tone="warn"
              title="Requirements incomplete"
              actions={
                <button type="button" className="cl-btn cl-btn-sm" onClick={() => setSlashOpen(true)}>
                  Insert /limits
                </button>
              }
            >
              {missingRequired.map((r) => r.label).join(', ')} must be stated explicitly before a Blueprint can be
              generated. A financial ceiling is never inferred from the other limits.
            </BlockerBanner>
          ) : null}
          {nearQuota ? (
            <BlockerBanner tone="warn" title="Approaching model usage limit">
              {QUOTA.used} of {QUOTA.limit} generation runs used {QUOTA.window}. A build that hits the limit pauses and
              can be resumed; already persisted artifacts are kept.
            </BlockerBanner>
          ) : null}
        </>
      }
    >
      <AgentPatchInbox pageKind="composer" />

      {/* prompt editor */}
      <Section
        label="Agent description"
        actions={
          <button type="button" className="cl-btn cl-btn-sm" onClick={() => setSlashOpen((v) => !v)}>
            Snippets
          </button>
        }
      >
        {slashOpen ? (
          <div className="cl-card" style={{ marginBottom: 10 }}>
            <div className="cl-card-body">
              <div className="cl-label" style={{ marginBottom: 8 }}>
                Structured prompt helpers
              </div>
              <div className="cl-col" style={{ gap: 6 }}>
                {COMPOSER_SLASH_HELPERS.map((helper) => (
                  <button
                    key={helper.command}
                    type="button"
                    className="cl-btn cl-btn-block"
                    style={{ fontFamily: 'var(--sans)' }}
                    onClick={() => insertHelper(helper.insert)}
                  >
                    <span className="cl-mono" style={{ marginRight: 8 }}>
                      {helper.command}
                    </span>
                    <span className="cl-meta">{helper.description}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        <textarea
          ref={textareaRef}
          className="cl-textarea"
          style={{ minHeight: 210, fontSize: 14, lineHeight: 1.6 }}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            if (state === 'EMPTY' || state === 'REQUIREMENTS_INCOMPLETE') setState('DRAFT');
          }}
          placeholder={'"Build an Aave guardian that repays my USDC debt when the health factor falls below 1.25…"'}
          aria-label="Agent description"
          disabled={generating}
        />
        <p className="cl-field-hint" style={{ marginTop: 6 }}>
          Do not paste secrets, private keys or API credentials. Credentials are configured separately under
          Integrations, where their values are never displayed.
        </p>
      </Section>

      {/* Clarifying interview — the parser reports what the description says;
          this asks about what it leaves out (spec §10, §30). */}
      {requirements.length > 0 ? (
        <Section label="Clarify">
          <RequirementInterview
            questions={openQuestions}
            answers={answers}
            onAnswer={(id, value) => {
              setAnswers((prev) => ({ ...prev, [id]: value }));
              setSavedAt(new Date().toISOString());
            }}
            onSkip={() => undefined}
          />
        </Section>
      ) : null}

      {/* detected requirements */}
      <Section
        label="Detected requirements"
        actions={
          <Badge tone={isDeterministic ? 'pass' : 'warn'}>
            {isDeterministic ? `Requirements r${PROJECT.revisions.requirements}` : 'DRAFT · parser output'}
          </Badge>
        }
      >
        {requirements.length === 0 ? (
          <Card>
            <p className="cl-meta">
              Nothing parsed yet. Describe the agent above and candidate requirements will appear here as a draft.
            </p>
          </Card>
        ) : (
          <Card flush>
            <div className="cl-table-scroll">
              <table className="cl-table">
                <thead>
                  <tr>
                    <th style={{ width: 210 }}>Requirement</th>
                    <th>Value</th>
                    <th style={{ width: 130 }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {requirements.map((r) => (
                    <tr
                      key={r.id}
                      data-clickable="true"
                      onClick={() => setSelection({ kind: 'requirement', id: r.id, label: r.label })}
                    >
                      <td className="cl-strong">{r.label}</td>
                      <td>
                        <div>{r.value}</div>
                        {r.note ? (
                          <div className="cl-meta" style={{ whiteSpace: 'normal' }}>
                            {r.note}
                          </div>
                        ) : null}
                      </td>
                      <td>
                        <StatusBadge status={r.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </Section>

      {/* build timeline */}
      {stages.length > 0 ? (
        <Section
          label="Build timeline"
          actions={<span className="cl-meta">Click a stage to open its detail below</span>}
        >
          <div className="cl-steps">
            {stages.map((stage, i) => (
              <button
                key={stage.id}
                type="button"
                className="cl-step"
                style={{ width: '100%', textAlign: 'left' }}
                onClick={() => {
                  openBottom(stage.panel);
                  setSelection({ kind: 'build-stage', id: stage.id, label: stage.name });
                }}
              >
                <span className="cl-step-index">{i + 1}</span>
                <span className="cl-step-name">{stage.name}</span>
                <StatusBadge status={stage.status} />
                <span className="cl-spacer" />
                <span className="cl-step-detail">{stage.detail}</span>
              </button>
            ))}
          </div>

          {state === 'COMPLETE' ? (
            <div className="cl-row" style={{ marginTop: 12, justifyContent: 'flex-end', gap: 8 }}>
              <button
                type="button"
                className="cl-btn"
                onClick={() => router.push(`/projects/${PROJECT.id}/security`)}
              >
                Inspect authority
              </button>
              <button
                type="button"
                className="cl-btn cl-btn-primary"
                onClick={() => router.push(`/projects/${PROJECT.id}/blueprint`)}
              >
                Open Blueprint r{PROJECT.revisions.blueprint}
              </button>
            </div>
          ) : null}
        </Section>
      ) : null}

      {/* examples */}
      <Modal
        open={examplesOpen}
        onClose={() => setExamplesOpen(false)}
        title="Examples"
        subtitle="Each example states its own limits explicitly."
        wide
      >
        <div className="cl-col" style={{ gap: 10 }}>
          {COMPOSER_EXAMPLES.map((example) => (
            <div className="cl-card" key={example.id}>
              <div className="cl-card-head">
                <div className="cl-card-title">{example.title}</div>
                <button
                  type="button"
                  className="cl-btn cl-btn-sm"
                  onClick={() => {
                    setText(example.body);
                    setState('DRAFT');
                    setExamplesOpen(false);
                  }}
                >
                  Use this
                </button>
              </div>
              <div className="cl-card-body">
                <p style={{ fontSize: 12.5, lineHeight: 1.6 }}>{example.body}</p>
              </div>
            </div>
          ))}
        </div>
      </Modal>

      {/* import requirements */}
      <Modal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        title="Import requirements"
        subtitle="Accepts a validated requirements JSON document."
        footer={
          <>
            <button type="button" className="cl-btn" onClick={() => setImportOpen(false)}>
              Cancel
            </button>
            <button type="button" className="cl-btn cl-btn-primary" disabled>
              Import
            </button>
          </>
        }
      >
        <div className="cl-field">
          <label className="cl-field-label" htmlFor="req-file">
            Requirements document
          </label>
          <input id="req-file" type="file" accept=".json" className="cl-input" style={{ paddingTop: 4 }} />
          <span className="cl-field-hint">
            The document is schema-validated before it replaces the current draft. Imported limits are still reviewed
            as an authority change.
          </span>
        </div>
      </Modal>
    </StudioPage>
  );
}
