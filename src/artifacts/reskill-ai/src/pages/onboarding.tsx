import { forgetPreviousIntake } from "@/lib/intake-replacement";
import {SyntheticBadge} from "@/components/sdg-choice";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link, Redirect, useLocation, useParams, useSearch } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  AlertTriangle, ArrowLeft, ArrowRight, BadgeCheck, BarChart2, Check, CheckCircle2, Compass, Copy, ExternalLink, Eye, FileCheck, FileImage, FileText, FileUp, GraduationCap, HelpCircle, Lightbulb, Loader2, PlusCircle, Quote, RotateCw, Sparkles, X,
} from "lucide-react";
import {
  customFetch, createProfile, runProfileAgent, useGetProfile, useListProfileInsights, useListRiasecQuestions, useListRoles, useListCourses, useSubmitRiasec, useUpdateProfile, useUploadCv,
  getGetProfileQueryKey, getListProfileInsightsQueryKey,
  type AgentInsight, type CvEvidence, type Profile, type ProfileUpdate, type Segment,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { AiWait, Brand, ErrorBox, LangToggle, Markdown, Meter, Rows, StepLoadingSkeleton, StatusTag } from "@/components/kit";
import { useToast } from "@/hooks/use-toast";
import { setActiveProfile } from "@/lib/fmt";
import { useAuth, portalHome } from "@/lib/auth";
import {
  CV_MAX_BYTES, CV_OK, OB_STEPS, clearDraft, clearObCreateKey, getObCreateKey, getObProfile, obScope, readDraft, setObProfile, writeDraft, type ObStep,
} from "@/lib/onboarding";
import { LANG_NAME, errCode, errStatus, useErrText, useT, type DictKey, type Lang } from "@/i18n";
import { en } from "@/i18n/en";
import { ms } from "@/i18n/ms";
import { zh } from "@/i18n/zh";
import { cn } from "@/lib/utils";
import { HollandLoadingStory, HollandStoryCard, HollandTranslationNote } from "@/components/holland-story";

const RIASEC = ["R", "I", "A", "S", "E", "C"] as const;
/** Temporary server-side name marker until the CV/review supplies the real name. */
const DRAFT_NAMES = new Set([en["ob.draftName"], ms["ob.draftName"], zh["ob.draftName"]]);
const idx = (s: string | null | undefined) => {
  if (s === "complete") return OB_STEPS.length - 1;
  const i = OB_STEPS.indexOf((s ?? "") as ObStep);
  return i < 0 ? 0 : i;
};
/** Furthest step the profile's actual data supports. */
function capStep(p: Profile): ObStep {
  if (!p.cvExtractionKey) return "cv";
  if (!p.verified) return "review";
  if (!p.riasecScores) return "holland";
  return "save";
}
/** Stored step bounded by what the data actually proves. */
function serverStep(p: Profile): ObStep {
  const cap = idx(capStep(p));
  const stored = p.onboardingStep ? idx(p.onboardingStep) : cap;
  return OB_STEPS[Math.min(cap, stored)];
}
const isAiDown = (e: unknown) => {
  const c = errCode(e);
  return c !== "ai_vision_unsupported" && (c === "ai_not_connected" || c === "ai_timeout" || c === "ai_unavailable" || c === "ai_failed" || (errStatus(e) ?? 0) >= 502);
};

export default function Onboarding() {
  const { user, loading } = useAuth();
  const qc = useQueryClient();
  const params = useParams<{ step?: string }>();
  const search = useSearch();
  const [, nav] = useLocation();
  const { t } = useT();
  const scope = obScope(user?.id);
  const searchParams = new URLSearchParams(search);
  const preSeg = searchParams.get("seg");
  const preNew = searchParams.get("new");
  const isNew = preNew === "1";

  // Check URL pid first (e.g. ?pid=123), then fallback to localStorage
  const urlPid = Number(searchParams.get("pid"));
  const validUrlPid = Number.isFinite(urlPid) && urlPid > 0 ? urlPid : null;

  const [pid, setPid] = useState<number | null>(() => {
    if (validUrlPid) return validUrlPid;
    if (isNew) {
      setActiveProfile(null);
      setObProfile(scope, null);
      clearObCreateKey(scope);
      return null;
    }
    return getObProfile(scope);
  });
  const [ready, setReady] = useState(() => !loading);

  // Clean new=1 from the URL; retain the previous intake until a CV succeeds.
  useEffect(() => {
    if (preNew === "1") {
      setObProfile(scope, null);
      const clean = new URLSearchParams(window.location.search);
      clean.delete("new");
      const qs = clean.toString();
      window.history.replaceState(null, "", `${window.location.pathname}${qs ? `?${qs}` : ""}`);
    }
  }, []);

  useEffect(() => {
    if (!loading && !ready) {
      if (!isNew && !pid) {
        setPid(getObProfile(scope));
      }
      setReady(true);
    }
  }, [loading, ready, isNew, pid, scope]);

  const q = useGetProfile(pid ?? 0, { query: { enabled: !!pid && pid > 0, queryKey: getGetProfileQueryKey(pid ?? 0), retry: false } });
  // Mutations update the cache synchronously, but React Query notifies this
  // observer on a later tick. A route change can render before that notice:
  // guarding against q.data alone would redirect a successful advance back
  // to the old step. Use the authoritative cache snapshot for this render.
  const p = pid ? qc.getQueryData<Profile>(getGetProfileQueryKey(pid)) ?? q.data : q.data;
  const requested = (OB_STEPS as readonly string[]).includes(params.step ?? "") ? (params.step as ObStep) : null;
  const upd = useUpdateProfile();
  const targetSeg: Segment = preSeg === "graduate" ? "graduate" : "worker";
  const createPromiseRef = useRef<Promise<Profile> | null>(null);

  const handleProfileReady = useCallback((np: Profile) => {
    const previous = getObProfile(scope);
    if (previous && previous !== np.id) forgetPreviousIntake(qc, scope, previous);
    setActiveProfile(np.id);
    setObProfile(scope, np.id);
    setPid(np.id);
    qc.setQueryData(getGetProfileQueryKey(np.id), np);
  }, [scope, qc]);

  const ensureProfile = useCallback(async (force = false): Promise<Profile> => {
    if (!force && p && p.id > 0) return p;
    if (createPromiseRef.current) return createPromiseRef.current;
    const promise = createProfile({
        name: t("ob.draftName"),
        segment: targetSeg,
        weeklyHours: 1,
        budgetMyr: 0,
    }, { headers: { "X-Idempotency-Key": getObCreateKey(scope), "X-Replace-Intake": "1" }, signal: AbortSignal.timeout(15_000) }).then((np) => {
      handleProfileReady(np);
      qc.invalidateQueries({ queryKey: ["/api/profiles"] });
      qc.invalidateQueries({ queryKey: ["/api/dashboard/summary"] });
      createPromiseRef.current = null;
      return np;
    }).catch((err) => {
      createPromiseRef.current = null;
      throw err;
    });
    createPromiseRef.current = promise;
    return promise;
  }, [p, scope, t, targetSeg, handleProfileReady, qc]);

  useEffect(() => {
    if (q.isError && pid && (errStatus(q.error) === 404 || errStatus(q.error) === 403)) {
      setObProfile(scope, null);
      clearObCreateKey(scope);
      setPid(null);
    }
  }, [q.isError, q.error, pid, scope]);

  useEffect(() => {
    if (requested !== "cv" && p && p.id > 0 && preSeg && (preSeg === "worker" || preSeg === "graduate") && p.segment !== preSeg && !upd.isPending) {
      upd.mutateAsync({ id: p.id, data: { segment: preSeg } }).then((np) => {
        handleProfileReady(np);
        qc.invalidateQueries({ queryKey: ["/api/profiles"] });
      }).catch(() => {});
    }
  }, [requested, p?.id, p?.segment, preSeg, handleProfileReady, upd, qc]);

  const draftProfile: Profile = useMemo(() => ({
    id: pid ?? 0,
    name: t("ob.draftName"),
    segment: targetSeg,
    weeklyHours: 1,
    budgetMyr: 0,
    hrdcEligible: false,
    hrdcEligibilityStatus: null,
    cvFileName: null,
    education: null,
    experience: null,
    cvEvidence: [],
    cvExtractionKey: null,
    onboardingStep: "cv",
    verified: false,
    riasecAnswers: [],
    cvUploadedAt: null,
    isGuest: true,
    cvWordCount: null,
    skills: [],
    riasecScores: null,
    riasecCode: null,
    targetRoleId: null,
    createdAt: new Date().toISOString(),
  }), [pid, targetSeg, t]);

  if (params.step === "status") {
    return <Redirect to={`/onboarding/cv${search ? `?${search}` : ""}`} replace />;
  }

  if (user && user.role !== "individual") return <Redirect to={portalHome(user.role)} />;

  const handleStartOver = () => {
    setObProfile(scope, null);
    clearObCreateKey(scope);
    if (p?.id) clearDraft(scope, p.id);
    setPid(null);
    createPromiseRef.current = null;
    nav("/onboarding/cv?new=1");
  };

  const isCvStep = requested === "cv" || (!requested && (!pid || !p || !p.cvExtractionKey));

  // If user is on the CV step, render immediately without waiting for network profile fetch!
  if (isCvStep) {
    return (
      <Frame step="cv" maxIdx={0} pid={p?.id ?? pid}>
        <CvStep
          p={p ?? draftProfile}
          scope={scope}
          ensureProfile={ensureProfile}
          onProfileReady={handleProfileReady}
        />
      </Frame>
    );
  }

  // If user is on a step after cv but pid is missing in state, attempt to restore from localStorage
  if (!pid) {
    const stored = getObProfile(scope);
    if (stored) {
      setPid(stored);
      return (
        <Frame step={requested ?? "cv"} maxIdx={0} pid={stored}>
          <StepLoadingSkeleton title={t("ob.loadingStep")} n={4} h="h-16" />
        </Frame>
      );
    }
    // No stored profile at all, redirect user to start at CV
    return <Redirect to="/onboarding/cv" replace />;
  }

  if (loading || !ready) {
    return (
      <Frame step={requested ?? "cv"} maxIdx={0} pid={pid}>
        <StepLoadingSkeleton title={t("ob.loadingStep")} n={4} h="h-16" />
      </Frame>
    );
  }

  if (q.isLoading && !p) {
    return (
      <Frame step={requested ?? "cv"} maxIdx={0} pid={pid}>
        <StepLoadingSkeleton title={t("ob.loadingStep")} n={4} h="h-16" />
      </Frame>
    );
  }

  if (q.isError || !p) {
    return (
      <Frame step={requested ?? "cv"} maxIdx={0} pid={pid}>
        <div className="space-y-4">
          <ErrorBox
            message={t("ob.loadErr")}
            retry={() => q.refetch()}
            action={
              <Button
                variant="secondary"
                className="min-h-11 shrink-0"
                onClick={handleStartOver}
                data-testid="button-start-over"
              >
                <PlusCircle className="mr-1.5 h-4 w-4" />
                {t("ob.startOver")}
              </Button>
            }
          />
        </div>
      </Frame>
    );
  }

  if(p.onboardingStep === "complete") return <Redirect to={"/me/profiles/"+p.id+"/intake"} replace />;
  const allowed = serverStep(p);
  const step = requested ?? allowed;
  if (!requested) return <Redirect to={`/onboarding/${allowed}${pid ? `?pid=${pid}` : ""}`} replace />;
  if (idx(step) > idx(allowed)) return <Redirect to={`/onboarding/${allowed}${pid ? `?pid=${pid}` : ""}`} replace />;

  return (
    <Frame step={step} maxIdx={idx(allowed)} pid={p.id}>
      {step === "cv" && (
        <CvStep
          p={p}
          scope={scope}
          ensureProfile={ensureProfile}
          onProfileReady={handleProfileReady}
        />
      )}
      {step === "review" && <ReviewStep p={p} scope={scope} onProfileReady={handleProfileReady} />}
      {step === "goals" && <GoalsStep p={p} scope={scope} onProfileReady={handleProfileReady} />}
      {step === "holland" && <HollandStep p={p} scope={scope} onProfileReady={handleProfileReady} />}
      {step === "results" && <ResultsStep key={resultSourceKey(p)} p={p} scope={scope} onProfileReady={handleProfileReady} />}
      {step === "save" && <SaveStep p={p} scope={scope} onProfileReady={handleProfileReady} />}
    </Frame>
  );
}

/* ---------- frame ---------- */
function Frame({ step, maxIdx = 0, pid, children }: { step?: ObStep; maxIdx?: number; pid?: number | null; children: ReactNode }) {
  const { t } = useT();
  const { user } = useAuth();
  const [help, setHelp] = useState(false);
  const cur = step ? idx(step) : 0;
  useEffect(() => { window.scrollTo({top:0,behavior:"instant"}); }, [step]);
  return (
    <div className="paper min-h-[100dvh] bg-background">
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur md:relative md:z-[2]">
      <header className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-2 md:px-8 md:py-4">
        <Brand small />
        <div className="flex items-center gap-2">
          <Button variant="outline" aria-label={t("ob.help.btn")} className="h-11 w-11 shrink-0 rounded-full p-0 sm:w-auto sm:gap-1.5 sm:px-4" onClick={() => setHelp(true)} data-testid="button-help"><HelpCircle className="h-4 w-4" /><span className="hidden sm:inline">{t("ob.help.btn")}</span></Button>
          <LangToggle />
          <Link href={user ? "/me" : "/"} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:text-primary" aria-label={t("ob.exit")} data-testid="link-exit"><X className="h-4 w-4" /></Link>
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-4 pb-3 md:hidden">
        <div className="flex items-center justify-between gap-2 text-xs"><span className="font-bold text-accent">{t("ob.title")}</span>{step && <span>{t("ob.stepOf", { n: cur + 1, total: OB_STEPS.length })}</span>}</div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full origin-left rounded-full bg-primary transition-transform" style={{transform:`scaleX(${(cur+1)/OB_STEPS.length})`}} /></div>
      </div>
      </div>
      <main className="relative z-[1] mx-auto grid max-w-6xl items-start gap-6 px-4 pb-16 md:grid-cols-[15rem_1fr] md:px-8">
        <aside aria-label={t("ob.title")} className="hidden self-start md:block md:sticky md:top-6 md:z-10 md:max-h-[calc(100vh-3rem)] md:overflow-y-auto">
          <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-accent">{t("ob.title")}</div>
          {step && <div className="tnum mt-1 text-sm text-muted-foreground" data-testid="text-step-count">{t("ob.stepOf", { n: cur + 1, total: OB_STEPS.length })}</div>}
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted md:hidden"><div className="h-full rounded-full bg-primary transition-transform duration-500 origin-left" style={{ transform: `scaleX(${(cur + 1) / OB_STEPS.length})` }} /></div>
          <ol className="mt-5 hidden space-y-1 md:block">
            {OB_STEPS.map((s, i) => {
              const done = i < cur || i < maxIdx;
              const reachable = step && i <= maxIdx;
              const stepHref = `/onboarding/${s}${pid ? `?pid=${pid}` : ""}`;
              const body = (
                <span className={cn("flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm transition-colors", i === cur && step ? "bg-primary font-semibold text-primary-foreground" : reachable ? "hover:bg-card" : "text-muted-foreground/60")}>
                  <span className={cn("tnum flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-bold",
                    i === cur && step ? "border-accent bg-accent text-accent-foreground" : done ? "border-primary bg-[hsl(var(--maroon-soft))] text-primary" : "border-border")}>
                    {done && i !== cur ? <Check className="h-3.5 w-3.5" /> : i + 1}
                  </span>
                  {t(`ob.step.${s}` as DictKey)}
                </span>
              );
              return <li key={s}>{reachable && i !== cur ? <Link href={stepHref} data-testid={`link-step-${s}`}>{body}</Link> : body}</li>;
            })}
          </ol>
        </aside>
        <section className="min-w-0">
          <AnimatePresence mode="wait">
            <motion.div key={step ?? "x"} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.28 }}
              className="rounded-2xl border border-card-border bg-card p-4 shadow-md sm:p-5 md:rounded-3xl md:p-8">
              {children}
            </motion.div>
          </AnimatePresence>
        </section>
      </main>
      {help && <Walkthrough start={cur} onClose={() => setHelp(false)} />}
    </div>
  );
}

function Walkthrough({ start, onClose }: { start: number; onClose: () => void }) {
  const { t } = useT();
  const [i, setI] = useState(start);
  const s = OB_STEPS[i];
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/30 p-4 md:items-center" role="dialog" aria-modal="true" aria-label={t("ob.help.title")} onClick={onClose}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-3xl border border-card-border bg-card p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-2">
          <h2 className="text-lg font-bold">{t("ob.help.title")}</h2>
          <Button variant="ghost" className="min-h-11 min-w-11 px-0" onClick={onClose} aria-label={t("ob.help.close")} data-testid="button-help-close"><X className="h-4 w-4" /></Button>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">{t("ob.help.intro")}</p>
        <div className="mt-4 flex gap-1">{OB_STEPS.map((x, j) => <span key={x} className={cn("h-1 flex-1 rounded-full", j <= i ? "bg-primary" : "bg-muted")} />)}</div>
        <div className="mt-4 rounded-2xl bg-[hsl(var(--gold-soft))]/60 p-4">
          <div className="text-[11px] font-bold uppercase tracking-wider text-accent">{i + 1}. {t(`ob.step.${s}` as DictKey)}</div>
          <p className="mt-1 text-sm" data-testid="text-help-tip">{t(`ob.help.${s}` as DictKey)}</p>
        </div>
        <div className="mt-4 flex items-center gap-2">
          <Button variant="ghost" className="h-11 w-11 shrink-0 p-0" aria-label={t("ob.help.replay")} title={t("ob.help.replay")} onClick={() => setI(0)} data-testid="button-help-replay"><RotateCw className="h-4 w-4" /></Button>
          <div className="ml-auto flex min-w-0 gap-2 [&>button]:min-h-11 [&>button]:whitespace-normal [&>button]:px-3 [&>button]:text-xs sm:[&>button]:text-sm">
            <Button variant="outline" className="min-h-11" disabled={i === 0} onClick={() => setI(i - 1)}>{t("ob.help.prev")}</Button>
            {i < OB_STEPS.length - 1 ? <Button className="min-h-11" onClick={() => setI(i + 1)} data-testid="button-help-next">{t("ob.help.nextTip")}</Button>
              : <Button className="min-h-11" onClick={onClose}>{t("ob.help.close")}</Button>}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function StepHead({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-extrabold tracking-tight md:text-3xl">{title}</h1>
      {sub && <p className="mt-2 max-w-2xl text-sm text-muted-foreground md:text-base">{sub}</p>}
    </div>
  );
}

function NavBar({ back, pid, children }: { back?: ObStep; pid?: number; children?: ReactNode }) {
  const { t } = useT();
  const backHref = back ? `/onboarding/${back}${pid ? `?pid=${pid}` : ""}` : undefined;
  return (
    <div className="mt-8 flex items-center justify-between gap-3 border-t border-border pt-5">
      {backHref ? (
        <Link
          href={backHref}
          className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground shadow-xs transition-all hover:border-primary hover:text-primary active:scale-95 sm:min-w-0 sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none sm:gap-1.5 sm:text-sm sm:font-medium sm:active:scale-100"
          aria-label={t("ob.back")}
          title={t("ob.back")}
          data-testid="link-back"
        >
          <ArrowLeft className="h-4 w-4 shrink-0" />
          <span className="hidden sm:inline">{t("ob.back")}</span>
        </Link>
      ) : (
        <span className="hidden sm:block" />
      )}
      <div className="flex flex-1 items-center justify-end gap-2 sm:flex-initial [&>button]:flex-1 sm:[&>button]:flex-initial [&>button]:justify-center">
        {children}
      </div>
    </div>
  );
}

/** Patch the profile; moves onboardingStep forward unless forced (e.g. CV re-upload). */
function useAdvance(p: Profile, scope?: string, onProfileReady?: (np: Profile) => void) {
  const qc = useQueryClient();
  const [, nav] = useLocation();
  const upd = useUpdateProfile();
  const go = async (next: ObStep | "complete", data: ProfileUpdate = {}, to?: string, force = false) => {
    const body: ProfileUpdate = { ...data };
    if (force || next === "complete" || idx(next) > idx(p.onboardingStep ?? serverStep(p))) body.onboardingStep = next;
    const np = Object.keys(body).length ? await upd.mutateAsync({ id: p.id, data: body }) : p;
    qc.setQueryData(getGetProfileQueryKey(p.id), np);
    qc.invalidateQueries({ queryKey: ["/api/profiles"] });
    if (scope) setObProfile(scope, np.id);
    onProfileReady?.(np);
    const target = to ?? `/onboarding/${next === "complete" ? "save" : next}?pid=${np.id}`;
    nav(target);
    return np;
  };
  return { go, upd };
}

/* ---------- 1. cv ---------- */
function CvStep({
  p,
  scope,
  ensureProfile,
  onProfileReady,
}: {
  p: Profile;
  scope: string;
  ensureProfile?: (force?: boolean) => Promise<Profile>;
  onProfileReady?: (np: Profile) => void;
}) {
  const { t, lang } = useT();
  const et = useErrText();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [, nav] = useLocation();
  const { go, upd } = useAdvance(p, scope, onProfileReady);
  const ref = useRef<HTMLInputElement>(null);
  const consentRef = useRef<HTMLLabelElement>(null);
  const atsConsentRef = useRef<HTMLLabelElement>(null);
  const reduceMotion = useReducedMotion();
  const [consent, setConsent] = useState(false);
  const [demoBusy,setDemoBusy]=useState(false);
  const [highlightConsent, setHighlightConsent] = useState(false);
  const [local, setLocal] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);
  const [since, setSince] = useState<number | null>(null);
  const lastFile = useRef<File | null>(null);
  const [showAtsNotice, setShowAtsNotice] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [previewDemo, setPreviewDemo] = useState<{
    id: number;
    title: string;
    file: string;
    type: string;
    mime: "pdf" | "jpeg";
    person: string;
    icon: typeof FileText;
  } | null>(null);

  const demoItems = useMemo(() => [
    {
      id: 1,
      title: "Demo 1",
      file: "/demo/demo-cv-1.pdf",
      type: lang === "ms" ? "PDF imbasan" : lang === "zh" ? "扫描 PDF" : "Scanned PDF",
      mime: "pdf" as const,
      person: "Ungku Babas bin Ungku Samad",
      icon: FileText,
    },
    {
      id: 2,
      title: "Demo 2",
      file: "/demo/demo-cv-2.jpeg",
      type: lang === "ms" ? "Gambar CV (JPEG)" : lang === "zh" ? "简历照片 (JPEG)" : "CV photo (JPEG)",
      mime: "jpeg" as const,
      person: "FOO WEI CHONG",
      icon: FileImage,
    },
    {
      id: 3,
      title: "Demo 3",
      file: "/demo/demo-cv-3.pdf",
      type: lang === "ms" ? "PDF teks" : lang === "zh" ? "文字 PDF" : "Text PDF",
      mime: "pdf" as const,
      person: "Karthik A/L Subramaniam",
      icon: FileText,
    },
  ], [lang]);

  const handleAtsConfirm = () => {
    if (!consent) {
      promptConsent();
      return;
    }
    setHighlightConsent(false);
    setShowAtsNotice(false);
    if (pendingFile) {
      const f = pendingFile;
      setPendingFile(null);
      send(f);
    } else {
      setLocal(null);
      ref.current?.click();
    }
  };

  const intakeSegment = new URLSearchParams(window.location.search).get("seg");
  const intakeHeaders = { "X-Replace-Intake": "1", "X-Intake-Segment": intakeSegment === "graduate" || intakeSegment === "worker" ? intakeSegment : p.segment };
  const loadDemoCv = async (demoId: number) => {
    setLocal(null);setDemoBusy(true);
    try {
      const profile=p.id>0?p:await ensureProfile?.();
      if(!profile?.id)throw new Error("profile_not_ready");
      const np=await customFetch<Profile>(`/api/profiles/${profile.id}/demo-cv`,{method:"POST",headers:{"Content-Type":"application/json",...intakeHeaders},body:JSON.stringify({demoId})});
      qc.setQueryData(getGetProfileQueryKey(np.id),np);onProfileReady?.(np);setObProfile(scope,np.id);clearDraft(scope,np.id);clearObCreateKey(scope);qc.invalidateQueries({queryKey:["/api/profiles"]});qc.invalidateQueries({queryKey:["/api/dashboard/summary"]});nav(`/onboarding/review?pid=${np.id}`);
    } catch(err) {setLocal(et(err));} finally {setDemoBusy(false);}
  };

  const handleAtsCancel = () => {
    setShowAtsNotice(false);
    setPendingFile(null);
  };

  const promptConsent = () => {
    setHighlightConsent(true);
    toast({
      title: t("ob.cv.consentTitle"),
      description: t("ob.cv.consentDesc"),
      variant: "destructive",
    });
    const target = showAtsNotice ? atsConsentRef.current : consentRef.current;
    target?.scrollIntoView({ behavior: reduceMotion ? "instant" : "smooth", block: "center" });
    target?.querySelector<HTMLButtonElement>('button[role="checkbox"]')?.focus({ preventScroll: true });
  };

  useEffect(() => {
    // Ping AI endpoint in background to warm up when user reaches CV step
    const base = import.meta.env.VITE_API_URL || "";
    fetch(`${base}/api/ai/status`, { cache: "no-store" }).catch(() => {});
  }, []);

  const up = useUploadCv({
    request: { headers: intakeHeaders },
    mutation: {
      onSuccess: async (np) => {
        setSince(null);
        lastFile.current = null;
        qc.setQueryData(getGetProfileQueryKey(np.id), np);
        onProfileReady?.(np);
        setObProfile(scope, np.id);
        clearDraft(scope, np.id);
        clearObCreateKey(scope);
        qc.invalidateQueries({ queryKey: ["/api/profiles"] });
        qc.invalidateQueries({ queryKey: ["/api/dashboard/summary"] });
        nav(`/onboarding/review?pid=${np.id}`);
      },
      onError: async (err) => {
        setSince(null);
        if (errStatus(err) === 404 && ensureProfile && lastFile.current) {
          try {
            setObProfile(scope, null);
            clearObCreateKey(scope);
            const replacement = await ensureProfile(true);
            send(lastFile.current, replacement);
          } catch {}
        }
      },
    },
  });

  const send = async (file: File, replacement?: Profile) => {
    setLocal(null);
    if (!consent) {
      promptConsent();
      return;
    }
    if (!CV_OK.test(file.name)) { setLocal(t("ob.cv.badType")); return; }
    if (file.size > CV_MAX_BYTES) { setLocal(t("ob.cv.tooBig")); return; }
    lastFile.current = file;
    setSince(Date.now());

    try {
      let b64: string;
      let finalName = file.name;

      // Automatically optimize oversized phone photos (> 1.5MB) to prevent Vercel 4.5MB payload limit
      if (file.type.startsWith("image/") && file.size > 1.5 * 1024 * 1024) {
        try {
          const bitmap = await createImageBitmap(file);
          const maxDim = 1800;
          let width = bitmap.width;
          let height = bitmap.height;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(bitmap, 0, 0, width, height);
            const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
            b64 = dataUrl.slice(dataUrl.indexOf(",") + 1).replace(/\s+/g, "");
            finalName = file.name.replace(/\.[^.]+$/, "") + ".jpeg";
          } else {
            throw new Error("canvas_unavailable");
          }
        } catch {
          const s = await new Promise<string>((res, rej) => {
            const r = new FileReader();
            r.onload = () => res(String(r.result));
            r.onerror = rej;
            r.readAsDataURL(file);
          });
          b64 = s.slice(s.indexOf(",") + 1).replace(/\s+/g, "");
        }
      } else {
        const s = await new Promise<string>((res, rej) => {
          const r = new FileReader();
          r.onload = () => res(String(r.result));
          r.onerror = rej;
          r.readAsDataURL(file);
        });
        b64 = s.slice(s.indexOf(",") + 1).replace(/\s+/g, "");
      }

      let activeProfile = replacement ?? p;
      if (!activeProfile?.id || activeProfile.id <= 0) {
        if (ensureProfile) {
          activeProfile = await ensureProfile();
        }
      }
      if (!activeProfile?.id || activeProfile.id <= 0) {
        throw new Error("profile_not_ready");
      }
      up.mutate({ id: activeProfile.id, data: { fileName: finalName, contentBase64: b64, consent: true, lang } });
    } catch (err) {
      setSince(null);
      setLocal(et(err));
    }
  };

  const code = errCode(up.error);
  const upErr = up.error ? (isAiDown(up.error) ? t("ob.cv.aiDown") : errStatus(up.error) === 413 && !code ? t("ob.err.tooLarge") : et(up.error)) : null;
  return (
    <>
      <StepHead title={t("ob.cv.title")} sub={t("ob.cv.sub")} />
      {p.cvFileName && <div className="mb-4 flex items-center gap-2 rounded-xl bg-muted/60 px-3 py-2 text-sm" data-testid="text-cv-existing"><BadgeCheck className="h-4 w-4 text-accent" /><span className="truncate">{t("ob.cv.already", { name: p.cvFileName })}</span></div>}
      <label
        ref={consentRef}
        className={cn(
          "relative flex cursor-pointer items-start gap-3.5 rounded-2xl border p-4 text-sm leading-relaxed transition-all duration-300",
          highlightConsent
            ? "border-primary bg-[hsl(var(--maroon-soft))]/40 ring-4 ring-primary/30 shadow-lg scale-[1.01]"
            : "border-border bg-background hover:border-primary/50"
        )}
      >
        <div className="relative mt-0.5 flex shrink-0 items-center justify-center">
          <Checkbox
            checked={consent}
            onCheckedChange={(v) => {
              setConsent(v === true);
              if (v === true) {
                setHighlightConsent(false);
                setLocal(null);
              }
            }}
            className={cn(
              "h-5 w-5 rounded-md transition-all",
              highlightConsent && "border-primary ring-4 ring-primary ring-offset-2 scale-110 shadow-md"
            )}
            data-testid="checkbox-consent"
            aria-invalid={highlightConsent && !consent}
          />
          {highlightConsent && (
            <>
              {/* Outer circular glowing/pulsing ring to circle the area to be ticked */}
              <span className="pointer-events-none absolute -inset-2.5 rounded-full border-2 border-primary motion-safe:animate-ping opacity-75" />
              <span className="pointer-events-none absolute -inset-2.5 rounded-full border-2 border-dashed border-primary motion-safe:animate-spin [animation-duration:6s]" />
            </>
          )}
        </div>
        <div className="min-w-0">
          <span className={cn(highlightConsent ? "font-semibold text-primary" : "text-foreground")}>
            {t("ob.cv.consent")}
          </span>
          {highlightConsent && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-1.5 flex items-center gap-1.5 text-xs font-bold text-primary"
            >
              <span className="flex h-2 w-2 rounded-full bg-primary animate-ping" />
              {t("ob.cv.consentNeeded")}
            </motion.p>
          )}
        </div>
      </label>
      <button
        type="button"
        disabled={up.isPending || demoBusy}
        onClick={() => {
          setPendingFile(null);
          setShowAtsNotice(true);
        }}
        data-testid="button-pick-cv"
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          const f = e.dataTransfer.files[0];
          if (!f) return;
          setPendingFile(f);
          setShowAtsNotice(true);
        }}
        className={cn("dotgrid mt-4 flex w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed px-4 py-10 text-center transition-colors", drag ? "border-primary bg-[hsl(var(--maroon-soft))]" : "border-primary/40 hover:border-primary")}>
        {up.isPending ? <Loader2 className="h-9 w-9 animate-spin text-primary" /> : <FileUp className="h-9 w-9 text-primary" />}
        <div className="mt-3 text-sm font-semibold">{up.isPending ? t("ob.cv.reading") : p.cvFileName ? t("ob.cv.replace") : t("ob.cv.pick")}</div>
        <div className="mt-1 text-xs text-muted-foreground">{t("ob.cv.formats")}</div>
      </button>

      <div className="mt-4 rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/[0.04] via-muted/30 to-background p-4 shadow-sm">
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
            {lang === "ms" ? "Cuba contoh CV" : lang === "zh" ? "试用示例简历" : "Try a sample CV"}
          </span>
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
            {lang === "ms" ? "1-Klik Sedia" : lang === "zh" ? "一键可用" : "1-Click Ready"}
          </span>
        </div>
        <p className="text-[11px] text-muted-foreground mb-3">
          {lang === "ms"
            ? "Terus isi data contoh tanpa AI. Upload CV sendiri masih dibaca AI."
            : lang === "zh" ? "直接填写示例资料，不调用 AI。上传自己的简历仍由 AI 读取。" : "Fill sample details instantly, without AI. Your own CV upload still uses AI."}
        </p>
        <div className="mb-3 [&>p]:w-full [&>p]:rounded-xl"><SyntheticBadge/></div>
        <div className="grid grid-cols-3 gap-2.5">
          {demoItems.map((demo) => {
            const Icon = demo.icon;
            return (
              <div
                key={demo.id}
                className="group relative flex flex-col sm:flex-row min-w-0 items-stretch rounded-xl border border-border/80 bg-background/90 hover:border-primary/80 hover:bg-background transition-all shadow-xs overflow-hidden"
              >
                {/* Main card button: Click to load demo and advance to next step */}
                <button
                  type="button"
                  disabled={up.isPending || demoBusy}
                  onClick={() => loadDemoCv(demo.id)}
                  className="min-w-0 flex-1 py-2.5 pl-2 sm:pl-3 pr-1.5 flex flex-col items-start gap-1 text-left cursor-pointer transition-colors hover:bg-primary/[0.04] disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none"
                  data-testid={`button-demo-cv-${demo.id}`}
                  title={lang === "ms" ? `Gunakan ${demo.title} & teruskan` : `Use ${demo.title} & proceed`}
                >
                  <span className="font-semibold text-primary flex items-center gap-1.5 text-xs">
                    <Icon className="h-3.5 w-3.5 shrink-0" /> {demo.title}
                  </span>
                  <span className="whitespace-normal text-[10px] text-muted-foreground font-medium line-clamp-1">
                    {demo.type}
                  </span>
                </button>

                {/* Eye icon: click to preview original document in special modal */}
                <button
                  type="button"
                  disabled={up.isPending || demoBusy}
                  onClick={(e) => {
                    e.stopPropagation();
                    setPreviewDemo(demo);
                  }}
                  className="min-h-11 sm:min-w-11 px-2.5 flex items-center justify-center text-muted-foreground/70 hover:text-primary hover:bg-primary/10 border-t sm:border-t-0 sm:border-l border-border/50 transition-colors disabled:opacity-50"
                  title={lang === "ms" ? `Pratonton dokumen asal ${demo.title}` : `Preview original ${demo.title} document`}
                  aria-label={`Preview ${demo.title}`}
                >
                  <Eye className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal Khas: Pratonton Dokumen Asal Demo CV */}
      <Dialog open={!!previewDemo} onOpenChange={(open) => { if (!open) setPreviewDemo(null); }}>
        <DialogContent className="sm:max-w-3xl max-h-[92vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-4 pb-3 border-b border-border/60 bg-muted/20">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                {previewDemo?.mime === "pdf" ? <FileText className="h-5 w-5" /> : <FileImage className="h-5 w-5" />}
              </div>
              <div className="min-w-0 flex-1">
                <DialogTitle className="text-sm font-bold flex flex-wrap items-center gap-2">
                  <span>{previewDemo?.title}: {previewDemo?.type}</span>
                  <span className="text-xs font-normal text-muted-foreground">({previewDemo?.person})</span>
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground truncate">
                  {lang === "ms"
                    ? "Pratonton dokumen contoh asal. Anda boleh klik 'Pilih & Teruskan' untuk melangkah ke langkah seterusnya."
                    : "Preview of original document fixture. Click 'Select & Proceed' to advance to the next step."}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-auto bg-neutral-900/90 dark:bg-black/90 p-2 sm:p-4 flex items-center justify-center min-h-[380px] max-h-[62vh]">
            {previewDemo?.mime === "pdf" ? (
              <iframe
                src={`${previewDemo.file}#toolbar=0&navpanes=0`}
                title={previewDemo.title}
                className="w-full h-[520px] rounded-md bg-white border-0 shadow-lg"
              />
            ) : previewDemo?.mime === "jpeg" ? (
              <div className="w-full max-h-[520px] overflow-auto flex items-center justify-center">
                <img
                  src={previewDemo.file}
                  alt={previewDemo.title}
                  className="max-h-[500px] w-auto object-contain rounded-md shadow-2xl border border-white/10"
                />
              </div>
            ) : null}
          </div>

          <DialogFooter className="p-3 sm:p-4 border-t border-border/60 bg-background flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <a
                href={previewDemo?.file}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 hover:text-primary underline underline-offset-2 transition-colors"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                {lang === "ms" ? "Buka fail penuh di tab baru" : "Open full file in new tab"}
              </a>
            </div>

            <div className="flex items-center gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPreviewDemo(null)}
              >
                {lang === "ms" ? "Tutup" : "Close"}
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={demoBusy || up.isPending}
                onClick={() => {
                  if (previewDemo) {
                    const id = previewDemo.id;
                    setPreviewDemo(null);
                    loadDemoCv(id);
                  }
                }}
                className="bg-primary text-primary-foreground hover:bg-primary/90 font-medium"
              >
                <FileCheck className="h-4 w-4 mr-1.5" />
                {lang === "ms" ? "Pilih & Teruskan" : "Select & Proceed"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showAtsNotice} onOpenChange={(open) => { if (!open) handleAtsCancel(); else setShowAtsNotice(true); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <FileCheck className="h-6 w-6" />
            </div>
            <DialogTitle className="text-center text-lg font-bold">
              {t("ob.cv.atsModalTitle")}
            </DialogTitle>
            <DialogDescription className="text-center text-xs text-muted-foreground">
              {t("ob.cv.atsModalSub")}
            </DialogDescription>
          </DialogHeader>

          <div className="my-2 space-y-2.5 rounded-xl border border-border/60 bg-muted/30 p-3.5 text-xs">
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              <span>{t("ob.cv.atsTip1")}</span>
            </div>
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              <span>{t("ob.cv.atsTip2")}</span>
            </div>
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              <span>{t("ob.cv.atsTip3")}</span>
            </div>
          </div>

          <label ref={atsConsentRef} className={cn(
            "my-1 flex cursor-pointer items-start gap-2.5 rounded-xl border p-3 text-xs leading-relaxed transition-all",
            highlightConsent
              ? "border-primary bg-[hsl(var(--maroon-soft))] ring-2 ring-primary motion-safe:animate-pulse"
              : "border-border/80 bg-background hover:border-primary/50"
          )}>
            <div className="relative mt-0.5 flex shrink-0 items-center justify-center">
              <Checkbox
                checked={consent}
                onCheckedChange={(v) => {
                  setConsent(v === true);
                  if (v === true) {
                    setHighlightConsent(false);
                    setLocal(null);
                  }
                }}
                className={cn(
                  "h-4 w-4 rounded-md transition-all",
                  highlightConsent && "border-primary ring-2 ring-primary ring-offset-1"
                )}
                data-testid="checkbox-ats-consent"
                aria-invalid={highlightConsent && !consent}
              />
            </div>
            <div className="min-w-0">
              <span className={cn(highlightConsent ? "font-semibold text-primary" : "text-foreground")}>
                {t("ob.cv.consent")}
              </span>
              {highlightConsent && (
                <p className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-primary">
                  {t("ob.cv.consentNeeded")}
                </p>
              )}
            </div>
          </label>

          <DialogFooter className="mt-2 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={handleAtsCancel}
              data-testid="button-ats-cancel"
            >
              {t("ob.cv.atsCancel")}
            </Button>
            <Button
              type="button"
              onClick={handleAtsConfirm}
              data-testid="button-ats-confirm"
            >
              <Check className="mr-1.5 h-4 w-4" />
              {t("ob.cv.atsConfirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <input
        ref={ref}
        type="file"
        accept=".pdf,.docx,.txt,.png,.jpg,.jpeg,.webp"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) {
            if (!consent) {
              promptConsent();
            } else {
              send(f);
            }
          }
          e.target.value = "";
        }}
        data-testid="input-cv-file"
      />
      {up.isPending && <p className="mt-2 text-xs text-muted-foreground">{t("ob.cv.readingHint")}</p>}
      <p className="mt-3 text-xs text-muted-foreground">{t("ob.cv.privacy")}</p>
      {up.isPending && since && <div className="mt-4"><AiWait since={since} /></div>}
      {local && <div className="mt-4"><ErrorBox message={local} /></div>}
      {upErr && (
        <div className="mt-4 rounded-2xl border border-destructive/40 bg-destructive/5 p-4" role="alert" data-testid="status-cv-error">
          <div className="flex items-center gap-2 font-semibold text-destructive"><AlertTriangle className="h-4 w-4" />{t("ob.cv.failTitle")}</div>
          <p className="mt-1 text-sm">{upErr}</p>
          {lastFile.current && <Button variant="outline" className="mt-3 min-h-11" onClick={() => lastFile.current && send(lastFile.current)} data-testid="button-cv-retry"><RotateCw className="mr-1.5 h-4 w-4" />{t("ob.cv.retry")}</Button>}
        </div>
      )}
      <NavBar pid={p.id}>
        {p.cvExtractionKey && <Button variant="outline" className="min-h-11" disabled={up.isPending || upd.isPending} onClick={() => go("review").catch(() => undefined)} data-testid="button-cv-next">{t("ob.next")}</Button>}
      </NavBar>
    </>
  );
}

/* ---------- 2. review ---------- */
const REVIEW_FIELDS = [
  ["name", "ob.review.name"],
  ["currentRole", "ob.review.role"],
  ["organization", "ob.review.org"],
  ["education", "ob.review.edu"],
  ["experience", "ob.review.exp"],
] as const;
type ReviewFieldKey = (typeof REVIEW_FIELDS)[number][0];
const OPTIONAL_WITH_NONE: ReviewFieldKey[] = ["currentRole", "organization", "education", "experience"];
type Hrdc = "" | "yes" | "no" | "unknown";
type ReviewForm = Record<ReviewFieldKey, string> & Record<`none_${ReviewFieldKey}`, string>;
const norm = (v: string | null | undefined) => (v ?? "").toLowerCase().replace(/\s+/g, " ").trim();
type EvState = "supported" | "corrected" | "none";
/** Evidence counts only if the CV actually quoted it AND the current form value still matches. */
function evState(ev: CvEvidence[], field: string, current: string): EvState {
  const real = ev.filter((e) => e.field === field && e.source !== "no_evidence" && !!e.quote);
  if (!real.length) return "none";
  return real.some((e) => norm(e.value) === norm(current) && norm(current) !== "") ? "supported" : "corrected";
}

function initReviewForm(p: Profile, scope: string): ReviewForm {
  const d = (readDraft(scope, p.id).form ?? {}) as Partial<ReviewForm> & {
    educationList?: string[];
    experienceList?: string[];
  };
  const prev = !!p.verified;

  const draftEdu = typeof d.education === "string" && d.education.trim()
    ? d.education
    : (Array.isArray(d.educationList) && d.educationList.length > 0 ? d.educationList.filter(Boolean).join("\n\n") : "");
  const draftExp = typeof d.experience === "string" && d.experience.trim()
    ? d.experience
    : (Array.isArray(d.experienceList) && d.experienceList.length > 0 ? d.experienceList.filter(Boolean).join("\n\n") : "");

  const eduVal = draftEdu || (p.education ?? "");
  const expVal = draftExp || (p.experience ?? "");

  const base: ReviewForm = {
    name: DRAFT_NAMES.has(p.name) ? "" : p.name,
    currentRole: p.currentRole ?? "",
    organization: p.organization ?? "",
    education: eduVal,
    experience: expVal,
    none_name: "",
    none_currentRole: prev && !p.currentRole ? "1" : "",
    none_organization: prev && !p.organization ? "1" : "",
    none_education: prev && !eduVal ? "1" : "",
    none_experience: prev && !expVal ? "1" : "",
  };
  return { ...base, ...d, education: eduVal, experience: expVal };
}

function ReviewStep({ p, scope, onProfileReady }: { p: Profile; scope: string; onProfileReady?: (np: Profile) => void }) {
  const { t } = useT();
  const et = useErrText();
  const qc = useQueryClient();
  const { go, upd } = useAdvance(p, scope, onProfileReady);
  const skillUpd = useUpdateProfile({
    mutation: {
      onSuccess: (np) => {
        qc.setQueryData(getGetProfileQueryKey(p.id), np);
        onProfileReady?.(np);
      },
    },
  });
  const roles = useListRoles();
  const courses = useListCourses();
  const [skillQuery, setSkillQuery] = useState("");
  const skillOptions = useMemo(() => {
    const catalogue = new Map<number, { name: string; category: string }>();
    (roles.data ?? []).forEach((role) => role.skills.forEach((skill) => catalogue.set(skill.skillId, { name: skill.name, category: skill.category })));
    (courses.data ?? []).forEach((course) => course.skills.forEach((skill) => catalogue.set(skill.id, { name: skill.name, category: skill.category })));
    const have = new Set(p.skills.map((skill) => skill.skillId));
    const query = skillQuery.trim().toLocaleLowerCase();
    return [...catalogue].filter(([id, skill]) => !have.has(id) && (!query || skill.name.toLocaleLowerCase().includes(query))).sort((a, b) => a[1].name.localeCompare(b[1].name)).slice(0, 8);
  }, [roles.data, courses.data, p.skills, skillQuery]);
  const [form, setForm] = useState<ReviewForm>(() => initReviewForm(p, scope));
  useEffect(() => {
    const existing = readDraft(scope, p.id).form ?? {};
    writeDraft(scope, p.id, { form: { ...existing, ...form } });
  }, [form, scope, p.id]);

  const setField = (k: ReviewFieldKey, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const setNone = (k: ReviewFieldKey, v: string) => setForm((f) => ({ ...f, [`none_${k}`]: v }));

  const ev = p.cvEvidence ?? [];
  const [touched, setTouched] = useState(false);

  const hasEdu = !!form.education.trim();
  const hasExp = !!form.experience.trim();

  const errs: Partial<Record<string, string>> = {};
  if (!form.name.trim()) errs.name = t("ob.review.nameReq");
  if (!form.currentRole.trim() && !form.none_currentRole) errs.currentRole = t("ob.review.pickOne");
  if (!form.organization.trim() && !form.none_organization) errs.organization = t("ob.review.pickOne");
  if (!hasEdu && !form.none_education) errs.education = t("ob.review.pickOne");
  if (!hasExp && !form.none_experience) errs.experience = t("ob.review.pickOne");
  const ok = Object.keys(errs).length === 0;

  const submit = () => {
    setTouched(true);
    if (!ok || !p.cvExtractionKey) return;
    go("goals", {
      name: form.name.trim(),
      currentRole: form.none_currentRole ? "" : form.currentRole.trim(),
      organization: form.none_organization ? "" : form.organization.trim(),
      education: form.none_education ? "" : form.education.trim(),
      experience: form.none_experience ? "" : form.experience.trim(),
      verified: true,
    }).catch(() => undefined);
  };
  const E = ({ k }: { k: string }) => (touched && errs[k] ? <p className="text-xs text-destructive" data-testid={`error-review-${k}`}>{errs[k]}</p> : null);

  return (
    <>
      <StepHead title={t("ob.review.title")} sub={t("ob.review.sub")} />
      <div className="max-w-3xl space-y-6">
        {/* Name */}
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Label htmlFor="f-name">{t("ob.review.name")}<span className="text-destructive"> *</span></Label>
            <EvChip s={evState(ev, "name", form.name)} filled={!!form.name.trim()} />
          </div>
          <Input id="f-name" value={form.name} onChange={(e) => setField("name", e.target.value)} className="min-h-11" data-testid="input-review-name" />
          <E k="name" />
        </div>

        {/* Current role or course */}
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Label htmlFor="f-currentRole">{t("ob.review.role")}</Label>
            <EvChip s={evState(ev, "currentRole", form.none_currentRole ? "" : form.currentRole)} filled={!form.none_currentRole && !!form.currentRole.trim()} />
          </div>
          <Input id="f-currentRole" value={form.none_currentRole ? "" : form.currentRole} disabled={!!form.none_currentRole} onChange={(e) => setField("currentRole", e.target.value)} className="min-h-11" data-testid="input-review-currentRole" />
          <label className="flex min-h-11 cursor-pointer items-center gap-2 text-xs text-muted-foreground">
            <Checkbox checked={!!form.none_currentRole} onCheckedChange={(v) => setNone("currentRole", v === true ? "1" : "")} data-testid="checkbox-none-currentRole" />
            {t("ob.review.noInfo")}
          </label>
          <E k="currentRole" />
        </div>

        {/* Current organisation or institution */}
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Label htmlFor="f-organization">{t("ob.review.org")}</Label>
            <EvChip s={evState(ev, "organization", form.none_organization ? "" : form.organization)} filled={!form.none_organization && !!form.organization.trim()} />
          </div>
          <Input id="f-organization" value={form.none_organization ? "" : form.organization} disabled={!!form.none_organization} onChange={(e) => setField("organization", e.target.value)} className="min-h-11" data-testid="input-review-organization" />
          <label className="flex min-h-11 cursor-pointer items-center gap-2 text-xs text-muted-foreground">
            <Checkbox checked={!!form.none_organization} onCheckedChange={(v) => setNone("organization", v === true ? "1" : "")} data-testid="checkbox-none-organization" />
            {t("ob.review.noInfo")}
          </label>
          <E k="organization" />
        </div>

        {/* Education (Single box with auto-adjusted height showing all lines) */}
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Label htmlFor="f-education">{t("ob.review.edu")}</Label>
            <EvChip s={evState(ev, "education", form.none_education ? "" : form.education)} filled={!form.none_education && hasEdu} />
          </div>
          <Textarea
            id="f-education"
            rows={Math.max(4, (form.education || "").split("\n").length)}
            value={form.none_education ? "" : form.education}
            disabled={!!form.none_education}
            onChange={(e) => setField("education", e.target.value)}
            placeholder={t("ob.review.eduPh")}
            className="min-h-[7.5rem] resize-y text-sm leading-relaxed"
            data-testid="input-review-education"
          />
          <label className="flex min-h-11 cursor-pointer items-center gap-2 text-xs text-muted-foreground">
            <Checkbox
              checked={!!form.none_education}
              onCheckedChange={(v) => setNone("education", v === true ? "1" : "")}
              data-testid="checkbox-none-education"
            />
            {t("ob.review.noInfo")}
          </label>
          <E k="education" />
        </div>

        {/* Experience (Single box with auto-adjusted height showing all lines) */}
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Label htmlFor="f-experience">{t("ob.review.exp")}</Label>
            <EvChip s={evState(ev, "experience", form.none_experience ? "" : form.experience)} filled={!form.none_experience && hasExp} />
          </div>
          <Textarea
            id="f-experience"
            rows={Math.max(4, (form.experience || "").split("\n").length)}
            value={form.none_experience ? "" : form.experience}
            disabled={!!form.none_experience}
            onChange={(e) => setField("experience", e.target.value)}
            placeholder={t("ob.review.expPh")}
            className="min-h-[7.5rem] resize-y text-sm leading-relaxed"
            data-testid="input-review-experience"
          />
          <label className="flex min-h-11 cursor-pointer items-center gap-2 text-xs text-muted-foreground">
            <Checkbox
              checked={!!form.none_experience}
              onCheckedChange={(v) => setNone("experience", v === true ? "1" : "")}
              data-testid="checkbox-none-experience"
            />
            {t("ob.review.noExp")}
          </label>
          <E k="experience" />
        </div>

        {/* Detected Skills */}
        <div className="rounded-2xl border border-border/80 bg-card/60 p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
            <div>
              <h2 className="text-base font-bold text-accent">{t("ob.review.skills", { n: p.skills.length })}</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">{t("ob.review.skillsSub")}</p>
            </div>
          </div>
          <div className="mt-3">
            <Input value={skillQuery} onChange={(event) => setSkillQuery(event.target.value)} placeholder={t("ob.review.skillSearch")} aria-label={t("ob.review.skillSearch")} data-testid="input-review-skill-search" />
            {skillQuery.trim() && <ul className="mt-1 max-h-56 overflow-y-auto rounded-xl border border-border bg-background" aria-label={t("ob.review.skillSuggestions")}>
              {skillOptions.map(([id, skill]) => <li key={id}><button type="button" disabled={skillUpd.isPending} onClick={() => { skillUpd.mutate({ id: p.id, data: { addSkills: [{ skillId: id, status: "self_reported" }] } }); setSkillQuery(""); }} className="flex min-h-11 w-full items-center justify-between gap-2 px-3 text-left text-sm hover:bg-muted" data-testid={`button-review-add-skill-${id}`}><span>{skill.name}</span><PlusCircle className="h-4 w-4 text-primary" /></button></li>)}
              {!skillOptions.length && <li className="px-3 py-2 text-sm text-muted-foreground">{t("ob.review.skillNoMatch")}</li>}
            </ul>}
          </div>
          {!p.skills.length ? (
            <p className="mt-3 rounded-xl bg-muted/60 p-4 text-sm text-muted-foreground">{t("ob.review.skillsEmpty")}</p>
          ) : (
            <ul className="mt-3 divide-y divide-border rounded-xl border border-border bg-background">
              {p.skills.map((s) => (
                <li key={s.skillId} className="flex items-center justify-between gap-2 px-3.5 py-2" data-testid={`row-ob-skill-${s.skillId}`}>
                  <span className="flex min-w-0 flex-wrap items-center gap-2 text-sm">
                    <span className="truncate font-medium">{s.name}</span>
                    <StatusTag s={s.status} />
                  </span>
                  <span className="flex shrink-0">
                    {s.status === "inferred" && (
                      <Button
                        variant="ghost"
                        className="min-h-10 px-2.5 text-xs"
                        disabled={skillUpd.isPending}
                        onClick={() =>
                          skillUpd.mutate({
                            id: p.id,
                            data: { addSkills: [{ skillId: s.skillId, status: "self_reported" }] },
                          })
                        }
                        data-testid={`button-ob-confirm-skill-${s.skillId}`}
                      >
                        <Check className="mr-1 h-3.5 w-3.5" />
                        {t("skills.confirm")}
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      className="min-h-10 min-w-10 px-0"
                      disabled={skillUpd.isPending}
                      onClick={() =>
                        skillUpd.mutate({
                          id: p.id,
                          data: { removeSkillIds: [s.skillId] },
                        })
                      }
                      aria-label={t("skills.remove", { name: s.name })}
                      data-testid={`button-ob-remove-skill-${s.skillId}`}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </span>
                </li>
              ))}
            </ul>
          )}
          {skillUpd.error && (
            <div className="mt-2">
              <ErrorBox message={et(skillUpd.error)} />
            </div>
          )}
        </div>

        <p className="text-[11px] text-muted-foreground">{t("ob.review.draft")}</p>
      </div>
      {!p.cvExtractionKey && <div className="mt-4"><ErrorBox message={t("ob.cv.required")} /></div>}
      {touched && !ok && <div className="mt-4"><ErrorBox message={t("ob.review.fixErrors")} /></div>}
      {upd.error && <div className="mt-4"><ErrorBox message={et(upd.error)} /></div>}
      <NavBar back="cv" pid={p.id}>
        <Button className="min-h-11" disabled={upd.isPending || !p.cvExtractionKey} onClick={submit} data-testid="button-review-confirm">
          {upd.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-1.5 h-4 w-4" />}{t("ob.review.confirm")}
        </Button>
      </NavBar>
    </>
  );
}

/* ---------- 4. goals ---------- */
type GoalsForm = {
  goals: string;
  hours: string;
  budget: string;
};

function initGoalsForm(p: Profile, scope: string): GoalsForm {
  const d = (readDraft(scope, p.id).form ?? {}) as Partial<GoalsForm>;
  const prev = idx(p.onboardingStep) >= idx("goals");
  const base: GoalsForm = {
    goals: p.goals ?? "",
    hours: prev && p.weeklyHours ? String(p.weeklyHours) : (p.weeklyHours && p.weeklyHours > 1 ? String(p.weeklyHours) : "10"),
    budget: prev && p.budgetMyr != null ? String(p.budgetMyr) : "0",
  };
  return { ...base, ...d };
}

function GoalsStep({ p, scope, onProfileReady }: { p: Profile; scope: string; onProfileReady?: (np: Profile) => void }) {
  const { t } = useT();
  const et = useErrText();
  const { go, upd } = useAdvance(p, scope, onProfileReady);
  const [form, setForm] = useState<GoalsForm>(() => initGoalsForm(p, scope));
  const [demoGoalIndex, setDemoGoalIndex] = useState(-1);
  const nextDemoGoal = () => {
    const next = (demoGoalIndex + 1) % 3;
    setDemoGoalIndex(next);
    const examples = [{ hours: "8", budget: "100" }, { hours: "12", budget: "0" }, { hours: "5", budget: "300" }];
    setForm({ goals: t(`ob.goals.demoExample${next + 1}` as "ob.goals.demoExample1" | "ob.goals.demoExample2" | "ob.goals.demoExample3"), ...examples[next] });
  };
  useEffect(() => {
    const existing = readDraft(scope, p.id).form ?? {};
    writeDraft(scope, p.id, { form: { ...existing, ...form } });
  }, [form, scope, p.id]);
  const set = (k: keyof GoalsForm, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const [touched, setTouched] = useState(false);

  const hoursN = Number(form.hours);
  const budgetN = Number(form.budget);
  const errs: Partial<Record<string, string>> = {};
  if (form.hours.trim() === "" || !Number.isInteger(hoursN) || hoursN < 1 || hoursN > 60) errs.hours = t("ob.review.hoursErr");
  if (form.budget.trim() === "" || !Number.isFinite(budgetN) || budgetN < 0) errs.budget = t("ob.review.budgetErr");
  const ok = Object.keys(errs).length === 0;

  const submit = () => {
    setTouched(true);
    if (!ok) return;
    go("holland", {
      goals: form.goals.trim(),
      weeklyHours: hoursN,
      budgetMyr: budgetN,
      hrdcEligible: p.hrdcEligible ?? false,
      hrdcEligibilityStatus: p.hrdcEligibilityStatus ?? "no",
    }).catch(() => undefined);
  };
  const E = ({ k }: { k: string }) => (touched && errs[k] ? <p className="text-xs text-destructive" data-testid={`error-goals-${k}`}>{errs[k]}</p> : null);

  return (
    <>
      <StepHead title={t("ob.goals.title")} sub={t("ob.goals.sub")} />
      <div className="max-w-2xl space-y-6">
        <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/[0.04] via-muted/30 to-background p-4 shadow-sm">
          <p className="mb-2.5 text-xs font-bold text-foreground">{t("ob.goals.demoTitle")}</p>
          <Button type="button" variant="outline" size="sm" className="h-auto min-h-11 flex flex-col items-start gap-1 border-border/80 bg-background/90 px-3 py-2.5 text-left shadow-xs transition-all hover:border-primary hover:bg-background" onClick={nextDemoGoal} data-testid="button-goals-demo">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-primary"><RotateCw className="h-3.5 w-3.5" />{t(demoGoalIndex < 0 ? "ob.goals.demoFill" : "ob.goals.demoRefresh")}</span>
            <span className="whitespace-normal text-[10px] font-medium text-muted-foreground">{t("ob.goals.demoHint")}</span>
          </Button>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="f-goals">{t("ob.goals.label")}</Label>
          <Textarea
            id="f-goals"
            rows={3}
            value={form.goals}
            onChange={(e) => set("goals", e.target.value)}
            placeholder={t("ob.goals.hint")}
            data-testid="input-goals"
          />
        </div>

        <fieldset className="rounded-2xl border border-border p-4 sm:p-5">
          <legend className="px-1 text-sm font-bold">{t("ob.review.prefs")}</legend>
          <p className="mb-4 text-xs text-muted-foreground">{t("ob.review.prefsSub")}</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="f-hours">{t("ob.review.hours")} <span className="text-destructive">*</span></Label>
              <Input id="f-hours" type="number" inputMode="numeric" min={1} max={60} value={form.hours} onChange={(e) => set("hours", e.target.value)} className="min-h-11" data-testid="input-goals-hours" />
              <E k="hours" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="f-budget">{t("ob.review.budget")} <span className="text-destructive">*</span></Label>
              <div className="relative"><span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">RM</span>
                <Input id="f-budget" type="number" inputMode="decimal" min={0} value={form.budget} onChange={(e) => set("budget", e.target.value)} className="min-h-11 pl-11" data-testid="input-goals-budget" /></div>
              <E k="budget" />
            </div>
          </div>
        </fieldset>
        <p className="text-[11px] text-muted-foreground">{t("ob.review.draft")}</p>
      </div>

      {touched && !ok && <div className="mt-4"><ErrorBox message={t("ob.review.fixErrors")} /></div>}
      {upd.error && <div className="mt-4"><ErrorBox message={et(upd.error)} /></div>}

      <NavBar back="review" pid={p.id}>
        <Button className="min-h-11" disabled={upd.isPending} onClick={submit} data-testid="button-goals-confirm">
          {upd.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {t("ob.goals.confirm")}
          <ArrowRight className="ml-1.5 h-4 w-4" />
        </Button>
      </NavBar>
    </>
  );
}

function EvChip({ s, filled }: { s: EvState; filled: boolean }) {
  const { t } = useT();
  if (s === "supported") return <span className="inline-flex items-center gap-1 rounded-full bg-[hsl(var(--gold-soft))] px-2 py-0.5 text-[11px] font-semibold text-accent"><BadgeCheck className="h-3 w-3" />{t("ob.ev.supported")}</span>;
  if (s === "corrected" || filled) return <span className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground">{t("ob.ev.self")}</span>;
  return <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">{t("ob.ev.none")}</span>;
}

function EvidenceList({ ev, current }: { ev: CvEvidence[]; current?: (field: string) => string | null }) {
  const { t } = useT();
  const label = (f: string) => { const x = REVIEW_FIELDS.find(([k]) => k === f); return x ? t(x[1]) : f; };
  return (
    <ul className="mt-3 space-y-2">
      {ev.map((e, i) => {
        const noEv = e.source === "no_evidence" || !e.quote;
        const cur = current?.(e.field);
        const matches = !noEv && (cur == null || norm(cur) === norm(e.value));
        return (
          <li key={i} className="rounded-xl border border-border bg-background p-3 text-sm" data-testid={`row-evidence-${i}`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label(e.field)}</span>
              <EvChip s={noEv ? "none" : matches ? "supported" : "corrected"} filled={!noEv} />
            </div>
            <div className={cn("mt-0.5 font-medium", !matches && !noEv && "text-muted-foreground line-through")}>{e.value || "-"}</div>
            {!noEv && <div className="mt-1.5 flex gap-1.5 border-l-2 border-accent pl-2 text-xs italic text-muted-foreground"><Quote className="mt-0.5 h-3 w-3 shrink-0" /><span title={t("ob.review.quote")}>{e.quote}</span></div>}
            {!noEv && <div className="mt-1 text-[11px] text-muted-foreground">{t("ob.review.source")}: {e.source === "user_cv" ? t("cv.title") : t("status.self_reported")}</div>}
          </li>
        );
      })}
    </ul>
  );
}

/* ---------- 5. holland ---------- */
function HollandStep({ p, scope, onProfileReady }: { p: Profile; scope: string; onProfileReady?: (np: Profile) => void }) {
  const { t, lang } = useT();
  const et = useErrText();
  const qc = useQueryClient();
  const { go } = useAdvance(p, scope, onProfileReady);
  const upd = useUpdateProfile();
  const qs = useListRiasecQuestions();
  const [ans, setAns] = useState<Record<number, number>>(() => {
    const d = readDraft(scope, p.id).answers;
    if (d && Object.keys(d).length) return d;
    return Object.fromEntries((p.riasecAnswers ?? []).map((a) => [a.questionId, a.value]));
  });
  const [showDemo, setShowDemo] = useState(false);
  const randomDemo = () => {
    if (!qs.data?.length) return;
    const next = Object.fromEntries(qs.data.map((question) => [question.id, 1 + Math.floor(Math.random() * 5)]));
    setAns(next);
    setShowDemo(true);
  };
  const saveRef = useRef(upd.mutate);
  saveRef.current = upd.mutate;
  const questionIds = new Set((qs.data ?? []).map((q) => q.id));
  const timer = useRef<number | undefined>(undefined);
  const first = useRef(true);
  useEffect(() => {
    writeDraft(scope, p.id, { answers: ans });
    if (first.current) { first.current = false; return; }
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      saveRef.current({ id: p.id, data: { riasecAnswers: Object.entries(ans).filter(([k]) => questionIds.has(Number(k))).map(([k, v]) => ({ questionId: Number(k), value: v })) } });
    }, 1200);
    return () => window.clearTimeout(timer.current);
  }, [ans, scope, p.id, qs.data]);
  const sub = useSubmitRiasec({
    mutation: {
      onSuccess: async (np) => {
        qc.setQueryData(getGetProfileQueryKey(p.id), np);
        if (scope) setObProfile(scope, np.id);
        onProfileReady?.(np);
        try { await go("results"); } catch { /* shown */ }
      },
    },
  });
  const total = qs.data?.length ?? 0;
  const done = (qs.data ?? []).filter((x) => ans[x.id] >= 1 && ans[x.id] <= 5).length;
  const demoCode = showDemo && done === total && total > 0 ? [...RIASEC].sort((a, b) => {
    const score = (type: string) => (qs.data ?? []).filter((q) => q.type === type).reduce((sum, q) => sum + ans[q.id], 0);
    return score(b) - score(a) || RIASEC.indexOf(a) - RIASEC.indexOf(b);
  }).slice(0, 3).join("") : null;
  const valid = new Set((qs.data ?? []).map((x) => x.id));
  const submit = () => sub.mutate({ id: p.id, data: { answers: Object.entries(ans).filter(([k]) => valid.has(Number(k))).map(([k, v]) => ({ questionId: Number(k), value: v })) } });
  return (
    <>
      <StepHead title={t("ob.holland.title")} sub={t("ob.holland.sub")} />
      <p className="mb-3 text-xs text-muted-foreground">
        {t("ob.holland.source")} <a className="underline" href="https://www.onetcenter.org/license_tools.html" target="_blank" rel="noopener noreferrer">O*NET® Interest Profiler / Developer License</a>
      </p>
      {qs.isLoading ? <Rows n={6} /> : qs.isError ? <ErrorBox error={qs.error} retry={() => qs.refetch()} /> : !total ? <ErrorBox message={t("riasec.none")} /> : (
        <>
          <div className="relative z-10 -mx-2 mb-3 rounded-xl bg-card/95 px-2 py-2 backdrop-blur">
            <Meter value={done} max={total} label={`${done}/${total}`} />
            <div className="mt-1 text-[11px] text-muted-foreground">{t("riasec.scale")}</div>
            <div className="mt-2 rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/[0.04] via-muted/30 to-background p-3 shadow-sm">
              <p className="mb-2 text-xs font-bold text-foreground">{t("ob.holland.demoTitle")}</p>
              <Button type="button" variant="outline" size="sm" className="h-auto min-h-11 flex flex-col items-start gap-1 border-border/80 bg-background/90 px-3 py-2.5 text-left shadow-xs transition-all hover:border-primary hover:bg-background" onClick={randomDemo} data-testid="button-random-demo-answer">
                <span className="flex items-center gap-1.5 text-xs font-semibold text-primary"><RotateCw className="h-3.5 w-3.5" />{showDemo ? t("ob.holland.refreshDemo") : t("ob.holland.randomDemo")}</span>
                <span className="whitespace-normal text-[10px] font-medium text-muted-foreground">{t("ob.holland.demoHint")}</span>
              </Button>
              {showDemo && <p className="mt-2 text-xs font-medium text-accent" role="status">{t("ob.holland.demoReady")}</p>}
              {demoCode && <p className="mt-1 text-sm font-bold text-primary" data-testid="text-demo-holland-code">{t("ob.holland.demoCode", { code: demoCode })}</p>}
            </div>
          </div>
          <ol className="space-y-2">
            {qs.data!.map((qq, i) => (
              <li key={qq.id} className={cn("rounded-xl border p-3 transition-colors", ans[qq.id] ? "border-primary/30 bg-[hsl(var(--maroon-soft))]/30" : "border-border")}>
                <div className="text-sm"><span className="tnum mr-2 text-xs font-semibold text-accent">{String(i + 1).padStart(2, "0")}</span>{lang === "ms" ? qq.textMs : lang === "zh" ? qq.textZh : qq.text}</div>
                <div className="mt-2 grid grid-cols-5 gap-1.5" role="radiogroup">
                  {[1, 2, 3, 4, 5].map((v) => (
                    <button key={v} type="button" role="radio" aria-checked={ans[qq.id] === v} aria-label={`${v}`} onClick={() => setAns((a) => ({ ...a, [qq.id]: v }))} data-testid={`button-answer-${qq.id}-${v}`}
                      className={cn("tnum min-h-11 rounded-lg border text-sm font-semibold transition-all active:scale-95", ans[qq.id] === v ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:border-primary")}>{v}</button>
                  ))}
                </div>
              </li>
            ))}
          </ol>
        </>
      )}
      {sub.error && <div className="mt-4"><ErrorBox message={et(sub.error)} retry={submit} /></div>}
      {done < total && (
        <p className="mt-3 text-right text-xs text-muted-foreground sm:hidden" data-testid="text-holland-all-mobile">
          {t("ob.holland.all", { n: total })}
        </p>
      )}
      <NavBar back="goals" pid={p.id}>
        {done < total && (
          <span className="hidden self-center text-xs text-muted-foreground sm:inline">
            {t("ob.holland.all", { n: total })}
          </span>
        )}
        <Button className="min-h-11" disabled={!total || done < total || sub.isPending} onClick={submit} data-testid="button-holland-submit">
          {sub.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{t("ob.holland.submit")}<ArrowRight className="ml-1.5 h-4 w-4" />
        </Button>
      </NavBar>
    </>
  );
}

interface ParsedHollandSection {
  title: string;
  body: string;
  icon: "compass" | "cv" | "action";
}

function parseHollandSections(content: string, lang: string): ParsedHollandSection[] {
  const lines = content.split("\n");
  const sections: ParsedHollandSection[] = [];
  let currentTitle = "";
  let currentBody: string[] = [];

  const determineIcon = (title: string): "compass" | "cv" | "action" => {
    const t = title.toLowerCase();
    if (t.includes("evidence") || t.includes("cv") || t.includes("bukti") || t.includes("简历")) return "cv";
    if (t.includes("easy") || t.includes("try") || t.includes("langkah") || t.includes("cuba") || t.includes("尝试") || t.includes("action") || t.includes("cadangan")) return "action";
    return "compass";
  };

  for (const line of lines) {
    const headerMatch = line.match(/^#{1,4}\s+(.+)$/) || line.match(/^\*\*(.+)\*\*$/);
    if (headerMatch) {
      if (currentTitle || currentBody.some((b) => b.trim())) {
        sections.push({
          title: currentTitle || (lang === "ms" ? "Kombinasi Minat" : lang === "zh" ? "兴趣概述" : "The Interest Mix"),
          body: currentBody.join("\n").trim(),
          icon: determineIcon(currentTitle),
        });
        currentBody = [];
      }
      currentTitle = headerMatch[1].replace(/\*\*/g, "").trim();
    } else {
      currentBody.push(line);
    }
  }

  if (currentTitle || currentBody.some((b) => b.trim())) {
    sections.push({
      title: currentTitle || (lang === "ms" ? "Rumusan" : lang === "zh" ? "总结" : "Summary"),
      body: currentBody.join("\n").trim(),
      icon: determineIcon(currentTitle),
    });
  }

  const valid = sections.filter((s) => s.body.length > 0);
  if (valid.length === 0 && content.trim()) {
    valid.push({
      title: lang === "ms" ? "Analisis Minat & CV" : lang === "zh" ? "兴趣与简历分析" : "The Interest Mix",
      body: content.trim(),
      icon: "compass",
    });
  }

  return valid;
}

function resultSourceKey(p: Profile) {
  return JSON.stringify([p.cvExtractionKey,p.cvUploadedAt,p.name,p.currentRole,p.organization,p.education,p.experience,p.goals,p.weeklyHours,p.budgetMyr,p.skills,p.riasecAnswers,p.riasecScores,p.riasecCode]);
}

/* ---------- 5. results ---------- */
function ResultsStep({ p, scope, onProfileReady }: { p: Profile; scope?: string; onProfileReady?: (np: Profile) => void }) {
  const { t, tk, lang } = useT();
  const { go, upd } = useAdvance(p, scope, onProfileReady);
  const qc = useQueryClient();
  const scores = p.riasecScores;
  const code = p.riasecCode ?? "-";
  const max = scores ? Math.max(1, ...RIASEC.map((k) => scores[k])) : 1;

  // Query existing insights from server
  const insList = useListProfileInsights(p.id, {
    query: { queryKey: [...getListProfileInsightsQueryKey(p.id), resultSourceKey(p)] },
  });

  // Cache insights by language so switching is seamless
  const [byLang, setByLang] = useState<Record<string, AgentInsight>>({});
  const [selectedLetter, setSelectedLetter] = useState(0);
  const [copied, setCopied] = useState(false);

  const requests = useRef(new Map<string, Promise<void>>());
  const completed = useRef(new Set<string>());
  const [pending, setPending] = useState<Record<string, number>>({});
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  // Sync existing insights from database on load
  useEffect(() => {
    if (insList.data && insList.data.length > 0) {
      const hollandList = insList.data.filter((it) => it.agent === "holland" && Boolean(it.content));
      if (hollandList.length > 0) {
        setByLang((prev) => {
          const next = { ...prev };
          let changed = false;
          for (const it of hollandList) {
            if (it.lang && (!next[it.lang] || new Date(it.createdAt) > new Date(next[it.lang].createdAt))) {
              next[it.lang] = it;
              changed = true;
            }
          }
          return changed ? next : prev;
        });
      }
    }
  }, [insList.data]);

  const hasGeneratedInsight = Object.values(byLang).some((it) => Boolean(it.content));
  // Keep the original readable while translations complete independently of the UI language.
  const original = Object.values(byLang).sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt))[0];
  const insight = byLang[lang] ?? original ?? null;
  const since = pending[lang] ?? Object.values(pending)[0] ?? null;
  const explainError = errors[lang] || (!hasGeneratedInsight && Object.values(errors).some(Boolean));

  const requestExplanation = useCallback((target: Lang) => {
    const existing = requests.current.get(target);
    if (existing) return existing;
    if (completed.current.has(target)) return Promise.resolve();
    setPending((prev) => ({ ...prev, [target]: Date.now() }));
    setErrors((prev) => ({ ...prev, [target]: false }));
    const job = runProfileAgent(p.id, { agent: "holland", lang: target })
      .then((result) => {
        completed.current.add(target);
        setByLang((prev) => ({ ...prev, [target]: result }));
        qc.invalidateQueries({ queryKey: getListProfileInsightsQueryKey(p.id) });
      })
      .catch(() => setErrors((prev) => ({ ...prev, [target]: true })))
      .finally(() => {
        requests.current.delete(target);
        setPending((prev) => { const next = { ...prev }; delete next[target]; return next; });
      });
    requests.current.set(target, job);
    return job;
  }, [p.id, qc]);
  const explain = () => requestExplanation(lang);

  // Start the other translations once; language switching never cancels or restarts them.
  useEffect(() => {
    if (!hasGeneratedInsight) return;
    for (const target of ["en", "ms", "zh"] as const) {
      if (byLang[target]) completed.current.add(target);
      else if (!errors[target]) void requestExplanation(target);
    }
  }, [hasGeneratedInsight, byLang, errors, requestExplanation]);

  const selectedType = code[selectedLetter] ?? code[0];

  const copySummary = (text: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <>
      <div className="mb-6 flex flex-col items-start gap-3 sm:flex-row sm:items-end sm:gap-4">
        <div className="tnum flex gap-1" role="group" aria-label={t("ob.results.exploreCode")}>
          {code.split("").slice(0, 3).map((c, i) => (
            <motion.button type="button" key={i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.12 }}
              translate="no" onClick={() => setSelectedLetter(i)} aria-pressed={selectedLetter === i} aria-label={`${c}: ${tk("riasec", c)}`}
              className={cn("flex h-14 w-12 sm:h-16 sm:w-14 items-center justify-center rounded-xl sm:rounded-2xl text-2xl sm:text-3xl font-extrabold transition-transform hover:-translate-y-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary", selectedLetter === i ? "bg-primary text-primary-foreground" : "bg-[hsl(var(--gold-soft))] text-primary")}>{c}</motion.button>
          ))}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight" data-testid="text-riasec-code">{t("ob.results.title", { code })}</h1>
          <p className="mt-0.5 sm:mt-1 text-xs sm:text-sm text-muted-foreground">{t("ob.results.sub")}</p>
        </div>
      </div>
      {selectedType && selectedType !== "-" && <div className="mb-6 rounded-2xl border border-primary/25 bg-card p-3.5 sm:p-4" data-testid="holland-letter-detail">
        <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-wide text-accent">{t("ob.results.exploreCode")}</p>
        <p className="mt-0.5 sm:mt-1 font-bold text-sm sm:text-base"><span translate="no" className="notranslate">{selectedType}</span> · {tk("riasec", selectedType)}</p>
        <p className="mt-1 text-xs sm:text-sm text-muted-foreground leading-relaxed">{t(`ob.results.type.${selectedType}` as Parameters<typeof t>[0])}</p>
      </div>}

      {/* 1. YOUR SIX SCORES SECTION */}
      <div className="mb-6 rounded-2xl border border-border bg-card p-4 sm:p-5 md:p-6 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-border/40">
          <div className="flex items-center gap-2">
            <BarChart2 className="h-4 w-4 text-accent" />
            <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-accent">{t("ob.results.scores")}</h2>
          </div>
        </div>
        {scores ? (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 sm:gap-y-3.5">
            {RIASEC.map((k) => (
              <div key={k} className="grid grid-cols-[1.5rem_minmax(0,6.5rem)_1fr] sm:grid-cols-[1.5rem_minmax(0,7.5rem)_1fr] items-center gap-2 text-xs sm:text-sm" data-testid={`meter-riasec-${k}`}>
                <span translate="no" className="notranslate font-bold text-primary">{k}</span>
                <span className="truncate font-medium">{tk("riasec", k)}</span>
                <Meter value={scores[k]} max={max} tone={code.includes(k) ? "maroon" : "gold"} label={scores[k].toFixed(1)} />
              </div>
            ))}
          </div>
        ) : <p className="mt-3 text-xs sm:text-sm text-muted-foreground">-</p>}
        <p className="mt-4 border-t border-border/40 pt-2 text-[10px] sm:text-[11px] text-muted-foreground">{t("riasec.disclaimer")}</p>
      </div>

      {/* 2. RAG AI AGENT SUMMARY ELI-5 SECTION (FULL WIDTH BELOW SCORES) */}
      <div className="mb-6 rounded-2xl border border-accent/30 bg-gradient-to-br from-card via-card to-[hsl(var(--gold-soft))]/20 p-4 sm:p-5 md:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-accent/20">
          <div>
            <h2 className="flex items-center gap-2 text-sm sm:text-base font-bold text-foreground">
              <Lightbulb className="h-4 w-4 shrink-0 text-accent" />
              <span>{t("ob.results.explainTitle")}</span>
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">{t("ob.results.explainNote")}</p>
          </div>
          {insight && (
            <div className="flex flex-wrap items-center gap-2 pt-1 sm:pt-0">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card/80 px-2 py-0.5 sm:px-2.5 sm:py-1 text-[11px] sm:text-xs font-medium" data-testid="text-insight-lang">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                {t("ob.results.lang", { lang: LANG_NAME[insight.lang as Lang] ?? insight.lang })}
              </span>
              {insight.cached && (
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] sm:text-[11px] font-semibold text-muted-foreground">
                  {t("common.cached")}
                </span>
              )}
              <button
                type="button"
                onClick={() => copySummary(insight.content)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2 py-1 sm:px-2.5 text-xs font-medium text-foreground hover:bg-muted transition-colors cursor-pointer"
                title={lang === "ms" ? "Salin ringkasan" : lang === "zh" ? "复制内容" : "Copy summary"}
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copied ? (lang === "ms" ? "Disalin!" : lang === "zh" ? "已复制!" : "Copied!") : (lang === "ms" ? "Salin" : lang === "zh" ? "复制" : "Copy")}</span>
              </button>
            </div>
          )}
        </div>

        <div className="mt-4">
          {insight ? (
            <div data-testid="text-holland-insight" className="space-y-4">
              {!byLang[lang] && <HollandTranslationNote failed={!!errors[lang]} retry={() => { void requestExplanation(lang); }} />}
              {parseHollandSections(insight.content, insight.lang).map((section, index) => (
                <div key={`${insight.id}-${index}`} lang={insight.lang}><HollandStoryCard title={section.title} body={section.body} kind={section.icon} index={index} /></div>
              ))}
            </div>
          ) : since ? (
            <div>
              <HollandLoadingStory />
              <div className="mt-3"><AiWait since={since} note={t("ob.results.generating")} /></div>
              <p className="mt-2 rounded-lg bg-muted/60 px-3 py-2 text-xs text-muted-foreground">{t("ob.results.eli5Loading")}</p>
            </div>
          ) : explainError ? (
            /* ONLY ONE BUTTON APPEARS HERE: Retry */
            <div className="rounded-xl border border-destructive/40 bg-card p-4 text-sm" role="alert" data-testid="status-explain-error">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 shrink-0 text-destructive mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-xs sm:text-sm text-destructive">{t("ob.results.explainFail")}</p>
                  <Button
                    variant="outline"
                    className="mt-3 w-full sm:w-auto max-w-full min-h-11 px-4 sm:px-6 whitespace-normal text-xs sm:text-sm border-destructive/30 text-destructive hover:bg-destructive/10"
                    onClick={explain}
                    data-testid="button-explain-retry"
                  >
                    <RotateCw className="mr-1.5 h-4 w-4 shrink-0" />
                    <span>{t("ob.results.explainRetry")}</span>
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            /* ONLY ONE BUTTON APPEARS HERE: Connect / Explain */
            <Button
              className="w-full sm:w-auto max-w-full min-h-12 px-4 sm:px-6 py-3 font-semibold shadow-xs whitespace-normal text-center leading-snug rounded-xl cursor-pointer"
              onClick={explain}
              disabled={!scores}
              data-testid="button-explain"
            >
              <Sparkles className="mr-2 h-4 w-4 shrink-0 text-accent" />
              <span className="text-xs sm:text-sm md:text-base font-semibold">{t("ob.results.explainBtn")}</span>
            </Button>
          )}
        </div>
      </div>
      <NavBar back="holland" pid={p.id}>
        <Button className="min-h-11" disabled={upd.isPending} onClick={() => go("save").catch(() => undefined)} data-testid="button-results-next">{t("ob.next")}<ArrowRight className="ml-1.5 h-4 w-4" /></Button>
      </NavBar>
    </>
  );
}

/* ---------- 6. save ---------- */
function SaveStep({ p, scope, onProfileReady }: { p: Profile; scope: string; onProfileReady?: (np: Profile) => void }) {
  const { t } = useT();
  const et = useErrText();
  const { user } = useAuth();
  const { go, upd } = useAdvance(p, scope, onProfileReady);
  const seg = p.segment === "graduate" ? "student" : "worker";
  const finish = async () => {
    try {
      await go("complete", {}, `/me/profiles/${p.id}/intake`);
      clearDraft(scope, p.id);
      setObProfile(scope, null);
    } catch { /* shown */ }
  };
  const finishing = useRef(false);
  useEffect(() => {
    if (user && !finishing.current) {
      finishing.current = true;
      void finish();
    }
  }, [user?.id]);
  const next = encodeURIComponent(`/onboarding/save?pid=${p.id}`);
  return (
    <>
      <StepHead title={t("ob.save.title")} sub={user ? t("ob.save.subUser", { name: user.name }) : t("ob.save.subGuest")} />
      {user ? (
        <Button className="min-h-12 px-6 text-base" disabled={upd.isPending} onClick={finish} data-testid="button-finish">
          {upd.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{t("ob.save.finish")}<ArrowRight className="ml-1.5 h-4 w-4" />
        </Button>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <Link href={`/register?next=${next}&seg=${seg}`} className="flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-primary px-5 font-semibold text-primary-foreground hover:bg-primary/90" data-testid="link-save-register">{t("ob.save.register")}<ArrowRight className="h-4 w-4" /></Link>
          <Link href={`/login?role=individual&next=${next}`} className="flex min-h-14 items-center justify-center rounded-2xl border border-border bg-background px-5 font-semibold hover:border-primary" data-testid="link-save-login">{t("ob.save.login")}</Link>
          <Button type="button" variant="ghost" disabled={upd.isPending} onClick={finish} className="min-h-11 text-sm text-muted-foreground hover:text-primary sm:col-span-2" data-testid="link-save-guest">{upd.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{t("ob.save.guestKeep")}</Button>
          <p className="text-center text-xs text-muted-foreground sm:col-span-2">{t("ob.save.guestNote")}</p>
        </div>
      )}
      {upd.error && <div className="mt-4"><ErrorBox message={et(upd.error)} /></div>}
      <NavBar back="results" pid={p.id} />
    </>
  );
}
