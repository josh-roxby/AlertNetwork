import { IconChevronRight } from "@/components/icons";

type Base = {
  label: string;
  subtitle?: string;
  onClick?: () => void;
};

type Variant =
  | ({ kind: "value"; value: string; chevron?: boolean } & Base)
  | ({ kind: "toggle"; on: boolean } & Base)
  | ({ kind: "pill"; status: "good" | "bad" | "neutral"; value: string } & Base)
  | ({ kind: "danger"; value?: string } & Base);

export function SettingsSection({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-5">
      <div className="t-micro mb-2 px-1 text-ink-3">{label}</div>
      <div className="overflow-hidden rounded-md border border-line bg-surface">
        {children}
      </div>
    </section>
  );
}

export function SettingsRow(props: Variant) {
  const inner =
    props.kind === "toggle" ? (
      <Toggle on={props.on} />
    ) : props.kind === "pill" ? (
      <StatusPill status={props.status} value={props.value} />
    ) : props.kind === "danger" ? (
      <ChevronGroup value={props.value} />
    ) : (
      <ChevronGroup value={props.value} chevron={props.chevron !== false} />
    );

  const labelTone =
    props.kind === "danger" ? "text-bad" : "text-ink";

  return (
    <button
      type="button"
      onClick={props.onClick}
      disabled={!props.onClick && props.kind !== "danger"}
      className="tap-row flex w-full items-center gap-3 border-b border-line px-3 py-3 text-left last:border-b-0 enabled:hover:bg-surface-2 disabled:cursor-default"
      style={{ minHeight: 56 }}
    >
      <span className="min-w-0 flex-1">
        <span className={`block t-body font-medium ${labelTone}`}>
          {props.label}
        </span>
        {props.subtitle && (
          <span
            className="mt-0.5 block t-meta text-ink-3"
            style={{ fontSize: 10 }}
          >
            {props.subtitle}
          </span>
        )}
      </span>
      {inner}
    </button>
  );
}

function ChevronGroup({
  value,
  chevron = true,
}: {
  value?: string;
  chevron?: boolean;
}) {
  return (
    <span className="flex shrink-0 items-center gap-2">
      {value && (
        <span
          data-numeric
          className="text-ink-2"
          style={{ fontSize: 12, fontFamily: "var(--font-mono)" }}
        >
          {value}
        </span>
      )}
      {chevron && <IconChevronRight className="text-ink-3" />}
    </span>
  );
}

function Toggle({ on }: { on: boolean }) {
  return (
    <span
      aria-hidden
      className={`relative inline-block h-6 w-10 shrink-0 rounded-full transition-colors duration-[120ms] ${
        on ? "bg-accent" : "bg-surface-3"
      }`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-[#0A0A0A] transition-transform duration-[120ms] ${
          on ? "translate-x-[18px]" : "translate-x-0.5"
        }`}
      />
    </span>
  );
}

function StatusPill({
  status,
  value,
}: {
  status: "good" | "bad" | "neutral";
  value: string;
}) {
  const tone =
    status === "good"
      ? "bg-good-soft text-good"
      : status === "bad"
        ? "bg-bad-soft text-bad"
        : "bg-surface-3 text-ink-3";
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 ${tone}`}
      style={{ fontSize: 10, fontWeight: 600 }}
    >
      <span
        aria-hidden
        className={`inline-block h-1.5 w-1.5 rounded-full ${status === "good" ? "bg-good" : status === "bad" ? "bg-bad" : "bg-ink-3"}`}
      />
      {value}
    </span>
  );
}
