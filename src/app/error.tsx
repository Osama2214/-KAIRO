"use client";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <section role="alert" className="min-h-[70vh] flex flex-col items-center justify-center gap-5 px-6 text-center">
      <h1 className="text-2xl font-bold">We couldn’t load this page</h1>
      <p className="text-text-muted">Please check your connection and try again.</p>
      <p lang="ar" dir="rtl">تعذّر تحميل الصفحة. جرّب تاني بعد التأكد من الاتصال.</p>
      <button onClick={reset} className="border border-gold px-6 py-3 text-gold">Try again · حاول تاني</button>
    </section>
  );
}
