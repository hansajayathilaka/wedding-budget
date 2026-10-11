import type { ReactNode } from 'react';
import { WorkspaceShell } from '@/components/workspace/workspace-shell';

export default async function WeddingLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ weddingId: string }>;
}) {
  const { weddingId } = await params;
  return <WorkspaceShell weddingId={weddingId}>{children}</WorkspaceShell>;
}
