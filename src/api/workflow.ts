import { callMethod } from "@/api/client";
import type { TimelineEntry, WorkflowActionResponse, WorkflowComment } from "@/types/api";

export function getWorkflowActions(name: string) {
  return callMethod<WorkflowActionResponse>("infra_ms.portal.workflow.get_permitted_workflow_actions", { name });
}

export function getWorkflowTimeline(name: string) {
  return callMethod<{ current_state: string; current_state_label: string; entries: TimelineEntry[] }>(
    "infra_ms.portal.workflow.get_workflow_timeline",
    { name },
  );
}

export function getWorkflowComments(name: string) {
  return callMethod<{ items: WorkflowComment[] }>("infra_ms.portal.workflow.get_workflow_comments", { name });
}

export function executeWorkflowAction(input: {
  name: string;
  action: string;
  comment?: string;
  expectedModified?: string;
  expectedNextState?: string;
}) {
  return callMethod<{ name: string; workflow_state: string; workflow_state_label: string; modified: string }>(
    "infra_ms.portal.workflow.execute_workflow_action",
    {
      name: input.name,
      action: input.action,
      comment: input.comment,
      expected_modified: input.expectedModified,
      expected_next_state: input.expectedNextState,
    },
    "post",
  );
}
