import {SkillSdg} from "./skill-sdg";
import {SdgContribution,SdgExplanation} from "./sdg-choice";
import {useState} from "react";
import {jobWords} from "./market-skills";
import type { Profile } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Award, Medal, CalendarCheck, CheckCircle2 } from "lucide-react";
import { roleTitle } from "@/lib/fmt";
import { useT } from "@/i18n";
import { learningWords } from "@/i18n/learning";
import {
  learningCalendar,
  useLearning,
  useLearningAction,
} from "@/lib/learning";
import { Button } from "./ui/button";
import { ErrorBox, SdgBadge } from "./kit";

export function LearningDashboard({ p, employer=false, portal="hr" }: { p: Profile; employer?:boolean;portal?:"hr"|"tvet" }) {
  const { lang } = useT(),
    w = learningWords[lang];
  const [category,setCategory]=useState("all");
  const q = useLearning(p.id),
    action = useLearningAction(p.id);
  const j = q.data;
  if (q.isError) return <ErrorBox error={q.error} retry={() => q.refetch()} />;
  if (!j) return null;
  if (j.stage !== "active")
    return (
      <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card p-4">
        <div>
          <b>{p.name}</b>
          <p className="text-xs text-muted-foreground">
            {w.steps[j.stage === "intake" ? 0 : j.stage === "matcher" ? 1 : 2]}
          </p>
        </div>
        <Link
          className="inline-flex min-h-11 items-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground"
          href={
            p.onboardingStep === "complete"
              ? `/me/profiles/${p.id}/${j.stage}`
              : `/onboarding/${!p.cvExtractionKey?"cv":!p.verified?"review":!p.riasecScores?"holland":p.onboardingStep==="save"?"save":"results"}?pid=${p.id}`
          }
        >
          {w.resume} →
        </Link>
      </section>
    );
  const done = j.items.filter((i) => !!j.completed[String(i.courseId)]).length;
  const total = j.items.length;
  return (
    <section className="rounded-2xl border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase text-accent">
            {w.dashboard}
          </p>
          <h2 className="text-xl font-bold">
            {p.name} · {roleTitle({title:j.roleTitle??"",titleMs:j.roleTitleMs,titleZh:j.roleTitleZh},lang)}
          </h2>
        </div>
        <Button
          variant="outline"
          className="h-auto min-h-11 w-full whitespace-normal py-2 sm:w-auto"
          onClick={() =>
            learningCalendar(
              j.items,
              p.id,
              j.roleTitle ?? "",
              !/iPad|iPhone|Macintosh/.test(navigator.userAgent),
            )
          }
        >
          <CalendarCheck className="mr-2 h-4 w-4" />
          {w.calendar}
        </Button>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">{w.calendarNote}</p>
      <SdgContribution goals={j.items.flatMap(i=>i.sdgCodes)}/>
      <div className="my-5">
        <p className="mb-2 flex justify-between text-sm font-semibold">
          <span>{w.progress}</span>
          <span>
            {done} / {total}
          </span>
        </p>
        <div
          role="progressbar"
          aria-label={w.progress}
          aria-valuenow={total ? Math.round((done / total) * 100) : 0}
          aria-valuemin={0}
          aria-valuemax={100}
          className="h-3 overflow-hidden rounded-full bg-muted"
        >
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${total ? (done / total) * 100 : 0}%` }}
          />
        </div>
      </div>
      {employer && portal==="tvet" && <div role="tablist" className="mb-4 flex flex-wrap gap-2">{[["all",lang==="ms"?"Semua":lang==="zh"?"全部":"All"],["compulsory",lang==="ms"?"Wajib":lang==="zh"?"必修":"Compulsory"],["personalised",lang==="ms"?"Peribadi":lang==="zh"?"个性化":"Personalised"]].map(([id,label])=><button key={id} role="tab" aria-selected={category===id} onClick={()=>setCategory(id)} className={`min-h-11 rounded-xl border px-3 text-sm font-semibold ${category===id?"bg-primary text-primary-foreground":""}`}>{label} ({j.items.filter(i=>id==="all"||(id==="compulsory"?i.compulsory:!i.compulsory)).length})</button>)}</div>}
      <ol className="space-y-3">
        {j.items.filter(i=>!employer||portal!=="tvet"||category==="all"||(category==="compulsory"?i.compulsory:!i.compulsory)).map((i) => {
          const complete = !!j.completed[String(i.courseId)];
          const late =
            !complete &&
            i.deadline &&
            i.deadline < new Date().toISOString().slice(0, 10);
          return (
            <li
              key={i.courseId}
              className={`rounded-xl border p-4 ${complete ? "border-emerald-500/40 bg-emerald-500/5" : ""}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  {employer && portal==="tvet" && <p className="mb-2 text-xs font-bold text-primary">{i.compulsory ? (lang==="ms"?"Kursus wajib":lang==="zh"?"必修课程":"Compulsory course") : (lang==="ms"?"Kursus peribadi":lang==="zh"?"个性化课程":"Personalised course")}</p>}
                  <h3 className="font-bold">
                    {complete && (
                      <CheckCircle2 className="mr-2 inline h-4 w-4 text-emerald-600" />
                    )}
                    {i.title}
                  </h3>
                  <p className="mt-2 text-xs text-muted-foreground">{i.provider} · {i.costMyr===0?(lang==="ms"?"Percuma":lang==="zh"?"免费":"Free"):`RM ${i.costMyr}`}</p>
                  <p className="mt-2 text-sm">
                    <span className="rounded bg-muted px-2 py-1">
                      {w.starts}: {i.startDate}
                    </span>{" "}
                    <span
                      className={`inline-block rounded px-2 py-1 font-bold ${late ? "bg-destructive/10 text-destructive" : "bg-[hsl(var(--gold-soft))]"}`}
                    >
                      {w.deadline}: {i.deadline}
                    </span>
                  </p>
                  {late && (
                    <p className="mt-1 text-xs text-destructive">{w.overdue}</p>
                  )}
                  {i.estimated && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {w.dateEstimate}
                    </p>
                  )}
                </div>
                <a
                  href={i.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-11 items-center rounded-lg border px-3 text-sm font-semibold"
                >
                  {w.open} ↗
                </a>
              </div>
              <details className="my-3 text-xs"><summary className="min-h-11 cursor-pointer py-3">{lang==="ms"?"Kemahiran & kaitan SDG":lang==="zh"?"技能与SDG关联":"Skills & SDG links"}</summary><div className="grid gap-2 sm:grid-cols-2">{i.skills.map(name=><SkillSdg key={name} name={name}/>)}</div></details><SdgExplanation goals={i.sdgCodes} subject={i.title} skills={i.skills} kind="course"/>
              <label className="mt-3 inline-flex min-h-11 cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={complete}
                  disabled={action.isPending}
                  onChange={(e) =>
                    action.mutate({
                      action: "complete_course",
                      courseId: i.courseId,
                      done: e.target.checked,
                    })
                  }
                />
                {complete ? w.completed : w.done}
              </label>
            </li>
          );
        })}
      </ol>
      <h3 className="mb-3 mt-5 font-bold">{w.achievement}</h3>
      <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 sm:flex-wrap sm:overflow-visible" tabIndex={0} aria-label={w.achievement}>
        {[
          [done > 0, w.first],
          [done > 0 && done >= Math.ceil(total / 2), w.half],
          [j.complete, w.finish],
        ].map(([earned, label], i) => (
          <div
            key={String(label)}
            className={`inline-flex shrink-0 snap-start items-center gap-2 whitespace-nowrap rounded-xl border p-3 text-sm ${earned ? "border-accent bg-[hsl(var(--gold-soft))]" : "opacity-40"}`}
          >
            {i === 2 ? (
              <Award className="h-6 w-6" />
            ) : (
              <Medal className="h-6 w-6" />
            )}
            {label}
            {earned && " ✓"}
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">{w.certificateNote}</p>
      {j.complete && (
        <div className="mt-5 space-y-3 rounded-2xl border-2 border-accent p-4">
          <h3 className="text-xl font-bold">{w.finish} 🎉</h3>
          <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
          <Button asChild className="h-auto min-h-11 whitespace-normal py-3"><Link href={`${employer?`/${portal}`:"/me"}/certificates/${p.id}`}>
            <Award className="mr-2 h-4 w-4" />
            {w.certificate}
          </Link></Button>
          {!employer && <Button asChild className="h-auto min-h-11 whitespace-normal py-3"><Link href={`/me/jobs/${p.id}`}>{jobWords[lang].jobs} →</Link></Button>}
          </div>
          <p className="text-xs">{j.certificateId}</p>
          <h3 className="pt-4 font-bold">{w.nextSkills}</h3>
          <p className="text-sm text-muted-foreground">{w.nextNote}</p>
          {j.recommendations.map((c) => (
            <article key={c.id} className="rounded-xl border p-3">
              <a
                className="font-semibold text-primary underline"
                href={c.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                {c.title} ↗
              </a>
              <p className="text-xs text-muted-foreground">{c.provider}</p>
              <div className="mt-2 flex gap-1">
                {[...new Set(c.sdgCodes.map((s) => s.split(".")[0]))].map(
                  (code, index) => (
                    <SdgBadge key={code} code={code} primary={index === 0} />
                  ),
                )}
              </div>
            </article>
          ))}
        </div>
      )}
      {action.isError && <ErrorBox message={w.error} />}
    </section>
  );
}
