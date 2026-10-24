import { FutureScenarioChoice } from "./future-scenario";
import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useT } from "@/i18n";

export function ChangingValue({
  value,
  children,
  className = "",
}: {
  value: string | number | null;
  children?: ReactNode;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const previous = useRef(value);
  const changed = previous.current !== value;
  useEffect(() => {
    previous.current = value;
  }, [value]);
  return (
    <motion.span
      key={String(value)}
      data-changing-value={value ?? "unknown"}
      className={`inline-flex items-baseline rounded-lg px-1 tabular-nums ${className}`}
      initial={
        changed
          ? {
              backgroundColor: "rgba(213,158,35,0.3)",
              ...(reduce ? {} : { y: 3, scale: 1.04 }),
            }
          : false
      }
      animate={{ backgroundColor: "rgba(213,158,35,0)", y: 0, scale: 1 }}
      transition={{ duration: reduce ? 0 : 0.65 }}
    >
      {children ?? value ?? "—"}
    </motion.span>
  );
}
const words = {
  en: { target: "Scenario for", years: "years ahead", year: "year ahead" },
  ms: {
    target: "Senario untuk",
    years: "tahun ke hadapan",
    year: "tahun ke hadapan",
  },
  zh: { target: "情景年份", years: "年后", year: "年后" },
};
export function HorizonSlider({
  id,
  years,
  onChange,
  baseYear = new Date().getFullYear(),
  label,
}: {
  id: string;
  years: number;
  onChange: (n: number) => void;
  baseYear?: number;
  label: string;
}) {
  const { lang } = useT(),
    w = words[lang];
  return (
    <div><FutureScenarioChoice graduate={id==="graduate-years"}/><div className="mb-4 rounded-2xl border border-primary/15 bg-primary/5 p-4">
      <label
        htmlFor={id}
        className="flex flex-wrap items-center justify-between gap-3 text-sm font-semibold"
      >
        <span>{label}</span>
        <output
          htmlFor={id}
          aria-live="polite"
          className="rounded-xl bg-primary px-3 py-2 text-primary-foreground"
        >
          <span className="block text-[10px] font-medium opacity-80">
            {w.target}
          </span>
          <ChangingValue
            value={baseYear + years}
            className="text-2xl font-extrabold"
          >
            {baseYear + years}
          </ChangingValue>
          <span className="ml-2 text-xs">
            +{years} {years === 1 ? w.year : w.years}
          </span>
        </output>
      </label>
      <input
        id={id}
        data-testid={id === "market-years" ? "market-year-slider" : id}
        type="range"
        min={1}
        max={10}
        step={1}
        value={years}
        aria-valuetext={`${baseYear + years}, +${years}`}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-3 h-8 w-full cursor-pointer accent-primary"
      />
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{baseYear + 1}</span>
        <span>{baseYear + 10}</span>
      </div>
    </div></div>
  );
}
