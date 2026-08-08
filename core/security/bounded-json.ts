export type JsonBounds = Readonly<{
  maxBytes: number;
  maxDepth: number;
  maxNodes: number;
  maxStringBytes: number;
}>;

const DEFAULT_BOUNDS: JsonBounds = {
  maxBytes: 32_768,
  maxDepth: 8,
  maxNodes: 2_048,
  maxStringBytes: 16_384,
};

export function assertBoundedJson(
  value: unknown,
  label: string,
  bounds: JsonBounds = DEFAULT_BOUNDS
): void {
  let nodes = 0;

  function visit(item: unknown, depth: number): void {
    nodes += 1;
    if (nodes > bounds.maxNodes) throw new Error(`${label} exceeds node limit`);
    if (depth > bounds.maxDepth) throw new Error(`${label} exceeds depth limit`);

    if (
      item === null ||
      typeof item === "boolean" ||
      (typeof item === "number" && Number.isFinite(item))
    ) {
      return;
    }
    if (typeof item === "string") {
      if (Buffer.byteLength(item, "utf8") > bounds.maxStringBytes) {
        throw new Error(`${label} contains an oversized string`);
      }
      return;
    }
    if (Array.isArray(item)) {
      for (const child of item) visit(child, depth + 1);
      return;
    }
    if (item && typeof item === "object") {
      const prototype = Object.getPrototypeOf(item);
      if (prototype !== Object.prototype && prototype !== null) {
        throw new Error(`${label} must contain only JSON objects`);
      }
      for (const [key, child] of Object.entries(item)) {
        if (Buffer.byteLength(key, "utf8") > 256) {
          throw new Error(`${label} contains an oversized key`);
        }
        visit(child, depth + 1);
      }
      return;
    }
    throw new Error(`${label} contains a non-JSON value`);
  }

  visit(value, 0);
  const encoded = JSON.stringify(value);
  if (encoded === undefined || Buffer.byteLength(encoded, "utf8") > bounds.maxBytes) {
    throw new Error(`${label} exceeds byte limit`);
  }
}
