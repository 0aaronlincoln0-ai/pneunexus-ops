export interface PevcoDeviceFamily {
  name: "Station" | "Diverter" | "Blower";
  purpose: string;
  evidence: string[];
}

export const pevcoKnowledgeProfile = {
  name: "Pevco Atlas service profile",
  scope:
    "Standalone field troubleshooting for the three primary pneumatic-tube device families using evidence entered by the technician.",
  deviceFamilies: [
    {
      name: "Station",
      purpose: "Send, receive, hold, and report carrier movement at an endpoint.",
      evidence: [
        "Dispatcher and slide-plate position",
        "Carrier and full-bin sensor state",
        "Local controller and touchscreen status",
      ],
    },
    {
      name: "Diverter",
      purpose: "Align a carrier path between indexed tube ports.",
      evidence: [
        "Indexed port position",
        "Carrier sighting at the device",
        "Alignment, seal, chain, and drive condition",
      ],
    },
    {
      name: "Blower",
      purpose: "Provide the vacuum and pressure phases that move a carrier.",
      evidence: [
        "Idle, vacuum, and pressure position",
        "Airflow feedback and travel time",
        "Zone-wide versus endpoint-specific behavior",
      ],
    },
  ] satisfies PevcoDeviceFamily[],
  atlasEvidence: [
    "Exact fault or advisory text visible locally",
    "Origin, destination, and phase reported by the technician",
    "Last observed carrier sighting and search result",
    "Locally observed position, sensor, and communication state",
    "Past recurrence and manually recorded return-to-service result",
  ],
  diagnosticMethod: [
    "Preserve the fault and transaction evidence before clearing state.",
    "Confirm the safety boundary and responsible role.",
    "Check the least invasive layer first.",
    "Compare the expected result with the observed result.",
    "Stop at the escalation boundary.",
    "Verify restoration with an approved empty-carrier test.",
  ],
  provenance:
    "Protocol set derived from the supplied Pevco Atlas software and mechanical training booklet, then normalized into safety-gated field workflows.",
  authority:
    "The current site manuals, equipment revisions, hospital policy, lockout/tagout, infection-prevention rules, and qualified personnel remain authoritative.",
} as const;
