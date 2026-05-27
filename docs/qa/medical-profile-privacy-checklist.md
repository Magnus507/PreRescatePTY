# Checklist QA — Privacidad y visibilidad de campos médicos/seguros

## 1. Campos privados nunca públicos
**Campos:**
- `nationalId` / cédula
- `insurancePolicyNumber` / póliza
- `insuranceEmergencyPhone` / teléfono del seguro

**Verificar:**
- [ ] Se guardan correctamente en el dashboard privado
- [ ] Se visualizan solo en el dashboard privado
- [ ] NO aparecen en `/api/public/[shortCode]`
- [ ] NO aparecen en ficha pública `/e/[shortCode]`

## 2. Campos públicos solo con toggle
**Campos:**
- `insuranceProvider`
- `preferredHospital`
- `primaryDoctorName`
- `primaryDoctorPhone`
- `additionalNotes`

**Para cada uno probar:**
- [ ] Toggle en `false` → no aparece público
- [ ] Toggle en `true` → aparece público
- [ ] Campo vacío + toggle `true` → no mostrar bloque vacío

## 3. Perfil propio y perfil familiar
- [ ] Editar perfil propio y verificar visibilidad pública/privada
- [ ] Editar perfil familiar y verificar visibilidad pública/privada

## 4. Cifrado / privacidad
- [ ] Verificar que campos sensibles pasan por `ProfileRepository`
- [ ] Verificar que no se guarden logs con PII
- [ ] Verificar que `auditLog` no exponga cédula/póliza/teléfonos sensibles sin redacción

## 5. API privada
- [ ] `GET /api/users/profile` devuelve campos privados al dueño
- [ ] `PATCH /api/users/profile` actualiza campos nuevos
- [ ] `GET`/`PATCH` perfil familiar respeta ownership

## 6. API pública
- [ ] `/api/public/[shortCode]` devuelve solo whitelist
- [ ] Nunca devuelve cédula/póliza/teléfono seguro
- [ ] `publicMedicalExtras` respeta toggles

## 7. UI ficha pública compacta
- [ ] Primer pantallazo muestra datos críticos
- [ ] Seguro/hospital aparece solo si autorizado
- [ ] Médico aparece solo si autorizado
- [ ] Instrucciones aparecen como bloque compacto/acordeón

## 8. Casos borde
- [ ] Usuario sin seguro
- [ ] Usuario con seguro pero todos los toggles en `false`
- [ ] Usuario con campos incompletos
- [ ] Usuario con texto largo en instrucciones
- [ ] Usuario con caracteres especiales en aseguradora/hospital
- [ ] Mobile Safari/Chrome

## 9. SQL/checks sugeridos para verificar no exposición
- [ ] Consultas de Profile no exponen campos privados
- [ ] Pruebas de API pública no exponen campos privados

## 10. Criterios de aceptación final
- [ ] Todos los casos anteriores verificados y documentados
- [ ] No hay exposición accidental de datos sensibles
- [ ] Documentación de pruebas y resultados adjunta

---

Observaciones:

- Checklist para uso QA previo a release de campos médicos/seguros y visibilidad pública.
- Revisar que los campos sensibles nunca sean expuestos fuera del dashboard privado.
- Validar que toggles de visibilidad funcionen correctamente y no muestren bloques vacíos.
- Confirmar que logs y auditoría no incluyan PII sin redacción.
- Probar en navegadores móviles principales.
