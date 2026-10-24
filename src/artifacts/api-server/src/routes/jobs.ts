import {skillDemand} from "../lib/skill-demand";
import {
  additionalVacancies,
  vacancyFetchedAt,
} from "../lib/vacancy-catalogues";
import { Router } from "express";
import { z } from "zod";
import { db, profilesTable, plansTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { getProfileRow, canAccessProfile } from "../lib/profiles";
import { learningState, allComplete } from "../lib/learning-journey";
import { loadSkills, loadRoles, loadCourses } from "../lib/catalog";
import { profileSkills } from "../lib/profile-skills";
import { scoreRole } from "../lib/scoring";
import { extractSkills } from "../lib/cv";
const router = Router();
type Job = {
  source?: string;
  sourceUrl?: string;
  id: number;
  url: string;
  jobTitle: string;
  companyName: string;
  jobGeo: string;
  jobDescription: string;
  pubDate: string;
};
export function malaysiaLocation(s: string) {
  return /\bmalaysia\b/i.test(s);
}
export function eligibleLocation(s: string) {
  return malaysiaLocation(s) || /^(anywhere|worldwide|global)$/i.test(s.trim());
}
export const publicJobs = additionalVacancies;
router.get("/market/skill-demand",async(_req,res)=>{try{res.json(await skillDemand());}catch{res.status(503).json({error:"jobs_unavailable"});}});
router.get("/profiles/:id/jobs", async (req, res) => {
  const p = await getProfileRow(
    z.coerce.number().int().positive().parse(req.params.id),
  );
  if (!p || !(await canAccessProfile(req, p))) {
    res.status(404).json({ error: "profile_not_found" });
    return;
  }
  if (req.user && req.user.role !== "individual") {
    res.status(403).json({ error: "forbidden" });
    return;
  }
  const state = await learningState(p.id);
  const [plan] = state.planId
    ? await db
        .select()
        .from(plansTable)
        .where(
          and(eq(plansTable.id, state.planId), eq(plansTable.profileId, p.id)),
        )
    : [];
  if (!plan || !state.finishedAt || !allComplete(plan.items, state.completed)) {
    res.status(409).json({ error: "pathway_incomplete" });
    return;
  }
  try {
    const [jobs, skills, roles, courses] = await Promise.all([
      publicJobs(),
      loadSkills(),
      loadRoles(),
      loadCourses(),
    ]);
    const learned = new Set(plan.items.flatMap((i) => i.skills));
    const existing = profileSkills(p, skills);
    for (const s of skills)
      if (learned.has(s.name) && !existing.some((k) => k.skillId === s.id))
        existing.push({
          skillId: s.id,
          status: "self_reported",
          evidence: null,
        });
    const ranked = jobs
      .filter((j) => eligibleLocation(j.jobGeo))
      .map((j) => {
        const required = extractSkills(
          j.jobTitle + " " + j.jobDescription.replace(/<[^>]*>/g, " "),
          skills,
        );
        const matched = required.filter((s) =>
          existing.some((k) => k.skillId === s.skillId),
        );
        const words = j.jobTitle
          .toLowerCase()
          .split(/[^a-z]+/)
          .filter((w) => w.length > 3);
        const role = roles
          .map((r) => ({
            r,
            n: words.filter((w) => r.title.toLowerCase().includes(w)).length,
          }))
          .sort((a, b) => b.n - a.n)[0];
        const fit = role?.n
          ? scoreRole({ ...p, skills: existing }, role.r, skills, courses).score
          : 0;
        return {
          source: j.source ?? "Public vacancy catalogue",
          sourceUrl: j.sourceUrl ?? j.url,
          id: j.id,
          title: j.jobTitle,
          company: j.companyName,
          location: j.jobGeo,
          url: j.url,
          posted: j.pubDate,
          skillsMatchPct: required.length
            ? Math.round((matched.length / required.length) * 100)
            : null,
          aiExposure: role?.n ? role.r.aiExposure : null,
          exposureRole: role?.n
            ? {
                title: role.r.title,
                sector: role.r.sector,
                sourceUrl: role.r.sourceUrl ?? null,
              }
            : null,
          matched: matched.map(
            (s) => skills.find((k) => k.id === s.skillId)!.name,
          ),
          missing: required
            .filter((s) => !matched.includes(s))
            .map((s) => skills.find((k) => k.id === s.skillId)!.name),
          score:
            matched.length * 10 +
            fit / 10 +
            plan.roleTitle
              .toLowerCase()
              .split(/[^a-z]+/)
              .filter(
                (w) => w.length > 3 && j.jobTitle.toLowerCase().includes(w),
              ).length *
              15,
        };
      })
      .filter(
        (j) =>
          j.matched.length > 0 &&
          !/nurse|physician|surgeon|dentist|licensed|mechanical|electrical|\bMSc\b|\bPhD\b/i.test(
            j.title,
          ),
      )
      .sort((a, b) => b.score - a.score);
    res.setHeader("Cache-Control", "no-store");
    res.json({
      checkedAt: new Date(vacancyFetchedAt() ?? Date.now()).toISOString(),
      jobs: ranked,
      source: "Himalayas · Remotive · RemoteOK",
    });
  } catch {
    res.status(503).json({ error: "jobs_unavailable" });
  }
});
export default router;
