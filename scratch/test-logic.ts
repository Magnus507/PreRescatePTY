import { registerSchema, orderCreateSchema } from "../lib/validations";

async function runTests() {
  console.log("=== INICIANDO PRUEBAS DE VALIDACIÓN Y LÓGICA ===\n");

  // 1. Probar Registro
  console.log("Prueba 1: Registro de usuario (Datos válidos)");
  const validRegister = registerSchema.safeParse({
    email: "test@example.com",
    password: "Password123!",
    phone: "6000-0000",
    accountType: "PERSONAL"
  });
  console.log("Resultado:", validRegister.success ? "✅ ÉXITO" : "❌ FALLO", validRegister.success ? "" : validRegister.error);

  console.log("\nPrueba 2: Registro de usuario (Password corto)");
  const invalidRegister = registerSchema.safeParse({
    email: "test@example.com",
    password: "123",
    phone: "6000-0000"
  });
  console.log("Resultado:", !invalidRegister.success ? "✅ CAPTURADO (Esperado)" : "❌ FALLO", !invalidRegister.success ? invalidRegister.error.issues[0].message : "");

  // 2. Probar Órdenes
  console.log("\nPrueba 3: Creación de pedido (Datos válidos)");
  const validOrder = orderCreateSchema.safeParse({
    customerName: "Juan Perez",
    customerEmail: "juan@example.com",
    items: [{ productType: "CHIP", quantity: 2, unitPrice: 15.00 }],
    shippingAddress: "Calle Principal #123",
    shippingCity: "Panamá",
    customerPhone: "1234567"
  });
  console.log("Resultado:", validOrder.success ? "✅ ÉXITO" : "❌ FALLO");

  console.log("\n=== PRUEBAS COMPLETADAS ===");
}

runTests().catch(console.error);
