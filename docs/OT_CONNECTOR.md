# Future read-only OT connector design

No Phase 1 component connects to or controls hospital equipment. A future connector requires a separate architecture and safety review.

The preferred design is a hospital-hosted connector making outbound-only mutually authenticated TLS connections from a segmented integration zone. It uses allowlisted devices/endpoints, unique minimal service accounts, explicit versioned read-only data contracts, certificate rotation, compatibility checks, health monitoring, tamper-evident logs, a local and cloud kill switch, signed updates, rollback, and no shared credentials.

Commands to physical equipment are outside this design. Any future control capability requires an independently approved safety, clinical/facility engineering, cybersecurity, legal, vendor, and operational architecture; read-only must remain the default.
