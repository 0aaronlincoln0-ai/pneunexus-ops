# Database model

```mermaid
erDiagram
  ORGANIZATIONS ||--o{ HOSPITAL_NETWORKS : owns
  HOSPITAL_NETWORKS ||--o{ CAMPUSES : contains
  CAMPUSES ||--o{ BUILDINGS : contains
  BUILDINGS ||--o{ FLOORS : contains
  FLOORS ||--o{ ROOMS : contains
  CAMPUSES ||--o{ PNEUMATIC_SYSTEMS : operates
  PNEUMATIC_SYSTEMS ||--o{ ZONES : divides
  ZONES ||--o{ LINES : routes
  PNEUMATIC_SYSTEMS ||--o{ DEVICES : contains
  DEVICES ||--o{ PORTS : exposes
  PORTS ||--o{ CONNECTIONS : links
  ORGANIZATIONS ||--o{ MEMBERSHIPS : grants
  USERS ||--o{ MEMBERSHIPS : holds
  ROLES ||--o{ MEMBERSHIPS : assigns
  ROLES ||--o{ ROLE_PERMISSIONS : maps
  PERMISSIONS ||--o{ ROLE_PERMISSIONS : maps
  DEVICES ||--o{ WORK_ORDERS : relates
  DEVICES ||--o{ INSPECTIONS : receives
  DEVICES ||--o{ INCIDENTS : affects
  ORGANIZATIONS ||--o{ AUDIT_EVENTS : records
```

The migration creates 43 normalized tables. All tenant-owned rows have `organization_id`; public IDs are UUIDs. Database constraints prevent duplicate facility asset tags, duplicate device port names, and duplicate source/destination port assignments. Important operational history uses archive timestamps and audit rows are protected by update/delete rejection triggers.
