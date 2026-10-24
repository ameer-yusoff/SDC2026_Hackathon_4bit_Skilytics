import { compulsoryIds } from "../lib/institution";
import { guestProfileScope, keepOneGuestProfile } from "../lib/guest-profile";
import demoFixtures from "../../../../testing/demo-cv/profiles.json";
import { individualProfile } from "../lib/individual-profile";
import { hollandSource } from "../lib/holland-source";
import { Router, type IRouter } from "express";
import { performance } from "node:perf_hooks";
import { z } from "zod";
import { ROLES } from "../data/roles";
import { ROLE_TITLE_ZH } from "../data/roles-zh";
import { learningState, saveLearningState, datedCourses, allComplete } from "../lib/learning-journey";
import { db, profilesTable, plansTable, insightsTable, rolesTable, type StoredProfileSkill } from "@workspace/db";
import { and, desc, eq, isNotNull, lt, ne, sql } from "drizzle-orm";
import {
  ListProfilesQueryParams,
  CreateProfileBody,
  GetProfileParams,
  UpdateProfileBody,
  UploadCvBody,
  SubmitRiasecBody,
  CreateProfilePlanBody,
  RunProfileAgentBody,
} from "@workspace/api-zod";
import { loadCourses, loadRoles, loadSkills, roleToApi } from "../lib/catalog";
import { selfDirectedRoles } from "../lib/self-directed";
import { extractCvDocument, extractSkills, CvError, isCvImageFile, validateCvImage, recognizeCvImage, type CvDocumentPage } from "../lib/cv";
import { RIASEC_QUESTIONS } from "../data/riasec";
import { scoreRiasec } from "../lib/riasec-scoring";
import { profileSkills } from "../lib/profile-skills";
import { agentRoutes } from "../lib/agent-routing";
import { scoreRole } from "../lib/scoring";
import { buildPlan } from "../lib/planner";
import { workplaceAiCourses } from "../lib/workplace-ai";
import { canAccessProfile, getLatestPlan, getProfileRow, planToApi, profileScope, profileToApi, type ProfileRow } from "../lib/profiles";
import { agentPrompt, agentTier, generateHollandFallback, hashInput, translateHollandInsight, SOURCE_AEI, type AgentName, type Lang } from "../lib/agents";
import { chat, AiNotConnectedError, AiTimeoutError, AiVisionUnsupportedError } from "../lib/llm";
import { consumeAiRequest } from "../lib/ai-rate-limit";
import { SDG_TARGETS } from "../data/courses";
import { CvAiOutputError, CvProfileFactsMissingError, cvExtractionKey, extractCvMultimodalProfile, extractCvProfile, extractCvProfileFallback, retrieveCv, retrieveReferences } from "../lib/cv-retrieval";

const router: IRouter = Router();
const cvRequests = new Map<number, Promise<unknown>>();

router.get("/profiles", async (req, res) => {
  if (!req.user && req.guestToken) await keepOneGuestProfile(req.guestToken);
  const q = ListProfilesQueryParams.parse(req.query);
  const conds = [profileScope(req)];
  if (q.segment) conds.push(eq(profilesTable.segment, q.segment));
  if (q.organization) conds.push(eq(profilesTable.organization, q.organization));
  const [rows, skills] = await Promise.all([
    db.select().from(profilesTable).where(and(...conds, q.beforeId ? lt(profilesTable.id, q.beforeId) : undefined)).orderBy(desc(profilesTable.id)).limit(q.limit ?? 50),
    loadSkills(),
  ]);
  res.json(rows.map((r) => profileToApi(r, skills)));
});

router.post("/profiles", async (req, res) => {
  const body = CreateProfileBody.parse(req.body);
  const u = req.user;
  const isOrg = u && (u.role === "hr" || u.role === "tvet");
  if (!u && !req.guestToken) {
    res.status(400).json({ error: "guest_token_required" });
    return;
  }
  const requestKey = req.headers["x-idempotency-key"];
  if (requestKey !== undefined && (typeof requestKey !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestKey))) {
    res.status(400).json({ error: "invalid_input" }); return;
  }
  if (requestKey && u) {
    const [existing] = await db.select().from(profilesTable).where(eq(profilesTable.createRequestKey, requestKey));
    if (existing) {
      if (!await canAccessProfile(req, existing)) { res.status(409).json({ error: "profile_not_found" }); return; }
      res.json(profileToApi(existing, await loadSkills())); return;
    }
  }
  const values = {
      name: body.name,
      segment: body.segment,
      currentRole: body.currentRole ?? null,
      organization: isOrg ? u.organization : body.organization?.trim() || null,
      ownerUserId: u ? u.id : null,
      guestToken: u ? null : req.guestToken!,
      createRequestKey: requestKey ?? null,
      goals: body.goals ?? null,
      weeklyHours: body.weeklyHours,
      budgetMyr: body.budgetMyr,
      hrdcEligible: u?.role === "hr" && (body.hrdcEligible ?? false),
      onboardingStep: "cv",
  };
  if(u?.role === "individual") {
    const result=await db.transaction(async tx=>{
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${"individual-profile:"+u.id},0))`);
      const current=await individualProfile(u.id,tx);
      if(current) return {row:current,created:false};
      const [row]=await tx.insert(profilesTable).values(values).returning();
      return {row,created:true};
    });
    res.status(result.created?201:200).json(profileToApi(result.row,await loadSkills()));return;
  }
  if (!u && req.guestToken) {
    const guestToken = req.guestToken;
    const outcome = await db.transaction(async (tx) => {
      // A database lock also serialises different application instances for this guest.
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${guestToken}, 0))`);
      if (requestKey) {
        const [existing] = await tx.select().from(profilesTable).where(eq(profilesTable.createRequestKey, requestKey));
        if (existing) return { kind: existing.guestToken === guestToken && !existing.ownerUserId ? "existing" : "conflict", row: existing } as const;
      }
      const [row] = await tx.insert(profilesTable).values(values).onConflictDoNothing().returning();
      if (row) await tx.delete(profilesTable).where(and(guestProfileScope(guestToken),ne(profilesTable.id,row.id)));
      return { kind: row ? "created" : "conflict", row: row ?? null } as const;
    });
    if (outcome.kind === "conflict" || !outcome.row) { res.status(409).json({ error: "profile_creation_conflict" }); return; }
    res.status(outcome.kind === "created" ? 201 : 200).json(profileToApi(outcome.row, await loadSkills()));
    return;
  }
  const [row] = await db.insert(profilesTable).values(values).onConflictDoNothing().returning();
  if (!row && requestKey) {
    const [existing] = await db.select().from(profilesTable).where(eq(profilesTable.createRequestKey, requestKey));
    if (existing && await canAccessProfile(req, existing)) { res.json(profileToApi(existing, await loadSkills())); return; }
  }
  if (!row) { res.status(409).json({ error: "profile_creation_conflict" }); return; }
  res.status(201).json(profileToApi(row, await loadSkills()));
});

async function requireProfile(id: number, req: import("express").Request, res: import("express").Response): Promise<ProfileRow | null> {
  const p = await getProfileRow(id);
  if (!p || !await canAccessProfile(req, p)) {
    res.status(404).json({ error: "profile_not_found" });
    return null;
  }
  return p;
}

router.get("/profiles/:id", async (req, res) => {
  const { id } = GetProfileParams.parse(req.params);
  const p = await requireProfile(id, req, res);
  if (!p) return;
  res.json(profileToApi(p, await loadSkills()));
});

router.get("/profiles/:id/journey", async (req,res) => {
  const p=await requireProfile(GetProfileParams.parse(req.params).id,req,res); if(!p)return;
  const state=await learningState(p.id);
  const [plan]=state.planId ? await db.select().from(plansTable).where(and(eq(plansTable.id,state.planId),eq(plansTable.profileId,p.id))) : [];
  const items=plan && state.startDate ? datedCourses(plan.items,state.startDate,state.durationWeeks) : [];
  const complete=allComplete(items,state.completed);
  let recommendations: Awaited<ReturnType<typeof loadCourses>> = [];
  if(complete) {
    const [courses,roles]=await Promise.all([loadCourses(),loadRoles()]);
    const role=roles.find(r=>r.id===plan?.roleId);
    recommendations=courses.filter(c=>!items.some(i=>i.courseId===c.id) && c.costMyr<=p.budgetMyr && (!c.roleScope || c.roleScope.includes(role?.title??"")) && c.skills.some(s=>role?.skills.some(k=>k.skillId===s.id) || /generative ai|prompt engineering/i.test(c.title)))
      .sort((a,b)=>Number(/generative ai|prompt/i.test(b.title))-Number(/generative ai|prompt/i.test(a.title)) || a.costMyr-b.costMyr).slice(0,3);
  }
  res.json({...state,items,roleTitle:plan?.roleTitle,roleTitleMs:ROLES.find(r=>r.title===plan?.roleTitle)?.titleMs,roleTitleZh:ROLE_TITLE_ZH[plan?.roleTitle??""],complete,recommendations:recommendations.map(c=>({id:c.id,title:c.title,url:c.url,provider:c.provider,sdgCodes:c.sdgCodes})),certificateId:complete ? `SK-${p.id}-${plan!.id}` : null});
});

const journeyAction=z.discriminatedUnion("action",[
  z.object({action:z.literal("confirm_intake")}),
  z.object({action:z.literal("activate"),startDate:z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(s=>!Number.isNaN(Date.parse(s)) && new Date(s).toISOString().slice(0,10)===s),durationWeeks:z.record(z.string(),z.number().int().min(1).max(520)).default({})}),
  z.object({action:z.literal("complete_course"),courseId:z.number().int(),done:z.boolean()}),
]);
router.post("/profiles/:id/journey", async(req,res)=>{
  const p=await requireProfile(GetProfileParams.parse(req.params).id,req,res);if(!p)return;
  const action=journeyAction.parse(req.body);
  // Serialise changes across browser tabs and application instances.
  const outcome=await db.transaction(async tx=>{
    if(req.user?.role === "tvet")await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${"tvet-policy:"+req.user.organization},0))`);
    await tx.execute(sql`SELECT pg_advisory_xact_lock(${p.id})`);
    const state=await learningState(p.id,tx);
    if(action.action==="confirm_intake") {
      if(!p.cvExtractionKey || !p.verified || !p.riasecCode || p.onboardingStep!=="complete") {return {status:409,error:"intake_required"};}
      if(state.stage==="intake") await saveLearningState(p.id,{stage:"matcher",completed:{}},tx);
    } else if(action.action==="activate") {
      if(state.stage!=="pathway") {return {status:409,error:"journey_step_required"};}
      const plan=await getLatestPlan(p.id);
      if(!plan || plan.roleId!==p.targetRoleId || !plan.items.length || (await planToApi(plan)).verificationStatus!=="verified") {return {status:409,error:"plan_required"};}
      if((await compulsoryIds(req)).some(id=>!plan.items.some(i=>i.courseId===id && i.compulsory))){return {status:409,error:"compulsory_catalogue_changed"};}
      if(datedCourses(plan.items,action.startDate,action.durationWeeks).some(i=>!i.deadline)) {return {status:400,error:"course_dates_required"};}
      await saveLearningState(p.id,{stage:"active",planId:plan.id,startDate:action.startDate,durationWeeks:action.durationWeeks,completed:{}},tx);
    } else {
      const [plan]=state.planId ? await db.select().from(plansTable).where(and(eq(plansTable.id,state.planId),eq(plansTable.profileId,p.id))) : [];
      if(state.stage!=="active" || !plan?.items.some(i=>i.courseId===action.courseId)) {return {status:409,error:"plan_required"};}
      const completed={...state.completed};
      if(action.done) completed[String(action.courseId)] ??= new Date().toISOString();else delete completed[String(action.courseId)];
      await saveLearningState(p.id,{...state,completed,finishedAt:allComplete(plan.items,completed) ? state.finishedAt??new Date().toISOString() : undefined},tx);
    }
    return {ok:true};
  });
  if("error" in outcome) res.status(outcome.status??409).json({error:outcome.error}); else res.json(outcome);
});

router.get("/profiles/:id/journey/certificate",async(req,res)=>{
  const p=await requireProfile(GetProfileParams.parse(req.params).id,req,res);if(!p)return;
  const state=await learningState(p.id);
  const [plan]=state.planId ? await db.select().from(plansTable).where(and(eq(plansTable.id,state.planId),eq(plansTable.profileId,p.id))) : [];
  if(!plan || !state.finishedAt || !allComplete(plan.items,state.completed)) {res.status(409).json({error:"pathway_incomplete"});return;}
  res.setHeader("Cache-Control","no-store");
  res.json({id:`SK-${p.id}-${plan.id}`,name:p.name,roleTitle:plan.roleTitle,roleTitleMs:ROLES.find(r=>r.title===plan.roleTitle)?.titleMs??plan.roleTitle,roleTitleZh:ROLE_TITLE_ZH[plan.roleTitle]??plan.roleTitle,finishedAt:state.finishedAt,courseCount:plan.items.length,sdgCodes:[...new Set(plan.items.flatMap(i=>i.sdgCodes))]});
});

router.patch("/profiles/:id", async (req, res) => {
  const { id } = GetProfileParams.parse(req.params);
  const body = UpdateProfileBody.parse(req.body);
  const p = await requireProfile(id, req, res);
  if (!p) return;
  if (["hr","tvet"].includes(req.user?.role??"") && body.riasecAnswers && p.riasecCode) {res.status(409).json({error:"riasec_locked"});return;}
  if (req.user?.role !== "hr") { body.hrdcEligible = false; body.hrdcEligibilityStatus = "no"; }
  const individual = !req.user || req.user.role === "individual";
  const journey = (individual || req.user?.role === "hr" || req.user?.role === "tvet") ? await learningState(p.id) : null;
  const locked = (individual || req.user?.role === "hr" || req.user?.role === "tvet") && p.onboardingStep === "complete";
  if (locked && ((body.onboardingStep && body.onboardingStep !== "complete") || (body.riasecAnswers && JSON.stringify([...body.riasecAnswers].sort((a,b)=>a.questionId-b.questionId)) !== JSON.stringify([...p.riasecAnswers].sort((a,b)=>a.questionId-b.questionId))))) {res.status(409).json({error:"riasec_locked"});return;}
  if ((individual || req.user?.role === "hr" || req.user?.role === "tvet") && body.targetRoleId && journey?.stage !== "matcher" && journey?.stage !== "pathway") {res.status(409).json({error:"journey_step_required"});return;}
  const step = body.onboardingStep;
  if (body.verified && !(body.name ?? p.name).trim()) {
    res.status(400).json({ error: "invalid_input" }); return;
  }
  if ((body.verified || ["goals", "holland", "results", "save", "complete"].includes(step ?? "")) && !p.cvExtractionKey) {
    res.status(400).json({ error: "cv_required" }); return;
  }
  if (["results", "save", "complete"].includes(step ?? "") && (!(body.verified ?? p.verified) || !p.riasecScores)) {
    res.status(400).json({ error: "riasec_required" }); return;
  }
  if (step === "complete" && !(req.user?.role === "hr" || req.user?.role === "tvet" || (req.user?.role === "individual" && p.ownerUserId === req.user.id)) && !(p.guestToken && p.guestToken === req.guestToken && !p.ownerUserId)) {
    res.status(401).json({ error: "login_required" }); return;
  }
  if (body.riasecAnswers && (new Set(body.riasecAnswers.map((a) => a.questionId)).size !== body.riasecAnswers.length || body.riasecAnswers.some((a) => !RIASEC_QUESTIONS.some((q) => q.id === a.questionId)))) {
    res.status(400).json({ error: "invalid_input" }); return;
  }
  let skills: StoredProfileSkill[] = p.skills;
  if (body.removeSkillIds?.length) skills = skills.filter((s) => !body.removeSkillIds!.includes(s.skillId));
  for (const add of body.addSkills ?? []) {
    const existing = skills.find((s) => s.skillId === add.skillId);
    if (existing) existing.status = add.status;
    else skills.push({ skillId: add.skillId, status: add.status, evidence: null });
  }
  const { addSkills: _a, removeSkillIds: _r, organization: orgIn, ...rest } = body;
  const isOrg = req.user && (req.user.role === "hr" || req.user.role === "tvet");
  const organization = isOrg ? undefined : orgIn;
  const canonicalAnswers = (answers: { questionId: number; value: number }[]) =>
    JSON.stringify([...answers].sort((a, b) => a.questionId - b.questionId).map((a) => [a.questionId, a.value]));
  const changedAnswers = body.riasecAnswers && canonicalAnswers(body.riasecAnswers) !== canonicalAnswers(p.riasecAnswers);
  // Edited answers must not retain an old score; identical late autosaves are safe.
  const invalidatedScores = changedAnswers
    ? { riasecScores: null, riasecCode: null, ...(p.cvExtractionKey ? { onboardingStep: "holland" } : {}) }
    : {};
  // Editing source facts invalidates confirmation; explicit confirmation is applied last.
  const factsChanged = ["name", "currentRole", "organization", "education", "experience"].some((k) => k in body && body[k as keyof typeof body] !== p[k as keyof ProfileRow]);
  const [row] = await db
    .update(profilesTable)
    .set({ ...rest, ...invalidatedScores, ...(body.hrdcEligibilityStatus ? { hrdcEligible: body.hrdcEligibilityStatus === "yes" } : {}), ...(factsChanged ? { verified: body.verified === true } : {}), ...(organization !== undefined ? { organization: organization.trim() || null } : {}), skills })
    .where(eq(profilesTable.id, id))
    .returning();
  if (journey && ["matcher","pathway"].includes(journey.stage) && (factsChanged || body.goals !== undefined || body.addSkills || body.removeSkillIds)) await saveLearningState(p.id,{stage:"intake",completed:{}});
  res.json(profileToApi(row, await loadSkills()));
});

router.delete("/profiles/:id", async (req, res) => {
  const { id } = GetProfileParams.parse(req.params);
  const p = await requireProfile(id, req, res);
  if (!p) return;
  if(req.user?.role === "individual") {res.status(409).json({error:"profile_locked"});return;}
  await db.delete(profilesTable).where(eq(profilesTable.id, id));
  res.status(204).end();
});

// Fixed fictional sample data. This route never calls file extraction, OCR, or an LLM.
router.post("/profiles/:id/demo-cv",async(req,res)=>{
  const p=await requireProfile(GetProfileParams.parse(req.params).id,req,res);if(!p)return;
  if(p.onboardingStep==="complete") {res.status(409).json({error:"riasec_locked"});return;}
  const {demoId}=z.object({demoId:z.number().int().min(1).max(3)}).parse(req.body);
  const fixture=demoFixtures.profiles.find(f=>f.id===demoId)!;
  const skills=await loadSkills();
  const evidence=["name","currentRole","organization","education","experience"].map(field=>({field,value:String(fixture[field as keyof typeof fixture]),quote:String(fixture[field as keyof typeof fixture]),source:"user_cv"}));
  const [row]=await db.update(profilesTable).set({name:fixture.name,currentRole:fixture.currentRole,organization:fixture.organization,education:fixture.education,experience:fixture.experience,cvText:fixture.cvText,cvFileName:fixture.file,cvExtractionKey:"demo-v1:"+fixture.sha256,cvEvidence:evidence,cvUploadedAt:new Date(),skills:extractSkills(fixture.cvText,skills),verified:false,onboardingStep:"review"}).where(eq(profilesTable.id,p.id)).returning();
  res.json(profileToApi(row,skills));
});

router.post("/profiles/:id/cv", async (req, res) => {
  const { id } = GetProfileParams.parse(req.params);
  const body = UploadCvBody.parse(req.body);
  const p = await requireProfile(id, req, res);
  if (!p) return;
  if ((!req.user || req.user.role === "individual") && p.onboardingStep === "complete") {res.status(409).json({error:"riasec_locked"});return;}
  if (!body.consent) { res.status(400).json({ error: "cv_consent_required" }); return; }
  let text: string | null = null;
  let pages: CvDocumentPage[] | undefined;
  const documentProcessingStartedAt = performance.now();
  try {
    if (isCvImageFile(body.fileName)) {
      const validated = validateCvImage(body.fileName, body.contentBase64);
      pages = [{ pageNumber: 1, text: "", image: validated }];
      text = "";
    } else {
      const document = await extractCvDocument(body.fileName, body.contentBase64);
      if (document.pages) {
        pages = document.pages;
        text = document.pages.map((page) => page.text).filter(Boolean).join("\n\n");
      } else {
        text = document.text ?? "";
      }
    }
  } catch (err) {
    req.log.info(
      { profileId: id, documentProcessingMs: Math.round(performance.now() - documentProcessingStartedAt) },
      "CV document processing timing",
    );
    if (err instanceof CvError) {
      res.status(400).json({ error: err.message });
      return;
    }
    const detail = err instanceof Error ? err.message : String(err);
    req.log.warn({ profileId: id, detail }, "CV parse failed");
    res.status(400).json({ error: "cv_unreadable", detail });
    return;
  }
  const documentProcessingMs = Math.round(performance.now() - documentProcessingStartedAt);
  const lang = body.lang ?? "en";
  const images = pages?.flatMap((page) => page.image ? [page.image] : []) ?? [];
  // Include every PDF page's extracted text so mixed text/scanned PDFs cannot
  // reuse a cached extraction from a different document with the same images.
  const keyText = text ?? pages?.map((page) => `Page ${page.pageNumber}\n${page.text}`).join("\n\n") ?? "";
  const key = cvExtractionKey(keyText, lang, images);
  if (p.cvExtractionKey === key) { res.json(profileToApi(p, await loadSkills())); return; }
  const inFlight = cvRequests.get(id);
  if (inFlight) {
    try {
      res.json(await inFlight);
      return;
    } catch (err) {
      req.log.warn({ profileId: id, kind: err instanceof AiNotConnectedError ? "not_configured" : "extraction_failed" }, "CV in-flight extraction failed");
      const error = err instanceof AiNotConnectedError ? "ai_not_connected"
        : err instanceof AiTimeoutError ? "ai_timeout"
          : err instanceof AiVisionUnsupportedError ? "ai_vision_unsupported"
            : err instanceof CvError ? err.message
            : err instanceof CvAiOutputError ? "cv_ai_invalid" : "ai_failed";
      const status = err instanceof CvError ? 400 : err instanceof AiNotConnectedError ? 503 : 502;
      res.status(status).json({ error });
      return;
    }
  }
  const rate = consumeAiRequest(req.user ? "user" : "guest", req.user ? String(req.user.id) : req.guestToken!, images.length ? 2 : 1);
  if (!rate.allowed) { res.setHeader("Retry-After", String(rate.retryAfterSeconds)); res.status(429).json({ error: "ai_rate_limited", retryAfterSeconds: rate.retryAfterSeconds }); return; }
  const work = (async () => {
    const multimodal = images.length > 0;
    const cvModelStageStartedAt = performance.now();
    let result: any;
    try {
      result = multimodal
        ? await extractCvMultimodalProfile(pages!, lang)
        : await extractCvProfile(text!, lang);
    } catch (modelErr) {
      if (modelErr instanceof CvProfileFactsMissingError) {
        throw modelErr;
      }
      if (modelErr instanceof CvError && modelErr.message !== "cv_unreadable") {
        throw modelErr;
      }
      // Vision gets the original image before OCR can introduce spelling errors.
      // OCR is a recovery path only, never a prerequisite for a healthy vision model.
      if (images.length && pages) {
        for (const page of pages) if (page.image && !page.text.trim()) page.text = await recognizeCvImage(page.image);
      }
      const fallbackText = text?.trim() || pages?.map((page) => page.text).filter(Boolean).join("\n\n") || "";
      if (fallbackText.trim().length >= 20) {
        req.log.warn({ profileId: id, err: String(modelErr) }, "AI vision extraction failed; falling back to OCR + parser");
        try {
          result = await extractCvProfile(fallbackText, lang);
        } catch {
          result = extractCvProfileFallback(fallbackText, lang);
        }
      } else {
        throw modelErr;
      }
    }
    const cvModelStageMs = Math.round(performance.now() - cvModelStageStartedAt);
    const profileEvidenceCount = result.evidence.filter((entry: any) => entry.source === "user_cv" && entry.value.trim() && entry.quote).length;
    const usedTextFallback = ("usedTextFallback" in result && result.usedTextFallback) || result.model === "local-parser";
    if (!profileEvidenceCount) {
      throw new CvProfileFactsMissingError();
    }
    req.log.info({
      profileId: id,
      documentProcessingMs,
      cvModelStageMs,
      pageCount: pages?.length ?? 0,
      scannedPageCount: images.length,
      profileEvidenceCount,
      usedTextFallback,
      endpointTier: result.timing?.endpointTier ?? "light",
      modelResolutionMs: result.timing?.modelResolutionMs ?? 0,
      endpointRequestMs: result.timing?.endpointRequestMs ?? 0,
      endpointWarmBeforeRequest: result.timing?.endpointWarmBeforeRequest ?? true,
      endpointStartupMs: result.timing?.endpointStartupMs ?? 0,
      readyToResponseMs: result.timing?.readyToResponseMs ?? 0,
    }, "CV upload timing");
    const cvText = result.text || (multimodal ? (pages?.map((page) => page.text).filter(Boolean).join("\n\n") || "") : text!);
    const allSkills = await loadSkills();
    const extracted = extractSkills(cvText, allSkills);
    const manual = p.skills.filter((s) => s.status === "self_reported" && !extracted.some((e) => e.skillId === s.skillId));
    const isOrg = req.user?.role === "hr" || req.user?.role === "tvet";
    const preserveConfirmedDetails = p.verified;
    const [row] = await db.update(profilesTable).set({
      name: result.fields.name ?? p.name,
      currentRole: result.fields.currentRole ?? (preserveConfirmedDetails ? p.currentRole : null),
      ...(!isOrg ? { organization: result.fields.organization ?? (preserveConfirmedDetails ? p.organization : null) } : {}),
      education: result.fields.education ?? (preserveConfirmedDetails ? p.education : null),
      experience: result.fields.experience ?? (preserveConfirmedDetails ? p.experience : null),
      cvText, cvFileName: body.fileName, cvUploadedAt: new Date(),
      cvEvidence: result.evidence, cvExtractionKey: key, verified: false, onboardingStep: "review",
      skills: [...extracted, ...manual],
    }).where(eq(profilesTable.id, id)).returning();
    if(["hr","tvet"].includes(req.user?.role??"") && (await learningState(id)).stage !== "active") await saveLearningState(id,{stage:"intake",completed:{}});
    return profileToApi(row, allSkills);
  })();
  cvRequests.set(id, work);
  try { res.json(await work); }
  catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    req.log.warn({ profileId: id, detail, kind: err instanceof AiNotConnectedError ? "not_configured" : "extraction_failed" }, "CV extraction failed");
    const error = err instanceof AiNotConnectedError ? "ai_not_connected"
      : err instanceof AiTimeoutError ? "ai_timeout"
        : err instanceof AiVisionUnsupportedError ? "ai_vision_unsupported"
          : err instanceof CvError ? err.message
          : err instanceof CvAiOutputError ? "cv_ai_invalid" : "ai_failed";
    const status = err instanceof CvError ? 400 : err instanceof AiNotConnectedError ? 503 : 502;
    res.status(status).json({ error, detail });
  } finally { cvRequests.delete(id); }
});

router.get("/riasec/questions", (_req, res) => {
  res.json(RIASEC_QUESTIONS);
});

router.post("/profiles/:id/riasec", async (req, res) => {
  const { id } = GetProfileParams.parse(req.params);
  const body = SubmitRiasecBody.parse(req.body);
  const p = await requireProfile(id, req, res);
  if (!p) return;
  if ((!req.user || req.user.role === "individual" || req.user.role === "hr" || req.user.role === "tvet") && p.onboardingStep === "complete") {res.status(409).json({error:"riasec_locked"});return;}
  if (["hr","tvet"].includes(req.user?.role??"") && p.riasecCode) {res.status(409).json({error:"riasec_locked"});return;}
  if (p.onboardingStep && !p.verified) { res.status(400).json({ error: "cv_review_required" }); return; }
  let scores, code;
  try { ({ scores, code } = scoreRiasec(body.answers)); }
  catch (err) { res.status(400).json({ error: err instanceof Error ? err.message : "invalid_input" }); return; }
  const [row] = await db.update(profilesTable).set({ riasecScores: scores, riasecCode: code, riasecAnswers: body.answers }).where(eq(profilesTable.id, id)).returning();
  res.json(profileToApi(row, await loadSkills()));
});

async function computeMatches(p: ProfileRow) {
  const [roles, skills, courses] = await Promise.all([loadRoles(), loadSkills(), loadCourses()]);
  const candidate = { ...p, skills: profileSkills(p, skills) };
  return selfDirectedRoles(roles,courses)
    .map((role) => ({ role: roleToApi(role, courses), ...scoreRole(candidate, role, skills, courses) }))
    .sort((a, b) => b.score - a.score || a.gapSkills.length - b.gapSkills.length);
}

router.get("/profiles/:id/matches", async (req, res) => {
  const { id } = GetProfileParams.parse(req.params);
  const p = await requireProfile(id, req, res);
  if (!p) return;
  if ((!req.user || req.user.role === "individual" || req.user.role === "hr" || req.user.role === "tvet") && !["matcher","pathway","active"].includes((await learningState(p.id)).stage)) {res.status(409).json({error:"journey_step_required"});return;}
  res.json(await computeMatches(p));
});

router.get("/profiles/:id/plan", async (req, res) => {
  const { id } = GetProfileParams.parse(req.params);
  const p = await requireProfile(id, req, res);
  if (!p) return;
  const plan = await getLatestPlan(id);
  res.json(plan ? await planToApi(plan) : null);
});

router.post("/profiles/:id/plan", async (req, res) => {
  const { id } = GetProfileParams.parse(req.params);
  const { roleId,sdgGoal } = CreateProfilePlanBody.parse(req.body);
  const p = await requireProfile(id, req, res);
  if (!p) return;
  const journey = (!req.user || req.user.role === "individual" || req.user.role === "hr" || req.user.role === "tvet") ? await learningState(p.id) : null;
  if(journey && !["matcher","pathway"].includes(journey.stage)) {res.status(409).json({error:"journey_step_required"});return;}
  const [roles, skills, courses] = await Promise.all([loadRoles(), loadSkills(), loadCourses()]);
  if (!courses.length) { res.status(503).json({ error: "course_catalogue_unavailable" }); return; }
  if (journey && workplaceAiCourses(courses).length < 3) { res.status(503).json({ error: "course_catalogue_unavailable" }); return; }
  const role = (journey ? selfDirectedRoles(roles,courses) : roles).find((r) => r.id === roleId);
  if (!role) {
    res.status(404).json({ error: "role_not_found" });
    return;
  }
  const { gapSkills } = scoreRole({ ...p, skills: profileSkills(p, skills) }, role, skills, courses);
  const requiredIds = await compulsoryIds(req);
  const compulsoryCourses = requiredIds.map(id=>courses.find(c=>c.id===id));
  if(compulsoryCourses.some(c=>!c || c.durationHours===null)){res.status(409).json({error:"compulsory_catalogue_changed"});return;}
  if(compulsoryCourses.reduce((n,c)=>n+(c?.costMyr??0),0)>p.budgetMyr){res.status(409).json({error:"compulsory_budget_exceeded"});return;}
  const plan = buildPlan({ sdgGoal, compulsoryCourses: compulsoryCourses.filter((c):c is NonNullable<typeof c>=>!!c), gaps: gapSkills, courses, budgetMyr: p.budgetMyr, weeklyHours: p.weeklyHours, hrdcEligible: req.user?.role === "hr" && p.hrdcEligible, roleTitle: role.title, aiAdvancement: !req.user || req.user.role === "individual" || req.user.role === "hr" || req.user.role === "tvet" });
  const [row] = await db
    .insert(plansTable)
    .values({ profileId: id, roleId, roleTitle: role.title, ...plan })
    .returning();
  await db.update(profilesTable).set({ targetRoleId: roleId }).where(eq(profilesTable.id, id));
  if(journey) await saveLearningState(p.id,{stage:"pathway",completed:{}});
  res.status(201).json(await planToApi(row));
});

router.get("/profiles/:id/insights", async (req, res) => {
  const { id } = GetProfileParams.parse(req.params);
  const p = await requireProfile(id, req, res);
  if (!p) return;
  const rows = await db.select().from(insightsTable).where(eq(insightsTable.profileId, id)).orderBy(desc(insightsTable.createdAt));
  const latest = new Map<string, (typeof rows)[number]>();
  const sourcePrefix = hollandSource(p) + ":";
  for (const r of rows) {
    if (r.agent === "holland" && !r.inputHash.startsWith(sourcePrefix)) continue;
    if (!latest.has(`${r.agent}|${r.lang}`)) latest.set(`${r.agent}|${r.lang}`, r);
  }
  res.json([...latest.values()].map((r) => ({ ...insightToApi(r), cached: true })));
});

function insightToApi(r: typeof insightsTable.$inferSelect) {
  return {
    id: r.id,
    agent: r.agent as AgentName,
    lang: r.lang as Lang,
    content: r.content,
    sources: r.sources,
    model: r.model,
    cached: false,
    createdAt: r.createdAt.toISOString(),
  };
}

router.post("/profiles/:id/insights", async (req, res) => {
  const { id } = GetProfileParams.parse(req.params);
  const body = RunProfileAgentBody.parse(req.body);
  const p = await requireProfile(id, req, res);
  if (!p) return;
  const agent = body.agent as AgentName;
  if ((!req.user || req.user.role === "individual") && !["cv","holland"].includes(agent) && !["pathway","active"].includes((await learningState(p.id)).stage)) {res.status(409).json({error:"journey_step_required"});return;}
  const lang: Lang = body.lang ?? "en";
  const skills = await loadSkills();
  const profile = profileToApi(p, skills);
  const matches = await computeMatches(p);
  const top = matches.slice(0, 5).map((m) => ({
    title: m.role.title,
    score: m.score,
    breakdown: m.breakdown,
    gaps: m.gapSkills.map((g) => g.name),
    aiExposure: m.role.aiExposure,
    aiUsagePctMy: m.role.aiUsagePctMy,
    marketDemand: m.marketDemand,
  }));
  const targetId = body.roleId ?? p.targetRoleId;
  const [targetRole] = targetId ? await db.select().from(rolesTable).where(eq(rolesTable.id, targetId)) : [];
  const plan = await getLatestPlan(id);
  const planView = plan ? await planToApi(plan) : null;

  const base = {
    profil: { nama: profile.name, segmen: profile.segment, peranan: profile.currentRole, matlamat: profile.goals, jamSeminggu: profile.weeklyHours, bajetMyr: profile.budgetMyr, ...(req.user?.role === "hr" ? { layakHrdc: profile.hrdcEligible } : {}) },
    kemahiran: profile.skills.map((s) => ({ nama: s.name, status: s.status })),
  };
  const ctx: Record<string, unknown> = { ...base };
  const sources = [{ ...SOURCE_AEI }];
  if (agent === "cv") {
    if (!p.cvText) {
      res.status(400).json({ error: "cv_required" });
      return;
    }
    ctx["teksCv"] = retrieveCv(p.cvText);
    ctx["rujukanKemahiran"] = retrieveReferences(p.cvText);
    ctx["buktiProfil"] = p.cvEvidence;
    ctx["kemahiranDikesan"] = profile.skills.map((s) => ({ nama: s.name, bukti: s.evidence }));
  }
  if (agent === "holland") {
    if (!p.riasecScores) {
      res.status(400).json({ error: "riasec_required" });
      return;
    }
    ctx["riasec"] = { skor: p.riasecScores, kod: p.riasecCode };
    // Supply all verified data confirmed in the review step so AI grounds on real background:
    ctx["profilDisahkan"] = {
      nama: p.name,
      perananSemasa: p.currentRole || null,
      organisasi: p.organization || null,
      pendidikan: p.education || null,
      pengalaman: p.experience || null,
      matlamat: p.goals || null,
    };
    ctx["kemahiranDisahkan"] = profile.skills.map((s) => ({
      nama: s.name,
      status: s.status,
      bukti: s.evidence || null,
    }));
    ctx["semuaBuktiCv"] = (p.cvEvidence ?? []).filter((e) => e.quote && e.source !== "no_evidence");
    delete ctx.profil;
    delete ctx.kemahiran;
  }
  if (agent === "profiler" || agent === "fitter") {
    ctx["riasec"] = p.riasecScores ? { skor: p.riasecScores, kod: p.riasecCode } : null;
    ctx["padananTeratas"] = top;
    ctx["nota"] = "aiExposure 0-1 ialah pendedahan AI yang diperhatikan; aiUsagePctMy ialah peratus penggunaan AI di Malaysia bagi pekerjaan itu.";
  }
  if (agent === "planner" || agent === "sdg") {
    if (!planView) {
      res.status(400).json({ error: "plan_required" });
      return;
    }
    ctx["pelan"] = planView;
    if (agent === "sdg") ctx["sasaranSdg"] = SDG_TARGETS;
  }
  if (targetRole) ctx["peranSasaran"] = targetRole.title;

  const sourcePrefix = agent === "holland" ? hollandSource(p)+":" : "";
  const inputHash = sourcePrefix + hashInput(agent, lang, ctx, agent === "holland" ? "eli5-v2" : null, agentRoutes().find((route) => route.agent === agent));
  if (!body.refresh) {
    const [cached] = await db
      .select()
      .from(insightsTable)
      .where(and(eq(insightsTable.profileId, id), eq(insightsTable.agent, agent), eq(insightsTable.lang, lang), eq(insightsTable.inputHash, inputHash)))
      .orderBy(desc(insightsTable.createdAt))
      .limit(1);
    if (cached) {
      res.json({ ...insightToApi(cached), cached: true });
      return;
    }

    // If an insight for Holland ELI5 was ALREADY generated in another language, translate it
    // faithfully so metaphors, reasoning, and CV evidence remain consistent and identical across languages!
    if (agent === "holland") {
      const [existingOtherLang] = await db
        .select()
        .from(insightsTable)
        .where(and(eq(insightsTable.profileId, id), eq(insightsTable.agent, "holland"), ne(insightsTable.lang, lang), sql`${insightsTable.inputHash} LIKE ${sourcePrefix+"%"}`))
        .orderBy(desc(insightsTable.createdAt))
        .limit(1);

      if (existingOtherLang && existingOtherLang.content) {
        req.log.info({ profileId: id, fromLang: existingOtherLang.lang, toLang: lang }, "Translating existing Holland insight to requested language");
        const translated = await translateHollandInsight(
          existingOtherLang.content,
          existingOtherLang.lang as Lang,
          lang,
          {
            code: p.riasecCode || "CIR",
            scores: p.riasecScores,
            verified: {
              education: p.education,
              experience: p.experience,
              currentRole: p.currentRole,
              skills: profile.skills,
            },
          },
        );
        const [row] = await db
          .insert(insightsTable)
          .values({
            profileId: id,
            agent,
            lang,
            inputHash,
            content: translated.content,
            sources,
            model: translated.model,
          })
          .returning();
        res.json(insightToApi(row));
        return;
      }
    }
  }
  const rateLimit = consumeAiRequest(req.user ? "user" : "guest", req.user ? String(req.user.id) : req.guestToken!);
  res.setHeader("X-RateLimit-Limit", String(rateLimit.limit));
  res.setHeader("X-RateLimit-Remaining", String(rateLimit.remaining));
  if (!rateLimit.allowed) {
    if (agent === "holland") {
      const fallbackContent = generateHollandFallback(
        p.riasecCode || "CIR",
        p.riasecScores,
        (p.cvEvidence as any[]) || [],
        lang,
        {
          education: p.education,
          experience: p.experience,
          currentRole: p.currentRole,
          skills: profile.skills,
        },
      );
      const [row] = await db
        .insert(insightsTable)
        .values({ profileId: id, agent, lang, inputHash, content: fallbackContent, sources, model: "local-rag" })
        .returning();
      res.json(insightToApi(row));
      return;
    }
    res.setHeader("Retry-After", String(rateLimit.retryAfterSeconds));
    res.status(429).json({
      error: "ai_rate_limited",
      message: "You've reached the AI request limit. Please try again after the retry period.",
      retryAfterSeconds: rateLimit.retryAfterSeconds,
    });
    return;
  }
  try {
    const { system, user } = agentPrompt(agent, ctx, lang);
    const out = await chat(agentTier(agent), system, user, { agent });
    const [row] = await db
      .insert(insightsTable)
      .values({ profileId: id, agent, lang, inputHash, content: out.content, sources, model: out.model })
      .returning();
    res.json(insightToApi(row));
  } catch (err) {
    if (agent === "holland") {
      req.log.warn({ profileId: id, err: String(err) }, "Holland AI chat failed; using grounded fallback generator");
      const fallbackContent = generateHollandFallback(
        p.riasecCode || "CIR",
        p.riasecScores,
        (p.cvEvidence as any[]) || [],
        lang,
        {
          education: p.education,
          experience: p.experience,
          currentRole: p.currentRole,
          skills: profile.skills,
        },
      );
      const [row] = await db
        .insert(insightsTable)
        .values({ profileId: id, agent, lang, inputHash, content: fallbackContent, sources, model: "local-rag" })
        .returning();
      res.json(insightToApi(row));
      return;
    }
    if (err instanceof AiNotConnectedError) {
      res.status(503).json({ error: "ai_not_connected", detail: err.message });
      return;
    }
    const detail = err instanceof Error ? err.message : String(err);
    req.log.error({ err, agent, detail }, "Agent run failed");
    res.status(502).json({ error: err instanceof AiTimeoutError ? "ai_timeout" : "ai_failed", detail });
  }
});

export default router;
