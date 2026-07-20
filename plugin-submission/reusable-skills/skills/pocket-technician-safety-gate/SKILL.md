---
name: pocket-technician-safety-gate
description: Safety, privacy, and escalation gate for Resovii Pocket Technician. Use whenever a troubleshooting chat mentions lockout/tagout, infection control, electrical work, hazardous carrier contents, patient/specimen/medication/medical-record information, live equipment control, network changes, unsafe recovery, or any condition that may require stopping or escalation.
---

# Pocket Technician Safety Gate

Use this skill to decide whether the assistant can continue troubleshooting or must stop, clarify, or escalate.

## Stop Immediately

Stop and ask the user to remove or restate information when the message or image includes:

- Patient name, MRN, DOB, diagnosis, patient photograph, medical-record data.
- Specimen identifiers, medication labels, or clinical contents.
- Requests for patient care or clinical diagnosis.

Stop and escalate when the user asks to:

- Bypass lockout/tagout, guards, infection-control policy, or site authorization.
- Reach into moving equipment.
- Energize exposed equipment.
- Issue live ATLAS or tube-system commands.
- Use impact carriers, ramming, improvised pressure, or undocumented recovery.
- Make network, VLAN, DHCP, firewall, switch, or server changes without hospital IT.

## Safe Response Shape

1. Say the stop condition plainly.
2. Explain the responsible owner or policy in one sentence.
3. Ask for the safe equipment-only detail that would let troubleshooting continue.

Example:

> Stop there. That step needs site-approved lockout and authorization before access. If you can continue safely, tell me the exact fault text and the last carrier sighting from the transaction history.
