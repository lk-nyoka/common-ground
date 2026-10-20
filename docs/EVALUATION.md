# Evaluation: Common Ground vs the same AI on its own

Run on 21 October 2026 against the live Qloo hackathon API and Google Gemini. Reproduce with `npm run eval` (needs both keys in `.env.local`). The raw output is written to `results/`, which is git-ignored because it contains Qloo response data.

## Method

- **16 taste pairs**, deliberately mismatched: for example Metallica and Taylor Swift, Miriam Makeba and Tyla, Breaking Bad and Friends, Black Coffee and Dolly Parton. Each person has one favourite. Every pair has 2 hours, and two pairs also asked to avoid horror.
- **Common Ground:** the full product, meaning Qloo plus the planning agent. For each pair we took the film or show to watch, two alternatives and three artists.
- **AI alone:** the same Gemini model, given the same favourites, time and things to avoid, but with no Qloo data. It was asked for 3 things to watch and 3 artists that both people would enjoy.
- **Scoring:** every suggestion from both methods was looked up in Qloo and scored against each person's favourites on their own.
- **Exclusions:** one pair was skipped because Qloo didn't find a favourite in time. One more was excluded because the AI-alone baseline timed out. That leaves **14 pairs**: 82 Common Ground picks and 84 AI-alone picks.

## Results

| Measure | Common Ground | AI alone |
| --- | --- | --- |
| Suggestions Qloo could find | 82 of 82 | 84 of 84 |
| Films whose runtime could be checked against the time available | 36 of 36 (none over) | 0 of 34 (no runtimes known) |
| Picks carrying a tag the pair asked to avoid | 0 | 0 |
| Suggested one of the pair's own favourites back | 0 | 1 |
| Mean Qloo affinity for the person each pick suits *least* | 0.831 | 0.772 |
| Mean gap between the two people's affinity | 0.071 | 0.101 |
| Pairs where Common Ground's worst-off affinity was higher | 14 of 14 | |
| Films in *neither* person's own top 30 | 23 of 36 (64%) | not measured |
| Picks both methods suggested | 5 of 82 | |

## What this does and doesn't show

- **Discovery is real.** About two thirds of Common Ground's films appear in neither person's own top 30 Qloo results. The pair's results genuinely differ from either person's solo results.
- **The AI alone did better than we expected on basics.** All 84 of its suggestions were real titles Qloo could find, and it respected the avoid list. "LLMs make things up" isn't the argument here.
- **Common Ground is fairer by Qloo's measure, but that measure is circular.** Common Ground chooses picks using these same Qloo scores, so it is expected to win on worst-off affinity and on the gap between people. That shows the fairness logic works as designed. It does **not** show people enjoy the picks more.
- **The picks differ in character.** For Miriam Makeba and Tyla, the AI alone suggested music documentaries such as *Summer of Soul*. Common Ground suggested acclaimed dramas such as *Minari* and *CODA*. The AI reads the theme literally; Qloo's graph leans toward what similar fans actually watch, which skews toward popular and acclaimed titles. Neither is obviously better.
- **Only real people can settle it.** The blind study at `/study` mixes both methods' picks, hides which is which, and has each person rate them separately. Paste the result codes into `/study/results` to compare.

On 2 of the 14 pairs, Common Ground's AI planner was busy, so fixed rules picked from the same Qloo results.
