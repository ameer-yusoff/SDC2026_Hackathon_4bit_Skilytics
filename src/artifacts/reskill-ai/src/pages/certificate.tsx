import {SdgContribution} from "@/components/sdg-choice";
import { useEffect, useRef, useState } from "react";
import { Link, useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react";
import {
  ArrowLeft,
  CheckCircle2,
  Download,
  Image,
  Loader2,
  Printer,
} from "lucide-react";
import { Brand, BrandMark, ErrorBox, LangToggle, Rows } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n";
import { useToast } from "@/hooks/use-toast";
import "./certificate.css";

const words = {
  en: {
    back: "Workspace",
    title: "Your completion certificate",
    sub: "A milestone worth keeping.",
    pdf: "Download PDF",
    png: "Download PNG",
    print: "Print",
    ready: "Pathway complete",
    heading: "Certificate of completion",
    awarded: "Presented to",
    completed: "For completing the learning pathway",
    date: "Completed on",
    courses: "Courses completed",
    reference: "Certificate ID",
    note: "Based on your completion check-ins. This is not a course provider certificate or professional qualification.",
    again: "File ready · download again",
    error: "Could not export your certificate. Please try again.",
  },
  ms: {
    back: "Ruang kerja",
    title: "Sijil penyempurnaan anda",
    sub: "Pencapaian yang patut disimpan.",
    pdf: "Muat turun PDF",
    png: "Muat turun PNG",
    print: "Cetak",
    ready: "Laluan selesai",
    heading: "Sijil penyempurnaan",
    awarded: "Dianugerahkan kepada",
    completed: "Telah menyelesaikan laluan pembelajaran",
    date: "Tarikh selesai",
    courses: "Kursus diselesaikan",
    reference: "ID sijil",
    note: "Berdasarkan rekod penyempurnaan yang anda sahkan sendiri. Bukan sijil penyedia kursus atau kelayakan profesional.",
    again: "Fail sedia · muat turun semula",
    error: "Sijil tidak dapat dieksport. Sila cuba lagi.",
  },
  zh: {
    back: "工作空间",
    title: "你的学习完成证书",
    sub: "值得珍藏的学习里程碑。",
    pdf: "下载 PDF",
    png: "下载 PNG",
    print: "打印",
    ready: "学习路径已完成",
    heading: "学习完成证书",
    awarded: "颁发给",
    completed: "已完成以下学习路径",
    date: "完成日期",
    courses: "已完成课程",
    reference: "证书编号",
    note: "依据你自行确认的完成记录，并非课程机构的证书或专业资格。",
    again: "文件已生成 · 再次下载",
    error: "无法导出证书，请重试。",
  },
};
type Certificate = {
  id: string;
  name: string;
  roleTitle: string;
  roleTitleMs: string;
  roleTitleZh: string;
  finishedAt: string;
  courseCount: number;
  sdgCodes?:string[];
};

export default function CertificatePage() {
  const { id } = useParams<{ id: string }>();
  const { lang } = useT(),
    w = words[lang];
  const { toast } = useToast();
  const [file, setFile] = useState<{ href: string; name: string } | null>(null);
  const sheet = useRef<HTMLElement>(null),
    frame = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1),
    [busy, setBusy] = useState<string | null>(null);
  const q = useQuery({
    queryKey: ["certificate", id],
    queryFn: () =>
      customFetch<Certificate>(`/api/profiles/${id}/journey/certificate`),
    retry: false,
  });
  useEffect(() => {
    if (!frame.current) return;
    const observer = new ResizeObserver(([entry]) =>
      setScale(Math.min(1, entry.contentRect.width / 1120)),
    );
    observer.observe(frame.current);
    return () => observer.disconnect();
  }, [q.data]);
  const exportFile = async (format: "pdf" | "png") => {
    if (!sheet.current || !q.data || busy) return;
    setBusy(format);
    try {
      await document.fonts.ready;
      await Promise.all(
        [...sheet.current.querySelectorAll("img")].map((img) => img.decode()),
      );
      if (sheet.current.lang !== lang) return;
      const { toPng } = await import("html-to-image");
      const png = await toPng(sheet.current, {
        width: 1120,
        height: 792,
        pixelRatio: 2,
        fontEmbedCSS: "",
        backgroundColor: "#fffdf8",
        style: { transform: "none", margin: "0" },
      });
      let href = png;
      if (format === "pdf") {
        const { jsPDF } = await import("jspdf");
        const pdf = new jsPDF({
          compress: true,
          orientation: "landscape",
          unit: "mm",
          format: "a4",
        });
        pdf.addImage(png, "PNG", 0, 0, 297, 210, undefined, "FAST");
        href = pdf.output("datauristring");
      }
      if (sheet.current?.lang !== lang) return;
      const name = `${q.data.id}.${format}`;
      setFile({ href, name });
      const link = document.createElement("a");
      link.href = href;
      link.download = name;
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      toast({ title: w.error, variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };
  useEffect(() => {
    setFile(null);
  }, [lang, id]);
  const c = q.data;
  return (
    <div className="min-h-dvh bg-background pb-10">
      <style>{`@media print{
  @page{size:A4 landscape;margin:0}
  html,body,#root{width:297mm!important;height:210mm!important;min-height:0!important;margin:0!important;padding:0!important;overflow:hidden!important}
  body *{visibility:hidden!important}
  #completion-certificate,#completion-certificate *{visibility:visible!important;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  #completion-certificate{position:fixed!important;inset:0!important;transform:none!important;width:297mm!important;height:210mm!important}
  .certificate-stage{overflow:visible!important;border:0!important;height:auto!important;box-shadow:none!important}
  .certificate-controls{display:none!important}
}
`}</style>
      <header className="certificate-controls border-b bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Brand small />
          <LangToggle />
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-5 sm:py-8">
        <div className="certificate-controls">
          <Link
            href={window.location.pathname.startsWith("/tvet/")?"/tvet/students":window.location.pathname.startsWith("/hr/")?"/hr/members":"/me"}
            className="mb-5 inline-flex min-h-11 items-center gap-2 text-sm text-muted-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            {w.back}
          </Link>
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold sm:text-3xl">{w.title}</h1>
              <p className="mt-1 text-sm text-muted-foreground">{w.sub}</p>
            </div>
            <div className="grid w-full grid-cols-3 gap-2 sm:flex sm:w-auto">
              {(["pdf", "png"] as const).map((format) => (
                <Button
                  key={format}
                  disabled={!c || !!busy}
                  onClick={() => exportFile(format)}
                  variant={format === "pdf" ? "default" : "outline"}
                  className="h-auto min-h-11 gap-2 whitespace-normal px-3 py-2"
                  data-testid={`certificate-${format}`}
                >
                  {busy === format ? (
                    <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                  ) : format === "pdf" ? (
                    <Download className="h-4 w-4 shrink-0" />
                  ) : (
                    <Image className="h-4 w-4 shrink-0" />
                  )}
                  <span>{w[format]}</span>
                </Button>
              ))}
              <Button
                variant="outline"
                disabled={!c || !!busy}
                className="h-auto min-h-11 gap-2 whitespace-normal px-3 py-2"
                onClick={() => window.print()}
                data-testid="certificate-print"
              >
                <Printer className="h-4 w-4 shrink-0" />
                {w.print}
              </Button>
            </div>
          </div>
        </div>
        {file && (
          <a
            className="certificate-controls mb-4 block w-fit text-sm font-medium text-primary underline"
            data-testid="certificate-file"
            href={file.href}
            download={file.name}
          >
            {w.again} ({file.name.split(".").at(-1)?.toUpperCase()})
          </a>
        )}
        {q.isLoading ? (
          <Rows n={1} h="h-72" />
        ) : q.isError ? (
          <ErrorBox error={q.error} retry={() => q.refetch()} />
        ) : (
          c && (
            <>
              <p className="certificate-controls mb-3 flex items-center gap-2 text-sm font-medium text-emerald-700">
                <CheckCircle2 className="h-4 w-4" />
                {w.ready}
              </p>
              <div className="certificate-controls"><SdgContribution goals={c.sdgCodes??[]}/></div>
              <div
                ref={frame}
                className="certificate-stage w-full overflow-hidden rounded-xl border shadow-sm"
                style={{ height: 792 * scale }}
              >
                <article
                  ref={sheet}
                  id="completion-certificate"
                  className="certificate-sheet"
                  style={{ transform: `scale(${scale})` }}
                  lang={lang}
                >
                  <div className="certificate-inner">
                    <div className="certificate-brand flex flex-row flex-nowrap items-center justify-center gap-3">
                      <BrandMark className="h-11 w-11 shrink-0" />
                      <span>Skilytics</span>
                    </div>
                    <h2>{w.heading}</h2>
                    <p className="certificate-awarded">{w.awarded}</p>
                    <h3 style={{ fontSize: c.name.length > 45 ? 36 : 48 }}>
                      {c.name}
                    </h3>
                    <span className="certificate-rule" />
                    <p className="certificate-completed">{w.completed}</p>
                    <p className="certificate-role">
                      {lang === "ms"
                        ? c.roleTitleMs
                        : lang === "zh"
                          ? c.roleTitleZh
                          : c.roleTitle}
                    </p>
                    <div className="certificate-facts">
                      <div>
                        <span>{w.date}</span>
                        <strong>
                          {new Intl.DateTimeFormat(
                            lang === "ms"
                              ? "ms-MY"
                              : lang === "zh"
                                ? "zh-CN"
                                : "en-GB",
                            { day: "numeric", month: "long", year: "numeric" },
                          ).format(new Date(c.finishedAt))}
                        </strong>
                      </div>
                      <div>
                        <span>{w.courses}</span>
                        <strong>{c.courseCount}</strong>
                      </div>
                      <div>
                        <span>{w.reference}</span>
                        <strong>{c.id}</strong>
                      </div>
                    </div>
                    <p className="certificate-note">{w.note}</p>
                  </div>
                </article>
              </div>
            </>
          )
        )}
      </main>
    </div>
  );
}
