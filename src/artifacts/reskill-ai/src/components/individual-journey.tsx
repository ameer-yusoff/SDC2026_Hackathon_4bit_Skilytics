import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChangingValue } from "./projection-feedback";
import { SkillSdg } from "./skill-sdg";
import {
  RoleTrendEvidence,
  MatcherTrends,
  useMarketSignals,
} from "./matcher-trends";
import { useFutureScenario } from "./future-scenario";
import { futurePriority } from "../../../api-server/src/lib/future-scenarios";
import {
  SdgChoice,
  SdgExplanation,
  SdgContribution,
  CatalogueGuard,
  SdgReason,
} from "./sdg-choice";
import { byGoal, roleGoals } from "@/lib/sdg-choice";
import bls from "../../../api-server/src/data/bls-projections.json";
import { useErrText } from "@/i18n";
import { StudyCalendar } from "./study-calendar";
import {
  isAiWorkplaceCourse,
  studyColors,
  studyWords,
} from "@/lib/study-calendar";
import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetProfileMatches,
  useGetProfilePlan,
  useCreateProfilePlan,
  useUpdateProfile,
  useListRoles,
  runProfileAgent,
  getGetProfileQueryKey,
  getGetProfileMatchesQueryKey,
  getGetProfilePlanQueryKey,
  type Profile,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ErrorBox, Rows, SdgBadge, Markdown } from "@/components/kit";
import { useT } from "@/i18n";
import { roleTitle } from "@/lib/fmt";
import { learningWords } from "@/i18n/learning";
import {
  useLearningAction,
  datedLearning,
  learningCalendar,
} from "@/lib/learning";
import { ChevronDown, MapPin } from "lucide-react";
import {
  AiExposure,
  RoleGoals,
  MatcherSkillMap,
  matcherWords,
} from "./matcher-skill-map";

const words = {
  en: {
    title: "Your closest career paths",
    note: "Start with what you already know. Interests help us choose work you may enjoy.",
    top: "Your top 3",
    others: "More options",
    have: "Skills you bring",
    gap: "Skills to learn",
    choose: "Choose this path",
    map: "Your skill map",
    known: "Already in your profile",
    learn: "Next to learn",
    empty: "No skill requirements are published for this role yet.",
    hours: "Study hours each week",
    budget: "Training investment (RM)",
    start: "Suggested start date",
    tailor: "Update my timeline",
    calendar: "Add to calendar",
    download: "Download full calendar (.ics)",
    loading: "Building your learning story…",
    dates: "Suggested dates",
    unknown: "Check course duration with the provider",
    more: "Why this plan?",
    uncovered: "Still to explore",
    noPlan: "Choose a career path to begin.",
    fail: "Could not update your plan. Please try again.",
    invalid: "Use 1–60 hours per week and a budget of RM 0 or more.",
    estimated:
      "Suggestions, not proof of ability. Course prices and availability can change.",
    noCourses:
      "No matching courses fit your current budget. Try increasing your budget or explore the catalogue.",
    interest: "Interest fit",
    inferred: "Experience-based suggestions count less than confirmed skills.",
  },
  ms: {
    title: "Laluan kerjaya terdekat anda",
    note: "Mulakan dengan apa yang anda sudah tahu. Minat membantu memilih kerja yang mungkin anda sukai.",
    top: "3 pilihan terbaik",
    others: "Pilihan lain",
    have: "Kemahiran sedia ada",
    gap: "Kemahiran untuk dipelajari",
    choose: "Pilih laluan ini",
    map: "Peta kemahiran anda",
    known: "Sudah dalam profil",
    learn: "Untuk dipelajari",
    empty: "Keperluan kemahiran peranan ini belum diterbitkan.",
    hours: "Jam belajar seminggu",
    budget: "Pelaburan latihan (RM)",
    start: "Tarikh mula cadangan",
    tailor: "Kemas kini garis masa",
    calendar: "Tambah ke kalendar",
    download: "Muat turun kalendar penuh (.ics)",
    loading: "Menyusun kisah pembelajaran anda…",
    dates: "Tarikh cadangan",
    unknown: "Semak tempoh kursus dengan penyedia",
    more: "Mengapa pelan ini?",
    uncovered: "Masih perlu diterokai",
    noPlan: "Pilih laluan kerjaya untuk bermula.",
    fail: "Pelan tidak dapat dikemas kini. Sila cuba lagi.",
    invalid: "Gunakan 1–60 jam seminggu dan bajet RM 0 atau lebih.",
    estimated:
      "Cadangan, bukan bukti kebolehan. Harga dan ketersediaan kursus boleh berubah.",
    noCourses:
      "Tiada kursus sepadan dalam bajet semasa. Cuba tambah bajet atau terokai katalog.",
    interest: "Padanan minat",
    inferred:
      "Cadangan berdasarkan pengalaman diberi nilai lebih rendah daripada kemahiran disahkan.",
  },
  zh: {
    title: "最接近你的职业道路",
    note: "从已有能力出发，再用兴趣寻找你可能喜欢的工作。",
    top: "前三名推荐",
    others: "更多选择",
    have: "已有技能",
    gap: "待学技能",
    choose: "选择这条道路",
    map: "你的技能地图",
    known: "已在资料中",
    learn: "接下来学习",
    empty: "此职位尚未公布技能要求。",
    hours: "每周学习时数",
    budget: "培训投入（RM）",
    start: "建议开始日期",
    tailor: "更新学习时间线",
    calendar: "添加到日历",
    download: "下载完整日历（.ics）",
    loading: "正在编排你的学习故事…",
    dates: "建议日期",
    unknown: "请向课程机构确认时长",
    more: "为什么推荐这个计划？",
    uncovered: "仍需探索",
    noPlan: "选择职业道路即可开始。",
    fail: "无法更新计划，请重试。",
    invalid: "每周请输入 1–60 小时，预算至少为 RM 0。",
    estimated: "这些是建议，不是能力证明。价格和课程供应可能变化。",
    noCourses: "当前预算内没有匹配课程。可增加预算或探索课程目录。",
    interest: "兴趣匹配",
    inferred: "根据经历推测的技能权重低于已确认技能。",
  },
};

export function IndividualMatcher({ p, base }: { p: Profile; base: string }) {
  const { lang, tk } = useT();
  const w = words[lang];
  const [, nav] = useLocation();
  const qc = useQueryClient();
  const matches = useGetProfileMatches(p.id);
  const update = useUpdateProfile();
  const createPlan = useCreateProfilePlan();
  const reduceMotion = useReducedMotion();
  const [search, setSearch] = useState("");
  const [limit, setLimit] = useState(20);
  const [selected, setSelected] = useState<number | null>(null);
  const [error, setError] = useState("");
  const errorText = useErrText();
  const [goal, setGoal] = useState("all");
  const [order, setOrder] = useState("future");
  const [years, setYears] = useState(3);
  const [scenario] = useFutureScenario();
  const signals = useMarketSignals();
  const priority = (x: { score: number; role: { id: number } }) =>
    futurePriority(
      x.score,
      signals.data?.references.find((r) => r.roleId === x.role.id),
      years,
      scenario,
    );
  const available = matches.data ?? [];
  const goals = [...new Set(available.flatMap((x) => roleGoals(x.role)))].sort(
    (a, b) => Number(a) - Number(b),
  );
  const roles = byGoal(available, goal, (x) => x.role).sort((a, b) =>
    order === "future"
      ? priority(b) - priority(a) || b.score - a.score
      : order === "growth"
        ? (bls.rows.find((r) => r.socCode === b.role.socCode)?.growthPct ??
            -Infinity) -
            (bls.rows.find((r) => r.socCode === a.role.socCode)?.growthPct ??
              -Infinity) || b.score - a.score
        : b.score - a.score,
  );

  const otherRoles = roles
    .slice(3)
    .filter((x) =>
      roleTitle(x.role, lang).toLowerCase().includes(search.toLowerCase()),
    );
  const chosen = roles.find((x) => x.role.id === selected) ?? roles[0];
  if (matches.isLoading) return <Rows n={3} />;
  if (matches.isError)
    return <ErrorBox error={matches.error} retry={() => matches.refetch()} />;
  const choose = async (id: number) => {
    setError("");
    try {
      const profile = await update.mutateAsync({
        id: p.id,
        data: { targetRoleId: id },
      });
      qc.setQueryData(getGetProfileQueryKey(p.id), profile);
      const plan = await createPlan.mutateAsync({
        id: p.id,
        data: {
          roleId: id,
          ...{ futureScenario: scenario, futureYears: years },
          ...(goal !== "all" ? { sdgGoal: goal } : {}),
        },
      });
      qc.setQueryData(getGetProfilePlanQueryKey(p.id), plan);
      await qc.invalidateQueries({ queryKey: ["learning", p.id] });
      nav(`${base}/${p.id}/pathway`);
    } catch (err) {
      setError(errorText(err));
    }
  };
  return (
    <div className="min-w-0 space-y-6" data-testid="individual-matcher">
      <header>
        <h2 className="text-2xl font-bold">{w.title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{w.note}</p>
      </header>
      <section
        className="space-y-4 rounded-2xl border bg-card/70 p-4 sm:p-5"
        aria-label={
          lang === "ms"
            ? "Pilihan cadangan"
            : lang === "zh"
              ? "推荐设置"
              : "Recommendation settings"
        }
      >
        <label className="flex flex-col gap-2 text-sm font-semibold sm:flex-row sm:items-center sm:justify-between">
          {lang === "ms"
            ? "Susun pilihan"
            : lang === "zh"
              ? "排序方式"
              : "Order choices"}
          <select
            data-testid="matcher-order"
            className="min-h-11 w-full min-w-0 rounded-xl border bg-card px-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:w-auto sm:max-w-[65%]"
            value={order}
            onChange={(e) => {
              setOrder(e.target.value);
              setSelected(null);
              setLimit(20);
            }}
          >
            <option value="future">
              {lang === "ms"
                ? "Keutamaan masa depan"
                : lang === "zh"
                  ? "未来优先级"
                  : "Future priority"}
            </option>
            <option value="fit">
              {lang === "ms"
                ? "Padanan peribadi"
                : lang === "zh"
                  ? "个人匹配"
                  : "Personal fit"}
            </option>
            <option value="growth">
              {lang === "ms"
                ? "Pertumbuhan pekerjaan (rujukan AS)"
                : lang === "zh"
                  ? "就业增长（美国参考）"
                  : "Job growth (US reference)"}
            </option>
          </select>
        </label>
        <SdgChoice
          goals={goals}
          value={goal}
          onChange={(g) => {
            setGoal(g);
            setSelected(null);
            setLimit(20);
          }}
        />
        <AnimatePresence initial={false}>
          {order === "future" && (
            <motion.div
              key="future-controls"
              data-testid="matcher-future-controls"
              initial={{ opacity: 0, height: reduceMotion ? "auto" : 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: reduceMotion ? "auto" : 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.22 }}
              className="overflow-hidden"
            >
              <MatcherTrends years={years} setYears={setYears} />
            </motion.div>
          )}
        </AnimatePresence>
        {order === "growth" && (
          <p className="text-xs text-muted-foreground">
            <a
              href={bls.url}
              target="_blank"
              rel="noreferrer"
              className="underline"
            >
              {bls.source} · {bls.period}
            </a>{" "}
            · {bls.reviewedAt}.{" "}
            {lang === "ms"
              ? "Skor padanan peribadi kekal sama. Bukan ramalan Malaysia; pekerjaan khusus menggunakan rujukan SOC yang lebih luas."
              : lang === "zh"
                ? "个人匹配分数不变。并非马来西亚预测；细分职位采用较宽泛的SOC参考。"
                : "Personal fit scores stay the same. Not a Malaysian forecast; specialisations use broader SOC references."}
          </p>
        )}
      </section>
      <CatalogueGuard />
      {!roles.length && (
        <p role="status">
          {lang === "ms"
            ? "Tiada kerjaya untuk tema ini."
            : lang === "zh"
              ? "此主题暂无匹配职业。"
              : "No careers match this theme."}
        </p>
      )}
      {roles.length > 0 && <h3 className="text-xl font-bold">{w.top}</h3>}
      <div className="grid items-stretch gap-3 md:grid-cols-3">
        {roles.slice(0, 3).map((x, i) => (
          <motion.article
            layout={reduceMotion ? false : "position"}
            initial={{ opacity: 0, y: reduceMotion ? 0 : 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.25 }}
            whileHover={reduceMotion ? undefined : { y: -4 }}
            key={x.role.id}
            className={`relative flex flex-col rounded-2xl border p-5 motion-safe:transition-[box-shadow,border-color] motion-safe:duration-300 hover:shadow-lg ${chosen?.role.id === x.role.id ? "ring-2 ring-primary ring-offset-2 shadow-md" : ""} ${i === 0 ? "border-accent bg-[hsl(var(--gold-soft))] md:order-2" : i === 1 ? "border-border bg-card md:mt-8 md:order-1" : "border-border bg-card md:mt-14 md:order-3"}`}
          >
            <span className="text-3xl font-black text-accent">#{i + 1}</span>
            <h3 className="mt-2 text-lg font-bold">
              {roleTitle(x.role, lang)}
            </h3>
            <p className="text-xs text-muted-foreground">
              {tk("sector", x.role.sector)}
            </p>
            {order === "future" && (
              <p className="my-2 rounded-xl bg-primary/10 p-2 text-xs">
                <ChangingValue value={priority(x)} className="font-bold" /> /100
                ·{" "}
                {lang === "ms"
                  ? "Keutamaan masa depan"
                  : lang === "zh"
                    ? "未来优先级"
                    : "Future priority"}
                <br />
                {lang === "ms"
                  ? "Kedudukan padanan asal"
                  : lang === "zh"
                    ? "原个人匹配排名"
                    : "Original fit rank"}
                : #
                {[...available]
                  .sort((a, b) => b.score - a.score)
                  .findIndex((a) => a.role.id === x.role.id) + 1}
              </p>
            )}
            <div className="my-3 grid grid-cols-2 gap-2 rounded-xl bg-background/60 p-3 text-xs sm:text-sm">
              <span>
                {w.have}: <b>{x.matchedSkills.length}</b>
              </span>
              <span>
                {w.gap}: <b>{x.gapSkills.length}</b>
              </span>
            </div>
            <p className="inline-flex rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
              {w.interest}: {Math.round((x.breakdown.interest / 20) * 100)}%
            </p>
            <p className="mt-2 text-sm font-bold">
              {lang === "ms" ? "Padanan" : lang === "zh" ? "匹配" : "Fit"}:{" "}
              {x.score}%
            </p>
            {order === "future" && (
              <RoleTrendEvidence
                roleId={x.role.id}
                fit={x.score}
                years={years}
              />
            )}
            <SdgReason
              role={x.role}
              matchedSkills={x.matchedSkills
                .filter((s) =>
                  p.skills.some(
                    (k) => k.skillId === s.skillId && k.status !== "inferred",
                  ),
                )
                .map((s) => s.name)}
              missingSkills={x.gapSkills.map((s) => s.name)}
            />
            {order === "growth" && (
              <p className="mt-2 text-xs">
                BLS {bls.period}:{" "}
                {bls.rows.find((r) => r.socCode === x.role.socCode)
                  ?.growthPct ?? "—"}
                %
              </p>
            )}
            <a
              className="mt-2 text-xs underline"
              href={x.role.sourceUrl ?? "https://www.onetonline.org/"}
              target="_blank"
              rel="noreferrer"
            >
              O*NET · {x.role.sourceVersion} ·{" "}
              {x.role.sourceFetchedAt?.slice(0, 10) ?? "—"}
            </a>
            <AiExposure role={x.role} />
            <div className="my-3 flex gap-1">
              <RoleGoals role={x.role} />
            </div>
            <div className="mt-auto space-y-3 pt-2">
              <button
                aria-pressed={chosen?.role.id === x.role.id}
                className={
                  "flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border-2 px-3 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 motion-safe:active:scale-[0.98] " +
                  (chosen?.role.id === x.role.id
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-primary/40 bg-primary/10 text-primary hover:bg-primary/20")
                }
                onClick={() => setSelected(x.role.id)}
              >
                <MapPin className="h-4 w-4" /> {w.map}
                {chosen?.role.id === x.role.id && (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>
              <Button
                className="min-h-11 w-full"
                disabled={update.isPending || createPlan.isPending}
                onClick={() => choose(x.role.id)}
              >
                {w.choose}
              </Button>
            </div>
          </motion.article>
        ))}
      </div>
      {error && <p role="alert">{error}</p>}
      <p className="text-xs text-muted-foreground">
        {matcherWords[lang].exposureNote} {matcherWords[lang].sdg}
      </p>
      <AnimatePresence mode="wait" initial={false}>
        {chosen &&
          roles.slice(0, 3).some((x) => x.role.id === chosen.role.id) && (
            <motion.div
              key={chosen.role.id}
              initial={{ opacity: 0, y: reduceMotion ? 0 : 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.16 }}
            >
              <MatcherSkillMap
                match={chosen}
                p={p}
                rank={roles.indexOf(chosen) + 1}
              />
            </motion.div>
          )}
      </AnimatePresence>
      {roles.length > 3 && (
        <section>
          <h3 className="mb-3 font-bold">{w.others}</h3>
          <Input
            className="mb-3"
            aria-label={w.others}
            placeholder={
              lang === "ms"
                ? "Cari pekerjaan"
                : lang === "zh"
                  ? "搜索职位"
                  : "Search careers"
            }
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setLimit(20);
            }}
          />
          <div className="space-y-2">
            {otherRoles.length === 0 && (
              <p
                role="status"
                className="rounded-xl bg-muted/40 p-4 text-sm text-muted-foreground"
              >
                {lang === "ms"
                  ? "Tiada pilihan sepadan. Cuba carian lain."
                  : lang === "zh"
                    ? "没有匹配的选择，请换个关键词。"
                    : "No matching options. Try another search."}
              </p>
            )}
            {otherRoles.slice(0, limit).map((x) => (
              <motion.div
                layout={reduceMotion ? false : "position"}
                initial={{ opacity: 0, y: reduceMotion ? 0 : 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: reduceMotion ? 0 : 0.2 }}
                key={x.role.id}
                className="overflow-hidden rounded-2xl border bg-card motion-safe:transition-shadow hover:shadow-md"
              >
                <div className="grid min-w-0 grid-cols-2 items-center gap-3 p-4 lg:grid-cols-[minmax(0,1fr)_10rem_auto_auto]">
                  <button
                    className="col-span-2 flex min-h-11 min-w-0 items-center gap-3 rounded-lg text-left font-semibold hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary lg:col-span-1"
                    aria-expanded={selected === x.role.id}
                    aria-controls={"role-map-" + x.role.id}
                    onClick={() =>
                      setSelected(selected === x.role.id ? null : x.role.id)
                    }
                  >
                    <ChevronDown
                      className={
                        "h-5 w-5 shrink-0 transition-transform " +
                        (selected === x.role.id
                          ? "rotate-180 text-primary"
                          : "")
                      }
                    />
                    <span>
                      {roleTitle(x.role, lang)}
                      <span className="mt-1 block text-xs font-normal text-muted-foreground">
                        {w.have}: {x.matchedSkills.length} · {w.gap}:{" "}
                        {x.gapSkills.length}
                      </span>
                    </span>
                  </button>
                  <div className="min-w-0 [&>div]:min-w-0">
                    <AiExposure role={x.role} />
                  </div>
                  <div>
                    <RoleGoals role={x.role} />
                    {order === "future" && (
                      <p className="mt-2 text-xs font-bold text-primary">
                        {lang === "ms"
                          ? "Keutamaan"
                          : lang === "zh"
                            ? "优先级"
                            : "Priority"}
                        : {priority(x)}
                      </p>
                    )}
                  </div>
                  <Button
                    className="col-span-2 min-h-11 w-full lg:col-span-1 lg:w-auto"
                    variant="outline"
                    disabled={update.isPending || createPlan.isPending}
                    onClick={() => choose(x.role.id)}
                  >
                    {w.choose}
                  </Button>
                </div>
                <AnimatePresence initial={false}>
                  {selected === x.role.id && (
                    <motion.div
                      key="map"
                      id={"role-map-" + x.role.id}
                      initial={{
                        height: reduceMotion ? "auto" : 0,
                        opacity: 0,
                      }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: reduceMotion ? "auto" : 0, opacity: 0 }}
                      transition={{ duration: reduceMotion ? 0 : 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="p-3 pt-0">
                        <MatcherSkillMap
                          match={x}
                          p={p}
                          rank={roles.indexOf(x) + 1}
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
          {otherRoles.length > limit && (
            <Button variant="ghost" onClick={() => setLimit((n) => n + 20)}>
              {lang === "ms"
                ? "Lihat lagi"
                : lang === "zh"
                  ? "查看更多"
                  : "Show more"}
            </Button>
          )}
        </section>
      )}
    </div>
  );
}

function day(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function IndividualPathway({ p, base }: { p: Profile; base: string }) {
  const { lang } = useT();
  const errorText = useErrText();
  const lw = learningWords[lang];
  const sw = studyWords[lang];
  const roleList = useListRoles();
  const [selectedCourse, setSelectedCourse] = useState<number | null>(null);
  const [, navigate] = useLocation();
  const activate = useLearningAction(p.id);
  const [estimates, setEstimates] = useState<Record<string, number>>({});
  const [calendarTarget, setCalendarTarget] = useState(() =>
    /iPad|iPhone|Macintosh/.test(navigator.userAgent) ? "apple" : "google",
  );
  const w = words[lang];
  const qc = useQueryClient();
  const plan = useGetProfilePlan(p.id, {
    query: { queryKey: getGetProfilePlanQueryKey(p.id), retry: false },
  });

  const create = useCreateProfilePlan();
  const update = useUpdateProfile();
  const [hours, setHours] = useState(String(p.weeklyHours));
  const [budget, setBudget] = useState(String(p.budgetMyr));
  const [start, setStart] = useState(
    () =>
      localStorage.getItem(`skilytics.pathway.start.${p.id}`) ||
      day(new Date()),
  );
  useEffect(() => {
    if (/^\d{4}-\d{2}-\d{2}$/.test(start))
      localStorage.setItem(`skilytics.pathway.start.${p.id}`, start);
  }, [start, p.id]);
  const [error, setError] = useState("");
  const [summary, setSummary] = useState("");
  const attempted = useRef(false);
  const aiKey = useRef("");
  const rebuild = async () => {
    if (!p.targetRoleId) return;
    if (
      !Number.isInteger(+hours) ||
      +hours < 1 ||
      +hours > 60 ||
      !Number.isFinite(+budget) ||
      +budget < 0
    ) {
      setError(w.invalid);
      return;
    }
    setError("");
    try {
      const profile = await update.mutateAsync({
        id: p.id,
        data: { weeklyHours: +hours, budgetMyr: +budget },
      });
      qc.setQueryData(getGetProfileQueryKey(p.id), profile);
      const result = await create.mutateAsync({
        id: p.id,
        data: {
          roleId: p.targetRoleId,
          // Retain the choice confirmed in Matcher when adjusting study time/budget.
          ...(plan.data?.items[0]?.futureScenario ? {
            futureScenario: plan.data.items[0].futureScenario,
            futureYears: plan.data.items[0].futureYears ?? 3,
          } : {}),
          ...(plan.data?.sdgGoal ? { sdgGoal: plan.data.sdgGoal } : {}),
        },
      });
      qc.setQueryData(getGetProfilePlanQueryKey(p.id), result);
      qc.invalidateQueries({ queryKey: getGetProfileMatchesQueryKey(p.id) });
    } catch (err) {
      setError(errorText(err));
    }
  };
  useEffect(() => {
    if (
      !plan.isLoading &&
      p.targetRoleId &&
      !attempted.current &&
      (!plan.data ||
        plan.data.roleId !== p.targetRoleId ||
        plan.data.items.filter(isAiWorkplaceCourse).length < 3)
    ) {
      attempted.current = true;
      void rebuild();
    }
  }, [plan.isLoading, p.targetRoleId, plan.data]);
  useEffect(() => {
    if (
      !plan.data ||
      plan.data.roleId !== p.targetRoleId ||
      plan.data.items.filter(isAiWorkplaceCourse).length < 3
    )
      return;
    const key = `${plan.data.id}:${lang}`;
    if (aiKey.current === key) return;
    aiKey.current = key;
    let live = true;
    setSummary("");
    runProfileAgent(p.id, { agent: "planner", roleId: plan.data.roleId, lang })
      .then((result) => {
        if (live) setSummary(result.content);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [plan.data?.id, lang, p.id, p.targetRoleId]);
  const pl = plan.data;
  const busy = create.isPending || update.isPending;
  const items = pl && pl.roleId === p.targetRoleId ? pl.items : [];
  const dated = datedLearning(items, start, estimates);
  return (
    <div className="space-y-5">
      <form
        className="grid gap-3 rounded-2xl border bg-card p-4 sm:grid-cols-3"
        onSubmit={(e) => {
          e.preventDefault();
          void rebuild();
        }}
      >
        <label className="text-sm">
          {w.hours}
          <Input
            type="number"
            min={1}
            max={60}
            required
            value={hours}
            onChange={(e) => setHours(e.target.value)}
          />
        </label>
        <label className="text-sm">
          {w.budget}
          <Input
            type="number"
            min={0}
            step="any"
            required
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
          />
        </label>
        <label className="text-sm">
          {w.start}
          <Input
            type="date"
            required
            value={start}
            onChange={(e) => setStart(e.target.value)}
          />
        </label>
        <Button disabled={busy || !p.targetRoleId}>{w.tailor}</Button>
      </form>
      {error && <p role="alert">{error}</p>}
      {(plan.isLoading || busy) && <Rows n={3} />}
      {!p.targetRoleId && (
        <Link href={`${base}/${p.id}/matcher`}>{w.noPlan}</Link>
      )}
      {pl && pl.roleId === p.targetRoleId && (
        <>
          <div className="flex flex-wrap justify-between gap-3">
            <h2 className="text-xl font-bold">
              {roleTitle(
                roleList.data?.find((r) => r.id === pl.roleId) ?? {
                  title: pl.roleTitle,
                },
                lang,
              )}
            </h2>
            <span>
              {pl.totalWeeks ?? "—"}{" "}
              {lang === "ms" ? "minggu" : lang === "zh" ? "周" : "weeks"} · RM{" "}
              {pl.totalCostMyr ?? "—"}
            </span>
          </div>
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
            <h3 className="font-bold">
              {sw.ai} · {items.filter(isAiWorkplaceCourse).length} {sw.courses}
            </h3>
            <p className="mt-1 text-sm">{sw.aiNote}</p>
            <p className="mt-1 text-xs text-muted-foreground">{sw.tools}</p>
          </div>
          {pl.sdgGoal && (
            <p className="rounded-xl bg-primary/5 p-3 text-sm font-semibold">
              {
                items.filter((i) =>
                  i.sdgTargets.some((t) => t.code.split(".")[0] === pl.sdgGoal),
                ).length
              }{" "}
              / {items.length} ·{" "}
              {lang === "ms"
                ? "kursus sepadan tema dipilih"
                : lang === "zh"
                  ? "门课程符合所选主题"
                  : "courses match your selected theme"}
            </p>
          )}
          <SdgContribution
            goals={items.flatMap((i) => i.sdgTargets.map((t) => t.code))}
          />
          <CatalogueGuard />

          <StudyCalendar
            courses={dated}
            start={start}
            selected={selectedCourse}
            onSelect={setSelectedCourse}
          />
          <div className="rounded-2xl border-2 border-primary/30 bg-primary/5 p-4">
            <label className="text-sm font-semibold">
              {lw.calendar}
              <select
                className="mt-2 block min-h-11 w-full rounded-lg border bg-card p-2 sm:ml-3 sm:mt-0 sm:inline-block sm:w-auto"
                aria-label={lw.calendar}
                value={calendarTarget}
                onChange={(e) => setCalendarTarget(e.target.value)}
              >
                <option value="google">{lw.google}</option>
                <option value="apple">{lw.apple}</option>
              </select>
            </label>
            <Button
              className="mt-3 block h-auto min-h-12 w-full whitespace-normal px-3 py-3"
              disabled={!items.length || dated.some((i) => !i.deadline)}
              onClick={() =>
                learningCalendar(
                  dated,
                  p.id,
                  pl.roleTitle,
                  calendarTarget === "google",
                )
              }
            >
              {lw.calendar} · {calendarTarget === "google" ? "Google" : "Apple"}
            </Button>
            <p className="mt-2 text-xs text-muted-foreground">
              {lw.calendarNote}
            </p>
          </div>
          {base.startsWith("/tvet") && (
            <div className="flex flex-wrap gap-3 rounded-xl bg-primary/5 p-3 text-sm font-bold">
              <span>
                {lang === "ms"
                  ? "Kursus wajib"
                  : lang === "zh"
                    ? "必修课程"
                    : "Compulsory courses"}
                : {items.filter((i) => i.compulsory).length}
              </span>
              <span>
                {lang === "ms"
                  ? "Kursus peribadi"
                  : lang === "zh"
                    ? "个性化课程"
                    : "Personalised courses"}
                : {items.filter((i) => !i.compulsory).length}
              </span>
            </div>
          )}
          <ol className="space-y-4 border-l-2 border-primary/25 pl-5">
            {items.map((item, index) => {
              const dates = dated[index];
              const color = studyColors[index % studyColors.length];
              const advancing = isAiWorkplaceCourse(item);
              return (
                <li
                  key={`${item.courseId}-${index}`}
                  id={`course-${item.courseId}`}
                  className={`scroll-mt-40 rounded-2xl border border-l-4 bg-card p-4 transition-shadow ${selectedCourse === item.courseId ? "ring-2 ring-primary ring-offset-2" : ""}`}
                  style={{ borderLeftColor: color }}
                >
                  {base.startsWith("/tvet") && (
                    <p className="mb-2 inline-flex rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
                      {item.compulsory
                        ? lang === "ms"
                          ? "Kursus wajib"
                          : lang === "zh"
                            ? "必修课程"
                            : "Compulsory course"
                        : lang === "ms"
                          ? "Kursus peribadi"
                          : lang === "zh"
                            ? "个性化课程"
                            : "Personalised course"}
                    </p>
                  )}
                  {advancing && (
                    <p className="mb-2 text-xs font-bold text-primary">
                      {sw.ai}
                    </p>
                  )}
                  <span className="text-xs font-bold" style={{ color }}>
                    {index + 1}
                  </span>
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="ml-2 font-bold text-primary underline"
                  >
                    {item.title}
                  </a>
                  <p className="mt-2 text-sm">
                    {item.provider} ·{" "}
                    {item.costMyr === 0
                      ? lang === "ms"
                        ? "Percuma"
                        : lang === "zh"
                          ? "免费"
                          : "Free"
                      : `RM ${item.costMyr}`}{" "}
                    ·{" "}
                    {item.durationWeeks == null
                      ? w.unknown
                      : `${item.durationWeeks} ${lang === "ms" ? "minggu" : lang === "zh" ? "周" : "weeks"}`}
                  </p>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-lg bg-muted p-3">
                      <p className="text-muted-foreground">{sw.starts}</p>
                      <p className="mt-1 font-bold">
                        {dates?.startDate
                          ? new Intl.DateTimeFormat(
                              { en: "en-GB", ms: "ms-MY", zh: "zh-CN" }[lang],
                              {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                                timeZone: "UTC",
                              },
                            ).format(new Date(dates.startDate + "T12:00:00Z"))
                          : "—"}
                      </p>
                    </div>
                    <div className="rounded-lg bg-[hsl(var(--gold-soft))] p-3">
                      <p className="text-muted-foreground">{sw.ends}</p>
                      <p className="mt-1 font-bold">
                        {dates?.deadline
                          ? new Intl.DateTimeFormat(
                              { en: "en-GB", ms: "ms-MY", zh: "zh-CN" }[lang],
                              {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                                timeZone: "UTC",
                              },
                            ).format(new Date(dates.deadline + "T12:00:00Z"))
                          : "—"}
                      </p>
                    </div>
                  </div>
                  {item.durationWeeks == null && (
                    <label className="mt-3 block text-sm">
                      {lw.estimate}
                      <Input
                        type="number"
                        min={1}
                        max={520}
                        value={estimates[String(item.courseId)] || ""}
                        onChange={(e) =>
                          setEstimates((v) => ({
                            ...v,
                            [String(item.courseId)]: Number(e.target.value),
                          }))
                        }
                      />
                      <span className="text-xs text-muted-foreground">
                        {lw.estimateNote}
                      </span>
                    </label>
                  )}
                  <div className="my-3 flex flex-wrap gap-1">
                    {item.sdgTargets
                      .filter(
                        (s, i, all) =>
                          all.findIndex(
                            (x) =>
                              x.code.split(".")[0] === s.code.split(".")[0],
                          ) === i,
                      )
                      .map((s, i) => (
                        <SdgBadge
                          key={s.code}
                          code={s.code}
                          primary={i === 0}
                        />
                      ))}
                  </div>
                  <details className="my-3 text-xs">
                    <summary className="min-h-11 cursor-pointer py-3">
                      {lang === "ms"
                        ? "Kemahiran & kaitan SDG"
                        : lang === "zh"
                          ? "技能与SDG关联"
                          : "Skills & SDG links"}
                    </summary>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {item.skills.map((name) => (
                        <SkillSdg key={name} name={name} subject={item.title} />
                      ))}
                    </div>
                  </details>
                  <SdgExplanation
                    goals={item.sdgTargets.map((t) => t.code)}
                    subject={item.title}
                    skills={item.skills}
                    kind="course"
                  />
                </li>
              );
            })}
          </ol>
          {!items.length && <p>{w.noCourses}</p>}
          {pl.uncoveredSkills.length > 0 && (
            <details className="rounded-xl border p-3 text-xs text-muted-foreground">
              <summary className="min-h-11 cursor-pointer font-semibold">
                {w.uncovered} · {pl.uncoveredSkills.length}
              </summary>
              <p>{pl.uncoveredSkills.join(", ")}</p>
            </details>
          )}
          {summary && (
            <details className="rounded-xl border p-4">
              <summary className="cursor-pointer font-semibold">
                {w.more}
              </summary>
              <div className="mt-3 text-sm">
                <Markdown>{summary}</Markdown>
              </div>
            </details>
          )}
          <p className="text-xs text-muted-foreground">{w.estimated}</p>
          <div className="rounded-2xl border bg-card p-5">
            <p className="mb-3 text-sm">{lw.activateNote}</p>
            <Button
              className="h-auto min-h-12 w-full whitespace-normal py-3 text-sm sm:text-base"
              disabled={
                activate.isPending ||
                busy ||
                !items.length ||
                dated.some((i) => !i.deadline)
              }
              onClick={async () => {
                try {
                  await activate.mutateAsync({
                    action: "activate",
                    startDate: start,
                    durationWeeks: estimates,
                  });
                  navigate(
                    `${base}/${p.id}/${base.startsWith("/me") ? "ready" : "intake"}`,
                  );
                } catch {}
              }}
            >
              {lw.activate}
            </Button>
            {!items.length && <p className="mt-2 text-sm">{lw.noCourses}</p>}
            {dated.some((i) => !i.deadline) && (
              <p className="mt-2 text-sm">{lw.dateRequired}</p>
            )}
            {activate.isError && <ErrorBox error={activate.error} />}
          </div>
        </>
      )}
    </div>
  );
}
