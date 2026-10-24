import type { ProfileRow } from "./profiles";

/** Only the individual onboarding uploader may replace a personal intake. */
export function replacesIntake(role: string | undefined, header: unknown) {
  return header === "1" && (!role || role === "individual");
}

type FreshCv = Pick<
  ProfileRow,
  | "name"
  | "currentRole"
  | "organization"
  | "education"
  | "experience"
  | "cvText"
  | "cvFileName"
  | "cvExtractionKey"
  | "cvEvidence"
  | "skills"
>;

export function freshIntakeValues(
  previous: ProfileRow,
  cv: FreshCv,
  segment?: string,
) {
  return {
    ...cv,
    segment:
      segment === "graduate" || segment === "worker"
        ? segment
        : previous.segment,
    ownerUserId: previous.ownerUserId,
    guestToken: previous.ownerUserId ? null : previous.guestToken,
    weeklyHours: 1,
    budgetMyr: 0,
    goals: null,
    hrdcEligible: false,
    hrdcEligibilityStatus: null,
    riasecAnswers: [],
    riasecScores: null,
    riasecCode: null,
    targetRoleId: null,
    verified: false,
    onboardingStep: "review",
    cvUploadedAt: new Date(),
  };
}
