import Script from "next/script";

/**
 * Google Analytics 4 (gtag) loader. Renders nothing in environments without
 * NEXT_PUBLIC_GA_MEASUREMENT_ID set, so dev / preview deployments don't
 * pollute the production property. Mount once in the root layout.
 */
export function GoogleAnalytics() {
  const id = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  if (!id) return null;
  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${id}`}
        strategy="afterInteractive"
      />
      <Script id="ga4-init" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${id}', { send_page_view: true });`}
      </Script>
    </>
  );
}
