export default function NotFound() {
  // Deliberately no link back to `/`: see the isolation rule (F3).
  return (
    <main className="flex min-h-dvh items-center justify-center p-6 text-center">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Page not found</h1>
        <p className="text-sm text-muted-foreground">This page does not exist.</p>
      </div>
    </main>
  );
}
