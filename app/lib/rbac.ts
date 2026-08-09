import { permissions, type Permission, type Role } from "./constants";

/**
 * Checks if a user has the required permission based on their role.
 * @param userRole - The role of the user
 * @param permission - The specific permission string to check for
 * @returns boolean
 */
export function hasPermission(
  userRole: string | undefined,
  permission: Permission,
): boolean {
  if (!userRole) return false;

  const allowedRoles = permissions[permission] as readonly string[];
  return allowedRoles.includes(userRole);
}

/**
 * Checks if a user has any of the specified roles.
 * @param userRole - The role of the user
 * @param roles - Array of roles that are allowed
 * @returns boolean
 */
export function hasRole(userRole: string | undefined, roles: Role[]): boolean {
  if (!userRole) return false;
  return roles.includes(userRole as Role);
}