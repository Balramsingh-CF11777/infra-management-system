export function PlaceholderPage({ title, body }: { title: string; body: string }) {
  return (
    <section className="ims-card p-6">
      <h1 className="text-[22px] font-extrabold tracking-tight text-ims-ink">{title}</h1>
      <p className="mt-2 max-w-2xl text-sm text-slate-600">{body}</p>
    </section>
  );
}
