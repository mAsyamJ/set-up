import fs from "node:fs";
import path from "node:path";

const SECRET_PATH_RE = /(^|[/\\])(\.env(?:\..*)?|\.npmrc|\.netrc|\.ssh(?:[/\\]|$)|credentials?(?:[/\\.]|$)|keystore|wallet|seed(?:[-_. ]?phrase)?|id_(?:rsa|dsa|ecdsa|ed25519)|[^/\\]*\.(?:pem|key|p12|pfx))($|[/\\])/i;

export function isSecretPath(relOrAbs: string): boolean {
  return SECRET_PATH_RE.test(relOrAbs);
}

export function resolveInProject(projectRoot: string, rel: string): string {
  const root = fs.realpathSync(projectRoot);
  const requested = path.resolve(root, rel);
  if (!isWithin(root, requested)) {
    throw new Error("path escapes project root");
  }
  if (isSecretPath(requested)) {
    throw new Error("secrets path denied");
  }

  let existing = requested;
  const suffix: string[] = [];
  while (!fs.existsSync(existing)) {
    const parent = path.dirname(existing);
    if (parent === existing) throw new Error("path has no existing ancestor");
    suffix.unshift(path.basename(existing));
    existing = parent;
  }
  const realExisting = fs.realpathSync(existing);
  if (!isWithin(root, realExisting)) {
    throw new Error("symlink escapes project root");
  }
  const resolved = path.join(realExisting, ...suffix);
  if (!isWithin(root, resolved)) {
    throw new Error("path escapes project root");
  }
  return resolved;
}

function isWithin(root: string, candidate: string): boolean {
  return candidate === root || candidate.startsWith(root + path.sep);
}
