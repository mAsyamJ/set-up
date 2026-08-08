const SENSITIVE_KEY = /(?:^|[_-])(token|secret|password|passwd|authorization|cookie|private[_-]?key|seed|credential|session|wallet|keystore)(?:$|[_-])/i;

export function redactText(value: string): string {
  return value
    .replace(/-----BEGIN [^-]*PRIVATE KEY-----[\s\S]*?-----END [^-]*PRIVATE KEY-----/g, "[REDACTED_PRIVATE_KEY]")
    .replace(/\bAKIA[0-9A-Z]{16}\b/g, "[REDACTED_AWS_ACCESS_KEY]")
    .replace(/\bAIza[0-9A-Za-z_-]{30,}\b/g, "[REDACTED_GOOGLE_API_KEY]")
    .replace(/\b(?:npm_[A-Za-z0-9]{20,}|glpat-[A-Za-z0-9_-]{20,}|xox[baprs]-[A-Za-z0-9-]{12,})\b/g, "[REDACTED_TOKEN]")
    .replace(/\b(?:sk|gh[pousr])[-_][A-Za-z0-9_-]{12,}\b/g, "[REDACTED_TOKEN]")
    .replace(/\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g, "[REDACTED_JWT]")
    .replace(/\bBearer\s+\S+/gi, "Bearer [REDACTED]")
    .replace(/([A-Za-z_][A-Za-z0-9_]*(?:TOKEN|SECRET|PASSWORD|PASSWD|PRIVATE_KEY|ACCESS_KEY|SEED|CREDENTIAL|COOKIE|SESSION)[A-Za-z0-9_]*)\s*=\s*[^\s]+/gi, "$1=[REDACTED]")
    .replace(/:\/\/([^:/\s]+):([^@/\s]+)@/g, "://$1:[REDACTED]@");
}

export function redactValue(value: unknown, depth = 0): unknown {
  if (depth > 12) return "[REDACTED_DEPTH_LIMIT]";
  if (typeof value === "string") return redactText(value);
  if (Array.isArray(value)) return value.map((item) => redactValue(item, depth + 1));
  if (value && typeof value === "object") {
    const output: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) {
      output[key] = SENSITIVE_KEY.test(key) ? "[REDACTED]" : redactValue(item, depth + 1);
    }
    return output;
  }
  return value;
}

export function redactedJson(value: unknown): string {
  return JSON.stringify(redactValue(value));
}

export function containsSensitiveData(value: unknown, depth = 0): boolean {
  if (depth > 12) return true;
  if (typeof value === "string") return redactText(value) !== value;
  if (Array.isArray(value)) return value.some((item) => containsSensitiveData(item, depth + 1));
  if (value && typeof value === "object") {
    return Object.entries(value).some(
      ([key, item]) => SENSITIVE_KEY.test(key) || containsSensitiveData(item, depth + 1)
    );
  }
  return false;
}
