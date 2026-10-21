# Common Ground

> **Two tastes. One night you’ll both enjoy.**

Common Ground is a planning agent for two people: a couple, two friends, or a parent and their adult child. Each person adds a few artists, films or shows they love. The agent uses [Qloo](https://www.qloo.com/)’s taste graph to find where the two tastes meet, and plans a night in around that overlap: something to watch, music to put on, and one “swap” each way from the other person’s world. **Every pick shows proof that it suits both of you:** its rank for each person’s taste on its own, and how much each person’s favourites pulled it. Afterwards you say who liked what, and the next plan learns from it.

- **Live app:** <https://common-ground-pho7.onrender.com>
- **Built for:** the [Qloo Agentic Hackathon](https://qloo.devpost.com/) (“Agents, but with taste”)
- **Licence:** MIT

### For judges: the 30-second version

- **What it is:** an agent that plans one night for two people whose tastes differ. Qloo finds the overlap, the agent turns it into a plan, and every pick shows its rank for each person on their own.
- **Why it needs Qloo:** the plan is built from Qloo's joint-signal results, per-person scoring and explainability. A pick in the bottom half for one person is never presented as suiting both: it is either replaced or labelled "fairest of tonight's options, but lower for …".
- **The local thread:** when the pair's shared taste has a South African music signal in Qloo, a **Mzansi match** appears (for example, Adele + Drake fans get Nasty C, Tyla and Master KG).
- **Social, not solitary:** an invite link for the second person, a **live swipe room** where a match lands on both phones at once, a shared **start-together** countdown, and **story cards** to share the result.
- **Evidence:** a Qloo-vs-AI-alone evaluation on 15 mismatched pairs: the person each pick suits least gets higher Qloo affinity in 15 of 15, and every film fits the time. We also report where the AI alone did better (it names more films outside both people's top 30). A blind study is built in at `/study` ([section 8](#8-evaluation)).
- **Try it:** tap **Gogo and Lwazi** on the [live app](https://common-ground-pho7.onrender.com). No sign-up.

---

## Contents

1. [The problem](#1-the-problem)
2. [What it does](#2-what-it-does)
3. [Try it in 60 seconds](#3-try-it-in-60-seconds)
4. [How the agent works](#4-how-the-agent-works)
5. [Why it needs Qloo](#5-why-it-needs-qloo)
6. [The Mutual Fit Proof and fair ranking](#6-the-mutual-fit-proof-and-fair-ranking)
7. [Precision: how we keep it honest](#7-precision-how-we-keep-it-honest)
8. [Evaluation](#8-evaluation)
9. [How it learns](#9-how-it-learns)
10. [Privacy](#10-privacy)
11. [What we tested, and what we left out](#11-what-we-tested-and-what-we-left-out)
12. [Gentle visit (experimental)](#12-gentle-visit-experimental)
13. [Setup](#13-setup)
14. [Configuration](#14-configuration)
15. [Deploying (Render or Vercel)](#15-deploying-render-or-vercel)
16. [Running in production](#16-running-in-production)
17. [Tests and scripts](#17-tests-and-scripts)
18. [API reference](#18-api-reference)
19. [Project structure](#19-project-structure)
20. [Known limitations](#20-known-limitations)
21. [Roadmap](#21-roadmap)
22. [Licence](#22-licence)

---

## 1. The problem

“What should we watch?” is one of the most common small arguments two people have. Recommendation apps answer it for **one** person: your feed, your history, your taste. Spotify Blend mixes two people’s music, but it covers only music and it ends at a playlist.

When two people with different tastes choose together, one of three things usually happens. One person’s favourite wins. They settle on something neither of them wants. Or they give up. What they need is **one plan**, with a reason to believe it suits *both* of them, not just whoever picked it.

**Who else does this.** "What should we watch together?" is an established category. TasteGraph's Watch Together, Flipe, Matched and Movvie all help couples choose. TasteGraph, for example, ranks shared film and TV picks by the person they suit less, and uses invite links. Common Ground doesn't claim to have invented two-person matching. What it does differently:
- **It starts from a few favourites of any kind, not a rating history.** One person's music can lead to the other's films, because Qloo's graph links across domains.
- **It turns the difference into something.** Each person gets a "swap" from the other's world, chosen as the closest fit to their own taste.
- **It explains the overlap and the balance.** Shared taste tags, per-person ranks, how much each person's favourites pulled each pick, and the agent's full trace are all visible.
- **It learns as a pair.** "Only you" and "only them" reactions shape each person's side separately; they aren't merged into one profile.

## 2. What it does

- **Finds your common ground.** Qloo compares both people’s favourites and returns the taste tags you share. They’re shown as an overlap of your two circles, with no invented compatibility percentage.
- **Plans tonight.**
  - One film or show to watch together, with two alternatives. Films longer than the time you have are dropped.
  - Three artists to put on.
  - A swap each way: something from *their* world, chosen as the closest fit to *your* taste.
- **Proves each pick.** Each pick shows its rank for each person’s taste, how much each person’s favourites pulled it, and Qloo’s joint rank (see [section 6](#6-the-mutual-fit-proof-and-fair-ranking)).
- **Works when you’re apart.** One person sends an invite link and the other adds their own favourites on their own phone. No account or database is needed.
- **Shows its work live.** While planning, the screen shows the agent’s real steps as they happen. Every plan keeps a full trace.
- **Learns from both of you.** After the night, tap who liked each thing: both of you, one of you, or neither. The next plan builds on your answers.
- **Your Mzansi match.** When Qloo finds a South African thread in the pair's shared taste, the plan adds South African artists ranked for both people. It queries Qloo's South African music tag with both tastes as joint signals, so the result depends on the pair (Tyla + Miriam Makeba fans get Brenda Fassie and Mafikizolo; Adele + Drake fans get Nasty C and Tyla). It is music only, because the same tag returned no films or shows. If Qloo finds nothing, the section doesn't appear. It can be switched off on the setup screen.
- **Where to watch or listen.** Cards open the exact Netflix title or Spotify artist when Qloo links one, plus a JustWatch search for your country, a trailer search and IMDb. Ratings from IMDb, Rotten Tomatoes and Metacritic come from Qloo. Artists can be played in a Spotify player on the page. We don't check availability ourselves; the links take you to services that do.
- **Swipe together, live.** For when you can't decide: a room with a link for each phone. Each person swipes on tonight's picks, and a pick both say yes to becomes a match on both screens at once. No second phone? Open the other side in a new tab. A swipe means "I'd consider it tonight"; the after-the-night rating is what the agent learns from.
- **Start together.** From a match, both phones count down to the same second on the server's clock, then show a shared timer with "pause for both" and reactions. It can't control Netflix or Spotify: each person presses play themselves.
- **Quick feedback for testers.** After a plan, a five-tap check-in (emoji answers that move on by themselves, plus an optional note). No names or favourites are sent.
- **Story cards.** "Play our story" turns the plan into 1080×1920 cards (your common ground, the bridge film with both ranks, your Mzansi match, the swap) to share to WhatsApp or Instagram, or save.

## 3. Try it in 60 seconds

1. Open the [live app](https://common-ground-pho7.onrender.com) and tap **Gogo and Lwazi**. Gogo loves Miriam Makeba; Lwazi loves Tyla and Black Panther.
2. Watch the agent’s steps appear while it plans. This usually takes 10–25 seconds.
3. Look at **Where your tastes meet**: South Africa, Love, Vocals, Melodic, Charismatic, Freedom.
4. Under **Watch together**, read the proof: each person's rank among tonight's candidates, each person's share of Qloo's signal behind the pick, and a plain verdict ("Top half for both of you", or "Fairest of tonight's options, but lower for …"). Open **What these numbers mean** for the raw scores.
5. Scroll to **Your Mzansi match**, then tap **Play our story** for the shareable cards, or **Swipe together, live** to try the room (open the other side in a new tab).
6. Tap **Rate tonight**. Mark one pick “We both liked it” and one “Neither”, then **Plan our next night**.
7. Night 2 opens with what night 1 taught the agent, and builds on what you both liked.
8. Open **How the agent planned this** to see every Qloo call and every check.

The examples only fill in the favourites. Everything after that is a real Qloo result.

## 4. How the agent works

```
favourites (A)            favourites (B)
      │                         │
      └──── Qloo /search ───────┘      match each favourite (retried once if Qloo is busy)
                   │
   ┌───────────────┼──────────────────────────────┐    in parallel
   │               │                              │
Qloo compare   Qloo insights, both together    Qloo insights, each side alone
shared tags    films · TV · artists            artists from A’s side and B’s side
               + explainability
   │               │                              │
   └── verify tags ┴── filter: seen, rejected, “avoid”, film runtime ──┘
                   │
      Mutual Fit Proof: score every candidate for A alone and B alone
      (filter.results.entities), rank per person, fairness on each person's own scale
                   │
      planning agent (Gemini, function calling, may call Qloo up to 3 more times)
                   │
      critic: replace a watch pick that is unfair to one person
      validate: every pick must be a Qloo result
                   │
      tonight’s plan + proof + trace  (streamed live to the browser)
```

1. **Match.** The agent searches Qloo for each favourite, using the same name-matching rule the setup form uses to show "Qloo knows …". If Qloo is busy it retries once. If Qloo still doesn't recognise a favourite, it's flagged rather than guessed.
2. **Explore.** Six Qloo calls run together, at most two at a time, with retry on rate limits:
   - `compare` on the two sets of favourites;
   - insights for films (30), TV (10) and artists (12) from both people's favourites together, with `feature.explainability`;
   - insights for artists from each person's favourites alone. These become the swaps.
3. **Filter.** The agent removes anything already suggested, anything you both rejected, anything matching your avoid list (checked against names and Qloo tags), and any film whose Qloo runtime is longer than your time.
4. **Prove.** The agent scores every remaining candidate against each person's favourites on their own (see [section 6](#6-the-mutual-fit-proof-and-fair-ranking)).
5. **Plan.** If a Gemini key is set, the model gets a brief with no names. It holds the favourites, shared tags, candidates with their per-person ranks and balance, the time, things to avoid, and the verdicts on the last plan. The model picks tonight's plan and writes short notes, and it may call `qloo_related` up to three times to explore further. Without a key, or when every model is busy, fixed rules pick from the same scored lists and the plan says so.
6. **Check.** A critic step re-checks the AI's pick to watch. If it sits in the bottom third for one person and a fairer option exists, the critic replaces it and logs why. Every id the model returns is checked against the right Qloo list.
7. **Model fallback.** The default model is `gemini-3.5-flash`, and Flash-Lite models are next. A model that is busy or times out is skipped for 3 minutes, so a slow model doesn't slow every plan. The plan records which model actually answered.

## 5. Why it needs Qloo

An LLM on its own can name films that a Metallica fan and a Taylor Swift fan *might* both like. Our evaluation shows it names real titles and follows instructions well. What it can't do is **measure** how well a pick fits each person, or find what the two tastes have in common in data. Qloo's graph is built from real affinity data across domains, and Common Ground uses five parts of it:

- **Compare** gives the taste tags two sets of favourites share.
- **Multi-entity insights** return what people who like *both* sets of things also like, so the pair's candidates differ from either person's solo results.
- **Per-person scoring** (`filter.results.entities`) scores any candidate against one person's favourites, which makes the Mutual Fit Proof possible.
- **Explainability** (`feature.explainability`) shows how much each input drove a result, so the app can show balance.
- **Entity metadata** such as runtimes, tags and content ratings makes "we have 90 minutes" and "avoid horror" real constraints.

The model never invents a title. It can only choose from what Qloo returned.

## 6. The Mutual Fit Proof and fair ranking

For every candidate film, show and artist, Common Ground asks Qloo how strongly people who like **Person A's favourites** are drawn to it, and the same for **Person B**. Each person's candidates are then ranked on that person's own scale.

On each pick you see:

| Shown | Where it comes from | What it means |
| --- | --- | --- |
| **Gogo #4 of 5** | Qloo affinity for Gogo's favourites, ranked among tonight's candidates | How this pick compares with the alternatives *for Gogo* |
| **Lwazi #2 of 5** | The same for Lwazi | The same, *for Lwazi* |
| **Gogo 33%, Lwazi 67%** | Qloo explainability on the joint result | How much each person's favourites pulled this pick |
| **Joint #1** (in "What these numbers mean") | Position in Qloo's results for both tastes together | What Qloo ranks highest for the pair as a whole |

**Fair ranking (maximin).** A pick is only as good as it is for the person it suits *least*. Raw Qloo affinities aren't comparable between people: fans of one favourite can score everything lower than fans of another. So each person's scores are first placed on their own 0–1 scale, from their best candidate to their worst. The fairest pick then has the highest *worse* score of the two. Without this step, the person whose favourite produces lower scores would always win. We found that problem on live data, and the fix is covered by tests.

**Swaps** go the other way: from Person B's world, the agent picks the artist that Person A's own taste scores highest. That's the swap most likely to land with the person receiving it.

These numbers describe what people with similar favourites tend to like. They are a strong hint, not a promise that either person will enjoy a pick, and the app says so.

## 7. Precision: how we keep it honest

| Risk | What we do |
| --- | --- |
| A pick that suits only one person | Fair ranking on each person's own scale, plus a critic that replaces an unfair AI choice and says why in the trace. |
| A shared tag that doesn't really describe both people | A tag counts as **confirmed** only if Qloo puts it on *both* people's own favourites, not just in the compare output. Unconfirmed tags have a dashed outline. Tags about the fan base rank below genre and mood. |
| The model invents a pick | Every id it returns is checked against the right Qloo list. Invalid picks are dropped and logged. |
| The model asks Qloo about something made up | Tool calls using ids Qloo never returned are refused and logged. |
| Notes that overpromise | The model is told never to promise enjoyment. Notes are labelled as the planner's; the numbers come from Qloo. Names are filled in afterwards, even when the model forgets the placeholders. |
| A film longer than your evening | Each film's Qloo runtime is checked against your time. |
| "Avoid horror" ignored | Exclusions are matched against each item's name and its Qloo tags. |
| Suggesting the same thing again | Anything already suggested, and anything you both rejected, is filtered out. |
| A favourite matched to the wrong thing | The setup form shows "Qloo knows …" or "Use … ?" as you type, using the planner's own matching rule. |
| A fake "87% compatible" score | There isn't one. The only score is a count: how many tried picks you both liked. |
| A silent fallback | If Qloo is down or busy, results are saved ones, or the model failed, a notice above the plan says so. |

## 8. Evaluation

We compared Common Ground with **the same Gemini model on its own**, using 16 deliberately mismatched taste pairs; 15 were usable. The full method and caveats are in [docs/EVALUATION.md](docs/EVALUATION.md). In brief:

| Measure | Common Ground | AI alone |
| --- | --- | --- |
| Suggestions Qloo could find | 90 of 90 | 88 of 90 |
| Films checked against the time available | 35 of 35 | 0 of 40 (not checkable) |
| Films in neither person's own top 30 | 77% | 92% |
| Mean Qloo affinity for the person each pick suits least | 0.843 | 0.771 |
| Mean gap between the two people | 0.056 | 0.090 |

What we take from it:
- The AI alone was more reliable than we expected: it rarely named titles Qloo couldn't find, and it respected avoid lists.
- **Discovery isn't our advantage.** The AI alone names more films outside both people's top 30, because it doesn't draw from Qloo at all. We measured it to check our own claim, and dropped the claim.
- Common Ground's advantages are **measured balance** (higher worst-off affinity in 15 of 15 pairs, a smaller gap between the two people) and **real constraints** (every film's runtime checked).
- The affinity rows use the same Qloo scores Common Ground optimises, so they show the fairness logic works, **not** that people enjoy the picks more.

To measure enjoyment, the app includes a **blind study** at [`/study`](https://common-ground-pho7.onrender.com/study):
- Two people add favourites and get one mixed list from both methods, shown without images or labels.
- Each person rates every pick on their own.
- The result code they send back holds only ratings: no names and no favourites.
- [`/study/results`](https://common-ground-pho7.onrender.com/study/results) adds the codes up in the browser.

## 9. How it learns

After each night, every pick gets one of four verdicts:

- **We both liked it:** added to both people's favourites in the next Qloo request, so the next plan starts from it.
- **Only one of you:** added to that person's side only, which shapes their ranks and their swaps.
- **Neither:** never suggested again.
- **Skipped:** not counted.

Learning lasts for the browser tab. There's no account, so nothing is saved after the tab is closed. From night 2, the app shows how many of the picks you tried you both liked: a count of your own taps, not a prediction.

## 10. Privacy

- **Names never go to Qloo or the model.** The model sees `{A}` and `{B}`, and the app fills in the names afterwards.
- **Your favourites do go to outside services:** to Qloo, and for planning to Google's Gemini. The app says so on the setup screen.
- **There are no accounts and no database.** The session lives in your browser tab (`sessionStorage`) and is sent with each request. The server keeps nothing, and its logs never include names or favourites.
- **Invite links** carry Person A's half of the setup in the part of the link after `#`, which browsers never send to the server.
- **Study result codes** contain ratings and which method suggested each pick, nothing else.
- **Live rooms** are the one thing the server holds: both first names and tonight's picks (titles, artwork links and ranks), in memory, for 24 hours. No favourites. They are lost if the app restarts.

## 11. What we tested, and what we left out

**Places are dominated by location, not taste.** Before building, we tested whether Qloo's place recommendations change with taste:
- Sandton and Braamfontein shared **0 of 10** venues.
- Within Sandton, Miriam Makeba alone and Makeba with Tyla shared **9 of 10**. Metallica and Taylor Swift shared **6 of 10**.

**Films change strongly with taste.** Results for the pair are genuinely different from either person's solo results.

So this version is **at home only**: watch and listen. "Going out" is left out until we can show its places suit both people, not just that they're nearby. We built a live-venues section during development and removed it for this reason.

**What else we built and left out of this submission.** A per-person "taste drops" feature (a daily artist or film, chosen on the phone by a small Bayesian model with Thompson sampling, with push notifications) works, and is on the [`expansion-full`](https://github.com/lk-nyoka/common-ground/tree/expansion-full) branch. We left it out because with a handful of reactions per person its predictions would be too thin to trust, it learns one person rather than the pair, and its schedules would need durable storage. See [section 21](#21-roadmap).

## 12. Gentle visit (experimental)

At `/gentle` is the project's first mode, which started during this hackathon as "Back Then". It plans a calm visit to someone living with dementia, from a few things their family knows they loved when they were young. It follows the same honesty rules: items only from Qloo, labelled sources and a real trace. It adds era filtering, an avoid list and logging of the person's reactions by their caregiver. It is a reminiscence aid, not medical advice or treatment, and hasn't been tested with carers. It is kept separate from the main product.

## 13. Setup

**Requirements:** Node.js 18.17 or later, and npm.

```bash
git clone https://github.com/lk-nyoka/common-ground.git
cd common-ground
npm ci
cp .env.example .env.local        # PowerShell: Copy-Item .env.example .env.local
```

Fill in `.env.local`:

```ini
QLOO_API_KEY=your_qloo_hackathon_key
GEMINI_API_KEY=your_gemini_key
GEMINI_MODEL=gemini-3.5-flash
```

- **Qloo key:** request one through the [hackathon developer guide](https://docs.qloo.com/reference/qloo-llm-hackathon-developer-guide). It works only against `https://hackathon.api.qloo.com`.
- **Gemini key:** free from [Google AI Studio](https://aistudio.google.com/apikey).

```bash
npm run dev     # http://localhost:3000
```

Both keys are optional. Without them the app still runs and says what's missing. Never commit `.env.local`; it is git-ignored. The build works on Windows too, including from a folder whose path contains spaces.

## 14. Configuration

| Variable | Required | Default | What it does |
| --- | --- | --- | --- |
| `QLOO_API_KEY` | For live Qloo | none | Qloo hackathon key |
| `QLOO_BASE_URL` | No | `https://hackathon.api.qloo.com` | Qloo API base URL |
| `QLOO_CAPTURE` | No | off | `true` saves live responses to `data/qloo-fixtures/` as a local demo backup. Leave it off when hosted. |
| `GEMINI_API_KEY` | For the AI planner | none | Without it, the app uses rules mode. |
| `GEMINI_MODEL` | No | `gemini-3.5-flash` | The first model tried. Flash-Lite models are the fallback. |
| `GEMINI_BASE_URL` | No | Google's API | Only for testing against a mock. |
| `PLAN_RATE_LIMIT` | No | `20` | Plans per visitor per 10 minutes. |
| `NEXT_PUBLIC_SITE_URL` | No | Render's URL | Public URL used in link previews. |
| `KEEP_AWAKE` | No | on (Render only) | Set to `false` to stop the self-ping on Render. |
| `PREWARM` | No | on (Render only) | When the server starts, and every 5 hours, it plans the two example pairs once with Qloo only, filling its cache so examples are fast. `false` turns this off; `true` turns it on elsewhere. |
| `QLOO_CONCURRENCY` | No | `3` | How many Qloo calls run at once. |
| `FEEDBACK_KEY` | No | none | Any secret. Turns on the owner's feedback summary at `/feedback?key=…`. |
| `FEEDBACK_WEBHOOK_URL` | No | none | Where tester feedback is also sent, so it survives restarts. A Discord webhook gets a readable message; any other https URL gets the JSON. |

**Timeouts:**
- Each Qloo call times out after 8 s.
- Each model call has up to 20 s, shared across the fallback chain.
- The agent stops exploring after about 40 s.
- Routes allow 60 s, and the browser gives up after 75 s.

Live Qloo responses are cached in memory for six hours, which Qloo allows for private server-side caching. Saved responses (from `QLOO_CAPTURE=true`) and evaluation output (`results/`) are git-ignored on purpose, because Qloo asks that its response data isn't stored in a public repository.

## 15. Deploying (Render or Vercel)

First push to a **public** GitHub repo, and check that nothing private is tracked: `git ls-files | grep -E "env|fixtures|results"` should show only `.env.example` and `data/qloo-fixtures/README.txt`.

### Render (free web service)

The repo includes `render.yaml`.

1. In Render, choose **New → Blueprint** and pick the repo. It builds with `npm ci --include=dev && npm run build`, starts with `npm start` and runs on Node 20.
2. When asked, enter `QLOO_API_KEY` and `GEMINI_API_KEY`.
3. Deploy, then try an example pair on your phone. `/api/status` is the health check.

Free Render services sleep after about 15 minutes without visits, and waking one takes up to a minute. To prevent that, `instrumentation.ts` makes the server visit its own public address (`RENDER_EXTERNAL_URL`) every 10 minutes. The free plan's 750 hours a month cover one service running all month. The same file pre-warms the examples on start-up (see `PREWARM`), because each call to the Qloo hackathon API takes a few seconds.

### Vercel

1. Import the repo at [vercel.com/new](https://vercel.com/new).
2. Add `QLOO_API_KEY`, `GEMINI_API_KEY` and `GEMINI_MODEL` as environment variables.
3. Deploy.

## 16. Running in production

| Area | What the app does |
| --- | --- |
| **Input** | The server treats the browser's session as untrusted. It keeps only known fields, trims text and caps every list (3 favourites, 5 exclusions, 4 stored plans and so on). Only id-shaped Qloo ids are passed on to Qloo. Request bodies are capped at 400 KB. The raw Qloo helper routes validate their query parameters too. |
| **Abuse** | Each visitor can make 20 plans per 10 minutes. The raw Qloo helper routes have their own, higher limit. |
| **Errors** | Bad input gets a plain message. Unexpected errors get a generic one and are logged without internals going to the browser. The app has its own error and 404 pages. A failed first plan keeps whatever was typed. |
| **Speed** | Each candidate list is scored as soon as Qloo returns it. Live Qloo responses are cached, and the examples are pre-warmed on start-up. Busy AI models are skipped for a while, and the whole plan works to a 42-second budget, with the AI getting whatever time Qloo leaves. If the AI leaves a slot empty, the fair ranking fills it. Plans stream their steps to the browser as they happen. |
| **Headers** | In production: Content Security Policy, HSTS, `X-Frame-Options: DENY`, `nosniff`, a strict referrer policy and a locked-down permissions policy. API responses are `no-store`. |
| **Logs** | One JSON line per plan: time taken, plan number, planner, model, Qloo status and pick count. No names or favourites are logged. |
| **Accessibility** | Text contrast is at least 4.5:1. Keyboard focus is always visible. Main buttons are at least 44 px tall, and smaller controls at least 36 px. Results, progress and errors are announced to screen readers. Motion respects reduced-motion settings. |
| **Staying awake** | On Render, the server pings itself every 10 minutes. |

**Before a commercial launch,** two things are needed:
- **Qloo production access.** The hackathon key only works on the hackathon API and is switched off after judging.
- **A shared store.** Rate limits are currently held in one server's memory, so they need a shared store if the app runs on more than one server.

## 17. Tests and scripts

| Command | What it does |
| --- | --- |
| `npm test` | 28 tests with Qloo and Gemini faked; no keys needed (planner, fairness, Mzansi lane, invite links, study, and live rooms) |
| `npm run typecheck` | TypeScript check of the app |
| `npm run test:live` | Plans the two example pairs against the real APIs and prints the proof for every pick |
| `npm run eval` | The Qloo vs AI-alone evaluation ([docs/EVALUATION.md](docs/EVALUATION.md)) |
| `npm run test:qloo` | Gentle visit's Qloo vs AI-alone comparison (needs `npm run dev` running) |

The tests check that:
- every pick is a Qloo result, labelled as such;
- each pick carries both people's ranks and the explainability split;
- fair ranking beats one-sided picks, and the critic replaces an unfair AI pick and explains why;
- films longer than your time are dropped, and avoid-list items are filtered using Qloo's tags;
- shared tags count as confirmed only when both people's favourites carry them;
- names never reach Qloo or the model, and are filled back in even when the model forgets the placeholders;
- invented model picks are dropped;
- a model failure falls back to rules, and a Qloo outage produces no invented plan;
- feedback adds the right signals, and rejected items never return;
- invite links and study codes round-trip correctly and reject junk.

## 18. API reference

| Method and path | Body | Returns |
| --- | --- | --- |
| `POST /api/cg/plan` | `{ session }` | `{ session }` with a new plan at the front of `plans`. Send `Accept: application/x-ndjson` to stream `{type:"step"}` lines, then `{type:"done", session}`. |
| `POST /api/cg/feedback` | `{ session, verdicts: { [pickId]: "both" \| "a" \| "b" \| "neither" } }` | The same as `/plan`, after applying the feedback. |
| `POST /api/study` | `{ session }` | `{ items }`: both methods' picks, merged and shuffled. |
| `POST /api/room` | `{ names, items }` | `{ id }` for a new live room. The other person opens `/room/{id}?p=b`. |
| `GET /api/room/{id}`, `POST /api/room/{id}` | `{ who, type: "swipe" \| "party_start" \| "party_pause" \| "party_resume" \| "party_end" \| "react", … }` | The room, with `serverNow` so both phones can line up the countdown. |
| `GET /api/room/{id}/events?p=a\|b` | none | Server-sent events: the room each time it changes. |
| `POST /api/feedback`, `GET /api/feedback?key=` | `{ ease, fit, liked, again, comment, context }` | Saves tester feedback; the summary needs `FEEDBACK_KEY`. |
| `GET /api/img?u=` | none | Qloo artwork served from our own site, so story cards can be drawn and saved. Only `images.qloo.com` is allowed. |
| `GET /api/status` | none | `{ qloo: { keySet, savedResponses }, llm: { configured, model } }`. Never returns the keys. |
| `GET /api/qloo/search`, `GET /api/qloo/insights` | query parameters | Raw Qloo helpers, used by the setup form and Gentle visit |
| `POST /api/agent/*` | | Gentle visit |

## 19. Project structure

```
app/
  page.tsx                  Common Ground: setup → live progress → plan → feedback
  study/, study/results/    Blind study and its results page
  room/[id]/                Live room: swipe to match, start together
  gentle/                   Gentle visit (experimental)
  api/cg/plan, feedback     Planning routes (streaming)
  api/study                 Both methods for the blind study
  api/room/*                Live rooms and their event stream
  api/img                   Qloo artwork proxy for story cards
  api/status, api/qloo/*    Status and raw Qloo helpers
components/cg/              Setup, PlanView, FitProof, Links (where to watch), Stories, Venn, Progress, ui
lib/cg/agent.ts             The planning agent: matching, exploring, scoring, fairness, critic
lib/cg/baseline.ts          The AI-alone baseline
lib/cg/learn.ts             Feedback and the shared hit count
lib/cg/invite.ts            Invite links (the setup travels in the link after #)
lib/cg/study.ts             Study result codes and summary
lib/cg/validate.ts          Server-side input checks and size limits
lib/cg/match.ts             Name matching shared by the planner and the form
lib/qloo-client.ts          Qloo search, insights, compare, per-person scoring; cache, rate limiting
lib/llm.ts                  Gemini with function calling, model fallback and cooldown
lib/cg/room-items.ts        Turns a plan into a swipe deck
lib/server/                 Rate limiting, safe errors, logs, streaming, rooms
instrumentation.ts          Keeps the free Render service awake
tests/                      Unit tests, live check, evaluation
docs/EVALUATION.md          Evaluation method and results
```

## 20. Known limitations

- **Scope:** two people, at home only. Groups and going out aren't built.
- **Live rooms** live in one server's memory, so they reset when the app redeploys or restarts. That's fine for one free instance; several would need a shared store such as Redis.
- **Start together** can't control playback on Netflix or Spotify. It counts you in together and keeps a shared clock and pause.
- **Favourites:** artists, films and TV shows only. Qloo supports more domains; we kept to the ones that tested well.
- **Popularity:** Qloo's results lean toward popular and acclaimed titles. Fair ranking stops one person dominating, but it can choose a "most even" pick that neither person ranks first.
- **Small candidate pools:** a short time limit can leave only a few films. Ranks such as "#2 of 5" are then coarse.
- **Unverified enjoyment:** the evaluation's affinity measures are Qloo's own, and only the blind study measures enjoyment.
- **Speed:** Qloo's hackathon API is rate-limited, and free Gemini models are sometimes busy. A plan can take 20–30 seconds; when the AI is busy, fixed rules pick from the same Qloo results.
- **Learning:** lasts for the browser tab only.
- **Streaming:** availability isn't checked by us. Netflix and Spotify links open the exact title only when Qloo links one; otherwise they search JustWatch or Spotify.
- **Mzansi match** is music only, and Qloo's results lean toward well-known South African artists.

## 21. Roadmap

In order of what we'd build next, each only with evidence that it helps the pair:

1. **Persistent pair spaces:** a private, expiring space that two people share, so learning outlasts the tab. It needs consent, expiry, deletion and a durable store.
2. **Taste drops:** the per-person daily discovery on the `expansion-full` branch, re-aimed at the pair, and only once there is enough feedback to evaluate it.
3. **Verified streaming availability by country**, with provider attribution.
4. **Going out:** only if Qloo's place or event results can be shown to depend on taste as well as location.

## 22. Licence

MIT. See [LICENSE](LICENSE).
