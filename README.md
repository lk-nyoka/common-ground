# Common Ground

> **Two people, a few favourites each. Find what you’ll both love tonight.**

Common Ground is a planning agent for two people: a couple, two friends, or a parent and their adult child. Each person adds a few artists, films or shows they love. The agent uses [Qloo](https://www.qloo.com/)’s taste graph to find where the two tastes meet. It plans a night in around that overlap: something to watch, music to put on, and one “swap” each way from the other person’s world. Then it learns from what both of you thought.

Built for the [Qloo Agentic Hackathon](https://qloo.devpost.com/) (“Agents, but with taste”).

---

## Contents

1. [The problem](#1-the-problem)
2. [What it does](#2-what-it-does)
3. [Try it in 60 seconds](#3-try-it-in-60-seconds)
4. [How the agent works](#4-how-the-agent-works)
5. [Why it needs Qloo](#5-why-it-needs-qloo)
6. [Precision: how we keep it honest](#6-precision-how-we-keep-it-honest)
7. [How it learns](#7-how-it-learns)
8. [Privacy](#8-privacy)
9. [What we tested, and what we left out](#9-what-we-tested-and-what-we-left-out)
10. [Gentle visit mode](#10-gentle-visit-mode)
11. [Setup](#11-setup)
12. [Configuration](#12-configuration)
13. [Deploying (Render or Vercel)](#13-deploying-render-or-vercel)
14. [API reference](#14-api-reference)
15. [Project structure](#15-project-structure)
16. [Known limitations](#16-known-limitations)
17. [Licence](#17-licence)

---

## 1. The problem

“What should we watch?” is one of the most common small arguments two people have. Recommendation apps answer it for **one** person: your feed, your history, your taste. Spotify Blend mixes two people’s music, but it covers only music and it ends at a playlist.

Two people with different tastes don’t need two feeds. They need **one plan** that both will enjoy, and a reason to trust it. They want to know *why* a film works for both of them, and not only for whoever picked it.

## 2. What it does

- **Finds your common ground.** Qloo compares both people’s favourites and returns the taste tags you share. The app shows them on a card you can share, with no invented compatibility percentage.
- **Plans tonight.** It picks:
  - one film or show to watch together (a TV episode if time is short), with up to two alternatives;
  - three artists to put on;
  - a swap each way: something from *their* world for *you* to try.
- **Explains every pick.** Each item says why it was chosen and carries a “Qloo live” or “Qloo saved” label.
- **Learns from both of you.** After the night, tap who liked each thing: Both, one of you, or Neither. The next plan builds on your answers.
- **Shows its working.** Every plan has a trace of the agent’s real Qloo and model calls.

## 3. Try it in 60 seconds

1. Open the app and tap a sample pair, e.g. **Thabo + Naledi**. Thabo likes Metallica and The Dark Knight; Naledi likes Taylor Swift and The Notebook.
2. Read the dark **click on** card. It shows the tags they share, such as Drama, Energetic, Melodic and Passionate.
3. Look at tonight’s plan: a film, music, and the two swaps.
4. Tap **Both** on the film and **Neither** on something else, then press **Plan our next night**.
5. Plan 2 opens with what plan 1 taught the agent, and builds on what you both loved.
6. Open **How the agent got here** to see every call.

The sample pairs only fill in the favourites. Everything you see after that is a real Qloo result.

## 4. How the agent works

```
favourites (A)   favourites (B)
      │                │
      └── Qloo /search ┘          match each favourite to a Qloo entity
              │
   ┌──────────┼───────────────────────────────┐   in parallel
   │          │                               │
Qloo compare  Qloo insights (both together)   Qloo insights (each side alone)
shared tags   films · TV · artists            artists from A’s side, B’s side
   │          │                               │
   └──── verify tags ── filter (seen, rejected, “avoid”) ──┘
                       │
             planning agent (Gemini, function calling)
             may call qloo_related up to 3 more times
                       │
        validate every pick against the Qloo lists
                       │
        tonight’s plan + reasons + trace
```

**Step 1: match.** The app searches Qloo for each favourite. If nothing matches, the favourite is flagged rather than guessed.

**Step 2: explore.** The agent makes six Qloo calls together. At most two run at a time, and calls that hit the rate limit are retried. The six calls are:
- `compare` on the two sets of favourites;
- insights for films, TV and artists, from both people’s favourites together;
- insights for artists from each person’s favourites alone. These become the swaps.

**Step 3: plan.** If a Gemini key is set, the model gets a brief and picks tonight’s plan from it. The brief holds:
- each person’s favourites and the shared tags;
- the candidate lists, with their Qloo ids;
- the time available and anything to avoid;
- the verdicts on the last plan.

The model can call `qloo_related` to explore further, for example from something both people loved last time. With no key, or when every model is busy, fixed rules pick from the same Qloo lists and the app says so.

**Model fallback.** The default model is `gemini-3.5-flash`. If it is busy or has been retired, the agent tries Flash-Lite models in turn. The plan shows which model actually answered.

## 5. Why it needs Qloo

An LLM on its own can name films that a Metallica fan and a Taylor Swift fan *might* both like. But it is guessing from general knowledge, and it can’t tell you how strongly the two tastes overlap. Qloo’s graph is built from real affinity data across domains:

- **Compare** gives the taste tags two sets of entities share.
- **Multi-entity insights** return what people who like *both* sets of things also like. In our live tests, Metallica and Taylor Swift together returned films such as *Titanic* and *Slumdog Millionaire*. Neither film appeared in either person’s results on their own.
- **Cross-domain results** mean music favourites can lead to films, and the other way round.

The model never invents a title. It can only choose from what Qloo returned.

## 6. Precision: how we keep it honest

This is an ML product, so we measure what we can and refuse to fake the rest.

| Risk | What we do |
| --- | --- |
| A shared tag that doesn’t really describe both people | A tag counts as **confirmed** only if Qloo puts it on *both* people’s own favourites, not just in the compare output. Unconfirmed tags are drawn with a dashed outline. Tags about a fan base rank below genre and mood tags. |
| The model invents a pick | Every id the model returns is checked against the right Qloo list: films for “watch”, A’s side for B’s swap, and so on. Invalid picks are dropped and logged. |
| The model asks Qloo about something made up | A tool call that uses ids Qloo never returned is refused and logged. |
| Suggesting the same thing again | Anything already suggested, and anything both people rejected, is filtered out. |
| “Avoid horror” is ignored | Exclusions are matched against each item’s name and its Qloo tags. In one test this is how *1917* was dropped. |
| One person’s taste drowns out the other’s | The music list is balanced. Artists that Qloo also returns from each person’s side alone come first, alternating between the two sides. |
| A fake “87% compatible” score | There isn’t one. The only number shown is a count: **shared hits**, the number of tried items you both loved. |
| A silent fallback | If Qloo is down, the results are saved ones, or the model failed, a notice above the plan says so. |

## 7. How it learns

After each night, every item gets one of four verdicts:

- **Both:** the item becomes a new Qloo signal for both people, so the next plan starts from it.
- **Only A / Only B:** the item becomes a signal for that person only, shaping their side and their swaps.
- **Neither:** the item is never suggested again.
- **Skipped:** the item isn’t counted.

From the second plan on, the app shows the **shared hit rate**: items both of you loved, out of all the items you tried. It is a count of your own taps, not a prediction.

## 8. Privacy

- Names never go to Qloo or the model. The model sees `{A}` and `{B}`, and the app fills in the names afterwards.
- Only favourites and Qloo ids are sent to Qloo.
- There are no accounts and no database. The session lives in your browser tab (`sessionStorage`) and is sent with each request. The server keeps nothing.

## 9. What we tested, and what we left out

Before building, we tested whether Qloo’s **place** recommendations change with taste:

- Sandton and Braamfontein shared **0 of 10** venues, so location dominates.
- Within Sandton, Miriam Makeba alone and Makeba with Tyla shared **9 of 10** venues. Metallica and Taylor Swift shared **6 of 10**. Taste changes places only a little.
- **Films** changed strongly with taste. The pair results were genuinely different from either person’s solo results.

So the first version is **at home only**: watch and listen. “Going out” is left out until we can show that its places suit both people, not just that they are nearby.

## 10. Gentle visit mode

The project’s first mode lives at `/gentle`. It plans a calm visit to someone living with dementia, starting from a few things their family knows they loved when they were young. It follows the same honesty rules: items only from Qloo, labelled sources and a real trace. It adds era filtering, an avoid list and logging of the person’s reactions by their caregiver. It is a reminiscence aid, not a treatment, and makes no medical claims.

## 11. Setup

**Requirements:** Node.js 18 or later, and npm.

```bash
git clone <your-repo-url> common-ground
cd common-ground
npm install
cp .env.example .env.local        # PowerShell: Copy-Item .env.example .env.local
```

Fill in `.env.local`:

```ini
QLOO_API_KEY=your_qloo_hackathon_key
GEMINI_API_KEY=your_gemini_key
GEMINI_MODEL=gemini-3.5-flash
```

- **Qloo key:** request it through the [hackathon developer guide](https://docs.qloo.com/reference/qloo-llm-hackathon-developer-guide). It works only against `https://hackathon.api.qloo.com`.
- **Gemini key:** free from [Google AI Studio](https://aistudio.google.com/apikey).

```bash
npm run dev     # http://localhost:3000
```

Both keys are optional. Without them the app still runs and says what’s missing. Never commit `.env.local`; it is git-ignored.

## 12. Configuration

| Variable | Required | Default | What it does |
| --- | --- | --- | --- |
| `QLOO_API_KEY` | For live Qloo | none | Qloo hackathon key |
| `QLOO_BASE_URL` | No | `https://hackathon.api.qloo.com` | Qloo API base URL |
| `QLOO_CAPTURE` | No | off | `true` saves live responses to `data/qloo-fixtures/` as a backup for local demos. Leave it off on Vercel. |
| `GEMINI_API_KEY` | For agent mode | none | Without it, the app uses rules mode. |
| `GEMINI_MODEL` | No | `gemini-3.5-flash` | The first model tried. Flash-Lite models are the fallback. |
| `GEMINI_BASE_URL` | No | Google’s API | Only for testing against a mock. |

**Timeouts:**
- Each Qloo call times out after 8 s.
- Each model call has 20 s, shared across the fallback chain.
- The agent stops exploring after about 40 s.
- Routes allow up to 60 s.

Live Qloo responses are cached in memory for six hours, which Qloo allows for private server-side caching.

Saved responses (from `QLOO_CAPTURE=true`) are git-ignored on purpose. Qloo asks that its response data is not stored in a public repository.

## 13. Deploying (Render or Vercel)

First push to a **public** GitHub repo, and check that nothing private is tracked: `git ls-files | grep -E "env|fixtures|results"` should show only `.env.example` and `data/qloo-fixtures/README.txt`.

### Render (free web service)

The repo includes `render.yaml`.

1. In Render, choose **New → Blueprint** and pick the repo. Render reads `render.yaml`: it builds with `npm ci --include=dev && npm run build` and starts with `npm start`, on Node 20.
2. When asked, enter `QLOO_API_KEY` and `GEMINI_API_KEY`. `GEMINI_MODEL` is already set. Don't set `QLOO_CAPTURE`.
3. Deploy, then try a sample pair on your phone. `/api/status` is the health check.

Free Render services go to sleep after about 15 minutes without visits, and waking one takes up to a minute. To avoid that, `instrumentation.ts` makes the server visit its own public address (`RENDER_EXTERNAL_URL`, which Render sets) every 10 minutes, so it stays awake. The free plan's 750 hours a month covers one service running all month. Set `KEEP_AWAKE=false` to turn this off. It does nothing outside Render.

### Vercel

1. Import the repo at [vercel.com/new](https://vercel.com/new). Vercel detects Next.js automatically.
2. Under **Environment Variables**, add `QLOO_API_KEY`, `GEMINI_API_KEY` and `GEMINI_MODEL`. Don't set `QLOO_CAPTURE`.
3. Deploy, then try a sample pair on your phone.

## 14. API reference

| Method and path | Body | Returns |
| --- | --- | --- |
| `POST /api/cg/plan` | `{ session }` | `{ session }` with a new plan at the front of `plans` |
| `POST /api/cg/feedback` | `{ session, verdicts: { [pickId]: "both" \| "a" \| "b" \| "neither" } }` | `{ session }` with the feedback applied and the next plan made |
| `GET /api/status` | none | `{ qloo: { keySet, savedResponses }, llm: { configured, model } }`. Never returns the keys. |
| `POST /api/agent/*`, `GET /api/qloo/*` | | Routes for Gentle visit mode, and raw Qloo helpers |

## 15. Project structure

```
app/
  page.tsx                Common Ground (setup → plan → feedback)
  gentle/page.tsx         Gentle visit mode
  api/cg/plan, feedback   Common Ground routes
  api/status              What's connected
components/cg/            Setup and PlanView
lib/cg/agent.ts           The planning agent
lib/cg/learn.ts           Feedback, signals, shared hit rate
lib/cg/types.ts, samples.ts
lib/qloo-client.ts        Qloo search, insights, compare; cache, rate limiting, saved responses
lib/llm.ts                Gemini with function calling and model fallback
```

## 16. Known limitations

- It plans for two people, at home, only. Groups and going out are not built.
- Favourites can be artists, films or TV shows. Qloo also supports books, podcasts and more, but we kept to the domains where results tested well.
- A very popular favourite can still pull the joint list toward one person. The balancing reduces this but doesn’t remove it.
- Qloo’s hackathon API is rate-limited, so at busy times a plan can take 20–30 seconds.
- Free Gemini models are sometimes overloaded. When that happens, the plan says it was picked by rules from the same Qloo results.

## 17. Licence

MIT. See [LICENSE](LICENSE).
