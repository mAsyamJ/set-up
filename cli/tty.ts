import process from "node:process";
import readline from "node:readline/promises";

export function requireTty(): void {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new Error("operation requires an interactive TTY");
  }
}

export function readSecret(prompt: string): Promise<string> {
  requireTty();
  return new Promise((resolve, reject) => {
    const input = process.stdin;
    const output = process.stdout;
    let value = "";
    output.write(prompt);
    input.setRawMode?.(true);
    input.resume();
    input.setEncoding("utf8");
    const cleanup = () => {
      input.off("data", onData);
      input.setRawMode?.(false);
      input.pause();
      output.write("\n");
    };
    const onData = (chunk: string) => {
      for (const char of chunk) {
        if (char === "\u0003") {
          cleanup();
          reject(new Error("cancelled"));
          return;
        }
        if (char === "\r" || char === "\n") {
          cleanup();
          resolve(value);
          return;
        }
        if (char === "\u007f") value = value.slice(0, -1);
        else if (char >= " ") value += char;
      }
    };
    input.on("data", onData);
  });
}

export async function readLine(prompt: string): Promise<string> {
  requireTty();
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    return (await rl.question(prompt)).trim();
  } finally {
    rl.close();
  }
}
