#!/usr/bin/env node
// Before `vite build` in CI: overwrite src/content/<key>.json with the documents published from
// the admin console (public API, anonymous identity-pool guest, SigV4), so the bundled fallback
// and the SEO prerender match what the live site shows. Local builds keep the repo copies unless
// VITE_PUBLIC_API_URL/VITE_PUBLIC_IDENTITY_POOL_ID are set. Never fails the build: on any error
// the committed files are used. Only keys that already exist as files are written.
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const CONTENT = path.join(root, "src/content");
const url = process.env.VITE_PUBLIC_API_URL;
const poolId = process.env.VITE_PUBLIC_IDENTITY_POOL_ID;
const site = process.argv[2] || "landing";

async function identity(target, body, region) {
  const res = await fetch(`https://cognito-identity.${region}.amazonaws.com/`, {
    method: "POST",
    headers: { "Content-Type": "application/x-amz-json-1.1", "X-Amz-Target": `AWSCognitoIdentityService.${target}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${target}: HTTP ${res.status}`);
  return res.json();
}

const sha256 = (s) => crypto.createHash("sha256").update(s).digest("hex");
const hmac = (key, s) => crypto.createHmac("sha256", key).update(s).digest();

async function main() {
  if (!url || !poolId) return console.log("[content] public API not configured: using the committed content");
  const region = poolId.split(":")[0];
  const { IdentityId } = await identity("GetId", { IdentityPoolId: poolId }, region);
  const { Credentials: c } = await identity("GetCredentialsForIdentity", { IdentityId }, region);
  const target = new URL(`/api/public/content/${site}`, url);
  const amzDate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, "");
  const date = amzDate.slice(0, 8);
  const signed = "host;x-amz-date;x-amz-security-token";
  const canonical = ["GET", target.pathname, "", `host:${target.host}\nx-amz-date:${amzDate}\nx-amz-security-token:${c.SessionToken}\n`, signed, sha256("")].join("\n");
  const scope = `${date}/${region}/execute-api/aws4_request`;
  let key = hmac(`AWS4${c.SecretKey}`, date);
  for (const part of [region, "execute-api", "aws4_request"]) key = hmac(key, part);
  const signature = crypto.createHmac("sha256", key).update(["AWS4-HMAC-SHA256", amzDate, scope, sha256(canonical)].join("\n")).digest("hex");
  const res = await fetch(target, {
    headers: {
      "X-Amz-Date": amzDate,
      "X-Amz-Security-Token": c.SessionToken,
      Authorization: `AWS4-HMAC-SHA256 Credential=${c.AccessKeyId}/${scope}, SignedHeaders=${signed}, Signature=${signature}`,
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const { documents } = await res.json();
  const written = [];
  for (const [name, data] of Object.entries(documents ?? {})) {
    const file = path.join(CONTENT, `${name}.json`);
    if (!/^[a-z0-9-]+$/.test(name) || !fs.existsSync(file)) continue;
    fs.writeFileSync(file, JSON.stringify(data, null, 2) + "\n");
    written.push(name);
  }
  console.log(`[content] published ${site} content: ${written.join(", ") || "none"}`);
}

main().catch((error) => console.warn(`[content] could not pull published content (${error.message}); using the committed files`));
