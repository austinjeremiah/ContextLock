'use client';

/**
 * Code (spec §18).
 *
 * The one surface that genuinely is a code editor, so it flips to the dark
 * editor theme. Entering it plays a single blue-to-black wipe — the same
 * gesture as the landing page's "Enter Site" flood, expressed in CSS, since the
 * original is owned by the site's Three.js engine.
 *
 * FE-5 fills in the Monaco editor, file tree and diff view. The dark theme,
 * transition and chrome are in place now.
 */
import { useEffect, useState } from 'react';
import { StudioPage } from '@/components/studio/PageScaffold';
import { Badge, EmptyState } from '@/components/studio/primitives';

export default function CodePage() {
  const [wiping, setWiping] = useState(true);

  useEffect(() => {
    const handle = window.setTimeout(() => setWiping(false), 760);
    return () => window.clearTimeout(handle);
  }, []);

  return (
    <StudioPage segment="code" bleed>
      <div
        className="cl-theme-dark"
        style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          flex: '1 1 auto',
          minHeight: 0,
          background: 'var(--cl-canvas)',
          color: 'var(--cl-ink)',
        }}
      >
        {wiping ? <div className="cl-theme-wipe" aria-hidden /> : null}

        <div className="cl-page-pad" style={{ maxWidth: 1280 }}>
          <header className="cl-page-head">
            <div className="cl-page-head-main">
              <h1 className="cl-page-title">Code</h1>
              <p className="cl-page-sub">
                The generated sandbox files behind this agent. Generated code is read-only after a successful build, so
                the artifact still corresponds to the Blueprint.
              </p>
              <div className="cl-row cl-row-wrap" style={{ marginTop: 10 }}>
                <Badge tone="neutral">Build r7</Badge>
                <Badge tone="warn">STALE · Blueprint is r8</Badge>
                <Badge tone="sim">Dark editor theme</Badge>
              </div>
            </div>
          </header>

          <EmptyState
            title="Editor lands in FE-5"
            body="File tree, Monaco editor and the diff view are the next phase. The dark surface, transition and page chrome are wired now so the theme can be judged before the editor goes in."
          />
        </div>
      </div>
    </StudioPage>
  );
}
