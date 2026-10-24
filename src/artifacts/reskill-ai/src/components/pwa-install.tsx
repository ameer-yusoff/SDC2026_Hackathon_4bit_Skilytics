import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Download,
  MoreVertical,
  PlusSquare,
  Share,
  Smartphone,
  X,
} from "lucide-react";
import { useT } from "@/i18n";
import {
  installPlatform,
  type InstallPlatform,
  type InstallPromptEvent,
} from "@/lib/pwa";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";

const copy = {
  en: {
    title: "Keep Skilytics on your phone",
    note: "Add it to your Home Screen for quick access.",
    install: "Install app",
    guide: "How to install",
    later: "Maybe later",
    close: "Close",
    back: "Previous",
    next: "Next",
    done: "Got it",
    step: "Step",
    apple: "iPhone / iPad",
    android: "Android",
    manual:
      "No install option? Open this site in regular Safari or Chrome, outside an in-app browser or private mode.",
    online:
      "AI and live data need internet. You may need to sign in again after installing.",
    ios: [
      ["Open in Safari", "Open Skilytics in Safari on your iPhone or iPad."],
      [
        "Tap Share",
        "Tap the Share icon. If it is hidden, open the More menu first.",
      ],
      [
        "Add to Home Screen",
        "Choose Add to Home Screen. Turn on Open as Web App if shown, then tap Add. Open Skilytics from its new icon.",
      ],
    ],
    androidSteps: [
      ["Open in Chrome", "Open Skilytics in Chrome on your Android phone."],
      [
        "Open the browser menu",
        "Tap ⋮, then Install app or Add to Home screen. If our Install app button is available, you can use it instead.",
      ],
      [
        "Confirm installation",
        "Tap Install or Add in the browser's prompt. Open Skilytics from its new icon.",
      ],
    ],
  },
  ms: {
    title: "Letakkan Skilytics di telefon anda",
    note: "Tambah ke skrin utama untuk akses lebih cepat.",
    install: "Pasang app",
    guide: "Cara memasang",
    later: "Nanti dahulu",
    close: "Tutup",
    back: "Sebelum",
    next: "Seterusnya",
    done: "Faham",
    step: "Langkah",
    apple: "iPhone / iPad",
    android: "Android",
    manual:
      "Tiada pilihan pasang? Buka laman ini dalam Safari atau Chrome biasa, bukan pelayar dalam app atau mod peribadi.",
    online:
      "AI dan data langsung memerlukan internet. Anda mungkin perlu log masuk semula selepas pemasangan.",
    ios: [
      [
        "Buka dalam Safari",
        "Buka Skilytics dalam Safari pada iPhone atau iPad anda.",
      ],
      [
        "Tekan Kongsi",
        "Tekan ikon Kongsi (Share). Jika tidak kelihatan, buka menu Lagi dahulu.",
      ],
      [
        "Tambah ke Skrin Utama",
        "Pilih Add to Home Screen. Aktifkan Open as Web App jika dipaparkan, kemudian tekan Add. Buka Skilytics melalui ikon baharu.",
      ],
    ],
    androidSteps: [
      [
        "Buka dalam Chrome",
        "Buka Skilytics dalam Chrome pada telefon Android anda.",
      ],
      [
        "Buka menu pelayar",
        "Tekan ⋮, kemudian Install app atau Add to Home screen. Anda juga boleh guna butang Pasang app kami jika tersedia.",
      ],
      [
        "Sahkan pemasangan",
        "Tekan Install atau Add pada tetingkap pelayar. Buka Skilytics melalui ikon baharu.",
      ],
    ],
  },
  zh: {
    title: "将 Skilytics 装到手机上",
    note: "添加到主屏幕，打开更方便。",
    install: "安装应用",
    guide: "安装指南",
    later: "稍后再说",
    close: "关闭",
    back: "上一步",
    next: "下一步",
    done: "明白了",
    step: "步骤",
    apple: "iPhone / iPad",
    android: "Android",
    manual:
      "没有安装选项？请用普通 Safari 或 Chrome 打开，不要使用应用内浏览器或隐私模式。",
    online: "AI及实时数据需要网络。安装后可能需要重新登录。",
    ios: [
      ["用 Safari 打开", "在 iPhone 或 iPad 上用 Safari 打开 Skilytics。"],
      ["点按分享", "点按分享图标；如果看不到，先打开更多菜单。"],
      [
        "添加到主屏幕",
        "选择“添加到主屏幕”。如有“作为网页应用打开”，请开启，然后点“添加”。通过新图标打开 Skilytics。",
      ],
    ],
    androidSteps: [
      ["用 Chrome 打开", "在 Android 手机上用 Chrome 打开 Skilytics。"],
      [
        "打开浏览器菜单",
        "点 ⋮，选择“安装应用”或“添加到主屏幕”。如果本页有安装按钮，也可以直接使用。",
      ],
      [
        "确认安装",
        "在浏览器弹窗中点“安装”或“添加”，然后通过新图标打开 Skilytics。",
      ],
    ],
  },
};

const dismissedKey = "skilytics.install-notice-dismissed";
export function PwaInstall() {
  const { lang } = useT();
  const w = copy[lang];
  const [path] = useLocation();
  const [prompt, setPrompt] = useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(
    () =>
      window.matchMedia("(display-mode: standalone)").matches ||
      !!(navigator as Navigator & { standalone?: boolean }).standalone,
  );
  const [compact, setCompact] = useState(() => {
    try {
      return sessionStorage.getItem(dismissedKey) === "yes";
    } catch {
      return false;
    }
  });
  const [open, setOpen] = useState(false);
  const [platform, setPlatform] = useState<InstallPlatform>(() =>
    installPlatform(navigator.userAgent, navigator.maxTouchPoints),
  );
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(display-mode: standalone)");
    const sync = () =>
      setInstalled(
        media.matches ||
          !!(navigator as Navigator & { standalone?: boolean }).standalone,
      );
    const before = (event: Event) => {
      event.preventDefault();
      setPrompt(event as InstallPromptEvent);
    };
    const complete = () => {
      setInstalled(true);
      setPrompt(null);
      setOpen(false);
    };
    sync();
    media.addEventListener("change", sync);
    window.addEventListener("beforeinstallprompt", before);
    window.addEventListener("appinstalled", complete);
    return () => {
      media.removeEventListener("change", sync);
      window.removeEventListener("beforeinstallprompt", before);
      window.removeEventListener("appinstalled", complete);
    };
  }, []);
  const dismiss = () => {
    setCompact(true);
    try {
      sessionStorage.setItem(dismissedKey, "yes");
    } catch {}
  };
  const showGuide = () => {
    setStep(0);
    setOpen(true);
  };
  const install = async () => {
    if (!prompt || platform === "ios") {
      showGuide();
      return;
    }
    setBusy(true);
    setPrompt(null);
    try {
      await prompt.prompt();
      const result = await prompt.userChoice;
      if (result.outcome === "accepted") {
        setInstalled(true);
        setOpen(false);
      } else showGuide();
    } catch {
      showGuide();
    } finally {
      setBusy(false);
    }
  };
  // Promote on home/dashboard screens, without covering onboarding, certificates or a learning timeline.
  const promote = ["/", "/me", "/hr", "/tvet"].includes(path);
  if (installed || !promote) return null;
  const steps = platform === "ios" ? w.ios : w.androidSteps;
  const StepIcon =
    step === 0
      ? Smartphone
      : step === 1
        ? platform === "ios"
          ? Share
          : MoreVertical
        : PlusSquare;
  return (
    <>
      <aside
        data-testid="pwa-install-notice"
        className={`fixed right-3 z-30 max-w-[calc(100%_-_1.5rem)] print:hidden lg:hidden ${path === "/" ? "bottom-[calc(1rem_+_env(safe-area-inset-bottom))]" : "bottom-[calc(5.5rem_+_env(safe-area-inset-bottom))]"}`}
      >
        {compact ? (
          <Button
            className="min-h-11 rounded-full shadow-lg"
            onClick={showGuide}
          >
            <Download className="mr-2 h-4 w-4" aria-hidden="true" />
            {w.install}
          </Button>
        ) : (
          <div className="w-80 max-w-full rounded-2xl border border-primary/20 bg-card p-4 shadow-lg motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2">
            <div className="flex items-start gap-3">
              <img
                src="/pwa/icon-192.png"
                width={44}
                height={44}
                alt=""
                className="h-11 w-11 shrink-0"
              />
              <div className="min-w-0 flex-1">
                <h2 className="pr-3 text-sm font-bold">{w.title}</h2>
                <p className="mt-1 text-xs text-muted-foreground">{w.note}</p>
              </div>
              <button
                className="-mr-2 -mt-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg hover:bg-muted"
                onClick={dismiss}
                aria-label={w.later}
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Button
                disabled={busy}
                className="min-h-11"
                onClick={() => void install()}
              >
                {w.install}
              </Button>
              <Button
                variant="outline"
                className="min-h-11"
                onClick={showGuide}
              >
                {w.guide}
              </Button>
            </div>
          </div>
        )}
      </aside>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          closeLabel={w.close}
          className="w-[calc(100%_-_2rem)] max-w-md rounded-2xl p-5"
          data-testid="pwa-install-guide"
        >
          <DialogHeader className="pr-5 text-left">
            <DialogTitle className="text-xl leading-snug">
              {w.guide}
            </DialogTitle>
            <DialogDescription>{w.note}</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2" aria-label={w.guide}>
            {(["ios", "android"] as const).map((device) => (
              <button
                key={device}
                type="button"
                onClick={() => {
                  setPlatform(device);
                  setStep(0);
                }}
                aria-pressed={platform === device}
                className={`min-h-11 rounded-xl border px-3 py-2 text-sm font-semibold motion-safe:transition-colors ${platform === device ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-muted"}`}
              >
                {device === "ios" ? w.apple : w.android}
              </button>
            ))}
          </div>
          <div className="flex gap-1.5" aria-hidden="true">
            {steps.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 flex-1 rounded-full motion-safe:transition-colors ${i <= step ? "bg-primary" : "bg-muted"}`}
              />
            ))}
          </div>
          <section
            key={`${platform}-${step}`}
            className="rounded-2xl bg-primary/5 p-4 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-right-1"
            aria-live="polite"
            aria-atomic="true"
          >
            <div className="mb-3 flex items-center gap-2 text-xs font-bold text-primary">
              <StepIcon className="h-5 w-5" aria-hidden="true" />
              {w.step} {step + 1} / {steps.length}
            </div>
            <h3 className="text-lg font-bold">{steps[step][0]}</h3>
            <p className="mt-2 text-sm leading-relaxed">{steps[step][1]}</p>
          </section>
          {platform === "android" && prompt && (
            <Button
              disabled={busy}
              className="min-h-11"
              onClick={() => void install()}
            >
              <Download className="mr-2 h-4 w-4" aria-hidden="true" />
              {w.install}
            </Button>
          )}
          <p className="text-xs leading-relaxed text-muted-foreground">
            {w.manual}
          </p>
          <p className="text-xs leading-relaxed text-muted-foreground">
            {w.online}
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              className="min-h-11"
              disabled={step === 0}
              onClick={() => setStep((n) => n - 1)}
            >
              <ArrowLeft className="mr-1 h-4 w-4" aria-hidden="true" />
              {w.back}
            </Button>
            <Button
              className="min-h-11"
              onClick={() => {
                if (step < steps.length - 1) setStep((n) => n + 1);
                else {
                  setOpen(false);
                  dismiss();
                }
              }}
            >
              {step < steps.length - 1 ? (
                <>
                  {w.next}
                  <ArrowRight className="ml-1 h-4 w-4" aria-hidden="true" />
                </>
              ) : (
                <>
                  <Check className="mr-1 h-4 w-4" aria-hidden="true" />
                  {w.done}
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
