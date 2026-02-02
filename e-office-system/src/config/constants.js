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
  IN_PROGRESS: "IN_PROGRESS",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  REVERTED: "REVERTED",
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

export const MOVEMENT_ACTIONS = {
  FORWARD: "FORWARD", // Standard move
  REVERT: "REVERT", // Send back for correction
  APPROVE: "APPROVE", // Final approval
  REJECT: "REJECT", // Final rejection
};
