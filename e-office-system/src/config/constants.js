/**
 * src/config/constants.js
 * Central dictionary for Maharashtra Mandal System
 */

export const ROLES = {
  ADMIN: "ADMIN", // Manages Users/Org
  STAFF: "STAFF", // Data Entry, Forward Only
  BOARD_MEMBER: "BOARD_MEMBER", // Approver, PIN holder
};

export const DESIGNATIONS = {
  PRESIDENT: "PRESIDENT",
  SECRETARY: "SECRETARY",
  WARDEN: "WARDEN",
  COORDINATOR: "COORDINATOR",
  MEMBER: "MEMBER",
  CLERK: "CLERK",
  SYSTEM_ADMIN: "SYSTEM_ADMIN",
};

export const FILE_STATUS = {
  DRAFT: "DRAFT",
  PENDING_REVIEW: "PENDING_REVIEW",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  FORWARDED_TO_PRESIDENT: "FORWARDED_TO_PRESIDENT",
};

export const PRIORITY = {
  LOW: "LOW",
  MEDIUM: "MEDIUM",
  HIGH: "HIGH",
};

export const FILE_TYPES = {
  GENERIC: "GENERIC",
  FINANCIAL: "FINANCIAL",
  POLICY: "POLICY",
};
