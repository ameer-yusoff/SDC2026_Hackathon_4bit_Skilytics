import {usePortalGuide} from "./portal-guides";
import { PageHeader } from "./kit";
import { institutionWords } from "@/i18n/institution";
import { useState } from "react";
import { Link, Redirect, useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  useUpdateProfile,
  getGetProfileQueryKey,
  type Profile,
} from "@workspace/api-client-react";
import { FileText, Loader2, Pencil } from "lucide-react";
import { useT } from "@/i18n";
import { enterpriseWords } from "@/i18n/enterprise";
import { enterprisePost, type SavedAnalysis } from "@/lib/enterprise";
import { useLearning, useLearningAction } from "@/lib/learning";
import { skillLabel } from "@/lib/skill-label";
import { CvPanel, RiasecPanel } from "@/pages/profile";
import { IndividualMatcher, IndividualPathway } from "./individual-journey";
import { LearningDashboard } from "./learning-dashboard";
import { ProfileFormDialog } from "./profile-form";
import { PageGuide } from "./page-guide";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
import { ErrorBox, Rows, Panel, Meter, Markdown } from "./kit";

export function EnterpriseEmployee({
  p,
  mod,
  institution = false,
}: {
  p: Profile;
  mod: string;
  institution?: boolean;
}) {
  const { lang } = useT(),
    w = {
      ...enterpriseWords[lang],
      ...(institution
        ? {
            back: institutionWords[lang].back,
            guideEmployee: institutionWords[lang].guideStudents,
          }
        : {}),
    };
  const guideCopy=usePortalGuide();
  const base = institution ? "/tvet/students" : "/hr/members";
  const j = useLearning(p.id);
  if (j.isLoading) return <Rows n={3} />;
  if (j.isError) return <ErrorBox error={j.error} retry={() => j.refetch()} />;
  const active = j.data?.stage === "active",
    stage = j.data?.stage ?? "intake";
  if (
    !active &&
    ((mod === "matcher" && stage === "intake") ||
      (mod === "pathway" && stage !== "pathway") ||
      ["radar", "agents"].includes(mod))
  )
    return <Redirect to={`${base}/${p.id}/${stage}`} />;
  const index = mod === "matcher" ? 1 : mod === "pathway" ? 2 : 0;
  return (
    <div className="space-y-5">
      <PageHeader
        title={p.name}
        help={
          <PageGuide
            title={w.guide}
            steps={[
              { title: active ? w.progress : w.profile, body: active ? guideCopy.progressBody : guideCopy.intakeBody },
              { title: w.gaps, body: w.reported },
            ]}
          />
        }
        sub={
          <Link
            className="inline-flex min-h-11 items-center text-sm text-primary"
            href={base}
          >
            ← {w.back}
          </Link>
        }
      />
      {!active && (
        <ol className="grid grid-cols-3 gap-2">
          {w.setup.map((s, i) => (
            <li
              key={s}
              aria-current={index === i ? "step" : undefined}
              className={`rounded-xl border p-3 text-xs sm:text-sm ${index === i ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground"}`}
            >
              <b>{i + 1}</b> {s}
            </li>
          ))}
        </ol>
      )}
      {active ? (
        <>
          <LearningDashboard
            p={p}
            employer
            portal={institution ? "tvet" : "hr"}
          />
          <EmployeeGap p={p} />
          <details className="rounded-2xl border bg-card p-4">
            <summary className="cursor-pointer font-semibold">
              {w.profile} · {w.holland}
            </summary>
            <div className="mt-4">
              <EmployeeIntake p={p} active base={base} />
            </div>
          </details>
        </>
      ) : index === 0 ? (
        <EmployeeIntake p={p} base={base} />
      ) : index === 1 ? (
        <IndividualMatcher p={p} base={base} />
      ) : (
        <IndividualPathway p={p} base={base} />
      )}
    </div>
  );
}
function EmployeeGap({ p }: { p: Profile }) {
  const { lang } = useT(),
    w = enterpriseWords[lang];
  const j = useLearning(p.id);
  const upcoming = Array.from(
    new Set(
      j.data?.items
        .filter((i) => !j.data?.completed[String(i.courseId)])
        .flatMap((i) => i.skills) ?? [],
    ),
  );
  const practised = Array.from(
    new Set(
      j.data?.items
        .filter((i) => !!j.data?.completed[String(i.courseId)])
        .flatMap((i) => i.skills) ?? [],
    ),
  );
  return (
    <Panel title={w.gaps} meta={w.reported}>
      <div className="flex flex-wrap gap-2">
        {upcoming.map((s) => (
          <span className="rounded-lg bg-amber-50 px-3 py-2 text-sm" key={s}>
            {skillLabel(s, lang)}
          </span>
        ))}
      </div>
      {practised.length > 0 && (
        <>
          <h3 className="mb-2 mt-5 text-sm font-bold">{w.learned}</h3>
          <div className="flex flex-wrap gap-2">
            {practised.map((s) => (
              <span
                className="rounded-lg bg-emerald-50 px-3 py-2 text-sm"
                key={s}
              >
                {skillLabel(s, lang)}
              </span>
            ))}
          </div>
        </>
      )}
    </Panel>
  );
}
function EmployeeIntake({
  p,
  active = false,
  base = "/hr/members",
}: {
  p: Profile;
  active?: boolean;
  base?: string;
}) {
  const { lang, t, tk } = useT(),
    w = {
      ...enterpriseWords[lang],
      ...(base.startsWith("/tvet")
        ? {
            summary:
              lang === "ms"
                ? "Maksudnya untuk pembelajaran"
                : lang === "zh"
                  ? "这对学习意味着什么"
                  : "What this means for learning",
            uploadHelp:
              lang === "ms"
                ? "Semak CV pelajar dan kemas kini maklumat yang disimpan. Keputusan Holland kekal tetap."
                : lang === "zh"
                  ? "核对学生简历并更新保存的资料，霍兰德结果保持固定。"
                  : "Review the student's CV and update saved details. The Holland result stays fixed.",
          }
        : {}),
    };
  const [cv, setCv] = useState(false),
    [edit, setEdit] = useState(false),
    [questions, setQuestions] = useState(false);
  const qc = useQueryClient(),
    [, nav] = useLocation();
  const action = useLearningAction(p.id),
    update = useUpdateProfile();
  const ai = useQuery({
    queryKey: [
      "employee-summary",
      p.id,
      p.cvExtractionKey,
      p.name,
      p.education,
      p.experience,
      p.currentRole,
      p.skills,
      p.riasecCode,
      p.riasecScores,
    ],
    queryFn: () => enterprisePost<SavedAnalysis>(`employees/${p.id}/summary`),
    enabled: !!p.cvExtractionKey && !!p.riasecCode,
    retry: false,
    staleTime: Infinity,
  });
  const confirm = async () => {
    try {
      const next = await update.mutateAsync({
        id: p.id,
        data: { verified: true, onboardingStep: "complete" },
      });
      qc.setQueryData(getGetProfileQueryKey(p.id), next);
      await action.mutateAsync({ action: "confirm_intake" });
      qc.invalidateQueries({ queryKey: ["enterprise"] });
      nav(`${base}/${p.id}/matcher`);
    } catch {}
  };
  return (
    <>
      <div className="grid items-stretch gap-4 lg:grid-cols-2">
        <Panel
          title={w.profile}
          actions={
            <Button variant="outline" onClick={() => setCv(true)}>
              <FileText className="mr-2 h-4 w-4" />
              {w.cv}
            </Button>
          }
        >
          <p className="text-lg font-semibold">
            {p.currentRole || t("ob.saved.empty")}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">{p.organization}</p>
          <div className="my-4 flex flex-wrap gap-2">
            {p.skills.slice(0, 8).map((s) => (
              <span
                key={s.skillId}
                className="rounded-lg bg-muted px-2 py-1 text-xs"
              >
                {skillLabel(s.name, lang)}
              </span>
            ))}
          </div>
          <Button variant="outline" onClick={() => setEdit(true)}>
            <Pencil className="mr-2 h-4 w-4" />
            {w.edit}
          </Button>
        </Panel>
        <Panel title={w.holland} meta={w.locked}>
          {p.riasecScores ? (
            <>
              <div className="mb-4 flex gap-2" translate="no">
                {p.riasecCode?.split("").map((k) => (
                  <span
                    key={k}
                    className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-2xl font-bold text-primary-foreground"
                  >
                    {k}
                  </span>
                ))}
              </div>
              <div className="space-y-3">
                {(["R", "I", "A", "S", "E", "C"] as const).map((k) => (
                  <div
                    key={k}
                    className="grid grid-cols-[1rem_7rem_1fr] items-center gap-2 text-xs"
                  >
                    <b translate="no">{k}</b>
                    <span>{tk("riasec", k)}</span>
                    <Meter
                      value={p.riasecScores![k]}
                      max={5}
                      label={p.riasecScores![k].toFixed(1)}
                    />
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              <p className="mb-3 text-sm">{w.missing}</p>
              <Button disabled={!p.verified} onClick={() => setQuestions(true)}>
                {t("riasec.title")}
              </Button>
              {!p.verified && (
                <Button
                  variant="outline"
                  disabled={!p.cvExtractionKey || update.isPending}
                  onClick={async () => {
                    const np = await update.mutateAsync({
                      id: p.id,
                      data: { verified: true },
                    });
                    qc.setQueryData(getGetProfileQueryKey(p.id), np);
                  }}
                >
                  {w.confirm}
                </Button>
              )}
            </>
          )}
        </Panel>
      </div>
      <Panel title={w.summary} meta={w.saved}>
        {ai.isLoading && ai.fetchStatus === "fetching" ? (
          <div className="flex items-center gap-3 py-6">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p>{w.loading}</p>
          </div>
        ) : ai.isError ? (
          <ErrorBox error={ai.error} retry={() => ai.refetch()} />
        ) : ai.data ? (
          <div className="max-w-none text-sm leading-relaxed">
            <Markdown>{ai.data.translations[lang]}</Markdown>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{w.missing}</p>
        )}
      </Panel>
      {!active && (
        <div>
          <Button
            className="min-h-12 w-full sm:w-auto"
            disabled={
              !p.cvExtractionKey ||
              !p.riasecCode ||
              action.isPending ||
              update.isPending
            }
            onClick={confirm}
          >
            {w.next} →
          </Button>
          {(action.isError || update.isError) && (
            <ErrorBox error={action.error ?? update.error} />
          )}
        </div>
      )}
      <Dialog open={cv} onOpenChange={setCv}>
        <DialogContent className="max-h-[90dvh] max-w-3xl overflow-y-auto">
          <DialogTitle>{w.details}</DialogTitle>
          <DialogDescription>{w.uploadHelp}</DialogDescription>
          <dl className="grid gap-4 text-sm sm:grid-cols-2">
            {[
              [t("ob.review.role"), p.currentRole],
              [t("ob.review.org"), p.organization],
              [t("ob.review.edu"), p.education],
              [t("ob.review.exp"), p.experience],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl bg-muted/40 p-3">
                <dt className="text-xs text-muted-foreground">{label}</dt>
                <dd className="mt-2 whitespace-pre-line break-words">
                  {value || t("ob.saved.empty")}
                </dd>
              </div>
            ))}
          </dl>
          <div className="flex flex-wrap gap-2">
            {p.skills.map((s) => (
              <span
                key={s.skillId}
                className="rounded-lg bg-muted px-2 py-1 text-xs"
              >
                {skillLabel(s.name, lang)}
              </span>
            ))}
          </div>
          <Button variant="outline" onClick={() => setEdit(true)}>
            {w.edit}
          </Button>
          <CvPanel p={p} />
        </DialogContent>
      </Dialog>
      <Dialog open={questions} onOpenChange={setQuestions}>
        <DialogContent className="max-h-[90dvh] max-w-3xl overflow-y-auto">
          <DialogTitle>{w.holland}</DialogTitle>
          <DialogDescription>{w.locked}</DialogDescription>
          {!p.riasecScores && <RiasecPanel p={p} />}
        </DialogContent>
      </Dialog>
      <ProfileFormDialog
        open={edit}
        onOpenChange={setEdit}
        profile={p}
        lockSegment
      />
    </>
  );
}
