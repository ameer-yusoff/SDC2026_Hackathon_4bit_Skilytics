import {scenarioValue,type FutureScenario} from "../../../api-server/src/lib/future-scenarios";
export const AI_REMAINING_TASK_PACE=.05;
export type ScenarioRole={aiExposure:number|null;projection:{growthPct:number}|null};
export function scenarioPercent(mode:"ai"|"demand",role:ScenarioRole,years:number,scenario:FutureScenario="moderate"){return scenarioValue(mode,mode==="ai"?role.aiExposure:role.projection?.growthPct??null,years,scenario)}
