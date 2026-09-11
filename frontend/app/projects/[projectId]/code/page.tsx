'use client';

/**
 * Code (spec §18).
 *
 * The generated sandbox files behind the agent. This is the one surface that is
 * genuinely a code editor, so the workbench flips to its dark theme here — the
 * shell applies it for this route.
 */
import { StudioPage } from '@/components/studio/PageScaffold';
import { Badge, Card, EmptyState, Section } from '@/components/studio/primitives';

export default function CodePage() {
  return (
    <StudioPage
      segment="code"
      stale
      badges={
        <>
          <Badge tone="neutral">Build r7</Badge>
          <Badge tone="warn">STALE · Blueprint is r8</Badge>
          <Badge tone="blocked">Read-only</Badge>
        </>
      }
      actions={
        <>
          <button type="button" className="cl-btn">
            Rebuild from Blueprint
          </button>
          <button type="button" className="cl-btn">
            Run tests
          </button>
          <button type="button" className="cl-btn">
            Compare revision
          </button>
          <button type="button" className="cl-btn cl-btn-primary">
            Download project
          </button>
        </>
      }
    >
      <Section label="Generated files">
        <Card>
          <EmptyState
            title="No file selected"
            body="Generated code is read-only after a successful build, so the built artifact still corresponds to the Blueprint that produced it. Select a file to read it, or rebuild from the Blueprint to bring the build up to r8."
            action={
              <button type="button" className="cl-btn cl-btn-primary">
                Rebuild from Blueprint
              </button>
            }
          />
        </Card>
      </Section>
    </StudioPage>
  );
}
