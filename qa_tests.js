const http = require('http');

async function checkServer() {
  try {
    const res = await fetch('http://localhost:3000/');
    console.log(`[PASS] Server is up: ${res.status}`);
  } catch (e) {
    console.error(`[FAIL] Server is down:`, e);
  }
}

async function testHomePage() {
  console.log("\n--- 2. Página de Inicio ---");
  try {
    const res = await fetch('http://localhost:3000/');
    const html = await res.text();
    if (html.includes("PreRescate PTY")) {
      console.log(`[PASS] Home page cargada correctamente (Keyword: "PreRescate PTY")`);
    } else {
      console.log(`[FAIL] Home page no contiene el título esperado.`);
    }
  } catch (e) {
    console.log(`[FAIL] Error probando home page: ${e.message}`);
  }
}

async function testStaticPages() {
    console.log("\n--- 3. Páginas Estáticas (FAQ, Contacto, etc.) ---");
    const routes = ['/faq', '/como-funciona', '/contacto'];
    for (const route of routes) {
        try {
            const res = await fetch(`http://localhost:3000${route}`);
            if (res.ok) {
                console.log(`[PASS] Ruta ${route} accesible (Status: ${res.status})`);
            } else {
                console.log(`[FAIL] Ruta ${route} devolvió error (Status: ${res.status})`);
            }
        } catch (e) {
            console.log(`[FAIL] Error en ruta ${route}: ${e.message}`);
        }
    }
}

async function runTests() {
  console.log("=== INICIANDO PRUEBAS DE QA COMPLETA ===");
  await checkServer();
  await testHomePage();
  await testStaticPages();

  console.log("\n--- 4. Registro de Usuario ---");
  const testEmail = `test_${Date.now()}@example.com`;
  const testPassword = "Password123!";
  
  try {
    const registerRes = await fetch('http://localhost:3000/api/auth/register', {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: testEmail, password: testPassword }),
    });
    if (registerRes.ok) {
        console.log(`[PASS] Creación de cuenta exitosa (${testEmail})`);
    } else {
        const text = await registerRes.text();
        console.log(`[FAIL] Creación de cuenta fallida: ${registerRes.status} - ${text}`);
    }
  } catch (e) {
      console.log(`[FAIL] Error en creación de cuenta: ${e.message}`);
  }

  console.log("\n=== PRUEBAS FINALIZADAS ===");
}

runTests();
