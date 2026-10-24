import { test } from "node:test";
import assert from "node:assert/strict";
import { freshIntakeValues, replacesIntake } from "./intake-replacement";

test("replacement is an explicit personal-onboarding action, not an HR/student reset", () => {
  assert.equal(replacesIntake(undefined, "1"), true);
  assert.equal(replacesIntake("individual", "1"), true);
  for (const role of ["hr", "tvet", "individual", undefined])
    assert.equal(replacesIntake(role, undefined), false);
  assert.equal(replacesIntake("hr", "1"), false);
  assert.equal(replacesIntake("tvet", "1"), false);
});

test("fresh CV replacement cannot inherit Holland, goals, career or old manual skills", () => {
  const previous = {
    id: 42,
    segment: "worker",
    ownerUserId: null,
    guestToken: "this-device",
    name: "Previous person",
    goals: "old goal",
    weeklyHours: 30,
    budgetMyr: 900,
    verified: true,
    onboardingStep: "complete",
    riasecAnswers: [{ questionId: 1, value: 5 }],
    riasecCode: "RIA",
    targetRoleId: 10,
    skills: [{ skillId: 9, status: "self_reported", evidence: null }],
  } as any;
  const cv = {
    name: "New person",
    currentRole: null,
    organization: null,
    education: "New course",
    experience: null,
    cvText: "new CV",
    cvFileName: "new.pdf",
    cvExtractionKey: "new-key",
    cvEvidence: [],
    skills: [{ skillId: 2, status: "evidenced", evidence: "new CV" }],
  } as any;
  const fresh = freshIntakeValues(previous, cv, "graduate");
  assert.equal(fresh.name, "New person");
  assert.equal(fresh.organization, null);
  assert.equal(fresh.guestToken, "this-device");
  assert.equal(fresh.segment, "graduate");
  assert.equal(fresh.ownerUserId, null);
  assert.deepEqual(fresh.riasecAnswers, []);
  assert.equal(fresh.riasecCode, null);
  assert.equal(fresh.riasecScores, null);
  assert.equal(fresh.targetRoleId, null);
  assert.equal(fresh.goals, null);
  assert.equal(fresh.weeklyHours, 1);
  assert.equal(fresh.budgetMyr, 0);
  assert.equal(fresh.verified, false);
  assert.equal(fresh.onboardingStep, "review");
  assert.deepEqual(fresh.skills, cv.skills);
  assert.equal(previous.name, "Previous person");
  const account = freshIntakeValues(
    { ...previous, ownerUserId: 7 },
    cv,
    "invalid",
  );
  assert.equal(account.ownerUserId, 7);
  assert.equal(account.guestToken, null);
  assert.equal(account.segment, "worker");
});
