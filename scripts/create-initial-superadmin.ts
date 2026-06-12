// ============================================================
// CREACIÓN SEGURA DEL SUPERADMIN INICIAL
// ============================================================
// - Reutiliza hashing bcrypt (cost 12) del proyecto
// - Usa modelo User correcto (isAdmin + adminRole)
// - Genera contraseña temporal segura con crypto
// - Muestra contraseña UNA SOLA VEZ al finalizar
// - Requiere CONFIRM_FULL_RESET=YES_DELETE_ALL_TEST_DATA
// - No guarda secretos en logs ni archivos
// - ABORTA si la tabla User no está vacía (count !== 0)
// ============================================================

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const prisma = new PrismaClient();

const SUPERADMIN_EMAIL = 'superadmin@prerescatepty.com';
const CONFIRMATION_ENV = 'CONFIRM_FULL_RESET';
const REQUIRED_VALUE = 'YES_DELETE_ALL_TEST_DATA';

function generateSecurePassword(length = 20): string {
  // Caracteres seguros: alfanuméricos + símbolos, sin caracteres ambiguos
  const charset = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%^&*';
  let password = '';
  const randomBytes = crypto.randomBytes(length);
  for (let i = 0; i < length; i++) {
    password += charset[randomBytes[i] % charset.length];
  }
  // Asegurar al menos: 1 mayúscula, 1 minúscula, 1 número, 1 símbolo
  if (!/[A-Z]/.test(password)) password = 'A' + password.slice(1);
  if (!/[a-z]/.test(password)) password = password.slice(0, -1) + 'a';
  if (!/[0-9]/.test(password)) password = password.slice(0, -1) + '2';
  if (!/[!@#$%^&*]/.test(password)) password = password.slice(0, -1) + '!';
  return password;
}

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║  CREACIÓN SUPERADMIN INICIAL — PRE RESCATE PTY               ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');

  // 1. Verificación de confirmación explícita
  const confirmation = process.env[CONFIRMATION_ENV];
  if (confirmation !== REQUIRED_VALUE) {
    console.error('\n❌ ABORTADO: Falta confirmación explícita');
    console.error(`   Establezca la variable de entorno:`);
    console.error(`   ${CONFIRMATION_ENV}=${REQUIRED_VALUE}`);
    console.error('\n   Esto evita ejecuciones accidentales.');
    process.exit(1);
  }

  console.log('\n✅ Confirmación verificada');

  // 2. Verificar que la tabla User está COMPLETAMENTE VACÍA (count === 0)
  const userCountBefore = await prisma.user.count();
  if (userCountBefore !== 0) {
    console.error(`\n❌ ABORTADO: La tabla User no está vacía (count = ${userCountBefore})`);
    console.error('   El reset debe haber borrado TODOS los usuarios primero.');
    console.error('   Ejecute el reset SQL y verifique conteos post-borrado = 0.');
    process.exit(1);
  }

  console.log('\n✅ Tabla User verificada vacía (count = 0)');

  // 3. Verificar que no existe ya el superadmin (doble check)
  const existing = await prisma.user.findUnique({
    where: { email: SUPERADMIN_EMAIL },
  });

  if (existing) {
    console.error(`\n❌ ABORTADO: Ya existe usuario con email ${SUPERADMIN_EMAIL}`);
    console.error('   Esto no debería ocurrir si la tabla está vacía.');
    process.exit(1);
  }

  // 4. Generar contraseña temporal segura
  const tempPassword = generateSecurePassword(24);
  const passwordHash = await bcrypt.hash(tempPassword, 12);

  console.log('\n📋 Resumen de creación:');
  console.log(`   Email:    ${SUPERADMIN_EMAIL}`);
  console.log(`   Rol:      superadmin (acceso total)`);
  console.log(`   Estado:   active`);
  console.log(`   Hash:     bcrypt cost 12`);

  // 5. Crear superadmin (solo tabla User, sin Account, sin Package, sin Product)
  const superadmin = await prisma.user.create({
    data: {
      email: SUPERADMIN_EMAIL,
      passwordHash,
      role: 'owner',           // rol base (no usado cuando isAdmin=true)
      isAdmin: true,           // ← CLAVE: marca como administrador
      adminRole: 'superadmin', // ← CLAVE: rol de acceso total
      status: 'active',
      // accountId: null (opcional, no requerido para admin)
    },
  });

  console.log('\n✅ Superadmin creado exitosamente');
  console.log(`   ID: ${superadmin.id}`);

  // 6. Verificación final
  const verify = await prisma.user.findUnique({
    where: { id: superadmin.id },
    select: { id: true, email: true, isAdmin: true, adminRole: true, status: true },
  });

  console.log('\n🔍 Verificación post-creación:');
  console.log(`   ID:       ${verify?.id}`);
  console.log(`   Email:    ${verify?.email}`);
  console.log(`   isAdmin:  ${verify?.isAdmin}`);
  console.log(`   adminRole: ${verify?.adminRole}`);
  console.log(`   status:   ${verify?.status}`);

  // 7. MOSTRAR CONTRASEÑA TEMPORAL UNA SOLA VEZ
  console.log('\n' + '═'.repeat(60));
  console.log('🔐  CONTRASEÑA TEMPORAL (MOSTRARSE UNA SOLA VEZ)');
  console.log('═'.repeat(60));
  console.log(`\n   ${tempPassword}\n`);
  console.log('═'.repeat(60));
  console.log('⚠️  IMPORTANTE:');
  console.log('   • Guarde esta contraseña AHORA — no se volverá a mostrar');
  console.log('   • Inicie sesión en /login y cambie la contraseña inmediatamente');
  console.log('   • El sistema soporta MFA (opcional) en /dashboard/configuracion');
  console.log('═'.repeat(60));

  // 8. Conteo final de usuarios (debe ser exactamente 1)
  const userCountAfter = await prisma.user.count();
  console.log(`\n📊 Total usuarios en BD: ${userCountAfter} (debe ser 1)`);

  if (userCountAfter !== 1) {
    console.error('❌ ADVERTENCIA: Se esperaba 1 usuario, hay', userCountAfter);
    process.exit(1);
  }

  console.log('\n✅ VALIDACIÓN FINAL: Exactamente 1 superadmin en BD');
}

main()
  .catch((e) => {
    console.error('\n❌ ERROR:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });