// CR-043 — G-028/G-029 friendly mapping for catalog lock / policy 403s.
// Central helper so every catalogue mutation catch can convert raw axios
// error codes into human-readable messages without duplicating literals.

const CATALOG_ERROR_MAP = {
  PUSHED_CATALOG_LOCKED:
    "This item is managed by hierarchy push and can only be edited on the parent store.",
  CHILD_CATALOG_POLICY_DENIED:
    "This store is not permitted to make this catalogue change (set by parent).",
};

/**
 * Extract a friendly message from an axios error's response body.
 * Returns null when the code is not one of the catalog-lock codes,
 * so the caller can fall back to its own error message chain.
 */
export function friendlyCatalogError(err) {
  const data = err && err.response && err.response.data;
  const code = data && (data.error_code || data.code);
  if (code && CATALOG_ERROR_MAP[code]) return CATALOG_ERROR_MAP[code];
  return null;
}
