import type { QueryClient } from "@tanstack/react-query";
import { clearDraft } from "./onboarding";

export function forgetPreviousIntake(
  client: QueryClient,
  scope: string,
  previous: number,
) {
  clearDraft(scope, previous);
  localStorage.removeItem(`skilytics.pathway.start.${previous}`);
  client.removeQueries({
    predicate: (query) => {
      const key = query.queryKey;
      return (
        (typeof key[0] === "string" &&
          (key[0] === `/api/profiles/${previous}` ||
            key[0].startsWith(`/api/profiles/${previous}/`))) ||
        (["learning", "jobs"].includes(String(key[0])) &&
          String(key[1]) === String(previous))
      );
    },
  });
}
