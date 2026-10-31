/**
 * Central Inventory — Predefined Reason Categories (Slice 5)
 *
 * Adjustment categories: Q-S5-003: B (defaults, configurable in next phase)
 * Wastage categories: Q-WASTE-001: B (standard restaurant wastage reasons)
 *
 * Each item has { value, label } for use in dropdown selects.
 * "Other" allows free-text entry in forms that consume these categories.
 */

export const ADJUSTMENT_REASONS = [
  { value: "counting_error", label: "Counting Error" },
  { value: "system_correction", label: "System Correction" },
  { value: "opening_balance", label: "Opening Balance" },
  { value: "quality_issue", label: "Quality Issue" },
  { value: "other", label: "Other" },
];

export const WASTAGE_REASONS = [
  { value: "expired", label: "Expired" },
  { value: "spoiled", label: "Spoiled" },
  { value: "damaged", label: "Damaged" },
  { value: "spillage", label: "Spillage" },
  { value: "pest_contamination", label: "Pest/Contamination" },
  { value: "other", label: "Other" },
];
