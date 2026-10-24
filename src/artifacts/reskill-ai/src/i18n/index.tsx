import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { en, type DictKey } from "./en";
import { ms } from "./ms";
import { zh } from "./zh";

export type Lang = "en" | "ms" | "zh";
export type { DictKey };
const DICTS: Record<Lang, Record<DictKey, string>> = { en, ms, zh };
export const LANGS: Lang[] = ["en", "ms", "zh"];
export const LANG_SHORT: Record<Lang, string> = { en: "EN", ms: "BM", zh: "中文" };
export const LANG_NAME: Record<Lang, string> = { en: "English", ms: "Bahasa Melayu", zh: "简体中文" };
export const LOCALE: Record<Lang, string> = { en: "en-MY", ms: "ms-MY", zh: "zh-Hans-MY" };
const HTML_LANG: Record<Lang, string> = { en: "en", ms: "ms", zh: "zh-Hans" };
const KEY = "skilytics.lang";

type Vars = Record<string, string | number>;
const fill = (s: string, v?: Vars) => (v ? s.replace(/\{(\w+)\}/g, (m, k: string) => (v[k] !== undefined ? String(v[k]) : m)) : s);

interface Ctx {
  lang: Lang;
  setLang: (l: Lang) => void;
  cycle: () => void;
  t: (k: DictKey, v?: Vars) => string;
  tk: (prefix: string, value: string | null | undefined, v?: Vars) => string;
}
const LangCtx = createContext<Ctx | null>(null);

function initial(): Lang {
  const s = localStorage.getItem(KEY);
  return s === "ms" || s === "zh" || s === "en" ? s : "en";
}

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initial);
  useEffect(() => {
    localStorage.setItem(KEY, lang);
    document.documentElement.lang = HTML_LANG[lang];
    // The app owns EN/MS/ZH translations. Browser rewriting corrupts identifiers
    // such as RIASEC "I" and can leave React-managed labels out of sync.
    document.documentElement.translate = false;
    document.documentElement.classList.add("notranslate");
  }, [lang]);
  const setLang = useCallback((l: Lang) => setLangState(l), []);
  const cycle = useCallback(() => setLangState((l) => LANGS[(LANGS.indexOf(l) + 1) % LANGS.length]), []);
  const value = useMemo<Ctx>(() => {
    const d = DICTS[lang] as Record<string, string>;
    return {
      lang, setLang, cycle,
      t: (k, v) => fill(d[k] ?? (en as Record<string, string>)[k] ?? k, v),
      tk: (prefix, value, v) => {
        if (value == null) return "-";
        const k = `${prefix}.${value}`;
        return fill(d[k] ?? (en as Record<string, string>)[k] ?? value, v);
      },
    };
  }, [lang, setLang, cycle]);
  return <LangCtx.Provider value={value}>{children}</LangCtx.Provider>;
}

export function useOptionalT() { return useContext(LangCtx); }

export function useT() {
  const c = useContext(LangCtx);
  if (!c) throw new Error("useT outside LangProvider");
  return c;
}

export function errCode(e: unknown): string | undefined {
  const d = (e as { data?: unknown } | null)?.data;
  if (d && typeof d === "object" && typeof (d as { error?: unknown }).error === "string") return (d as { error: string }).error;
  return undefined;
}
export function errStatus(e: unknown): number | undefined {
  return (e as { status?: number } | null)?.status;
}

export function useErrText() {
  const { t, tk } = useT();
  return (e: unknown) => {
    const code = errCode(e);
    if (!code) {
      if (e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError")) return t("err.timeout");
      if (e instanceof TypeError) return t("err.network");
      const st = errStatus(e);
      if (st === 404) return t("err.not_found");
      if (st && st >= 500) return t("err.server_error");
      return t("err.generic");
    }
    const msg = tk("err", code);
    const base = msg === code ? t("err.generic") : msg;
    const detail = (e as { data?: { detail?: unknown } }).data?.detail;
    return code === "cv_unreadable" && typeof detail === "string" ? `${base} (${detail})` : base;
  };
}
