export type MaintenanceDeviceFamily = "station" | "diverter" | "blower";

export interface MaintenanceStep {
  title: string;
  instruction: string;
  passCriteria: string;
  ifFailed: string;
  requiresShutdown?: boolean;
  qualifiedElectrical?: boolean;
}

export interface MaintenanceTemplate {
  id: MaintenanceDeviceFamily;
  title: string;
  shortName: string;
  purpose: string;
  interval: string;
  safety: string[];
  tools: string[];
  steps: MaintenanceStep[];
  verification: string[];
  escalation: string[];
  source: string;
}

const universalSafety = [
  "Coordinate the outage and affected routes with site operations before starting.",
  "Use the current equipment-revision manual and the site's lockout/tagout procedure.",
  "Do not work around moving equipment, exposed wiring, stored mechanical energy, or an unknown carrier.",
  "Record infrastructure findings only; do not enter patient, specimen, medication, or medical-record information.",
];

export const maintenanceTemplates: MaintenanceTemplate[] = [
  {
    id: "station",
    title: "Station planned maintenance",
    shortName: "Station",
    purpose:
      "Inspect the endpoint mechanism, sensors, carrier handling surfaces, and recorded carrier inventory.",
    interval:
      "Set the service interval from the equipment-revision manual and local operating conditions.",
    safety: [
      ...universalSafety,
      "Keep hands clear of the dispatch arm, slide plate, carrier gate, brake, and all pinch points.",
    ],
    tools: [
      "Equipment-revision service manual",
      "Site lockout/tagout equipment",
      "Approved dry cleaning supplies",
      "Inspection light and mirror",
      "Approved empty test carrier",
    ],
    steps: [
      {
        title: "Inspect hardware and wiring",
        instruction:
          "With the station in the required safe state, inspect accessible mounting hardware, connectors, wire routing, strain relief, grounding, and signs of heat, abrasion, looseness, or contamination. Tighten only to the equipment-revision requirement.",
        passCriteria:
          "Hardware is secure; wiring is supported and undamaged; no heat discoloration, exposed conductor, or loose connection is visible.",
        ifFailed:
          "Keep the station unavailable and repair the mounting or electrical condition using approved parts and procedures.",
        requiresShutdown: true,
      },
      {
        title: "Clean receive bin, control panel, and dispatch arm",
        instruction:
          "Remove loose debris and residue using site-approved materials. Clean the carrier contact surfaces without flooding electronics or using a lubricant or chemical not listed for the equipment.",
        passCriteria:
          "The receive area and dispatch surfaces are clean, dry, unobstructed, and free of sharp damage.",
        ifFailed:
          "Stop if contamination, a damaged surface, or a trapped carrier requires a separate recovery or infection-control response.",
        requiresShutdown: true,
      },
      {
        title: "Inspect CID, carrier, and bin sensors",
        instruction:
          "Inspect each sensor and reflector for alignment, contamination, damage, loose mounting, or unstable wiring. Observe its normal clear and occupied indication using the approved diagnostic view.",
        passCriteria:
          "Each sensor changes state once, remains stable, and agrees with the physical condition.",
        ifFailed:
          "Clean or align only within the revision procedure; otherwise document the failed sensor circuit and escalate for repair.",
      },
      {
        title: "Inspect, clean, and adjust the slide plate",
        instruction:
          "Under lockout, inspect the slide plate, guides, stops, brake, linkage, and surrounding carrier path. Clean buildup and perform only the adjustment defined for the exact station revision.",
        passCriteria:
          "The plate is clean, mechanically intact, aligned, and moves without binding when tested through the approved service procedure.",
        ifFailed:
          "Do not return the station to service when it binds, overshoots, has unknown position feedback, or needs undocumented adjustment.",
        requiresShutdown: true,
      },
      {
        title: "Inspect carriers assigned to the station",
        instruction:
          "Check representative carriers for closure, shell damage, contamination, hinge and latch condition, seal condition, and wear-band integrity. Remove unserviceable carriers from circulation.",
        passCriteria:
          "Test carriers close securely, remain clean, and have intact shells, latches, hinges, seals, and wear bands.",
        ifFailed:
          "Quarantine damaged or contaminated carriers and follow the site replacement or cleaning procedure.",
      },
      {
        title: "Reconcile carrier count",
        instruction:
          "Physically count available carriers and compare the result with the station's locally displayed or manually maintained count. Adjust the record only after accounting for carriers in use or held elsewhere.",
        passCriteria: "The documented count matches the verified physical inventory.",
        ifFailed:
          "Record the variance and investigate missing, untracked, or out-of-service carriers before changing the baseline.",
      },
    ],
    verification: [
      "Remove tools, reinstall guards and covers, and clear the lockout under the site procedure.",
      "Confirm stable sensor and position indications with the station empty.",
      "Run at least two approved empty-carrier functional tests and confirm controlled dispatch and arrival.",
      "Record replaced parts, adjustments, unresolved findings, and the next PM date.",
    ],
    escalation: [
      "A carrier is trapped or the mechanism requires major disassembly.",
      "Position feedback is unstable, the mechanism binds, or the brake does not hold correctly.",
      "Electrical testing, controller repair, or an undocumented adjustment is required.",
      "The station cannot pass repeat empty-carrier tests.",
    ],
    source: "Equipment PM procedure: Station",
  },
  {
    id: "diverter",
    title: "Diverter planned maintenance",
    shortName: "Diverter",
    purpose:
      "Inspect the route-switching mechanism, indexed port alignment, seals, sensing, brake, and drive condition.",
    interval:
      "Set the service interval from the equipment-revision manual and local operating conditions.",
    safety: [
      ...universalSafety,
      "Rule out a carrier in the diverter and apply lockout/tagout before touching the tray, face plate, chain, brake, or transition tube.",
    ],
    tools: [
      "Equipment-revision service manual",
      "Site lockout/tagout equipment",
      "Approved alignment tool",
      "Approved cleaner and specified chain lubricant",
      "Inspection light",
    ],
    steps: [
      {
        title: "Inspect hardware and wiring",
        instruction:
          "Inspect mounting hardware, terminal and connector condition, cable support, grounding, sensor wiring, and visible control wiring. Tighten only to the documented requirement.",
        passCriteria:
          "The assembly is secure and wiring is undamaged, supported, and free of looseness or heat damage.",
        ifFailed:
          "Keep affected paths unavailable until the hardware or wiring defect is repaired.",
        requiresShutdown: true,
      },
      {
        title: "Clean tray and face plate; lubricate chain",
        instruction:
          "Under lockout, remove debris from the diverter tray, face plate, ports, and carrier-sensing area. Inspect the chain and apply only the lubricant and amount specified for that revision.",
        passCriteria:
          "Carrier paths are clean, the chain is intact and correctly lubricated, and no foreign material remains.",
        ifFailed:
          "Escalate excessive chain wear, damaged ports, contamination, or any condition requiring transition-tube removal.",
        requiresShutdown: true,
      },
      {
        title: "Inspect seals",
        instruction:
          "Inspect each accessible air seal for wear, cuts, deformation, looseness, contamination, and evidence of leakage. Replace only with the correct revision-compatible part.",
        passCriteria: "Seals are clean, seated, undamaged, and provide uniform contact.",
        ifFailed:
          "Keep the affected route unavailable until the seal is replaced and alignment is verified.",
        requiresShutdown: true,
      },
      {
        title: "Inspect carrier and position sensors",
        instruction:
          "Check sensor mounting, target or reflector alignment, cleanliness, connectors, and stable state changes at each approved test point.",
        passCriteria:
          "Carrier and indexed-position indications change cleanly and agree with the physical device position.",
        ifFailed:
          "Document the failed input and inspect alignment, wiring, supply power, or sensor replacement needs.",
      },
      {
        title: "Inspect brake and drive",
        instruction:
          "Under lockout, inspect brake condition, chain tension, drive components, actuators, stops, and signs of drift or overshoot. Perform only documented adjustment.",
        passCriteria:
          "The drive is intact, the brake holds the indexed position, and there is no binding, excess play, or abnormal wear.",
        ifFailed:
          "Remove the diverter from service when the brake, chain, motor, actuator, or drive needs repair.",
        requiresShutdown: true,
      },
      {
        title: "Check every port alignment",
        instruction:
          "Use the approved electronic positioning procedure and alignment tool to verify every indexed port. Never force the tool or rotate a position-unknown diverter manually.",
        passCriteria:
          "Every port aligns mechanically, reports one stable position, and remains indexed without drift.",
        ifFailed:
          "Keep the diverter unavailable and escalate for alignment, sensor, brake, or drive correction.",
      },
    ],
    verification: [
      "Remove tools, reinstall guards and covers, and clear lockout under the site procedure.",
      "Verify each port reports one stable indexed position.",
      "Run approved empty-carrier tests through every affected route.",
      "Record seal, sensor, chain, brake, alignment, and part-replacement findings.",
    ],
    escalation: [
      "A carrier may remain in the diverter or transition tube.",
      "Any port cannot be aligned electronically and mechanically.",
      "The brake, chain, motor, actuator, or transition tube requires repair.",
      "A controlled empty-carrier test fails or produces an abnormal sighting.",
    ],
    source: "Equipment PM procedure: Diverter",
  },
  {
    id: "blower",
    title: "Blower planned maintenance",
    shortName: "Blower",
    purpose:
      "Inspect the blower package, air shifter, airflow sensing, seals, brake, indexed ports, and supporting hardware.",
    interval:
      "Set the service interval from the equipment-revision manual and local operating conditions.",
    safety: [
      ...universalSafety,
      "Blower packages may contain 208/480 VAC three-phase power; energized testing and electrical access are restricted to qualified personnel.",
      "Do not operate the blower against an unknown obstruction or with guards, covers, or airflow components open.",
    ],
    tools: [
      "Equipment-revision service manual",
      "Site electrical and mechanical lockout equipment",
      "Approved airflow or pressure instrument",
      "Approved cleaner and specified chain lubricant",
      "Qualified electrical support",
    ],
    steps: [
      {
        title: "Inspect hardware and wiring",
        instruction:
          "With the package locked out, inspect mounting hardware, grounding, terminals, connectors, starters, visible control wiring, cable support, and signs of heat or vibration damage.",
        passCriteria:
          "Hardware is secure; wiring is supported and undamaged; no heat, arcing, looseness, or exposed conductor is visible.",
        ifFailed:
          "Keep the blower unavailable and route electrical findings to qualified personnel.",
        requiresShutdown: true,
        qualifiedElectrical: true,
      },
      {
        title: "Clean air shifter, cage, and face plate; lubricate chain",
        instruction:
          "Under lockout, remove debris and buildup from the air shifter, cage, face plate, ports, and sensing area. Inspect the chain and use only the lubricant specified for that revision.",
        passCriteria:
          "Air passages are clear and dry; the chain and drive surfaces are intact and correctly lubricated.",
        ifFailed:
          "Escalate damage, heavy contamination, abnormal wear, or a condition requiring major disassembly.",
        requiresShutdown: true,
      },
      {
        title: "Inspect seals",
        instruction:
          "Inspect vacuum, pressure, shifter, and port seals for cuts, deformation, contamination, looseness, or evidence of air leakage.",
        passCriteria: "Seals are clean, seated, undamaged, and contact uniformly.",
        ifFailed:
          "Replace only with the correct approved part and recheck port alignment before testing.",
        requiresShutdown: true,
      },
      {
        title: "Inspect vacuum and pressure sensors",
        instruction:
          "Inspect sampling tubes, fittings, sensor mounting, wiring, and clear passages. During an approved functional test, compare the vacuum and pressure indication with the commanded phase.",
        passCriteria:
          "Sampling paths are intact and each sensor changes state only during the matching airflow phase.",
        ifFailed:
          "Repair a blocked or leaking sampling path before condemning the blower motor or electrical supply.",
      },
      {
        title: "Inspect brake and air-shifter drive",
        instruction:
          "Under lockout, inspect the brake, chain, sprockets, actuator, stops, and signs of drift, binding, or overshoot. Perform only documented adjustment.",
        passCriteria:
          "The shifter moves through its approved service test, stops cleanly, and holds each indexed state.",
        ifFailed:
          "Keep the package unavailable and escalate brake, drive, actuator, motor, or alignment repair.",
        requiresShutdown: true,
      },
      {
        title: "Check idle, vacuum, and pressure alignment",
        instruction:
          "Using the approved service procedure and alignment tool, verify the idle, vacuum, and pressure ports and their matching position feedback.",
        passCriteria:
          "All ports align, each state has one stable indication, and the shifter does not drift.",
        ifFailed:
          "Do not operate the blower until mechanical alignment and position feedback agree.",
      },
    ],
    verification: [
      "Remove tools, reinstall guards and covers, and clear lockout under the site procedure.",
      "Confirm stable idle, vacuum, and pressure position feedback.",
      "Run approved empty-carrier tests from representative endpoints and compare travel behavior.",
      "Record airflow, seal, sensor, brake, alignment, electrical, and replacement-part findings.",
    ],
    escalation: [
      "Three-phase testing, starter work, motor work, or energized electrical diagnosis is required.",
      "The blower trips protection, rotates incorrectly, overheats, vibrates, or makes abnormal noise.",
      "Airflow remains inadequate after sampling paths and accessible leaks are checked.",
      "The air shifter cannot align or hold idle, vacuum, and pressure positions.",
    ],
    source: "Equipment PM procedure: Blower",
  },
];

export function getMaintenanceTemplate(id: string): MaintenanceTemplate {
  return maintenanceTemplates.find((template) => template.id === id) ?? maintenanceTemplates[0]!;
}
