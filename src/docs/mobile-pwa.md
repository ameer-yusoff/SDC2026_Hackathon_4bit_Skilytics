# Mobile installation

Skilytics has a web app manifest, standalone display mode, padded 192/512 px app icons, an Apple touch icon and a production service worker. Deploy over HTTPS. Localhost is suitable for development checks; the service worker registers only in production builds, including a Vite production preview.

The mobile install notice appears on the landing page and individual, HR and TVET dashboards. Dismissal reduces it to a small install button for the current tab session. It does not cover onboarding, pathway, certificate or other task pages. Installed standalone windows hide the promotion.

The EN/BM/ZH guide defaults to the detected device and lets users switch between iPhone/iPad and Android. Safari instructions cover Share → Add to Home Screen, including Open as Web App where shown. Android instructions use Chrome's menu or a deferred browser install prompt when available. A native prompt is invoked only by an explicit button click. Browser availability, private mode and install eligibility can affect the available actions; a manual guide remains accessible.

The service worker caches only the public offline page and app icons. HTML is always fetched from the network when online; APIs, account data, CVs, plans, AI replies and app HTML are never cached by the worker. Offline navigation shows a three-language reconnect page. This is not an offline AI or workspace implementation. Installation may use a separate browser storage context, so the guide warns that signing in again may be necessary.

Validation covers device detection, the worker's public-asset allowlist, fresh online HTML, offline fallback and exclusions for API, cross-origin and POST requests. Actual native installation must also be checked on physical Safari/iOS and Chrome/Android; desktop responsive previews cannot complete those device-specific flows.

References: [Apple's Safari installation guide](https://support.apple.com/guide/iphone/open-as-web-app-iphea86e5236/ios), [web.dev installation prompts](https://web.dev/learn/pwa/installation-prompt), [MDN installability](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable).
