import { useState } from "react";
import { Cpu, Images, ArrowLeft, ExternalLink } from "lucide-react";
import { useT } from "@/i18n";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";

const copy = {
  en: {
    short: "Gemini active · RunPod temporarily paused",
    notice: "Read notice",
    proof: "Preview proof of use",
    close: "Close",
    back: "Back to notice",
    continue: "Continue to Data Sources",
    proofNote:
      "Project screenshots supplied by the owner. These are reference images, not a live balance or service status.",
    balance: "RunPod account balance",
    endpoints: "Deployed Qwen Main and Light endpoints",
    full: "Open full-size image",
  },
  ms: {
    short: "Gemini aktif · RunPod dihentikan sementara",
    notice: "Baca notis",
    proof: "Lihat bukti penggunaan",
    close: "Tutup",
    back: "Kembali ke notis",
    continue: "Teruskan ke Sumber Data",
    proofNote:
      "Gambar projek yang dibekalkan pemilik. Ini imej rujukan, bukan baki atau status perkhidmatan secara langsung.",
    balance: "Baki akaun RunPod",
    endpoints: "Endpoint Qwen Main dan Light yang telah disediakan",
    full: "Buka gambar saiz penuh",
  },
  zh: {
    short: "Gemini 已启用 · RunPod 暂时停用",
    notice: "查看通知",
    proof: "预览使用证明",
    close: "关闭",
    back: "返回通知",
    continue: "继续查看数据来源",
    proofNote: "项目所有者提供的截图，仅作参考，并非实时余额或服务状态。",
    balance: "RunPod 账户余额",
    endpoints: "已部署的 Qwen 主模型与轻量模型端点",
    full: "打开原尺寸图片",
  },
};

/** Mounts anew on every visit; no local/session storage suppresses the notice. */
export function AiServiceNotice() {
  const { lang, t } = useT();
  const w = copy[lang];
  const [open, setOpen] = useState(true);
  const [proof, setProof] = useState(false);
  const show = (images: boolean) => {
    setProof(images);
    setOpen(true);
  };
  return (
    <>
      <aside
        data-testid="ai-service-notice"
        className="mb-5 flex flex-wrap items-center gap-3 rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sky-950"
      >
        <Cpu className="h-5 w-5 shrink-0" aria-hidden="true" />
        <p className="min-w-0 flex-1 text-sm font-semibold">{w.short}</p>
        <div className="flex w-full flex-wrap gap-2 sm:w-auto">
          <Button
            variant="outline"
            className="min-h-11"
            onClick={() => show(false)}
          >
            {w.notice}
          </Button>
          <Button className="min-h-11" onClick={() => show(true)}>
            <Images className="mr-2 h-4 w-4" aria-hidden="true" />
            {w.proof}
          </Button>
        </div>
      </aside>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          closeLabel={w.close}
          className={`w-[calc(100%_-_2rem)] rounded-2xl p-5 sm:p-6 ${proof ? "max-w-5xl" : "max-w-xl"}`}
          data-testid="ai-service-notice-modal"
        >
          <DialogHeader className="pr-6 text-left">
            <DialogTitle className="text-xl leading-snug">
              {proof ? w.proof : t("docs.ai.creditNoticeTitle")}
            </DialogTitle>
            <DialogDescription className="pt-2 text-sm leading-relaxed">
              {proof ? w.proofNote : t("docs.ai.creditNotice")}
            </DialogDescription>
          </DialogHeader>
          {proof ? (
            <>
              <div className="grid items-start gap-4 md:grid-cols-2">
                {[
                  ["runpod-balance.png", w.balance],
                  ["runpod-endpoints.png", w.endpoints],
                ].map(([file, label]) => (
                  <figure
                    key={file}
                    className="min-w-0 overflow-hidden rounded-xl border bg-card"
                  >
                    <a
                      href={`/proof/${file}`}
                      target="_blank"
                      rel="noreferrer"
                      className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      aria-label={`${label} · ${w.full}`}
                    >
                      <img
                        src={`/proof/${file}`}
                        alt={label}
                        className="h-auto w-full object-contain"
                        width={file === "runpod-balance.png" ? 1471 : 1482}
                        height={file === "runpod-balance.png" ? 544 : 362}
                      />
                    </a>
                    <figcaption className="space-y-1 p-3 text-sm">
                      <b className="block">{label}</b>
                      <a
                        href={`/proof/${file}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex min-h-11 items-center gap-1 text-xs text-primary underline"
                      >
                        {w.full}
                        <ExternalLink className="h-3 w-3" aria-hidden="true" />
                      </a>
                    </figcaption>
                  </figure>
                ))}
              </div>
              <Button
                variant="outline"
                className="min-h-11"
                onClick={() => setProof(false)}
              >
                <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
                {w.back}
              </Button>
            </>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              <Button
                variant="outline"
                className="min-h-11 whitespace-normal"
                onClick={() => setProof(true)}
              >
                <Images className="mr-2 h-4 w-4 shrink-0" aria-hidden="true" />
                {w.proof}
              </Button>
              <Button
                className="min-h-11 whitespace-normal"
                onClick={() => setOpen(false)}
              >
                {w.continue}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
