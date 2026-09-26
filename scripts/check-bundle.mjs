#!/usr/bin/env node
// The landing is static and public: its bundle must carry no user pool, app API or payment
// config (app-separation invariant). Its only build values are the app URL and the public
// content API URL + identity pool id. Run after `vite build`; fails on any match.
import fs from "node:fs";
import path from "node:path";

const dist = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..", "dist");
const FORBIDDEN = [
  /cognito-idp\./i,
  /userPoolId|userPoolClientId|user_pool/i,
  /us-east-1_[A-Za-z0-9]{9}/, // user pool id
  /aws-amplify|amplify-/i,
  /fire-api\.jcampos\.dev|api\.fire-code\.jcampos\.dev/, // the app API
  /paypal/i,
];
const hits = [];
(function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p);
    else if (/\.(js|html|css|json|map)$/.test(entry.name)) {
      const text = fs.readFileSync(p, "utf8");
      for (const re of FORBIDDEN) if (re.test(text)) hits.push(`${path.relative(dist, p)}: ${re}`);
    }
  }
})(dist);
if (hits.length) {
  console.error(`Forbidden app config in the landing bundle:\n  ${hits.join("\n  ")}`);
  process.exit(1);
}
console.log("Landing bundle is clean (no user pool, app API or payment config).");
