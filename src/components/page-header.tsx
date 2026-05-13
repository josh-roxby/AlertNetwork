export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex items-end justify-between gap-6">
      <div>
        {eyebrow && <div className="t-micro mb-2 text-ink-3">{eyebrow}</div>}
        <h1 className="t-display-2 uppercase">{title}</h1>
        {description && (
          <p className="mt-2 max-w-2xl t-body text-ink-2">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
