# Backup and restoration

The approved PostgreSQL provider must supply encrypted automated backups, point-in-time recovery, geographic requirements, access logging, documented retention, and contractual coverage appropriate to the deployment. File storage requires an independent versioned backup design.

At least quarterly, restore a production-equivalent backup into an isolated environment, verify schema/migration integrity, organization counts, foreign keys, audit continuity, and application smoke tests, then securely dispose of the restored copy. Record RPO/RTO results, exceptions, owners, and evidence. Restoration credentials and backups are secrets; never use real hospital data in developer environments.
