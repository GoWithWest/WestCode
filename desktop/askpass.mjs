// SSH passwords and one-time codes (Claude Desktop asks for them and can
// remember a password). ssh runs our SSH_ASKPASS helper for every prompt;
// the helper asks this process over a token-guarded 127.0.0.1 endpoint,
// which answers from a saved password (encrypted with the OS keychain) or
// asks the user in the app.
import { createServer } from "node:http";
import { randomBytes } from "node:crypto";
import { chmodSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

const westcodeHome = () => process.env.WESTCODE_HOME || join(homedir(), ".westcode");
const secretsFile = () => join(westcodeHome(), "ssh-secrets.json");

let endpoint = null; // { url, token }
let crypto = null; // { encrypt(str) -> base64, decrypt(base64) -> str }

const HELPER = `#!/bin/sh
# WestCode SSH_ASKPASS: ask the WestCode app for this ssh prompt.
exec curl -fsS --max-time 300 -H "X-WestCode-Token: $WESTCODE_ASKPASS_TOKEN" \\
  --data-urlencode "host=$WESTCODE_ASKPASS_HOST" --data-urlencode "prompt=$1" \\
  "$WESTCODE_ASKPASS_URL"
`;

export function helperPath() {
  const p = join(westcodeHome(), "bin", "westcode-askpass");
  let cur = "";
  try {
    cur = readFileSync(p, "utf8");
  } catch {
    /* first use */
  }
  if (cur !== HELPER) {
    mkdirSync(dirname(p), { recursive: true });
    writeFileSync(p, HELPER);
  }
  chmodSync(p, 0o755);
  return p;
}

/** Env that makes ssh ask WestCode instead of a terminal. Empty until started. */
export function askpassEnv(hostId) {
  if (!endpoint) return {};
  return {
    SSH_ASKPASS: helperPath(),
    SSH_ASKPASS_REQUIRE: "force",
    DISPLAY: process.env.DISPLAY || ":0",
    WESTCODE_ASKPASS_URL: endpoint.url,
    WESTCODE_ASKPASS_TOKEN: endpoint.token,
    WESTCODE_ASKPASS_HOST: String(hostId || ""),
  };
}

function readSecrets() {
  try {
    return JSON.parse(readFileSync(secretsFile(), "utf8")) || {};
  } catch {
    return {};
  }
}

export function savedPassword(hostId) {
  const enc = readSecrets()[hostId];
  if (!enc || !crypto) return "";
  try {
    return crypto.decrypt(enc);
  } catch {
    return "";
  }
}

export function rememberPassword(hostId, password) {
  if (!crypto) return false;
  const all = readSecrets();
  if (password) all[hostId] = crypto.encrypt(password);
  else delete all[hostId];
  mkdirSync(westcodeHome(), { recursive: true });
  writeFileSync(secretsFile(), JSON.stringify(all), { mode: 0o600 });
  return true;
}

export function forgetPassword(hostId) {
  const all = readSecrets();
  delete all[hostId];
  writeFileSync(secretsFile(), JSON.stringify(all), { mode: 0o600 });
}

export function hasSavedPassword(hostId) {
  return Boolean(readSecrets()[hostId]);
}

/** A password or key passphrase prompt (not a one-time code, host key question, etc.). */
export function isPasswordPrompt(prompt) {
  return /pass(word|phrase)/i.test(prompt) && !/(one[- ]time|verification|code|otp|token|yes\/no)/i.test(prompt);
}

/**
 * Start the endpoint. `ask({hostId, prompt, secret})` shows the prompt in
 * the app and resolves {value, remember} or null when cancelled.
 */
export function startAskpass({ ask, encrypt, decrypt }) {
  crypto = encrypt && decrypt ? { encrypt, decrypt } : null;
  const token = randomBytes(24).toString("hex");
  // A saved password that was just used and is asked for again was wrong:
  // ask the user instead of looping on it.
  const lastSaved = new Map();
  const server = createServer((req, res) => {
    if (req.method !== "POST" || req.headers["x-westcode-token"] !== token) {
      res.writeHead(403).end();
      return;
    }
    let body = "";
    req.on("data", (c) => {
      body += c;
      if (body.length > 20_000) req.destroy();
    });
    req.on("end", async () => {
      const form = new URLSearchParams(body);
      const hostId = form.get("host") || "";
      const prompt = (form.get("prompt") || "").slice(0, 500);
      try {
        const saved = isPasswordPrompt(prompt) ? savedPassword(hostId) : "";
        const recent = lastSaved.get(hostId) || 0;
        if (saved && Date.now() - recent > 15_000) {
          lastSaved.set(hostId, Date.now());
          res.writeHead(200, { "content-type": "text/plain" }).end(saved);
          return;
        }
        if (saved) forgetPassword(hostId);
        const answer = await ask({ hostId, prompt, secret: !/yes\/no/i.test(prompt) });
        if (!answer) {
          res.writeHead(401).end();
          return;
        }
        if (answer.remember && isPasswordPrompt(prompt)) rememberPassword(hostId, answer.value);
        res.writeHead(200, { "content-type": "text/plain" }).end(answer.value);
      } catch {
        res.writeHead(500).end();
      }
    });
  });
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      endpoint = { url: `http://127.0.0.1:${server.address().port}/askpass`, token };
      resolve(endpoint);
    });
  });
}
