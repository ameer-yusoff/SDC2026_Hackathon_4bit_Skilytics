import { useEffect, useState, type ReactNode } from "react";
import { Link } from "wouter";
import ReactMarkdown from "react-markdown";
import {
  AlertTriangle,
  Briefcase,
  CircleDashed,
  Cpu,
  Database,
  ExternalLink,
  HeartPulse,
  Landmark,
  Languages,
  Leaf,
  Loader2,
  Palette,
  RotateCw,
  Settings2,
  Sparkles,
  UserPlus,
  Users,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import type {
  CostType,
  HrdcStatus,
  SkillStatus,
  SourceRef,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { LANG_SHORT, useErrText, useT } from "@/i18n";
import { useFmt } from "@/lib/fmt";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

export function BrandMark({ className }: { className?: string }) {
  return (
    <span className={cn("relative inline-block h-10 w-10 shrink-0 overflow-hidden", className)}>
      <img src="/skilytics-logo.png" alt="Skilytics" className="absolute left-1/2 top-1/2 h-[145%] w-[145%] max-w-none -translate-x-1/2 -translate-y-1/2 object-contain" />
    </span>
  );
}

export function Brand({
  href = "/",
  small,
}: {
  href?: string;
  small?: boolean;
}) {
  return (
    <Link
      href={href}
      className="flex min-h-11 min-w-0 items-center gap-2.5"
      data-testid="link-brand"
    >
      <BrandMark className={small ? "h-8 w-8 text-xs" : undefined} />
      <span
        className={cn(
          "truncate whitespace-nowrap font-bold tracking-tight text-primary",
          small ? "text-base" : "text-xl",
        )}
      >
        Skilytics
      </span>
    </Link>
  );
}

export function LangToggle({ className }: { className?: string }) {
  const { lang, cycle, t } = useT();
  return (
    <button
      type="button"
      onClick={cycle}
      aria-label={t("lang.toggle")}
      title={t("lang.toggle")}
      data-testid="button-lang"
      className={cn(
        "inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-full border border-border bg-card px-3 text-sm font-semibold text-foreground transition-colors hover:border-primary hover:text-primary",
        className,
      )}
    >
      <Languages className="h-4 w-4 shrink-0" />
      <span className="whitespace-nowrap">{LANG_SHORT[lang]}</span>
    </button>
  );
}

export function PageHeader({
  eyebrow,
  title,
  sub,
  actions,
  help,
}: {
  eyebrow?: ReactNode;
  title: string;
  sub?: ReactNode;
  actions?: ReactNode;
  help?: ReactNode;
}) {
  return (
    <header className={cn("rise relative mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between",help && "md:flex-col md:items-stretch")}>
      <div className={cn("flex min-w-0 flex-1 items-start justify-between gap-3",help && "pr-16")}>
        <div className="min-w-0">
          {eyebrow && (
            <div className="mb-1 truncate whitespace-nowrap text-xs font-semibold uppercase tracking-[0.12em] text-accent">
              {eyebrow}
            </div>
          )}
          <h1
            title={title}
            className="text-2xl font-bold tracking-tight md:text-3xl"
          >
            {title}
          </h1>
          {sub && (
            <div className="mt-1 text-sm text-muted-foreground">{sub}</div>
          )}
        </div>
      </div>
      {help && <div className="absolute right-0 top-0">{help}</div>}
      {actions && (
        <div className={cn("flex shrink-0 flex-wrap gap-2",help && "justify-end")}>{actions}</div>
      )}
    </header>
  );
}

export function Panel({
  title,
  meta,
  children,
  className,
  actions,
  id,
}: {
  title?: string;
  meta?: ReactNode;
  children: ReactNode;
  className?: string;
  actions?: ReactNode;
  id?: string;
}) {
  return (
    <section
      id={id}
      className={cn(
        "rise min-w-0 rounded-2xl border border-card-border bg-card p-4 shadow-xs md:p-5",
        className,
      )}
    >
      {(title || actions) && (
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            {title && (
              <h2
                title={title}
                className="truncate whitespace-nowrap text-base font-semibold"
              >
                {title}
              </h2>
            )}
            {meta && (
              <div className="mt-0.5 text-xs text-muted-foreground">{meta}</div>
            )}
          </div>
          {actions && <div className="flex shrink-0 gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

export function Stat({
  label,
  value,
  foot,
  tone,
  testid,
}: {
  label: string;
  value: ReactNode;
  foot?: ReactNode;
  tone?: "gold" | "maroon";
  testid?: string;
}) {
  return (
    <div className="rise min-w-0 rounded-2xl border border-card-border bg-card p-4 shadow-xs">
      <div
        title={label}
        className="truncate whitespace-nowrap text-xs font-medium text-muted-foreground"
      >
        {label}
      </div>
      <div
        className={cn(
          "tnum mt-1 truncate text-2xl font-bold tracking-tight",
          tone === "gold"
            ? "text-accent"
            : tone === "maroon"
              ? "text-primary"
              : "",
        )}
        data-testid={testid}
      >
        {value}
      </div>
      {foot && (
        <div className="mt-1 text-[11px] leading-snug text-muted-foreground">
          {foot}
        </div>
      )}
    </div>
  );
}

export function Empty({
  title,
  children,
  icon,
  action,
}: {
  title: string;
  children?: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="dotgrid flex flex-col items-center justify-center rounded-2xl border border-dashed border-border px-6 py-10 text-center">
      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-card text-primary shadow-xs">
        {icon ?? <CircleDashed className="h-5 w-5" />}
      </div>
      <div className="font-semibold">{title}</div>
      {children && (
        <div className="mt-1 max-w-md text-sm text-muted-foreground">
          {children}
        </div>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorBox({
  error,
  retry,
  message,
  action,
}: {
  error?: unknown;
  retry?: () => void;
  message?: string;
  action?: ReactNode;
}) {
  const { t } = useT();
  const et = useErrText();
  return (
    <div
      className="flex flex-col gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm sm:flex-row sm:items-center sm:justify-between"
      role="alert"
    >
      <div className="flex items-start gap-2 text-destructive">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <span>{message ?? et(error)}</span>
      </div>
      <div className="flex flex-wrap items-center gap-2 shrink-0">
        {retry && (
          <Button
            variant="outline"
            className="min-h-11 shrink-0"
            onClick={retry}
            data-testid="button-retry"
          >
            <RotateCw className="mr-1.5 h-4 w-4" />
            {t("common.retry")}
          </Button>
        )}
        {action}
      </div>
    </div>
  );
}

export function Rows({ n = 4, h = "h-12" }: { n?: number; h?: string }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: n }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn("w-full rounded-2xl", h)}
          style={{ opacity: Math.max(0.6, 1 - i * 0.08) }}
        />
      ))}
    </div>
  );
}

export function StepLoadingSkeleton({
  title,
  n = 4,
  h = "h-14",
}: {
  title?: string;
  n?: number;
  h?: string;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground animate-pulse">
        <RotateCw className="h-4 w-4 animate-spin text-primary" />
        <span>{title ?? "Menyediakan profil anda..."}</span>
      </div>
      <Rows n={n} h={h} />
    </div>
  );
}

export function Meter({
  value,
  max = 1,
  tone = "maroon",
  label,
  className,
}: {
  value: number | null | undefined;
  max?: number;
  tone?: "maroon" | "gold" | "slate";
  label?: string;
  className?: string;
}) {
  const w = value == null ? 0 : Math.max(0, Math.min(1, value / max)) * 100;
  const col =
    tone === "gold"
      ? "bg-accent"
      : tone === "slate"
        ? "bg-chart-3"
        : "bg-primary";
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-700",
            col,
          )}
          style={{ width: `${w}%` }}
        />
      </div>
      {label && (
        <span className="tnum w-14 shrink-0 text-right text-xs font-medium">
          {label}
        </span>
      )}
    </div>
  );
}

export function DataStamp({
  source,
  period,
  fetchedAt,
}: {
  source: string;
  period?: string | null;
  fetchedAt?: string | null;
}) {
  const { t } = useT();
  const f = useFmt();
  return (
    <div
      className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground"
      data-testid="text-data-stamp"
    >
      <span className="inline-flex items-center gap-1">
        <Database className="h-3 w-3" />
        {t("common.source")}:{" "}
        <b className="font-semibold text-foreground">{source}</b>
      </span>
      <span>
        {t("common.dataPeriod")}:{" "}
        <b className="font-semibold text-foreground">
          {period ?? t("common.notYet")}
        </b>
      </span>
      {fetchedAt !== undefined && (
        <span>
          {t("common.checked")}: {f.date(fetchedAt)}
        </span>
      )}
    </div>
  );
}

export function SourceList({ sources }: { sources: SourceRef[] }) {
  const { t } = useT();
  if (!sources?.length)
    return (
      <div className="text-xs text-muted-foreground">
        {t("common.noSources")}
      </div>
    );
  return (
    <ul className="flex flex-wrap gap-1.5">
      {sources.map((s, i) => (
        <li
          key={i}
          className="inline-flex max-w-full items-center gap-1 rounded-full border border-border bg-background px-2 py-0.5 text-[11px]"
        >
          {s.url ? (
            <a
              href={s.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-w-0 items-center gap-1 hover:text-primary"
            >
              <span className="truncate">{s.label}</span>
              <ExternalLink className="h-3 w-3 shrink-0" />
            </a>
          ) : (
            <span className="truncate">{s.label}</span>
          )}
          {s.dataDate && (
            <span className="shrink-0 text-muted-foreground">
              · {s.dataDate}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}

const chip =
  "inline-flex max-w-full items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold";

export function HrdcBadge({ status }: { status: HrdcStatus }) {
  const { tk } = useT();
  const { user } = useAuth();
  if (user?.role !== "hr") return null;
  const c =
    status === "claimable_verified"
      ? "bg-primary text-primary-foreground"
      : status === "check_with_employer"
        ? "border border-accent bg-[hsl(var(--gold-soft))] text-foreground"
        : "bg-muted text-muted-foreground";
  const label = tk("hrdc", status);
  return (
    <span title={label} className={cn(chip, c)}>
      <Briefcase aria-hidden="true" className="h-3 w-3" />
      <span className="truncate">{label}</span>
    </span>
  );
}
export function CostBadge({ type }: { type: CostType }) {
  const { tk } = useT();
  const c =
    type === "free"
      ? "bg-[hsl(var(--gold-soft))] text-foreground"
      : type === "low_cost"
        ? "bg-secondary text-secondary-foreground"
        : "border border-border text-muted-foreground";
  return <span className={cn(chip, c)}>{tk("cost", type)}</span>;
}
export function SegTag({ s }: { s: string }) {
  const { tk } = useT();
  return (
    <span className={cn(chip, "bg-[hsl(var(--maroon-soft))] text-primary")}>
      {tk("seg", s)}
    </span>
  );
}
export function StatusTag({ s }: { s: SkillStatus }) {
  const { tk } = useT();
  const c =
    s === "evidenced"
      ? "bg-primary text-primary-foreground"
      : s === "self_reported"
        ? "bg-[hsl(var(--gold-soft))] text-foreground"
        : "bg-muted text-muted-foreground";
  return <span className={cn(chip, c)}>{tk("status", s)}</span>;
}
export function SdgBadge({
  code,
  title,
  primary = false,
  compact = false,
}: {
  code: string;
  title?: string;
  primary?: boolean;
  compact?: boolean;
}) {
  const { tk } = useT();
  const goal = Number(code.split(".")[0]);
  if (!Number.isInteger(goal) || goal < 1 || goal > 17) return null;
  const label = title ?? tk("sdg", String(goal));
  return (
    <a
      href={`https://sdgs.un.org/goals/goal${goal}`}
      target="_blank"
      rel="noopener noreferrer"
      title={label}
      className={cn(
        "inline-flex items-center gap-1 rounded-none border bg-card p-1 text-xs",
        primary ? "border-[3px] border-primary font-bold" : "border-border",
      )}
    >
      <img
        src={`/sdg/${goal}.png`}
        alt={`SDG ${goal}: ${label}`}
        className={cn("rounded-none object-contain", compact ? "h-8 w-8" : "h-14 w-14")}
        loading="lazy"
      />
    </a>
  );
}

const CAT_ICON: Record<string, LucideIcon> = {
  Digital: Cpu,
  Business: Briefcase,
  Creative: Palette,
  Finance: Landmark,
  Engineering: Wrench,
  Operations: Settings2,
  Green: Leaf,
  Health: HeartPulse,
  Human: Users,
};
export const catIcon = (c?: string | null): LucideIcon =>
  (c && CAT_ICON[c]) || Sparkles;

export function SkillBadge({
  name,
  category,
  tone = "neutral",
}: {
  name: string;
  category?: string;
  tone?: "have" | "gap" | "neutral";
}) {
  const { tk } = useT();
  const Icon = catIcon(category);
  const c =
    tone === "have"
      ? "border-accent/60 bg-[hsl(var(--gold-soft))]"
      : tone === "gap"
        ? "border-dashed border-primary/50 bg-card text-primary"
        : "border-border bg-background";
  const title = category ? `${name} · ${tk("cat", category)}` : name;
  return (
    <span
      title={title}
      className={cn(
        "inline-flex max-w-full items-center gap-1.5 rounded-lg border px-2 py-1 text-xs font-medium",
        c,
      )}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <span className="truncate whitespace-nowrap">{name}</span>
    </span>
  );
}

export function Markdown({ children }: { children: string }) {
  return (
    <div className="prose-sk min-w-0 break-words">
      <ReactMarkdown>{children}</ReactMarkdown>
    </div>
  );
}

export function AiWait({ since, note }: { since: number; note?: ReactNode }) {
  const { t } = useT();
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(i);
  }, []);
  const s = Math.max(0, Math.round((now - since) / 1000));
  return (
    <div
      className="rounded-xl border border-accent/40 bg-[hsl(var(--gold-soft))]/60 p-4 text-sm"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-2 font-semibold">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
        {t("ai.working", { s })}
      </div>
      <p className="mt-1 text-muted-foreground">
        {note ?? (s > 8 ? t("ai.coldStart") : t("ai.thinking"))}
      </p>
      <div className="mt-3 h-1 overflow-hidden rounded-full bg-card">
        <div className="sweep h-full w-1/3 rounded-full bg-primary/70" />
      </div>
    </div>
  );
}

export function GuestBanner({ compact }: { compact?: boolean }) {
  const { t } = useT();
  return (
    <div
      className="rise flex flex-col gap-3 rounded-2xl border border-accent/40 bg-[hsl(var(--gold-soft))]/50 p-3 text-sm sm:flex-row sm:items-center sm:justify-between"
      data-testid="banner-guest"
    >
      <div className="flex min-w-0 items-start gap-2.5">
        <UserPlus className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <div className="min-w-0">
          <div className="font-semibold">{t("guest.title")}</div>
          {!compact && (
            <div className="text-muted-foreground">{t("guest.body")}</div>
          )}
        </div>
      </div>
      <div className="flex shrink-0 gap-2">
        <Link
          href="/register"
          className="inline-flex min-h-11 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          data-testid="link-guest-register"
        >
          {t("auth.register")}
        </Link>
        <Link
          href="/login"
          className="inline-flex min-h-11 items-center rounded-lg border border-border bg-card px-4 text-sm font-medium hover:border-primary"
          data-testid="link-guest-login"
        >
          {t("auth.login")}
        </Link>
      </div>
    </div>
  );
}

export function ExplainNote({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-xl bg-muted/60 p-3 text-xs leading-relaxed text-muted-foreground">
      {children}
    </p>
  );
}

export function DataNotice() {
  const { t } = useT();
  return (
    <aside
      className="mt-10 rounded-2xl border border-dashed border-border bg-card/60 p-4 text-xs leading-relaxed text-muted-foreground"
      data-testid="notice-data"
    >
      <div className="mb-1.5 font-semibold text-foreground">
        {t("notice.title")}
      </div>
      <ul className="grid gap-1 md:grid-cols-2">
        {(
          [
            "notice.courses",
            "notice.mycol",
            "notice.sdg",
            "notice.onet",
          ] as const
        ).map((k) => (
          <li key={k} className="flex gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
            {t(k)}
          </li>
        ))}
      </ul>
    </aside>
  );
}
