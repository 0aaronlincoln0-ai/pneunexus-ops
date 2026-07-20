# Troubleshooting knowledge model

## Purpose

Resovii provides evidence-led decision support for hospital pneumatic tube system
technicians. It does not issue live device commands and does not replace manufacturer procedures,
hospital policy, lockout/tagout, infection prevention, IT change control, or qualified electrical
work.

## Diagnostic sequence

Every protocol follows the same operating model:

1. Identify the exact symptom, fault text, device, transaction, and operational impact.
2. Preserve objective evidence before clearing or changing state.
3. Confirm the safety boundary and responsible role.
4. Check the least invasive layer first: operator handling, transaction state, sensor feedback,
   local device state, network path, then physical mechanism.
5. Compare the expected result with the observed result at every step.
6. Stop at the escalation boundary instead of improvising a hazardous recovery.
7. Verify restoration with a controlled empty-carrier test and document the outcome.

## Evidence model

A production diagnostic session should capture:

- organization, campus, system, zone, device, and related work order or incident;
- selected protocol and revision;
- operator-reported symptom and exact fault/advisory wording;
- transaction origin, destination, phase, last sighting, and search outcome;
- sensor, position, airflow, controller, and network observations;
- completed checks, expected results, observed results, and timestamps;
- safety confirmation, responsible role, and any lockout reference;
- probable cause, corrective action, verification tests, disposition, and escalation reason.

The application must reject or warn on patient, specimen, medication, medical-record, and other
clinical identifiers. Carrier contents are recorded only as an operational risk category.

## Knowledge governance

Each guide needs a vendor/model scope, source document and revision, clinical-safety review where
applicable, technical approver, effective date, next review date, version history, and superseded
state. Site-specific overlays may narrow a manufacturer guide but must not silently weaken a safety
gate or escalation condition.

## Access boundaries

- Operators may report symptoms and complete explicitly operator-safe checks.
- Tube-system technicians may complete approved diagnostic and mechanical steps.
- Hospital IT owns network, VLAN, DHCP, switch, firewall, and server changes.
- Infection prevention owns contamination classification and decontamination approval.
- Qualified electrical personnel own energized testing and 208/480 VAC work.
- Vendor or engineering escalation is required for undocumented configurations, major disassembly,
  unsafe carrier recovery, or repeated unexplained failure.

## Source profile

The first knowledge profile was derived from the supplied Pevco ATLAS software and mechanical
training booklet. Content is paraphrased into a consistent Resovii workflow and deliberately
omits live-control shortcuts and improvised impact-recovery actions. Site manuals and current
manufacturer documentation remain authoritative.
