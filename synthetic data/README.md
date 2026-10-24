# Synthetic Data and Demo CVs

This folder provides review copies of the fictional data used to demonstrate and evaluate Skilytics. It contains no real user CVs or measured graduate-employment records. The application and tests use the source files inside `src`, not this root folder.

## Files

| File | Contents and purpose | Source of truth |
| --- | --- | --- |
| [demo-cv-1.pdf](demo-cv-1.pdf) | Fictional scanned-PDF CV for the onboarding demonstration. | [Original fixture](../src/testing/demo-cv/demo-cv-1.pdf) |
| [demo-cv-2.jpeg](demo-cv-2.jpeg) | Fictional CV image for the onboarding demonstration. | [Original fixture](../src/testing/demo-cv/demo-cv-2.jpeg) |
| [demo-cv-3.pdf](demo-cv-3.pdf) | Fictional text-PDF CV for the onboarding demonstration. | [Original fixture](../src/testing/demo-cv/demo-cv-3.pdf) |
| [graduate-employment-2024-2026.json](graduate-employment-2024-2026.json) | Hand-authored aggregate outcomes for a fictional TVET institution, covering 2024–2026. Used as a labelled demonstration reference in the TVET portal and institution analysis. | [Runtime dataset](../src/synthetic-data/tvet/graduate-employment-2024-2026.json) |
| [career-personas.json](career-personas.json) | Twenty fictional evaluation cases with skills, weekly time, budgets and equivalent EN/BM/Simplified Chinese career goals. Used to check language parity, ranking behaviour and pathway constraints. | [Evaluation dataset](../src/synthetic-data/evaluation/career-personas.json) |

All five review files are byte-identical to their source copies as checked on 25 October 2026. Original filenames are preserved.

## How the data is used

- **Demo CVs:** Onboarding demo buttons fill reviewed sample details from [profiles.json](../src/testing/demo-cv/profiles.json). Selecting a demo does not upload its file, run OCR or call an AI model. The public preview copies are in `src/artifacts/reskill-ai/public/demo/`. Uploaded user CVs follow a separate consent-based AI extraction flow.
- **TVET outcomes:** Employment rate is `employedWithinSixMonths / graduates × 100`. Further study is excluded from employment; unknown outcomes remain in the denominator. Outcome categories are mutually exclusive and sum to the graduate total. These figures do not describe the signed-in institution or Malaysia's actual employment market. Future scenarios are hypothetical, not measured forecasts.
- **Evaluation personas:** Expected career directions are editorial test expectations, not expert-validated career outcomes. Tests check equivalent-language behaviour and engineering constraints; they do not establish hiring accuracy. Recorded results and limitations are documented separately.

## Limits and maintenance

- Keep synthetic fixtures separate from real student progress, employee records and live vacancy data.
- Do not present demonstration outcomes or constructed evaluation results as real-world performance evidence.
- When a source fixture changes, update its review copy here. For demo CV changes, also update the public preview, reviewed profile data and matching SHA-256 in `profiles.json`.
- No API keys, account credentials or database exports belong in this folder.

## Supporting documentation

- [Demo CV fixture notes](../src/testing/demo-cv/README.md)
- [TVET synthetic-data notes](../src/synthetic-data/tvet/README.md)
- [Evaluation method and limitations](../src/docs/workforce-evaluation.md)
- [Recorded evaluation results](../src/synthetic-data/evaluation/results-2026-10-24.json)
