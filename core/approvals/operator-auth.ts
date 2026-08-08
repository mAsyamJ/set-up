import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const SCRYPT_OPTIONS = { N: 2 ** 17, r: 8, p: 1, maxmem: 192 * 1024 * 1024 };

type OperatorVerifier = {
  version: 1;
  operatorId: string;
  salt: string;
  verifier: string;
  scrypt: { N: number; r: number; p: number };
};

export function operatorConfigPath(): string {
  const configHome =
    process.env.HARNESS_CONFIG_HOME ??
    path.join(
      process.env.XDG_CONFIG_HOME ?? path.join(process.env.HOME ?? "", ".config"),
      "agent-harness"
    );
  return path.join(configHome, "operator-auth.json");
}

async function derive(passphrase: string, salt: Buffer): Promise<Buffer> {
  if (passphrase.length < 16) throw new Error("operator passphrase must contain at least 16 characters");
  return new Promise((resolve, reject) => {
    scryptCallback(passphrase, salt, 32, SCRYPT_OPTIONS, (error, derivedKey) => {
      if (error) reject(error);
      else resolve(Buffer.from(derivedKey));
    });
  });
}

export async function initializeOperator(
  operatorId: string,
  passphrase: string,
  target = operatorConfigPath()
): Promise<void> {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9:_-]{0,127}$/.test(operatorId)) {
    throw new Error("invalid operator ID");
  }
  if (fs.existsSync(target)) throw new Error("operator authentication is already initialized");
  const salt = randomBytes(16);
  const verifier = await derive(passphrase, salt);
  const record: OperatorVerifier = {
    version: 1,
    operatorId,
    salt: salt.toString("base64"),
    verifier: verifier.toString("base64"),
    scrypt: { N: SCRYPT_OPTIONS.N, r: SCRYPT_OPTIONS.r, p: SCRYPT_OPTIONS.p },
  };
  fs.mkdirSync(path.dirname(target), { recursive: true, mode: 0o700 });
  fs.writeFileSync(target, `${JSON.stringify(record, null, 2)}\n`, {
    encoding: "utf8",
    mode: 0o600,
    flag: "wx",
  });
}

export async function verifyOperatorPassphrase(
  passphrase: string,
  target = operatorConfigPath()
): Promise<string> {
  const stat = fs.lstatSync(target);
  if (!stat.isFile() || stat.isSymbolicLink()) {
    throw new Error("operator authentication path must be a regular file");
  }
  const currentUid = process.getuid?.();
  if (currentUid !== undefined && stat.uid !== currentUid) {
    throw new Error("operator authentication file owner mismatch");
  }
  if ((stat.mode & 0o077) !== 0) {
    throw new Error("operator authentication file permissions are too broad");
  }
  if (stat.size < 1 || stat.size > 16_384) {
    throw new Error("operator authentication file size is invalid");
  }
  const record = JSON.parse(fs.readFileSync(target, "utf8")) as OperatorVerifier;
  if (
    record.version !== 1 ||
    !/^[a-zA-Z0-9][a-zA-Z0-9:_-]{0,127}$/.test(record.operatorId) ||
    !/^[A-Za-z0-9+/]{22}==$/.test(record.salt) ||
    !/^[A-Za-z0-9+/]{43}=$/.test(record.verifier) ||
    record.scrypt.N !== SCRYPT_OPTIONS.N ||
    record.scrypt.r !== SCRYPT_OPTIONS.r ||
    record.scrypt.p !== SCRYPT_OPTIONS.p
  ) {
    throw new Error("unsupported operator authentication parameters");
  }
  const actual = await derive(passphrase, Buffer.from(record.salt, "base64"));
  const expected = Buffer.from(record.verifier, "base64");
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    throw new Error("operator authentication failed");
  }
  return record.operatorId;
}
