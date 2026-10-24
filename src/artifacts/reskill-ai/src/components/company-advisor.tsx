import {useFutureScenario} from "./future-scenario";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MessageCircle, Send, Loader2 } from "lucide-react";
import { customFetch } from "@workspace/api-client-react";
import { enterprisePost, type CompanyAnalysis } from "@/lib/enterprise";
import { useT } from "@/i18n";
import { Markdown, ErrorBox } from "./kit";
import { Button } from "./ui/button";
type Turn = CompanyAnalysis & {
  question: string;
  sources: { label: string; url: string }[];
};
const words = {
  en: {
    title: "Ask about your company's next step",
    note: "Uses this company snapshot and course references. Replies are saved in three languages. Changing the year or team data needs a fresh analysis.",
    placeholder: "What should our team learn first?",
    send: "Send",
    loading: "Checking your team's data and course references…",
    sources: "References",
    questions: [
      "Which skills should we practise first?",
      "Suggest a realistic 90-day learning KPI.",
      "Which courses can help our team use AI?",
    ],
  },
  ms: {
    title: "Tanya langkah seterusnya untuk syarikat",
    note: "Merujuk data syarikat ini dan rujukan kursus. Jawapan disimpan dalam tiga bahasa. Analisis baharu diperlukan jika tahun atau data pasukan berubah.",
    placeholder: "Apa yang pasukan kami patut belajar dahulu?",
    send: "Hantar",
    loading: "Menyemak data pasukan dan rujukan kursus…",
    sources: "Rujukan",
    questions: [
      "Kemahiran apa patut kami latih dahulu?",
      "Cadangkan KPI pembelajaran 90 hari yang realistik.",
      "Kursus apa membantu pasukan kami menggunakan AI?",
    ],
  },
  zh: {
    title: "询问公司的下一步",
    note: "参考本公司的数据快照和课程资料。回答以三种语言保存。更改年份或团队数据后，需要重新分析。",
    placeholder: "我们的团队应该先学什么？",
    send: "发送",
    loading: "正在核对团队数据和课程资料…",
    sources: "参考资料",
    questions: [
      "我们应该先练习哪些技能？",
      "建议一个切实可行的90天学习KPI。",
      "哪些课程能帮助团队使用AI？",
    ],
  },
};
const institutionCopy = {
  en: {
    ...words.en,
    title: "Ask about your institution's next step",
    note: "Uses this institution's learning snapshot and synthetic graduate reference data, not measured employment results. Replies are saved in three languages.",
    placeholder: "How can we improve graduate readiness?",
    loading: "Checking student learning and reference courses…",
    questions: [
      "Which skills should students practise first?",
      "Suggest a realistic graduate-readiness KPI.",
      "How do required and personalised courses work together?",
    ],
  },
  ms: {
    ...words.ms,
    title: "Tanya langkah seterusnya untuk institusi",
    note: "Merujuk snapshot pembelajaran institusi dan rujukan graduan sintetik, bukan hasil pekerjaan sebenar. Jawapan disimpan dalam tiga bahasa.",
    placeholder: "Bagaimana meningkatkan kesediaan graduan?",
    loading: "Menyemak pembelajaran pelajar dan rujukan kursus…",
    questions: [
      "Kemahiran apa patut pelajar latih dahulu?",
      "Cadangkan KPI kesediaan graduan yang realistik.",
      "Bagaimana kursus wajib dan peribadi saling melengkapi?",
    ],
  },
  zh: {
    ...words.zh,
    title: "询问机构的下一步",
    note: "使用本机构学习快照和合成毕业生参考数据，并非实测就业结果。回答以三种语言保存。",
    placeholder: "如何提升毕业生就业准备？",
    loading: "正在核对学生学习和课程资料…",
    questions: [
      "学生应该先练习哪些技能？",
      "建议一个切实可行的毕业生准备度KPI。",
      "必修课程如何与个性化课程配合？",
    ],
  },
};
export function CompanyAdvisor({
  analysis,
  years,
  institution = false,
}: {
  analysis: CompanyAnalysis;
  years: number;
  institution?: boolean;
}) {
  const { lang } = useT(),
    w = institution ? institutionCopy[lang] : words[lang],
    qc = useQueryClient();
  const [scenario]=useFutureScenario();
  const [question, setQuestion] = useState("");
  const key = ["company-advisor", analysis.id];
  const q = useQuery({
    queryKey: key,
    queryFn: () =>
      customFetch<Turn[]>(
        `/api/enterprise/future/chat?analysisId=${analysis.id}`,
      ),
    retry: false,
  });
  const send = useMutation({
    mutationFn: (text: string) =>
      enterprisePost<Turn>("future/chat", {
        analysisId: analysis.id,
        years, scenario,
        question: text,
        parentId: q.data?.at(-1)?.id ?? null,
      }),
    onSuccess: (turn, sent) => {
      qc.setQueryData<Turn[]>(key, (old) => [
        ...(old ?? []).filter((t) => t.id !== turn.id),
        turn,
      ]);
      setQuestion((current) => (current.trim() === sent ? "" : current));
    },
  });
  return (
    <section className="mt-6 border-t pt-5" aria-label={w.title}>
      <h3 className="flex items-center gap-2 font-bold">
        <MessageCircle className="h-5 w-5 text-primary" />
        {w.title}
      </h3>
      <p className="mt-2 text-xs text-muted-foreground">{w.note}</p>
      {q.isError && <ErrorBox error={q.error} retry={() => q.refetch()} />}
      <div className="my-4 flex flex-wrap gap-2">
        {w.questions.map((text) => (
          <button
            type="button"
            key={text}
            disabled={send.isPending || q.isPending || q.isError}
            onClick={() => setQuestion(text)}
            className="min-h-11 rounded-xl border bg-primary/5 px-3 py-2 text-left text-xs font-semibold text-primary hover:bg-primary/10"
          >
            {text}
          </button>
        ))}
      </div>
      <ol className="max-h-[32rem] space-y-4 overflow-y-auto overscroll-contain pr-1">
        {q.data?.map((turn) => (
          <li key={turn.id} className="space-y-2">
            <p className="ml-6 break-words rounded-2xl bg-primary/10 p-3 text-sm font-semibold">
              {turn.question}
            </p>
            <div className="mr-2 rounded-2xl border bg-background p-4 text-sm">
              <Markdown>{turn.translations[lang]}</Markdown>
              <details className="mt-3 text-xs">
                <summary className="cursor-pointer">{w.sources}</summary>
                <ul className="mt-2 space-y-2">
                  {turn.sources.map((s) => (
                    <li key={s.url}>
                      <a
                        className="break-words text-primary underline"
                        href={s.url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {s.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </details>
            </div>
          </li>
        ))}
      </ol>
      <form
        className="mt-4 space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (question.trim().length >= 2 && !send.isPending)
            send.mutate(question.trim());
        }}
      >
        <label className="sr-only" htmlFor="company-question">
          {w.placeholder}
        </label>
        <textarea
          id="company-question"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          maxLength={1200}
          rows={3}
          placeholder={w.placeholder}
          className="w-full resize-y rounded-xl border bg-background p-3 text-sm focus:outline-primary"
        />
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-muted-foreground">
            {question.length}/1200
          </span>
          <Button
            type="submit"
            disabled={
              question.trim().length < 2 ||
              send.isPending ||
              q.isPending ||
              q.isError
            }
          >
            {send.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            {w.send}
          </Button>
        </div>
      </form>
      {send.isPending && (
        <p className="mt-3 animate-pulse text-xs" role="status">
          {w.loading}
        </p>
      )}
      {send.isError && <ErrorBox error={send.error} />}
    </section>
  );
}
