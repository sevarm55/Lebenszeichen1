# Analytics

## Principle

No vendor SDK is imported anywhere except `components/ads/ad-scripts.tsx`.
Components call `trackEvent()` from `server/analytics/events.ts`. Adding a sink —
including the future cross-site dashboard — means editing that one file.

## Events

| Event | Fired |
|---|---|
| `page_view` | Route change |
| `article_view` | Article opens |
| `article_25` / `_50` / `_75` / `_complete` | Scroll depth (95 % = complete) |
| `related_article_click` | A recommendation is clicked |
| `category_click` | A category link is clicked |
| `share_click` | Share button (with `method`) |
| `search` | Search performed |
| `ad_slot_rendered` | An ad slot requested a fill |

Depth events are the useful ones: they tell you whether a Facebook visitor read
the piece or bounced off the headline, which is the single best signal for what
to commission next.

## Consent gating

```ts
export function trackEvent(event, payload) {
  window.dataLayer.push({ event, ...payload })   // always
  if (!hasAnalyticsConsent()) return             // gate
  window.gtag?.('event', event, payload)         // only with consent
}
```

The `dataLayer` push always happens so events are observable in development and
usable by a tag manager. Nothing leaves the browser without consent.

`window.__lzConsent` is set to `{analytics:false, ads:false}` by the inline
Consent Mode block in `app/layout.tsx` before any script runs, and updated when
the reader decides.

## GA4

```bash
NEXT_PUBLIC_ANALYTICS_PROVIDER=ga4
NEXT_PUBLIC_GA4_MEASUREMENT_ID=G-XXXXXXXXXX
```

Loaded with `send_page_view: false` — page views are dispatched by
`trackPageView` so they carry the same payload shape as everything else.

Consent Mode v2 defaults are denied; GA4 collects only cookieless pings until the
reader accepts.

Recommended custom dimensions in GA4: `post_id`, `category`, `slug`, `method`.

## View counting

`POST /api/views` increments `Post.views`, fired **five seconds** after an
article opens — an instant bounce is not a read, and counting it would fill the
"Beliebt" rail with noise. Rate limited to 60/min per IP. Failures are silent by
design; an approximate number is fine for an editorial rail.

The "popular" query uses a 45-day window so an old viral piece cannot own the
block forever, topping up from all time when a young site has too little recent
data.

## What is not built

Per the brief, the cross-site business dashboard is explicitly out of scope. What
exists is the shape it will need:

- `trackEvent` is a single choke point for a second sink.
- `AITask` records cost and duration per generation.
- `Post` records origin, source, AI provider and model.
- `AuditLog` records who did what.
- Every model carries `siteId`.

See [FUTURE_MULTI_SITE.md](FUTURE_MULTI_SITE.md).

## Reading the numbers that matter

| Question | Where |
|---|---|
| Is Facebook traffic worth the spend? | GA4 sessions from `utm_source=facebook` × AdSense page RPM vs ad spend |
| Which stories hold readers? | `article_complete` ÷ `article_view` per post |
| Does a higher ad density pay? | Change density, then compare RPM **and** `article_complete` — density that lifts RPM while collapsing completion is losing money on the next visit |
| Which categories deserve more work? | `article_view` by `category` |
