// Terminology mapping: Backend → Business
const TERM_MAP = {
  master: { business: "Central / Center", level: "TOP", color: "#EF4444" },
  central: { business: "Master Store", level: "MIDDLE", color: "#F59E0B" },
  franchise: { business: "Outlet / Unit", level: "BOTTOM", color: "#3B82F6" },
};

const FLAGGED_KEYS = [
  "restaurant_type",
  "store_type",
  "from_restaurant_type",
  "to_restaurant_type",
  "type",
];

export function scanForTerminology(obj, path = "") {
  const flags = [];
  if (!obj || typeof obj !== "object") return flags;

  if (Array.isArray(obj)) {
    obj.forEach((item, i) => {
      flags.push(...scanForTerminology(item, `${path}[${i}]`));
    });
    return flags;
  }

  for (const [key, value] of Object.entries(obj)) {
    const fullPath = path ? `${path}.${key}` : key;

    // Check if value is a flagged term
    if (typeof value === "string") {
      const lower = value.toLowerCase();
      if (TERM_MAP[lower]) {
        flags.push({
          path: fullPath,
          key,
          value,
          mapped: TERM_MAP[lower],
          type: FLAGGED_KEYS.includes(key) ? "critical" : "info",
        });
      }
    }

    // Check if key itself contains a flagged term
    const keyLower = key.toLowerCase();
    for (const term of Object.keys(TERM_MAP)) {
      if (keyLower.includes(term) && !flags.some((f) => f.path === fullPath)) {
        flags.push({
          path: fullPath,
          key,
          value: typeof value === "object" ? "(object)" : String(value),
          mapped: TERM_MAP[term],
          type: "key_contains_term",
          term,
        });
      }
    }

    // Recurse
    if (typeof value === "object" && value !== null) {
      flags.push(...scanForTerminology(value, fullPath));
    }
  }
  return flags;
}

export function getMethodColor(method) {
  const m = method?.toUpperCase();
  switch (m) {
    case "GET": return "#3B82F6";
    case "POST": return "#10B981";
    case "PUT": return "#F59E0B";
    case "DELETE": return "#EF4444";
    case "PATCH": return "#EAB308";
    default: return "#A1A1AA";
  }
}

export function getStatusColor(code) {
  if (!code) return "#A1A1AA";
  if (code >= 200 && code < 300) return "#22C55E";
  if (code >= 300 && code < 400) return "#3B82F6";
  if (code >= 400 && code < 500) return "#F59E0B";
  return "#EF4444";
}

export function getRiskColor(risk) {
  switch (risk?.toUpperCase()) {
    case "HIGH": return "#EF4444";
    case "MEDIUM": return "#F59E0B";
    case "LOW": return "#22C55E";
    default: return "#A1A1AA";
  }
}

export const VERIFICATION_STATUSES = [
  { value: "not_tested", label: "Not Tested", color: "#52525B" },
  { value: "verified_working", label: "Verified Working", color: "#22C55E" },
  { value: "verified_with_notes", label: "Verified w/ Notes", color: "#3B82F6" },
  { value: "failed", label: "Failed", color: "#EF4444" },
  { value: "blocked_backend_issue", label: "Blocked: Backend", color: "#EF4444" },
  { value: "blocked_auth_issue", label: "Blocked: Auth", color: "#F59E0B" },
  { value: "blocked_terminology_unclear", label: "Blocked: Terminology", color: "#F59E0B" },
  { value: "needs_backend_fix", label: "Needs Backend Fix", color: "#EF4444" },
  { value: "unclear", label: "Unclear", color: "#A1A1AA" },
];

export function getVerificationStatusInfo(status) {
  return VERIFICATION_STATUSES.find((s) => s.value === status) || VERIFICATION_STATUSES[0];
}

export { TERM_MAP };
