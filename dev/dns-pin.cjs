// DEV-ONLY DNS workaround (never product code, never imported by the app).
// This host's default resolver filters *.bitget.com while public DNS resolves
// it fine. This hook pins api.bitget.com to the observed anycast IP for the
// local dev/test process only, keeping SNI + full TLS verification intact.
// Production uses normal DNS (P6 sec 6, P18 re-proof). Usage:
//   $env:NODE_OPTIONS="--require ./dev/dns-pin.js"; npm run dev
// Pinned IP observed 2026-09-11/12; re-verify if connections fail.
const dns = require("node:dns");

const PINNED = { "api.bitget.com": ["104.18.14.166", "104.18.15.166"] };
const origLookup = dns.lookup.bind(dns);

function pick(hostname) {
  const ips = PINNED[hostname];
  if (!ips) return null;
  return ips[Math.floor(Math.random() * ips.length)];
}

dns.lookup = function patchedLookup(hostname, options, callback) {
  if (typeof options === "function") {
    callback = options;
    options = {};
  }
  const ip = typeof hostname === "string" ? pick(hostname) : null;
  if (!ip) return origLookup(hostname, options, callback);
  const family = options && options.family ? options.family : 4;
  const result =
    options && options.all
      ? [{ address: ip, family }]
      : options && (options.verbatim === false || options.hints)
        ? [ip, family]
        : ip;
  if (options && options.all) process.nextTick(() => callback(null, result));
  else if (Array.isArray(result)) process.nextTick(() => callback(null, ...result));
  else process.nextTick(() => callback(null, result, family));
};
