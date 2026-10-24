# Synthetic decision-support evaluation

24 October 2026. This is an initial engineering and editorial relevance check, not an independent human/domain-expert validation or real-world hiring accuracy claim.

## Dataset and procedure

- `src/synthetic-data/evaluation/career-personas.json`: 20 fictional profiles spanning development, data, marketing, writing, IT and security; budgets RM 0/300 and weekly time 2–12 hours.
- Every case has equivalent catalogue-named goals in English, Malay and Simplified Chinese. No real people or CVs are involved.
- Existing role seeds provide candidates; synthetic course fixtures are used only inside the test to isolate constraints. Their `example.org/test-only` URLs are never production offers.
- Automated checks compare **all candidate scores/rank order**, rather than only the target role's score, across languages. They also check catalogue ID provenance and budget limits.
- Source-change tests hold personal fit constant and change growth/listing-share inputs. Scenario tests hold the year constant. Missing-source tests preserve unknown results. Snapshot comparisons test provider, denominator and interval requirements.
- Expected learning directions were chosen editorially from the person's existing subject skills. They are weak labels, not independent truth labels; the target's catalogue requirements also informed fixture construction.

## Recorded result

`results-2026-10-24.json` preserves all twenty results, including the unexpected case.

- All twenty constructed cases have equal scores/order across EN/BM/ZH; every case satisfies the fixture budget and course-ID checks.
- Nineteen target labels appear in the constructed top three. **Do not market this as 95% accuracy**: the labels and data are constructed, the sample is small, and no real outcome is measured.
- `fictional-16`, Software Developer, instead ranks Back-end Developer, Software QA Tester and Cloud Application Developer in the top three. These share relevant Python/JavaScript/testing topics. The result is plausible adjacency but fails the exact editorial target expectation; retain it for domain review rather than tune the case away.
- The previous isolated Chinese goal penalty is removed for recognized catalogue role names. Arbitrary paraphrases, spelling variants and newly discovered untranslated role names are outside this parity guarantee.

## Review rubric for independent evaluation

For each case, a reviewer should grade 0–2: (a) relevance of top three to skills/interests, (b) realistic learning gap, (c) affordable and appropriately leveled course choices, (d) source/SDG explanation, and (e) uncertainty/human control. Record the reason and disagreements, not only an average. Use additional unseen profiles, incomplete/ambiguous CV text and verified current catalogue courses. Include missing/failed sources and different languages with equivalent meaning.

Independent human review, expert qualification checks and longitudinal forecast backtesting are **pending**. A code agent must not claim these external validations have occurred. Source-code tests and editable expected results are available to make that review reproducible.
