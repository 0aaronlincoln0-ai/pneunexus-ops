DO $$
DECLARE
  target_organization_id uuid;
  target_user_id uuid;
  administrator_role_id uuid;
BEGIN
  SELECT id
  INTO target_organization_id
  FROM organizations
  WHERE slug = 'great-lakes-regional-health';

  SELECT id
  INTO target_user_id
  FROM users
  WHERE email = 'organization.admin@greatlakes.demo';

  SELECT id
  INTO administrator_role_id
  FROM roles
  WHERE key = 'organization_admin';

  IF target_organization_id IS NULL OR target_user_id IS NULL OR administrator_role_id IS NULL THEN
    RAISE EXCEPTION 'Administrator activation prerequisites are missing';
  END IF;

  UPDATE organizations
  SET is_demo = false,
      archived_at = NULL,
      updated_at = now()
  WHERE id = target_organization_id;

  UPDATE users
  SET status = 'active',
      failed_login_count = 0,
      locked_until = NULL,
      email_verified_at = COALESCE(email_verified_at, now()),
      updated_at = now()
  WHERE id = target_user_id;

  INSERT INTO memberships (organization_id, user_id, role_id, status)
  VALUES (target_organization_id, target_user_id, administrator_role_id, 'active')
  ON CONFLICT (organization_id, user_id)
  DO UPDATE SET
    role_id = EXCLUDED.role_id,
    status = 'active',
    updated_at = now();
END $$;
