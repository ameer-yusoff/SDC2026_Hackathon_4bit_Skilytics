# Future-ready decisions: implementation and limits

Updated 24 October 2026. These are explainable planning aids, not calibrated forecasts or hiring decisions.

## Personal fit and future priority

Personal fit remains skills 40 + transferable 15 + interests 20 + preferences 10 + feasibility 15. Tools/subject skills have twice the weight of Human skills within skill fit. Inferred evidence receives less credit. EN/BM/ZH catalogue role names normalize to the same intent; unsupported paraphrases are not claimed to be understood.

Future priority is a separate editorial score:

`0.8 × personalFit + 0.2 × clamp(50 + 2 × scenarioGrowthPct + 2 × observedSkillShareDelta, 0, 100)`.

- Growth comes from the reviewed US BLS broad SOC reference, not Malaysian role-specific vacancies.
- Observed shift is the mean comparable listing-share change for the role's non-Human skills, in percentage points. It is not worker supply or a shortage estimate.
- If both signals are missing, retain personal fit. A missing one contributes no adjustment to the neutral reference index; it is not reported as observed zero growth.
- Headline news is qualitative context only; it cannot set or calibrate a numerical rate.
- The original fit rank remains visible beside future priority. Skills and CV facts are never rewritten by a changed trend.

## Two scenarios at the same year

| Assumption                                                   | Moderate | Faster |
| ------------------------------------------------------------ | -------- | ------ |
| Annual share of remaining tasks overlapping AI               | 5%       | 10%    |
| Exponent multiplier for reviewed US ten-year growth          | 1        | 1.35   |
| Annual illustrative learning-priority index growth           | 5%       | 10%    |
| Synthetic graduate example, annual percentage-point addition | 2        | 4      |

AI overlap: `100 × [1 − (1 − observedOverlap) × (1 − pace)^years]`.

Growth: `100 × [(1 + growth10Year / 100)^(years / 10 × multiplier) − 1]`. Negative references remain negative, and amplify in the faster transition. These are editorial stress-test assumptions. The example does not become an empirical forecast because it has two options.

The canonical calculation lives in `future-scenarios.ts`; graph, role priority and explanation inputs reuse it. Cache identity includes scenario, year and evidence. Company/institution analysis and chat use the same selected assumption; changing it requires a fresh matching analysis. Three translations remain one saved answer, not three independent predictions.

## Dated listing observations

Public vacancy providers already configured in the app supply the sample. Only Malaysia-labelled catalogue matches enter the observation sample. Himalayas country search may include worldwide remote jobs eligible for Malaysia; this is an eligibility sample, not jobs physically based in Malaysia. On the first successful trend request each UTC day, store one aggregate snapshot, no CVs, names or applications, using the existing `predictions` JSON/text fields (`PUBLIC_SKILL_OBSERVATION_V1`). No schema migration is required.

Each recognized skill counts once per listing. Divide by the sample's listing count. Compare provider sets only when they match, both totals are at least 20, and observations are at least seven days apart. Above +1 percentage point is rising; below −1 is declining; otherwise stable. These thresholds are explicit editorial choices. Show dates, denominator and sources. Insufficient samples, missing feeds or no earlier collection produce unavailable results, never invented history.

No daily collection is promised without application traffic. This is a retained eligibility feed sample with location and survival bias, not a census of Malaysia's labour market. The separate five-occupation DOSM JMI reference stays an editorial learning-priority index, not an official skill-shortage statistic. Source timestamps and publication periods are different concepts.

## Pathway changes require confirmation

The scenario, selected horizon, reviewed reference date and serialized public trend inputs are retained on confirmed plan items. Relevant non-Human gaps with catalogue coverage receive a modest priority boost tied to role task overlap, digital/automation topic, the selected horizon and comparable observed skill changes. The editorial multiplier is `max(0.5, 1 + overlap × [1 − (1 − pace)^years] × topicFactor + 0.05 × listingShareDelta)`, with topicFactor 1.8 for matching AI/data/automation/tool topics and 1 otherwise. These are prioritization weights, not new proof that the user lacks a skill.

Budget, relevance, catalogue IDs and required courses remain constraints. Existing AI workplace courses stay part of the advancing module. Reordering/rebuilding occurs only after the user chooses a path or updates the timeline. Changing a slider does not replace a saved plan, completed work or awards. Ties or a uniquely suitable course can legitimately leave a plan unchanged.

## Skill-level SDG provenance

Every role-skill response exposes `sdgLinks`: goal, target, topic, reason in three languages, mapping basis and official UN goal URL. The same pure mapping powers clickable icons in skill maps and skill disclosures in roles, learning and vacancy views.

Specific topic rules take priority. A generic skill uses an explicitly labelled workplace-context association with 8.2. This is an editorial explanation of possible use, not a UN classification of the skill, an endorsement or measured contribution. Examples: digital capability → 9.5; teaching → 4.4; accessible tools → 10.2; safer work → 8.8. Goal links are verified against official UN descriptions; the app's interpretation remains distinct from their indicators.

Sources: [UN Goal 8](https://sdgs.un.org/goals/goal8), [UN Goal 9](https://sdgs.un.org/goals/goal9), and the goal URL returned by each mapping. Actual role and course eligibility remains separate from SDG preference.

## Evaluation and open evidence

See [workforce-evaluation.md](workforce-evaluation.md). Synthetic fixture success is not forecast accuracy, a validated psychometric result or independent domain-expert review. Missing proposal/video/team submission files cannot be manufactured by a code change; the README marks the remaining submission materials pending.
