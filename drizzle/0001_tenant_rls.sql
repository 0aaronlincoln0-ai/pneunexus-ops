-- Defense-in-depth tenant isolation. The application role must set
-- app.organization_id at the start of each transaction. Migrations should run
-- under a separate owner role; the runtime role must not own these tables.
DO $$
DECLARE
  tenant_table text;
BEGIN
  FOREACH tenant_table IN ARRAY ARRAY[
    'hospital_networks','campuses','buildings','floors','rooms','pneumatic_systems','zones','lines',
    'devices','ports','connections','memberships','facility_assignments','work_orders','work_order_events',
    'maintenance_templates','maintenance_template_versions','maintenance_schedules','maintenance_instances',
    'inspections','incidents','incident_events','documents','document_versions','attachments','qr_identifiers',
    'exports','notifications','audit_events','sessions','organization_settings','retention_policies',
    'custom_field_definitions','custom_field_values'
  ]
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tenant_table);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I FOR ALL USING (organization_id = NULLIF(current_setting(''app.organization_id'', true), '''')::uuid) WITH CHECK (organization_id = NULLIF(current_setting(''app.organization_id'', true), '''')::uuid)',
      tenant_table
    );
  END LOOP;
END $$;

-- Audit history is immutable through ordinary SQL roles as well as the API.
CREATE OR REPLACE FUNCTION prevent_audit_event_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'audit_events are append-only';
END;
$$;

CREATE TRIGGER audit_events_no_update
BEFORE UPDATE ON audit_events
FOR EACH ROW EXECUTE FUNCTION prevent_audit_event_mutation();

CREATE TRIGGER audit_events_no_delete
BEFORE DELETE ON audit_events
FOR EACH ROW EXECUTE FUNCTION prevent_audit_event_mutation();

COMMENT ON TABLE audit_events IS 'Append-only security and operational audit history; update and delete are prohibited.';
