export type InstallPlatform = "ios" | "android";

export function installPlatform(
  userAgent: string,
  touchPoints = 0,
): InstallPlatform {
  return /iPad|iPhone|iPod/i.test(userAgent) ||
    (/Macintosh/i.test(userAgent) && touchPoints > 1)
    ? "ios"
    : "android";
}

export interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export function registerPwa() {
  if (
    !import.meta.env.PROD ||
    !window.isSecureContext ||
    !("serviceWorker" in navigator)
  )
    return;
  // Does not reload an open form or cache authenticated pages.
  window.addEventListener(
    "load",
    () => {
      void navigator.serviceWorker
        .register("/sw.js", { updateViaCache: "none" })
        .catch((error) => console.warn("PWA registration unavailable", error));
    },
    { once: true },
  );
}
