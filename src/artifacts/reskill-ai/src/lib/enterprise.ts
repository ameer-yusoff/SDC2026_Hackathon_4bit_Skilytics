import { useQuery } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react";
export type CompanyMember = {
  id: number;
  name: string;
  currentRole: string | null;
  riasecCode: string | null;
  exposure: number | null;
  exposureRole: string | null;
  targetRole: string | null;
  stage: string;
  skillCount: number;
  skillNames?: string[];
  requiredSkills?:string[];
  confirmedSkillNames?:string[];
  inferredSkillNames?:string[];
  completedSkillNames?:string[];
  gapCount: number;
  remainingGap: number;
  gaps: string[];
  totalCourses: number;
  completedCourses: number;
  nextDeadline: string | null;
  hrdcEligible: boolean;
};
export type Company = {
  organization: string;
  members: CompanyMember[];
  profileCount: number;
  exposureCoverage: number;
  avgExposure: number | null;
  avgGap: number;
  activeCount: number;
  totalCourses: number;
  completedCourses: number;
  topGaps: { name: string; count: number }[];
  catalogueCourses: number;
  updatedAt: string;
  sources: { id: string; version: string | null; dataDate: string | null }[];
};
export type SavedAnalysis = {
  translations: { en: string; ms: string; zh: string };
  generatedAt: string;
  cached: boolean;
};
export type CompanyAnalysis = SavedAnalysis & { id: number;model?:string;sources?:{label:string;url:string;dataDate?:string|null}[] };
export function useCompany(enabled=true) {
  return useQuery({
    enabled,
    queryKey: ["enterprise"],
    queryFn: () => customFetch<Company>("/api/enterprise/overview"),
    retry: false,
  });
}
export function enterprisePost<T>(path: string, data: unknown = {}) {
  return customFetch<T>(`/api/enterprise/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}
export function enterpriseGet<T>(path: string) {
  return customFetch<T>(`/api/enterprise/${path}`);
}

