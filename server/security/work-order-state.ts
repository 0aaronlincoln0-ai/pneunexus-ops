export const workOrderTransitions = {
  new: ["triaged", "cancelled"],
  triaged: ["assigned", "blocked", "cancelled"],
  assigned: ["in_progress", "blocked", "cancelled"],
  in_progress: ["waiting_for_parts", "waiting_for_vendor", "blocked", "completed"],
  waiting_for_parts: ["in_progress", "blocked", "cancelled"],
  waiting_for_vendor: ["in_progress", "blocked", "cancelled"],
  blocked: ["triaged", "assigned", "in_progress", "cancelled"],
  completed: ["verified", "in_progress"],
  verified: ["closed", "in_progress"],
  closed: [],
  cancelled: ["new"],
} as const;

export type WorkOrderStatus = keyof typeof workOrderTransitions;

export function canTransitionWorkOrder(from: WorkOrderStatus, to: WorkOrderStatus): boolean {
  return (workOrderTransitions[from] as readonly string[]).includes(to);
}
