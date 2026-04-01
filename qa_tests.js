const http = require('http');

async function checkServer() {
  try {
    const res = await fetch('http://localhost:3000/');
    console.log(`[PASS] Server is up: ${res.status}`);
  } catch (e) {
    console.error(`[FAIL] Server is down:`, e);
  }
}

async function runTests() {
  console.log("=== INICIANDO PRUEBAS DE QA ===");
  await checkServer();

  // Test 1: Registro de usuario y login
  console.log("\n--- 1. Registro y Login ---");
  const testEmail = `test_${Date.now()}@example.com`;
  const testPassword = "Password123!";
  
  let registerRes;
  try {
    registerRes = await fetch('http://localhost:3000/api/auth/register', {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: testEmail, password: testPassword }),
    });
    if (registerRes.ok) {
        console.log(`[PASS] Creación de cuenta (Status: ${registerRes.status})`);
    } else {
        const text = await registerRes.text();
        console.log(`[WARN/FAIL] Creación de cuenta fallida: ${registerRes.status} - ${text}`);
    }
  } catch (e) {
      console.log(`[FAIL] Error en creación de cuenta: ${e.message}`);
  }

  // To truly test full flow, we need to check public view without auth
  console.log("\n--- 4. Vista Pública de Emergencia ---");
  // Let's create a dummy chip straight in the DB using Prisma or assume one exists
  // First let's check what chips exists via Prisma
  console.log("Para la vista pública, probaremos con un chip inventado o existente.");
}

runTests();
