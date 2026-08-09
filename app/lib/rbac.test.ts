import { describe, expect, it } from "vitest";
import { roles } from "~/lib/constants";
import { hasPermission, hasRole } from "~/lib/rbac";

describe("hasPermission", () => {
  it("denies when role is undefined", () => {
    expect(hasPermission(undefined, "MANAGE_MEMBERS")).toBe(false);
  });

  it("grants MANAGE_MEMBERS only to admin and super_admin", () => {
    expect(hasPermission(roles.member, "MANAGE_MEMBERS")).toBe(false);
    expect(hasPermission(roles.admin, "MANAGE_MEMBERS")).toBe(true);
    expect(hasPermission(roles.super_admin, "MANAGE_MEMBERS")).toBe(true);
  });

  it("grants MANAGE_PAYMENTS only to admin and super_admin", () => {
    expect(hasPermission(roles.member, "MANAGE_PAYMENTS")).toBe(false);
    expect(hasPermission(roles.admin, "MANAGE_PAYMENTS")).toBe(true);
    expect(hasPermission(roles.super_admin, "MANAGE_PAYMENTS")).toBe(true);
  });

  it("grants MANAGE_EVENTS only to admin and super_admin", () => {
    expect(hasPermission(roles.member, "MANAGE_EVENTS")).toBe(false);
    expect(hasPermission(roles.admin, "MANAGE_EVENTS")).toBe(true);
  });

  it("grants MANAGE_TRANSFERS only to super_admin", () => {
    expect(hasPermission(roles.member, "MANAGE_TRANSFERS")).toBe(false);
    expect(hasPermission(roles.admin, "MANAGE_TRANSFERS")).toBe(false);
    expect(hasPermission(roles.super_admin, "MANAGE_TRANSFERS")).toBe(true);
  });

  it("grants MANAGE_TICKETS to admin and super_admin but not member", () => {
    expect(hasPermission(roles.member, "MANAGE_TICKETS")).toBe(false);
    expect(hasPermission(roles.admin, "MANAGE_TICKETS")).toBe(true);
    expect(hasPermission(roles.super_admin, "MANAGE_TICKETS")).toBe(true);
  });

  it("grants ASSIGN_TICKET only to super_admin", () => {
    expect(hasPermission(roles.member, "ASSIGN_TICKET")).toBe(false);
    expect(hasPermission(roles.admin, "ASSIGN_TICKET")).toBe(false);
    expect(hasPermission(roles.super_admin, "ASSIGN_TICKET")).toBe(true);
  });

  it("grants MANAGE_SESSIONS and MANAGE_ROLES only to super_admin", () => {
    expect(hasPermission(roles.admin, "MANAGE_SESSIONS")).toBe(false);
    expect(hasPermission(roles.super_admin, "MANAGE_SESSIONS")).toBe(true);
    expect(hasPermission(roles.admin, "MANAGE_ROLES")).toBe(false);
    expect(hasPermission(roles.super_admin, "MANAGE_ROLES")).toBe(true);
  });

  it("grants MANAGE_SETTINGS to every role including member", () => {
    expect(hasPermission(roles.member, "MANAGE_SETTINGS")).toBe(true);
    expect(hasPermission(roles.admin, "MANAGE_SETTINGS")).toBe(true);
    expect(hasPermission(roles.super_admin, "MANAGE_SETTINGS")).toBe(true);
  });

  it("returns false for an unknown role string", () => {
    expect(hasPermission("not-a-role", "MANAGE_EVENTS")).toBe(false);
  });
});

describe("hasRole", () => {
  it("returns false when role is undefined", () => {
    expect(hasRole(undefined, [roles.admin])).toBe(false);
  });

  it("matches roles in the allowed list", () => {
    expect(hasRole(roles.admin, [roles.admin, roles.super_admin])).toBe(true);
    expect(hasRole(roles.member, [roles.admin])).toBe(false);
  });

  it("is case-sensitive", () => {
    expect(hasRole("ADMIN", [roles.admin])).toBe(false);
  });
});
