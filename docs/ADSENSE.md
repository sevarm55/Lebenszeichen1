# Advertising — architecture and AdSense setup

Two parts: how ads work in this codebase, and the exact steps to connect Google
AdSense to a live site.

---

# Part 1 — Architecture

## One primitive

Every ad on the site is `<AdSlot id="…" />`. No component anywhere else contains
a publisher id or an ad-unit id. Swapping AdSense for another network is a change
in `server/ads/` plus environment variables.

```
config/public.ts        slot ids + publisher id from env (public by design)
server/ads/placements.ts  the 12 placements: label, format, reserved height, device
server/ads/engine.ts      how many in-content ads an article gets, and where
server/ads/runtime.ts     env + SiteSettings + AdPlacement rows → one runtime object
components/ads/ad-context.tsx   carries that runtime to client slots
components/ads/ad-slot.tsx      the only ad primitive
components/ads/ad-scripts.tsx   loader scripts, consent-gated
components/ads/mobile-sticky.tsx  dismissible bottom anchor
components/ads/popunder.tsx     integration point for a non-AdSense network
```

## The 12 placements

| Key | Where | Device |
|---|---|---|
| `HOME_TOP` | Homepage, above the lead | all |
| `HOME_FEED_1` | Between "Neueste" and "Für dich ausgewählt" | all |
| `HOME_FEED_2` | Between the category rails | all |
| `CATEGORY_TOP` | Under the category description | all |
| `CATEGORY_FEED` | After six posts in the list | all |
| `ARTICLE_AFTER_INTRO` | After the lead paragraph — the strongest position | all |
| `ARTICLE_INLINE` | Distributed by the density engine | all |
| `ARTICLE_END` | Before the recommendations | all |
| `SIDEBAR` | Right column | desktop |
| `SIDEBAR_STICKY` | Right column, follows the scroll | desktop |
| `MOBILE_STICKY` | Bottom anchor, dismissible | mobile |
| `SEARCH_TOP` | Above search results | all |

Each can be switched off individually in `/admin/settings → Реклама`.

## The density engine

The rule the brief insists on: a 300-word story must not carry the same ad load
as a 3000-word one.

```
article blocks + word count
  → eligible positions (never after a heading, never beside an image,
                        never before the closing paragraph)
  → minimum words between two ads
  → budget = min(maxInContent, floor(totalWords / wordsPerAd))
  → list of block indices
```

Presets (editable per-site in the admin):

| Preset | Min words before any inline ad | Min words between | Max inline | One extra ad per |
|---|---|---|---|---|
| `low` | 400 | 400 | 2 | 700 words |
| `balanced` *(default)* | 220 | 220 | 4 | 420 words |
| `high` | 150 | 150 | 6 | 280 words |
| `aggressive` | 120 | 120 | 8 | 200 words |

Measured on the seeded demo content:

```
words   low        balanced   high       aggressive
134     0+1+1=2    0+1+1=2    0+1+1=2    0+1+1=2
261     0+1+1=2    0+1+1=2    1+1+1=3    1+1+1=3
323     0+1+1=2    1+1+1=3    1+1+1=3    1+1+1=3
673     1+1+1=3    1+1+1=3    2+1+1=4    3+1+1=5
        (inline + after-intro + end)
```

Reproduce it any time with `npx tsx scripts/ad-engine-check.ts`.

`aggressive` is the floor on purpose. Below roughly 120 words between units,
AdSense starts treating the page as having "more ads than content", which is a
policy violation.

## Placement rules that are not negotiable

`AdSlot` and the engine enforce, structurally:

- **Space is reserved before the network answers.** Every placement declares a
  minimum height per breakpoint, so a filled *or unfilled* slot never shifts the
  article under the reader's eyes. CLS stays at zero.
- **"Anzeige" above every unit.** Required by German law (Trennungsgebot) and by
  AdSense's own rule on distinguishing ads from content.
- **Never directly after a heading** — an ad wedged under an H2 reads as part of
  that section. That is the "masquerading as content" pattern that gets accounts
  banned.
- **Never adjacent to an image, gallery or embed** — too noisy.
- **Never before the closing paragraph** — let readers finish.
- **The mobile anchor appears only after 600 px of scrolling**, is dismissible
  for the session, and its close button has a real 44 px hit area placed away
  from the ad so a dismiss cannot be mistaken for a click.
- **Placeholders never reach production.** Grey boxes render in development and
  in the admin preview only; with no publisher id configured, a real reader sees
  nothing at all.

## Preview

`/admin/vorschau/[id]?ads=1` renders the article exactly as production does and
draws the ad *boxes* with a summary line ("673 Wörter · 1 Inline-Platzierung · 3
Werbeplätze insgesamt · Dichte: balanced"). Real ad code is never loaded in
preview — impressions generated in an editor's browser are invalid traffic.

## Consent

`components/ads/ad-scripts.tsx` sets Google **Consent Mode v2** defaults inline
in the document head (`app/layout.tsx`), before any Google tag can load:

```js
gtag('consent','default',{
  ad_storage:'denied', ad_user_data:'denied',
  ad_personalization:'denied', analytics_storage:'denied',
  functionality_storage:'granted', security_storage:'granted',
  wait_for_update:2000 })
gtag('set','ads_data_redaction', true)
```

The built-in banner (`components/public/consent-banner.tsx`) then flips these on
a user decision. **It is not an IAB TCF-certified CMP and does not claim to be.**
Google requires a certified CMP for personalised ads to EEA/UK/CH users. The
integration point is ready: set `NEXT_PUBLIC_CMP_PROVIDER=funding-choices` plus
`NEXT_PUBLIC_CMP_FUNDING_CHOICES_ID`, and the built-in banner stops rendering so
there are never two.

---

# Part 2 — Connecting Google AdSense, step by step

## Before you apply

AdSense rejects most sites on the first try, almost always for the same reasons.
Fix these first — the review is manual and a rejection costs weeks.

- [ ] **Own domain, live over HTTPS.** No `.vercel.app`, no subdomain of someone
      else's site.
- [ ] **At least 20–30 substantial articles**, each 600+ words. The 18 demo
      articles shipped here are demo content — **delete or replace them before
      applying.** Reviewers recognise seed data.
- [ ] **Impressum filled in** (`/admin/settings → Рекизиты`). For a German site
      this is both a legal requirement and something reviewers check.
- [ ] **Privacy policy** at `/datenschutz`, naming Google AdSense and cookies.
      Already drafted — have it reviewed.
- [ ] **Über uns**, **Kontakt** with a working address, and an editorial policy.
      All three exist.
- [ ] **Site is genuinely navigable** — working menu, categories with content,
      no dead links, no "coming soon".
- [ ] **Some real traffic.** Not a formal requirement, but a site with zero
      visitors is reviewed more sceptically.

Realistic timeline: 1–14 days, occasionally longer.

## Step 1 — Create the account

1. Go to **https://www.google.com/adsense/** → *Get started*.
2. Sign in with the Google account that should own the revenue. Use a business
   account you will still control in five years, not a personal throwaway.
3. Enter the site URL (`https://yourdomain.de`), the country, and accept the
   terms.
4. **Country cannot be changed later** and determines the payment currency and
   tax treatment. Choose carefully.

## Step 2 — Payment address and tax

1. In AdSense: **Payments → Payments info → Add payment method**.
2. Enter the legal name and address. It must match your bank account, or payouts
   will be rejected.
3. **Payments → Manage tax info** → complete the tax form. For a German
   business this is normally the EU/DE form; for the US treaty section AdSense
   guides you.
4. Germany: if you are a business, provide the **USt-IdNr.** Google issues a
   reverse-charge invoice; without the VAT id you may be charged VAT.

## Step 3 — Verify site ownership

AdSense gives you one of three options. This codebase supports the simplest:

### Option A — AdSense code snippet (recommended)

1. AdSense shows a `<script>` with `data-ad-client="ca-pub-XXXXXXXXXXXXXXXX"`.
   **You only need the `ca-pub-…` value** — the loader is already implemented.
2. On the server, edit `.env`:

   ```bash
   ADS_ENABLED=true
   NEXT_PUBLIC_ADS_ENABLED=true
   NEXT_PUBLIC_ADS_PROVIDER=adsense
   NEXT_PUBLIC_ADSENSE_CLIENT_ID=ca-pub-XXXXXXXXXXXXXXXX
   ```

3. Rebuild and restart:

   ```bash
   cd /var/www/lebenszeichen && npm run build && pm2 restart lebenszeichen
   ```

   `NEXT_PUBLIC_*` values are compiled into the bundle, so a restart alone is
   not enough — you must rebuild.

4. Confirm the loader is on the page:

   ```bash
   curl -s https://yourdomain.de/ | grep adsbygoogle
   ```

5. Back in AdSense, press **Verify**.

### Option B — ads.txt

AdSense will ask for this anyway. Create `public/ads.txt`:

```
google.com, pub-XXXXXXXXXXXXXXXX, DIRECT, f08c47fec0942fa0
```

Note: `pub-…`, **without** the `ca-` prefix. Commit it, deploy, then check
`https://yourdomain.de/ads.txt`. A missing ads.txt is one of the most common
causes of "limited ad serving".

### Option C — Meta tag / DNS

Only if A and B are impossible.

## Step 4 — Wait for approval

AdSense shows "We're reviewing your site". During this period ad slots are
present but unfilled — that is expected. If you are rejected, the email names a
reason; the usual ones are thin content, missing Impressum/privacy policy, or
site navigation problems. Fix and reapply.

## Step 5 — Create the ad units

Once approved: **Ads → By ad unit → Display ads**. Create one unit per placement
you intend to use and copy its **numeric slot id** (`data-ad-slot`).

Suggested mapping:

| AdSense unit name | Type | Env variable |
|---|---|---|
| `LZ_HOME_TOP` | Display, horizontal | `NEXT_PUBLIC_AD_SLOT_HOME_TOP` |
| `LZ_HOME_FEED_1` | In-feed | `NEXT_PUBLIC_AD_SLOT_HOME_FEED_1` |
| `LZ_HOME_FEED_2` | In-feed | `NEXT_PUBLIC_AD_SLOT_HOME_FEED_2` |
| `LZ_CATEGORY_TOP` | Display, horizontal | `NEXT_PUBLIC_AD_SLOT_CATEGORY_TOP` |
| `LZ_CATEGORY_FEED` | In-feed | `NEXT_PUBLIC_AD_SLOT_CATEGORY_FEED` |
| `LZ_ARTICLE_INTRO` | In-article | `NEXT_PUBLIC_AD_SLOT_ARTICLE_AFTER_INTRO` |
| `LZ_ARTICLE_INLINE` | In-article | `NEXT_PUBLIC_AD_SLOT_ARTICLE_INLINE` |
| `LZ_ARTICLE_END` | Display, responsive | `NEXT_PUBLIC_AD_SLOT_ARTICLE_END` |
| `LZ_SIDEBAR` | Display, rectangle | `NEXT_PUBLIC_AD_SLOT_SIDEBAR` |
| `LZ_SIDEBAR_STICKY` | Display, vertical | `NEXT_PUBLIC_AD_SLOT_SIDEBAR_STICKY` |
| `LZ_MOBILE_STICKY` | Display, horizontal | `NEXT_PUBLIC_AD_SLOT_MOBILE_STICKY` |
| `LZ_SEARCH_TOP` | Display, horizontal | `NEXT_PUBLIC_AD_SLOT_SEARCH_TOP` |

Put them in `.env`:

```bash
NEXT_PUBLIC_AD_SLOT_HOME_TOP=1234567890
NEXT_PUBLIC_AD_SLOT_ARTICLE_INLINE=2345678901
# …
```

Rebuild and restart. Alternatively enter a slot id per placement in
`/admin/settings → Реклама`, which overrides the environment value without a
rebuild — useful for a quick change.

## Step 6 — Turn ads on in the CMS

`/admin/settings → Реклама`:

1. **Показывать рекламу** → on.
2. **Плотность** → start with *Сбалансированная*. Move up only after you have
   real revenue data; higher density lowers CPM and raises bounce rate, and past
   a point earns less in total.
3. Enable the sidebar and mobile anchor.
4. Enable individual placements.
5. Save.

Both switches must be on: `ADS_ENABLED` in the environment **and** the CMS
toggle. The environment one is the master kill switch.

## Step 7 — Consent (required in the EU)

Without a certified CMP, Google serves EEA/UK/CH traffic **non-personalised**
ads, which pay far less — and you may be in breach of GDPR.

1. AdSense → **Privacy & messaging → European regulations**.
2. Create a GDPR message, choose your styling, publish it.
3. Note the publisher id and set:

   ```bash
   NEXT_PUBLIC_CMP_PROVIDER=funding-choices
   NEXT_PUBLIC_CMP_FUNDING_CHOICES_ID=ca-pub-XXXXXXXXXXXXXXXX
   ```

4. Rebuild. The built-in banner stops rendering automatically so there are never
   two consent dialogs.
5. In the CMS set **Согласие (CMP)** to `funding-choices`.

## Step 8 — Auto Ads (optional, this is the legitimate way to raise density)

AdSense can place extra formats on top of your own: **anchor** ads (a bar at the
bottom of the screen) and **vignette** ads (a full-screen interstitial between
page views). These are the policy-compliant versions of the aggressive formats
you see on low-quality sites.

1. AdSense → **Ads → By site → your site → Edit**.
2. Enable *Auto ads*, then choose which formats. Recommended: **anchor on**,
   **vignette on**, **in-page/auto-inserted off** — leave in-article placement to
   the density engine, which knows the document structure.
3. Set:

   ```bash
   NEXT_PUBLIC_ADSENSE_AUTO_ADS=true
   ```

4. Rebuild.

## Step 9 — Verify

```bash
# loader present
curl -s https://yourdomain.de/ | grep -c adsbygoogle

# slots rendering
curl -s https://yourdomain.de/leben-schicksale/<slug> | grep -o 'data-ad-slot="[A-Z_]*"' | sort | uniq -c

# ads.txt reachable
curl -s https://yourdomain.de/ads.txt
```

In the browser: open an article, confirm the "Anzeige" labels appear, that the
page does not jump while ads load, and that the mobile anchor only shows after
scrolling.

**Never click your own ads**, not even once, not even "to test". Invalid
activity is the most common reason accounts are terminated. To check that a slot
would fill, use AdSense's own preview tool.

## Step 10 — Payouts

- Payment threshold: **€70** (Germany).
- Address verification: at €10 Google mails a PIN. Enter it within four months.
- Add a bank account under **Payments → Payment methods**. Google sends a small
  test deposit.
- Payouts run around the 21st of the following month.

---

# Part 3 — About aggressive ad formats (kaylestore.net style)

The reference site you pointed at uses **popunders**: click anywhere and a new
window opens behind the page. It earns per click and per pop.

You should know exactly what that trade-off is before choosing it:

**Google AdSense forbids it.** Specifically forbidden: popunders, pop-ups
triggered by page clicks, ads that provoke accidental clicks, and ad placement
that interferes with navigation. Running a popunder on a page that also serves
AdSense does not risk a warning — it gets the AdSense account **terminated**,
usually without notice and without paying out the current balance. Sites that run
both are running on a network that permits popunders (Adsterra, Monetag,
PropellerAds, PopAds), **not** on AdSense.

So there are two coherent strategies, and mixing them is the one that fails:

| | AdSense | Popunder network |
|---|---|---|
| Payout per 1000 views (German traffic) | €4–15 RPM | €1–4 RPM |
| Advertiser quality | High | Low, often adult/gambling |
| Reader experience | Acceptable | Hostile |
| Repeat visitors | Retained | Lost |
| Facebook | Fine | Links get flagged and reach collapses |
| Ban risk | Policy-bounded | None from that network |
| Suitable for a brand | Yes | No |

German traffic is among the best-paying in AdSense. For a magazine that intends
to build repeat readership and Facebook reach, AdSense with `high` density plus
Auto Ads (anchor + vignette) earns more over any horizon longer than a few
months — and is the only option compatible with the Facebook page strategy in
[FACEBOOK_ADS.md](FACEBOOK_ADS.md), because Facebook down-ranks and eventually
blocks domains that open popunders.

**If you decide to run a popunder network anyway**, the integration point exists
and is honest about what it is (`components/ads/popunder.tsx`):

```bash
NEXT_PUBLIC_POPUNDER_ENABLED=true
NEXT_PUBLIC_POPUNDER_SCRIPT_URL=https://<network>/script.js
NEXT_PUBLIC_POPUNDER_FREQUENCY_HOURS=12
```

It loads **the network's own script** — no hand-rolled click hijacker — and
applies a frequency cap so one visitor is not hit on every page view. It
**refuses to run while an AdSense client id is configured**, because that
combination is what terminates accounts.

The recommended arrangement if you want both revenue streams: AdSense on this
domain, the popunder network on a separate domain with separate content. Never
on the same page.
