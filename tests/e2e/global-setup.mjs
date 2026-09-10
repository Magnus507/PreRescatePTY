const ORIGIN = "http://127.0.0.1:3000";

async function warm(path) {
  let lastError;
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    try {
      const response = await fetch(ORIGIN + path, { redirect: "follow" });
      await response.arrayBuffer();
      if (response.status < 500) return;
      lastError = new Error(`Warm-up ${path} returned ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 750 * attempt));
  }
  throw lastError || new Error(`Unable to warm ${path}`);
}

export default async function globalSetup() {
  // Next.js dev mode compiles routes lazily. Warm the exact Block 4 surfaces so
  // browser assertions measure application behavior rather than first-compile
  // latency on a fresh CI runner.
  for (const path of [
    "/login",
    "/api/auth/csrf",
    "/api/auth/session",
    "/e/DEMO-ADMIN-VIP",
    "/api/public/DEMO-ADMIN-VIP",
  ]) {
    await warm(path);
  }
}
