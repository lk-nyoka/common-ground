# Common Ground: Devpost description (draft)

## Inspiration

Most "what should we watch?" fights aren't about the film. They're about one person's taste quietly winning every time. In South Africa that gap is often generational or cultural: a gogo who loves Miriam Makeba and a grandson who loves Tyla. We wanted an agent that finds the night both people would choose, and proves it isn't secretly favouring one of them.

## What it does

Each person adds a few artists, films or shows. Common Ground then:

- **finds the overlap** with Qloo (shared taste tags, checked against both people's own favourites);
- **plans one night**: a film or show that fits the time you have, music to put on, and a swap each way from the other person's world;
- **proves every pick**: its rank for each person on their own, each person's share of Qloo's signal behind it, and a plain verdict, either "Top half for both of you" or "Fairest of tonight's options, but lower for Gogo";
- **adds a Mzansi match**: when the pair's shared taste has a South African music thread in Qloo, South African artists ranked for both;
- **makes it social**: an invite link for the second person, a live swipe room where a match lands on both phones at once, a start-together countdown, and story cards to share;
- **learns**: after the night, you tap who liked what, and the next plan builds on it.

## How we built it

Next.js on Render; Qloo's search, insights (joint signals, per-person scoring with `filter.results.entities`, explainability, tag filters) and compare; Gemini as the planner with function calling, behind guardrails. The agent can only pick Qloo entities. A critic replaces any pick in the bottom half for one person when a pick in the top half for both exists. AI notes that overclaim are replaced with Qloo's ranks. Every step is in a visible trace.

## Without Qloo it doesn't work

Fair ranking needs a per-person score for every candidate, finding what fans of both tastes like needs the taste graph, and the Mzansi match depends on Qloo connecting two specific tastes to a local tag. An LLM alone can name films; it can't show you where each pick ranks for each person.

## Evidence

On 15 deliberately mismatched pairs (Metallica and Taylor Swift, Hugh Masekela and Billie Eilish, Black Coffee and Dolly Parton) we compared Common Ground with the same model alone. For the person each pick suited least, Common Ground's picks had higher Qloo affinity in all 15 pairs (0.843 vs 0.771), the gap between the two people was smaller (0.056 vs 0.090), and every film's runtime was checked against the time available (35 of 35, vs none checkable for the AI alone). We also report where it lost: the AI alone named more films outside both people's top 30 (92% vs 77%). The affinity measures are Qloo's own, so a blind study at `/study` measures whether people actually enjoy the picks.

## What we left out, on purpose

Going out (our tests showed Qloo's places depend on location far more than taste), and a per-person "taste drops" model with notifications (built, but too little data to trust; it's on a branch).

## What's next

Persistent pair spaces that remember you across nights, verified streaming availability, and taste drops for the pair.
