"use client";

export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    <html lang="en"><body style={{ margin: 0, background: "#0D0D0F", color: "#f5f1e8", fontFamily: "system-ui" }}>
      <main role="alert" style={{ minHeight: "100vh", display: "grid", placeContent: "center", textAlign: "center", padding: 24 }}>
        <h1>The store is temporarily unavailable</h1>
        <p>Please try again in a moment.</p>
        <p lang="ar" dir="rtl">المتجر غير متاح مؤقتًا. حاول تاني بعد لحظات.</p>
        <button onClick={reset} style={{ padding: 16, cursor: "pointer" }}>Try again · حاول تاني</button>
      </main>
    </body></html>
  );
}
