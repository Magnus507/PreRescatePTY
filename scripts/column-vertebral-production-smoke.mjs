const baseUrl = (process.argv[2] || "https://www.prerescatepty.com").replace(/\/$/, "");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function get(path, init) {
  const response = await fetch(`${baseUrl}${path}`, {
    redirect: "manual",
    ...init,
  });
  const body = await response.text();
  return { response, body };
}

const home = await get("/");
assert(home.response.status === 200, `homepage returned ${home.response.status}`);

const unknownCode = `CVSMOKE${Date.now().toString(36).toUpperCase()}`;
const publicReads = await Promise.all(
  Array.from({ length: 20 }, () => get(`/api/public/${unknownCode}`))
);
for (const [index, result] of publicReads.entries()) {
  assert([404, 429].includes(result.response.status), `public read ${index} returned ${result.response.status}`);
  assert(result.response.status < 500, `public read ${index} returned a server error`);
  assert(!/internalLabel|chipUidInternal|activationCode|stack|prisma|postgres/i.test(result.body),
    `public read ${index} leaked an internal field`);
  if (result.response.status === 404) {
    assert(/no-store/i.test(result.response.headers.get("cache-control") || ""),
      "public emergency miss is cacheable");
  }
}

const qr = await get("/api/public/qr");
assert(qr.response.status === 400, `QR validation returned ${qr.response.status}`);
assert(!/stack|prisma|postgres| at /i.test(qr.body), "QR validation leaked internals");

const activation = await get("/api/chips/activate", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ activationCode: "CV-SMOKE-INVALID" }),
});
assert([401, 403].includes(activation.response.status),
  `unauthenticated activation returned ${activation.response.status}`);
assert(!/stack|prisma|postgres|activationCodeHash/i.test(activation.body),
  "activation rejection leaked internals");

console.log(JSON.stringify({
  gate: "column-vertebral-production-smoke",
  baseUrl,
  homepage: home.response.status,
  publicReads: publicReads.map(({ response }) => response.status),
  qrValidation: qr.response.status,
  unauthenticatedActivation: activation.response.status,
  result: "PASS",
}));
