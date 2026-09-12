export default function OfflinePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 text-center bg-golf-cream text-golf-green-900 dark:bg-[#0f3d24] dark:text-golf-cream">
      <div className="text-5xl" aria-hidden>
        ⛳
      </div>
      <h1 className="text-2xl font-semibold text-golf-gold">You&apos;re offline</h1>
      <p className="max-w-sm text-sm opacity-90">
        OG Golf works offline once installed. Open the app from your home screen —
        your rounds stay in this device&apos;s local storage.
      </p>
      <p className="text-xs opacity-70">Reconnect or reopen the home-screen app to continue scoring.</p>
    </main>
  );
}
