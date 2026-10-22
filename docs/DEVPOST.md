# Common Ground: Devpost description

**Two tastes. One night you'll both enjoy.**

## What it does

Common Ground is an agent for two people with different taste, like a couple, two friends, or a gogo and her grandson. Each person names a film, an artist and a series they love. The agent then:

- **finds the overlap** with Qloo: the taste tags you share, checked against both people's own favourites;
- **plans one night**: something to watch that fits the time you have, music to put on, and a swap each way from the other person's world;
- **proves each pick is fair**: every pick shows where it ranks for each person on their own. A pick that only suits one person is swapped out, or labelled "Leans towards Gogo's taste";
- **adds local flavour and comedy**: South African artists when Qloo finds a South African thread in your shared taste, and stand-up comedians ranked for both of you, with links to their upcoming shows;
- **works apart**: send the other person a link. They add their own favourites on their phone, the plan opens on both phones, and there's a chat beside it;
- **helps you decide**: swipe on tonight's picks together, match when you both say yes, then start at the same moment;
- **goes out if you want**: date spots within 30 km of an address (food, coffee, drinks, outdoors, live music, comedy and theatre), ordered for both tastes;
- **learns**: after the night you tap who liked what, and the next plan builds on it.

No sign-up. It works on any phone.

## What makes it Qloo-powered

Without Qloo it doesn't work. Fair ranking needs a score for every candidate for each person separately (`filter.results.entities`). Finding what fans of both tastes go on to love needs the taste graph (joint signals in insights). The split between the two people comes from Qloo's explainability. Qloo also provides the shared tags (compare), the South African and stand-up comedy lanes (tag filters), runtimes and ratings, and nearby places (location and radius filters). When Qloo has no direct score across kinds, for example films for someone who only added music, the agent scores that person from their favourites' Qloo tags and says so.

Gemini plans the night with function calling, but it can only choose among Qloo results. A critic replaces any pick that's in the bottom half for one person when a better option exists for both, and AI notes that overclaim are replaced with Qloo's ranks. Every step is in a visible trace.

## Evidence

On 15 deliberately mismatched pairs, we compared Common Ground with the same AI model working alone:

- **Fairer to the person each pick suits least:** that person's Qloo affinity was higher in all 15 pairs (0.843 vs 0.771).
- **Smaller gap between the two people:** 0.056 vs 0.090.
- **Runtimes checked:** every film's runtime was checked against the time available (35 of 35, against none for the AI alone).

Where it lost: the AI alone named more films outside both people's top 30 (92% vs 77%). The affinity numbers are Qloo's own, so a built-in blind study (`/study`) measures whether people actually enjoy the picks.

## Built with

Next.js, TypeScript and Tailwind on Render (free tier), the Qloo hackathon API and Google Gemini. It's MIT-licensed, with 33 automated tests.
