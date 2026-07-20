# Pevco Diagnostic Method

## Operating Sequence

Use this sequence for Pevco/ATLAS-style pneumatic tube troubleshooting:

1. Identify the exact symptom, device, fault text, transaction, and operational impact.
2. Preserve objective evidence before clearing state.
3. Confirm the safety boundary and responsible role.
4. Check least invasive layers first: operator handling, transaction state, sensor feedback, local device state, network path, then physical mechanism.
5. Compare expected result with observed result at every step.
6. Stop at escalation boundaries instead of improvising recovery.
7. Verify restoration with an approved empty-carrier test and document the outcome.

## Device Families

Station:
- Send, receive, hold, and report carrier movement.
- Evidence: dispatcher position, slide plate position, carrier sensor, full-bin sensor, local controller, touchscreen status.

Diverter:
- Align carrier paths between indexed tube ports.
- Evidence: indexed port position, carrier sighting, alignment, seal, chain, and drive condition.

Blower:
- Provide vacuum and pressure phases.
- Evidence: idle/vacuum/pressure position, airflow feedback, travel time, zone-wide versus endpoint-specific symptoms.

## Escalation Owners

- Hospital IT owns switch, VLAN, DHCP, firewall, and server changes.
- Infection prevention owns contamination classification.
- Qualified electrical personnel own energized testing and 208/480 VAC work.
- Vendor or engineering escalation is required for undocumented configurations, major disassembly, unsafe carrier recovery, or repeated unexplained failure.
