# Facebook — promoting the German page, step by step

Goal: paid Facebook ads that promote **the Facebook page itself** (the German
one), building an audience that then clicks through to the site organically.

Two things this guide keeps separate, because Facebook treats them completely
differently:

| | Page promotion | Traffic ads |
|---|---|---|
| Objective | Engagement / Page likes | Traffic |
| Optimises for | Followers, post interaction | Link clicks / landing-page views |
| Cost | Cheap (€0.02–0.10 per follower in DE) | Expensive per click |
| Payoff | Every future post reaches them free | One-off visit |

For a content site the page-first strategy is normally the better use of the
first few hundred euros: a follower is a recurring, free distribution channel,
while a click is bought once.

---

## Before you start

- [ ] The German Facebook page exists and is **published** (not in draft).
- [ ] Profile picture (**170×170** min) and cover (**1640×856**) uploaded.
- [ ] The page has a **username** (`facebook.com/yourpage`) — Page settings →
      Username.
- [ ] Category set to **Media/News Company** or **Magazine**.
- [ ] The **About** section is filled in, in German.
- [ ] The website field points at your domain.
- [ ] **At least 5–10 posts already published.** Facebook reviews the page, and
      an empty page gets rejected or performs badly.
- [ ] A payment method you control.

If you have two German pages, decide now which one is the main brand. Running ads
for both splits budget and audience.

---

## Step 1 — Business portfolio (Business Manager)

Do not run ads from a personal profile. If the personal account is ever
restricted you lose the page, the ad account and the payment history together.

1. Go to **https://business.facebook.com** → *Create account*.
2. Enter the business name, your name and a business email.
3. **Settings → Accounts → Pages → Add → Add an existing Page**, select the
   German page.
4. **Settings → Accounts → Ad accounts → Add → Create a new ad account**.
   - Name: e.g. `Lebenszeichen DE`
   - Time zone: **(GMT+01:00) Berlin** — *cannot be changed later, and all
     reporting depends on it*.
   - Currency: **EUR** — also permanent.
5. **Settings → Payments → Add payment method.**
6. **Settings → Users → People → Add** anyone else who needs access, with the
   least role that works.

## Step 2 — Verify the business (do this early)

Facebook increasingly requires business verification for higher spend limits and
for some ad categories. It takes days, so start it before you need it.

**Settings → Business info → Security Center → Start verification.** You will
need the commercial register entry or equivalent, plus a document showing the
business name and address.

## Step 3 — Meta Pixel (set it up even for page ads)

You do not need the pixel for a page-likes campaign, but you want the data from
day one so that retargeting is possible in three months.

1. **Business Manager → Events Manager → Connect data sources → Web → Meta Pixel.**
2. Name it, note the **Pixel ID**.
3. Install it. This project has no pixel component yet — the cleanest place is
   `app/(public)/layout.tsx`, behind the same consent gate as the other tags, so
   that it only fires after the reader accepts marketing cookies. **Do not fire a
   pixel before consent for EU traffic.**
4. Verify the domain: **Business Manager → Brand safety → Domains → Add**, then
   add the DNS TXT record Facebook gives you.

## Step 4 — Warm the page up (2–3 days, no budget)

Facebook's review and its delivery algorithm both look at whether the page has
activity. Before the first euro:

- Publish 5–8 posts, in German, with images. Use your best articles: one strong
  sentence + the link + a real image.
- Reply to every comment.
- Invite friends who genuinely might care. Do not buy followers — bought
  audiences destroy your engagement rate permanently, and engagement rate is what
  determines organic reach.

## Step 5 — Campaign 1: grow the page

1. **Ads Manager → Create.**
2. **Objective: Engagement.** (In the older interface: *Page likes*.)
3. **Campaign name**: `DE | Page Likes | <month>`.
4. Leave *Advantage campaign budget* off for the first test — you want to see
   which ad set works, and CBO hides that.
5. **Ad set:**
   - **Conversion location: Facebook Page.**
   - **Budget: €5–10/day.** Enough to leave the learning phase, small enough that
     a bad test costs little.
   - **Schedule**: continuous.
   - **Audience:**
     - Locations: **Germany** (add Austria and German-speaking Switzerland only
       once Germany works — different costs, and mixing them hides the signal).
     - Age: **35–65+** for human-interest stories. Under 35 is cheaper per
       follower but much less likely to click a text article.
     - Language: **German**.
     - Detailed targeting — pick **one** interest cluster per ad set so you can
       tell them apart:
       - `A` — Reading, Books, Magazines, News
       - `B` — Family, Parenting, Relationships
       - `C` — Pets, Dogs, Cats, Animal welfare
       - `D` — Travel, Nature, Hiking
     - Leave *Advantage detailed targeting* **off** during testing.
   - **Placements: Manual.** Facebook Feed + Instagram Feed only. Audience
     Network and Reels burn budget on accidental taps.
6. **Ad:**
   - **Format: Single image.**
   - Image **1080×1080** (square outperforms landscape in feed). Use a real
     photograph from a story, not a logo.
   - Primary text — German, 2–3 lines, no clickbait:

     > Wahre Geschichten über Menschen, Familien und Tiere.
     > Jeden Tag eine neue Geschichte, die bleibt.
     > Folgen Sie uns für Geschichten, die man zu Ende liest.

   - Headline: the page name.
   - CTA: **Like Page**.
7. Duplicate the ad set for interest clusters B, C and D. Four ad sets at
   €5/day = €20/day.
8. **Publish.**

## Step 6 — Read the results after 3–4 days

Do not touch anything for the first 48 hours — the learning phase needs volume,
and editing an ad set restarts it.

Columns to add in Ads Manager: *Cost per result*, *CTR (all)*, *Frequency*,
*Reach*.

| Metric | Good (DE, page likes) | Act if |
|---|---|---|
| Cost per page like | €0.03–0.10 | > €0.20 → change creative |
| CTR | > 1.5 % | < 0.8 % → image is the problem |
| Frequency | < 2.0 | > 3.0 → audience too small, widen |

Then:
- Turn off ad sets above €0.20 per like.
- Double the budget on the best one (increase by ≤ 30 % per day, or you reset
  learning).
- Write two new creatives for the winning audience and test image against image.

## Step 7 — Campaign 2: traffic to the site

Once the page has ~1000 followers and posts get organic reach, add a traffic
campaign for your strongest articles.

1. **Objective: Traffic.** Optimise for **Landing page views**, not link clicks —
   you pay for people who actually arrived.
2. Budget €5–10/day.
3. Audience: **Custom audience → People who like your Page**, plus a **Lookalike
   1 %** of that audience once you have 1000+ followers.
4. Ad: use the article's own OG image and headline. The site already emits
   correct `og:title`, `og:description` and `og:image` for every article, and
   `socialHeadline` lets you write a Facebook-specific headline in the CMS.
5. **Always add UTM parameters** so you can separate paid from organic:

   ```
   https://yourdomain.de/tiere/der-hund-der-jeden-morgen…?utm_source=facebook&utm_medium=cpc&utm_campaign=traffic_okt&utm_content=ad1
   ```

   UTM parameters do **not** break canonical URLs here — the canonical is built
   without the query string, so paid traffic never splits your ranking signals.

## Step 8 — Check the share preview before spending

Before promoting any article:

1. Open **https://developers.facebook.com/tools/debug/**
2. Paste the article URL → **Debug**.
3. Confirm the image, title and description are right.
4. If you edited the article after Facebook first cached it, press **Scrape
   Again** — otherwise Facebook keeps serving the old preview.

Requirements the site already satisfies: `og:image` at 1200×630, `og:title`,
`og:description`, `og:type=article`, `og:locale=de_DE`, canonical URL.

## Step 9 — Daily routine

**Daily (5 min)**
- Ads Manager: cost per result vs yesterday.
- Reply to comments — comment velocity feeds organic reach.
- Publish one post from the day's article.

**Weekly**
- Pause anything above target cost.
- Add one new creative to the winning ad set.
- Check **Frequency**; above 3.0, refresh the audience or the creative.

**Monthly**
- Rebuild the lookalike audience from the grown follower base.
- Compare Facebook traffic against AdSense revenue: page RPM × sessions from
  Facebook should exceed what you spent, or the traffic campaign is losing money.

## Common reasons ads get rejected

| Rejection | Fix |
|---|---|
| "Low quality or disruptive content" | Landing page has too many ads or an interstitial. Lower ad density; **never run popunders on a domain you advertise** |
| "Personal attributes" | German ad copy addressing the reader's situation ("Sind Sie einsam?"). Describe the story, not the reader |
| "Sensational content" | Clickbait headline. Say what the story is |
| "Unavailable landing page" | Facebook could not load the URL. Check HTTPS and that the page returns 200 |
| "Circumventing systems" | A redirect between ad and destination. Link directly to the article |

Appeal from **Account Quality**; a human review usually resolves genuine false
positives within a day.

## Budget guidance for the first month

| Week | Focus | Budget |
|---|---|---|
| 1 | 4 page-like ad sets, find the winner | €20/day → €140 |
| 2 | Winner only, 2 new creatives | €15/day → €105 |
| 3 | Scale winner + start traffic campaign | €20/day → €140 |
| 4 | Traffic + lookalike | €20/day → €140 |

≈ €525 for month one. Expected: 3000–8000 followers and the beginning of
organic reach. That is a rough planning figure, not a promise — cost per result
varies with creative quality more than with anything else.

## What not to do

- Don't buy followers or use engagement-pod services. Engagement rate is
  permanent damage.
- Don't run ads from a personal profile.
- Don't change the ad account time zone or currency later — you can't.
- Don't edit a live ad set during the learning phase; duplicate instead.
- Don't advertise a domain that opens popunders. Facebook classifies it as a
  disruptive landing page and reach collapses across the whole domain. See
  [ADSENSE.md](ADSENSE.md) Part 3.
