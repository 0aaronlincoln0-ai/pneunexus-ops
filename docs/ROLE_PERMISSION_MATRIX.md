# Role and permission matrix

Capabilities are enforced server-side; labels do not authorize actions. Facility-scoped roles additionally require assignment.

| Role                         | Facilities             | Devices               | Work orders           | Audit/security    | Users/exports        |
| ---------------------------- | ---------------------- | --------------------- | --------------------- | ----------------- | -------------------- |
| Platform Super Administrator | Platform workflow only | Approved support only | Approved support only | Platform manage   | Platform manage      |
| Organization Administrator   | Manage all             | Manage + sensitive    | Manage/assign         | Audit + security  | Manage + export      |
| Network Administrator        | Manage network         | Manage + sensitive    | Manage/assign         | Audit             | Manage + export      |
| Facility Administrator       | Assigned manage        | Manage + sensitive    | Manage/assign         | No security admin | Export               |
| Maintenance Supervisor       | Assigned read          | Manage                | Manage/assign         | No                | Export               |
| Technician                   | Assigned read          | Read/update           | Read/update           | No                | No export by default |
| Auditor                      | Assigned read          | Read                  | Read                  | Audit read        | Export when assigned |
| Read-Only                    | Assigned read          | Read                  | Read                  | No                | No export by default |

Platform support access must use documented, time-bound approval and must not casually browse tenant operational data.
