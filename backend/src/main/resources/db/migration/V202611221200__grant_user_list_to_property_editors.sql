-- The property form's Builder field lists builder accounts through GET /api/v1/admin/users
-- (?userType=builder&status=active), which needs USER_LIST (user.list). Dashboard roles (admin_panel.access)
-- that can create or edit any property (property.create or property.update_any) get it too. App roles such as
-- `user` also hold property.create (owners list from the mobile app) but have no dashboard access, so they
-- get nothing. USER_LIST shows the user list with contact
-- details and counts; it does not allow opening, creating, changing or deleting accounts.
-- Merged into the existing permissions; roles that already have user.list (admin, super-admin) are unchanged.
-- Roles created later need the permission set in the Roles screen.
-- Rollback: db/rollback/U202611221200__grant_user_list_to_property_editors.sql

SET LOCAL lock_timeout = '5s';

UPDATE roles
SET permissions = permissions || jsonb_build_object('user', COALESCE(permissions -> 'user', '{}'::jsonb)
        || '{"list": true}'::jsonb),
    updated_at = now()
WHERE (permissions -> 'admin_panel' ->> 'access')::boolean IS TRUE
  AND ((permissions -> 'property' ->> 'create')::boolean IS TRUE
       OR (permissions -> 'property' ->> 'update_any')::boolean IS TRUE)
  AND (permissions -> 'user' ->> 'list')::boolean IS NOT TRUE;
