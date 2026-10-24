import {
  Component,
  type ComponentType,
  type ErrorInfo,
  type ReactNode,
} from "react";
import { useOptionalT } from "@/i18n";

export interface ErrorFallbackProps {
  error: Error;
  resetError: () => void;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  FallbackComponent?: ComponentType<ErrorFallbackProps>;
  /** Changing this clears a caught error. Pass the route to recover on navigation. */
  resetKey?: unknown;
}

interface ErrorBoundaryState {
  error: Error | null;
}

function toError(value: unknown): Error {
  if (value instanceof Error) {
    return value;
  }
  if (typeof value === "string") {
    return new Error(value);
  }
  try {
    return new Error(JSON.stringify(value));
  } catch {
    return new Error(String(value));
  }
}

function DefaultFallback({ error, resetError }: ErrorFallbackProps) {
  // The root boundary also wraps LangProvider itself, so translation context may be absent.
  const context = useOptionalT();
  const fallback = {
    en: {
      title: "Something went wrong",
      body: "Please try loading this page again.",
      retry: "Try again",
    },
    ms: {
      title: "Halaman tidak dapat dipaparkan",
      body: "Sila cuba muatkan halaman ini semula.",
      retry: "Cuba lagi",
    },
    zh: {
      title: "页面暂时无法显示",
      body: "请尝试重新加载此页面。",
      retry: "重试",
    },
  };
  let lang: "en" | "ms" | "zh" = "en";
  try {
    const saved = localStorage.getItem("skilytics.lang");
    if (saved === "ms" || saved === "zh") lang = saved;
  } catch {}
  const w = fallback[lang];
  const t = (key: "err.pageTitle" | "err.pageBody" | "common.retry") =>
    context?.t(key) ??
    (key === "err.pageTitle"
      ? w.title
      : key === "err.pageBody"
        ? w.body
        : w.retry);
  return (
    <div className="min-h-[50vh] w-full flex items-center justify-center bg-background p-6">
      <div className="max-w-lg w-full text-center">
        <h1 className="text-xl font-semibold text-foreground">
          {t("err.pageTitle")}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("err.pageBody")}
        </p>
        {/* Dev only: messages can carry API responses and other internals. */}
        {import.meta.env.DEV ? (
          <pre className="mt-4 overflow-x-auto rounded bg-gray-100 p-3 text-left text-xs text-gray-800">
            {error.message || String(error)}
          </pre>
        ) : null}
        <button
          type="button"
          onClick={() => {
            if (
              /Failed to fetch dynamically imported module|Importing a module script failed|Loading chunk.*failed|Failed to load module script/i.test(
                error.message,
              )
            ) {
              window.location.reload();
            } else resetError();
          }}
          className="mt-4 min-h-11 rounded bg-primary px-4 py-2 text-sm text-primary-foreground hover:opacity-90"
        >
          {t("common.retry")}
        </button>
      </div>
    </div>
  );
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return { error: toError(error) };
  }

  componentDidCatch(error: unknown, info: ErrorInfo): void {
    console.error(
      "ErrorBoundary caught an error:",
      toError(error),
      info.componentStack,
    );
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps): void {
    if (
      this.state.error !== null &&
      prevProps.resetKey !== this.props.resetKey
    ) {
      this.resetError();
    }
  }

  resetError = (): void => {
    this.setState({ error: null });
  };

  render(): ReactNode {
    const { error } = this.state;
    if (error === null) {
      return this.props.children;
    }
    const Fallback = this.props.FallbackComponent ?? DefaultFallback;
    return <Fallback error={error} resetError={this.resetError} />;
  }
}
