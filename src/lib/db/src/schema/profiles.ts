import {
  pgTable,
  serial,
  index,
  text,
  integer,
  boolean,
  real,
  jsonb,
  timestamp,
} from "drizzle-orm/pg-core";

export type StoredProfileSkill = {
  skillId: number;
  status: "evidenced" | "self_reported" | "inferred";
  evidence: string | null;
};

export type StoredRiasec = { R: number; I: number; A: number; S: number; E: number; C: number };
export type CvEvidence = { field: string; value: string; quote: string | null; source: string };

export const profilesTable = pgTable("profiles", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  segment: text("segment").notNull(),
  currentRole: text("current_role"),
  organization: text("organization"),
  goals: text("goals"),
  weeklyHours: integer("weekly_hours").notNull(),
  budgetMyr: real("budget_myr").notNull(),
  hrdcEligible: boolean("hrdc_eligible").notNull().default(false),
  hrdcEligibilityStatus: text("hrdc_eligibility_status"),
  cvFileName: text("cv_file_name"),
  cvUploadedAt: timestamp("cv_uploaded_at", { withTimezone: true }),
  cvText: text("cv_text"),
  education: text("education"),
  experience: text("experience"),
  cvEvidence: jsonb("cv_evidence").$type<CvEvidence[]>().notNull().default([]),
  cvExtractionKey: text("cv_extraction_key"),
  onboardingStep: text("onboarding_step"),
  verified: boolean("verified").notNull().default(false),
  riasecAnswers: jsonb("riasec_answers").$type<{ questionId: number; value: number }[]>().notNull().default([]),
  skills: jsonb("skills").$type<StoredProfileSkill[]>().notNull().default([]),
  riasecScores: jsonb("riasec_scores").$type<StoredRiasec | null>(),
  riasecCode: text("riasec_code"),
  targetRoleId: integer("target_role_id"),
  ownerUserId: integer("owner_user_id"),
  guestToken: text("guest_token"),
  createRequestKey: text("create_request_key").unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("profiles_guest_created_idx").on(table.guestToken, table.id),
  index("profiles_owner_created_idx").on(table.ownerUserId, table.id),
  index("profiles_guest_date_idx").on(table.guestToken, table.createdAt),
  index("profiles_owner_date_idx").on(table.ownerUserId, table.createdAt),
]);

export type PlanItemStored = {
  futureScenario?: "moderate"|"fast";
  trendReviewedAt?:string;
  futureYears?:number;
  trendEvidence?:string;
  sdgGoal?: string;
  compulsory?: boolean;
  courseId: number;
  title: string;
  provider: string;
  url: string;
  startWeek: number | null;
  durationWeeks: number | null;
  costMyr: number;
  hrdcStatus: string;
  skills: string[];
  sdgCodes: string[];
};

export const plansTable = pgTable("plans", {
  id: serial("id").primaryKey(),
  profileId: integer("profile_id")
    .notNull()
    .references(() => profilesTable.id, { onDelete: "cascade" }),
  roleId: integer("role_id").notNull(),
  roleTitle: text("role_title").notNull(),
  totalWeeks: integer("total_weeks").notNull(),
  totalCostMyr: real("total_cost_myr").notNull(),
  uncoveredSkills: jsonb("uncovered_skills").$type<string[]>().notNull(),
  items: jsonb("items").$type<PlanItemStored[]>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type SourceRefStored = { label: string; url: string | null; dataDate: string | null };

export const insightsTable = pgTable("agent_insights", {
  id: serial("id").primaryKey(),
  profileId: integer("profile_id")
    .notNull()
    .references(() => profilesTable.id, { onDelete: "cascade" }),
  agent: text("agent").notNull(),
  lang: text("lang").notNull().default("en"),
  inputHash: text("input_hash").notNull(),
  content: text("content").notNull(),
  sources: jsonb("sources").$type<SourceRefStored[]>().notNull(),
  model: text("model").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const predictionsTable = pgTable("predictions", {
  id: serial("id").primaryKey(),
  roleId: integer("role_id"),
  roleTitle: text("role_title"),
  question: text("question").notNull(),
  horizonYears: integer("horizon_years").notNull(),
  lang: text("lang").notNull().default("en"),
  ownerUserId: integer("owner_user_id"),
  guestToken: text("guest_token"),
  inputHash: text("input_hash").notNull(),
  content: text("content").notNull(),
  sources: jsonb("sources").$type<SourceRefStored[]>().notNull(),
  model: text("model").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
