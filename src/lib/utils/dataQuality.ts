const MAX_OPERATIONAL_AGE_MS = 24 * 60 * 60 * 1000;

export function hasFreshVerifiedProvenance(
  record: Record<string, unknown>,
  now = Date.now()
): boolean {
  const provenance = record.provenance;
  if (!provenance || typeof provenance !== "object" || Array.isArray(provenance)) return false;

  const source = provenance as Record<string, unknown>;
  if (
    source.kind !== "verified_real" ||
    typeof source.sourceId !== "string" ||
    !source.sourceId.trim() ||
    typeof source.sourceName !== "string" ||
    !source.sourceName.trim() ||
    typeof source.processingVersion !== "string" ||
    !source.processingVersion.trim() ||
    typeof source.confidence !== "number" ||
    !Number.isFinite(source.confidence) ||
    source.confidence < 0 ||
    source.confidence > 1
  ) return false;

  const observedAt = Date.parse(String(source.observedAt ?? ""));
  const recordedAt = Date.parse(String(source.recordedAt ?? ""));
  const verification = source.verification;
  if (
    !Number.isFinite(observedAt) ||
    !Number.isFinite(recordedAt) ||
    observedAt > now ||
    recordedAt > now ||
    now - observedAt > MAX_OPERATIONAL_AGE_MS ||
    !verification ||
    typeof verification !== "object" ||
    Array.isArray(verification)
  ) return false;

  const verified = verification as Record<string, unknown>;
  const verifiedAt = Date.parse(String(verified.verifiedAt ?? ""));
  return (
    typeof verified.verifiedBy === "string" &&
    verified.verifiedBy.trim().length > 0 &&
    Number.isFinite(verifiedAt) &&
    verifiedAt <= now
  );
}
