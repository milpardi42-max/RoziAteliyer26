import type { SessionUser } from "./session";

/**
 * TEMPORARY MODE: the admin panel and admin APIs are intentionally open to everyone.
 * Set this to false to restore the normal signed-admin-session requirement.
 */
export const ADMIN_LOGIN_DISABLED = true;

export const TEMPORARY_ADMIN_SESSION: SessionUser = {
  id: "temporary-admin",
  name: "Temporary Admin",
  email: "temporary-admin@local.invalid",
  role: "admin",
};
