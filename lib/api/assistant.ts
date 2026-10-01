import { apiPost } from "@/lib/api/client";
import type { AssistantQuery, AssistantReply } from "@/types/assistant";

export function askAquaShield(question: AssistantQuery, signal?: AbortSignal) {
  return apiPost<AssistantQuery, AssistantReply>("/assistant/query", question, signal);
}
