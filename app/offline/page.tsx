export default function OfflinePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 text-center bg-og-bg text-og-text">
      <div className="text-5xl" aria-hidden>
        ⛳
      </div>
      <h1 className="text-2xl font-semibold text-og-accent-text">You&apos;re offline</h1>
      <p className="max-w-sm text-sm opacity-90">
        OG Golf works offline once installed. Open the app from your home screen —
        your rounds stay in this device&apos;s local storage.
      </p>
      <p className="text-xs opacity-70">Reconnect or reopen the home-screen app to continue scoring.</p>
    </main>
  );
}
