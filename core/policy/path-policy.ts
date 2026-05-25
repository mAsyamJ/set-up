import path from "node:path";

const SECRET_PATH_RE = /\.env$|\.env\.|credentials|\.pem$|id_rsa|seed/i;

export function isSecretPath(relOrAbs: string): boolean {
  return SECRET_PATH_RE.test(relOrAbs);
}

export function resolveInProject(projectRoot: string, rel: string): string {
  const root = path.resolve(projectRoot);
  const abs = path.resolve(root, rel);
  if (!abs.startsWith(root + path.sep) && abs !== root) {
    throw new Error("path escapes project root");
  }
  if (isSecretPath(abs)) {
    throw new Error("secrets path denied");
  }
  return abs;
}
