import { describe, expect, it } from "vitest";
import type { AuthenticatedPrincipal } from "../server/providers/contracts";
import { assertFacilityAccess } from "../netlify/functions/_shared/session";

function principal(facilityIds: string[]): AuthenticatedPrincipal {
  return {
    userId: crypto.randomUUID(),
    organizationId: crypto.randomUUID(),
    membershipId: crypto.randomUUID(),
    roleKey: "technician",
    permissions: new Set(),
    facilityIds: new Set(facilityIds),
    sensitiveInfrastructureAllowed: false,
  };
}

describe("facility assignment isolation", () => {
  it("returns resource-not-found semantics for an unassigned facility", () => {
    const allowed = crypto.randomUUID();
    expect(() => assertFacilityAccess(principal([allowed]), crypto.randomUUID())).toThrow(
      "Resource not found",
    );
  });
  it("allows an explicitly assigned facility", () => {
    const allowed = crypto.randomUUID();
    expect(() => assertFacilityAccess(principal([allowed]), allowed)).not.toThrow();
  });
});
