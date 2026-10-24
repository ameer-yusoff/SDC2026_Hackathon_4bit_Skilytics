import {
  skillPersonalNote,
  sdgWorkBenefit,
  type SkillContext,
} from "@/lib/sdg-applications";
import { skillSdgLinks } from "../../../api-server/src/lib/skill-sdg";
import { useT } from "@/i18n";
import { skillLabel } from "@/lib/skill-label";
export function SkillSdg({
  name,
  subject,
  status,
}: { name: string } & SkillContext) {
  const { lang } = useT();
  const links = skillSdgLinks(name);
  const personal = skillPersonalNote(name, { subject, status }, lang);
  const benefit = sdgWorkBenefit(name, [], lang);
  const w = {
    en: [
      "Why this skill connects",
      "Skill → work topic → SDG target",
      "Thematic link, not measured impact.",
      "Workplace-context link",
      "Skill-topic link",
    ],
    ms: [
      "Mengapa kemahiran ini berkait",
      "Kemahiran → topik kerja → sasaran SDG",
      "Kaitan bertema, bukan impak diukur.",
      "Kaitan melalui kegunaan kerja",
      "Kaitan melalui topik kemahiran",
    ],
    zh: [
      "为什么这项技能有关联",
      "技能 → 工作主题 → SDG目标",
      "主题关联，并非实测影响。",
      "通过工作用途关联",
      "通过技能主题关联",
    ],
  }[lang];
  return (
    <details
      className="mt-3 rounded-lg border border-current/10 p-2 text-xs"
      data-testid="skill-sdg"
    >
      <summary
        aria-label={`${skillLabel(name, lang)} · ${w[0]}`}
        title={`${skillLabel(name, lang)} · ${w[0]}`}
        className="flex min-h-11 cursor-pointer list-none items-center gap-2"
      >
        <span className="min-w-0 flex-1 break-words text-sm font-semibold">{skillLabel(name, lang)}</span>
        <span className="flex shrink-0 gap-1">
          {links.map((l) => (
            <img
              key={l.code}
              src={`/sdg/${l.code}.png`}
              alt=""
              aria-hidden="true"
              loading="lazy"
              width={32}
              height={32}
              className="h-8 w-8 rounded-none object-contain"
            />
          ))}
        </span>
        <span className="sr-only">{w[0]}</span>
        <span className="shrink-0" aria-hidden>⌄</span>
      </summary>
      <div className="my-2 space-y-2 rounded-lg bg-background/60 p-3 leading-relaxed">
        <p>{personal.example}</p>
        {personal.status && <p className="font-medium">{personal.status}</p>}
      </div>
      <p className="mt-2 text-[10px] text-muted-foreground">{w[1]}</p>
      {links.map((l) => (
        <div key={l.code} className="mt-2">
          <b>{skillLabel(name, lang)}</b>
          <p>
            → {l.topic[lang]} → {l.target}
          </p>
          <p className="mt-2">
            {(l.code === "8" || l.code === "9") && benefit
              ? benefit
              : l.reason[lang]}
          </p>
          <a
            className="mt-2 inline-flex min-h-11 items-center underline"
            href={l.sourceUrl}
            target="_blank"
            rel="noreferrer"
          >
            {l.basis === "topic" ? w[4] : w[3]} · {l.target}
          </a>
        </div>
      ))}
      <p className="text-muted-foreground">{w[2]}</p>
    </details>
  );
}
