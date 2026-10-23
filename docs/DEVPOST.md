# Common Ground: Devpost submission

Everything entered on the Devpost form, kept here so it lives with the code.

- **Tagline:** Two tastes. One night you'll both enjoy.
- **Try it out:** https://common-ground-pho7.onrender.com · https://github.com/lk-nyoka/common-ground
- **Began:** 11 October 2026 (built from scratch for this hackathon)
- **Built with:** next.js, typescript, react, tailwindcss, node.js, qloo, gemini, google-gemini-api, render, server-sent-events, playwright
- **Gallery:** [`docs/media/gallery`](media/gallery) (3:2, upload in number order; `01-cover.jpg` is the thumbnail)
- **Demo video:** [`docs/media/common-ground-demo.mp4`](media/common-ground-demo.mp4)

---

## Inspiration
My gogo loves Miriam Makeba. I love Tyla. Every time we try to pick something to watch or listen to together, one of us ends up sitting through the other person's choice. Most recommenders are built for one person. Even the "group" ones just average everyone out, so the person whose taste is furthest from the middle loses. I wanted an agent that looks after *both* people, and can show that it did.

## What it does
Common Ground plans one night for two people with different taste: a couple, two friends, or a gogo and her grandson. Each person names a film, an artist and a series they love. Then the agent:

- **finds the overlap** using Qloo's taste graph: the tags you share, checked against each person's own favourites;
- **plans the night**: something to watch that fits the time you have, music to put on, and a swap each way from the other person's world;
- **proves every pick is fair**: each pick shows where it ranks for each person separately. If a pick only suits one person, it gets swapped out or labelled "Leans towards Gogo's taste";
- **adds Mzansi flavour and comedy**: South African artists when Qloo finds a South African thread in your shared taste, and stand-up comedians ranked for both of you, with links to their upcoming shows;
- **works when you're apart**: send a link, the other person adds their favourites on their own phone, the plan opens on both phones, and there's a chat beside it;
- **helps you decide**: swipe on tonight's picks together, match when you both say yes, then press play at the same moment;
- **goes out if you'd rather**: date spots within 30 km (food, coffee, drinks, outdoors, live music, comedy and theatre), ordered for both tastes;
- **learns**: after the night you tap who liked what, and the next plan builds on it.

No sign-up. It works on any phone.

## How we built it
Next.js 14, TypeScript and Tailwind, hosted on Render's free tier.

**Qloo is the engine.** Fair ranking needs a score for every candidate for each person separately, so we use Qloo insights with `filter.results.entities` per person. Joint signals in insights find what fans of *both* tastes go on to love. Qloo's explainability shows the split between the two people. Compare gives the shared tags. Tag filters drive the South African and stand-up comedy lanes. Location and radius filters find nearby places.

**Fairness is maximin, not averaging.** Each candidate's score is led by the rank of the person it suits *least*:

$$\text{fair}(c) = \min_{p}\left(1 - \frac{\text{rank}_p(c) - 1}{N_p - 1}\right) + 0.01\cdot\min_p \text{norm}_p(c) + 0.001\cdot\min_p \text{aff}_p(c)$$

**The agent is boxed in by the data.** Gemini plans the night with function calling, but it can only choose among Qloo results. A critic step replaces any pick that's in the bottom half for one person when a pick in the top half for both exists. AI notes that overclaim are replaced with Qloo's actual ranks. Every step appears in a visible trace ("How this plan was made").

Live rooms and pair spaces use server-sent events, so swipes, matches, the plan and chat appear on both phones in real time.

## Challenges we ran into
- **Cross-domain gaps.** If someone only adds music, Qloo returns no direct film affinity for them. We fall back to scoring them through their favourites' Qloo tags, and the app says when it did that.
- **Name matching.** "Kelvin Momo" was matching "Momo" and "tyla" was matching Tyla Yaweh. We rewrote matching so exact names win and a candidate must contain the whole query, never the other way round.
- **A critic that didn't swap.** Our first fairness check used affinity-scaled scores, so unfair picks slipped through. Moving to rank-based "top half for both" fixed it. We also had to clear the AI's summary after a swap so it didn't describe the old film.
- **Real testers.** Friends tested it on their own phones and found things we hadn't: the second person couldn't move on to the plan, there was too much scrolling (we cut the plan from about 8 screens to under 3), and the slot order was confusing.

## Accomplishments that we're proud of
On 15 deliberately mismatched pairs, compared with the same AI model working alone:
- the person each pick suits least got a higher Qloo affinity in **all 15 pairs** (0.843 vs 0.771);
- the gap between the two people was smaller (0.056 vs 0.090);
- every film's runtime was checked against the time available (35 of 35, against none for the AI alone).

Where it lost: the AI alone suggested more films outside both people's top 30 (92% vs 77%). We report that too. Details in [EVALUATION.md](EVALUATION.md).

## What we learned
Fairness has to be *shown*, not claimed. People trusted the picks once they could see "#3 for you, #5 for Gogo". We also learned to let Qloo decide and the AI explain, not the other way round.

## What's next for Common Ground
- Run the built-in blind study (`/study`) with real pairs to measure enjoyment, not just affinity.
- Groups of three or more, using the same "look after the person it suits least" rule.
- Persistent accounts so a pair's history carries across nights.
