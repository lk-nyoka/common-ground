# Evaluation: Common Ground vs the same AI on its own

Run on 21 October 2026 against the live Qloo hackathon API and Google Gemini. Reproduce with `npm run eval` (needs both keys in `.env.local`). The raw output is written to `results/`, which is git-ignored because it contains Qloo response data.

## Method

- **16 taste pairs**, deliberately mismatched: for example Metallica and Taylor Swift, Miriam Makeba and Tyla, Breaking Bad and Friends, Black Coffee and Dolly Parton. Each person has one favourite. Every pair has 2 hours, and two pairs also asked to avoid horror.
- **Common Ground:** the full product, meaning Qloo plus the planning agent. For each pair we took the film or show to watch, two alternatives and three artists.
- **AI alone:** the same Gemini model, given the same favourites, time and things to avoid, but with no Qloo data. It was asked for 3 things to watch and 3 artists that both people would enjoy.
- **Scoring:** every suggestion from both methods was looked up in Qloo and scored against each person's favourites on their own.
- **Exclusions:** one pair (The Dark Knight / The Notebook) was skipped because the AI-alone baseline didn't answer (Gemini was overloaded). That leaves **15 pairs**: 90 Common Ground picks and 90 AI-alone picks.
- **Discovery** is measured the same way for both methods: of each method's films that Qloo could find, how many appear in neither person's own top 30 Qloo film results.

This is the second run. The first (also 21 October, before we switched fairness to rank-based maximin and added the baseline's discovery figure) gave 0.831 vs 0.772 worst-off affinity over 14 pairs.

## Results

| Measure | Common Ground | AI alone |
| --- | --- | --- |
| Suggestions Qloo could find | 90 of 90 | 88 of 90 (98%) |
| Films whose runtime could be checked against the time available | 35 of 35 (none over) | 0 of 40 (not checkable: Qloo search results don't include runtimes, and the AI has no runtime data) |
| Picks carrying a tag the pair asked to avoid | 0 | 0 |
| Suggested one of the pair's own favourites back | 0 | 0 |
| Mean Qloo affinity for the person each pick suits *least* | 0.843 | 0.771 |
| Mean gap between the two people's affinity | 0.056 | 0.090 |
| Pairs where Common Ground's worst-off affinity was higher | 15 of 15 | |
| Films in *neither* person's own top 30 | 77% | 92% |
| Picks both methods suggested | 5 of 90 | |

## What this does and doesn't show

- **Discovery is not where Common Ground wins.** We expected joint discovery to be an advantage, and measured it for both methods to check. The AI alone suggests even more films outside both people's top 30 (92% vs 77%). That isn't surprising: it doesn't draw from Qloo's lists at all, so most of what it names falls outside them. Being outside a top 30 is novelty, not quality, so we no longer present this figure as an advantage.
- **Common Ground is fairer by Qloo's measure, and that measure is circular.** It chooses picks using these same Qloo scores, so it is expected to win on worst-off affinity (15 of 15 pairs) and on the gap between people. That shows the fairness logic does what it says. It does **not** show people enjoy the picks more.
- **Constraints are checkable only with Qloo.** Every Common Ground film had a known runtime and fitted the time available. For the AI alone we couldn't check runtimes at all.
- **The AI alone is reliable on basics.** 98% of its suggestions were real titles Qloo could find, and it respected the avoid list. "LLMs make things up" isn't the argument here.
- **The picks differ in character.** For Miriam Makeba and Tyla, the AI alone tends to read the theme literally (music documentaries); Common Ground's Qloo results lean toward what similar fans actually watch, which skews toward popular and acclaimed titles. Neither is obviously better.
- **Only real people can settle it.** The blind study at `/study` mixes both methods' picks, hides which is which, and has each person rate them separately. Paste the result codes into `/study/results` to compare.

On 1 of the 15 pairs, Common Ground's AI planner was busy, so fixed rules picked from the same Qloo results.
