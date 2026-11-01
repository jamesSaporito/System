import { z } from "zod";

// Enum literals match the Prisma enum in packages/db (Permission) so values go to and from the
// database without a mapping.

/** An admin tab a member can open. Admins hold all of them; managing members is admin-only. */
export const permissionSchema = z.enum(["DASHBOARD", "SESSIONS", "SECURITY"]);
export type Permission = z.infer<typeof permissionSchema>;

export const PERMISSIONS: readonly Permission[] = permissionSchema.options;

/**
 * Starting points for the permissions checklist. Only the resulting permissions are stored, so
 * changing a preset never changes what existing members can open.
 */
export const PERMISSION_PRESET_NAMES = ["none", "viewer", "full"] as const;
export type PermissionPreset = (typeof PERMISSION_PRESET_NAMES)[number];
export const PERMISSION_PRESETS: Record<PermissionPreset, readonly Permission[]> = {
  none: [],
  viewer: ["DASHBOARD"],
  full: PERMISSIONS,
};

/** The permissions a member is granted, without duplicates. */
export const permissionsSchema = z
  .array(permissionSchema)
  .transform((permissions) => [...new Set(permissions)]);

export const updateMemberPermissionsSchema = z.strictObject({ permissions: permissionsSchema });
export type UpdateMemberPermissionsInput = z.infer<typeof updateMemberPermissionsSchema>;
