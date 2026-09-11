'use client';

import { StudioPage } from '@/components/studio/PageScaffold';
import { EmptyState } from '@/components/studio/primitives';

export default function Page() {
  return (
    <StudioPage segment="identity">
      <EmptyState
        title="Surface in progress"
        body="This page is being built in the current phase. The workbench shell, navigation, agent context and status vocabulary around it are already live."
      />
    </StudioPage>
  );
}
