# Web Pública: Tienda y Registro de Usuarios

Flujo de adquisición de kits de protección y onboarding de nuevos miembros al ecosistema.

## Catálogo de Rescate (PricingSection)
El catálogo es dinámico y consume datos del endpoint `/api/public/packages`.

### Modelos de Empaquetado
- **Propiedad Intelectual**: El diseño de cada kit sigue los lineamientos de [[Web-Publica]] (Premium & Impactful).
- **Atributos por Kit**:
    - **Chips**: Cantidad de stickers físicos incluidos.
    - **Perfiles**: Límite de expedientes médicos gestionables.
    - **Roles**: Define si la cuenta es Personal, Familiar o Corporativa.
    - **Vigencia**: Tiempo de cobertura vital incluido (2-5 años).

## Flujo de Adquisición (Check-out)

### 1. Selección de Kit
El usuario elige un plan desde la landing o tienda y es redirigido a `/registro?package=[id]`.

### 2. Formulario de Registro Blindado
- **Campos**: Email, Teléfono (WhatsApp - Crítico para alertas), Contraseña.
- **Tipo de Cuenta**: 
    - **Personal/Familiar**: Enfoque en protección de seres queridos.
    - **Corporativo/Flotas**: Enfoque en seguridad ocupacional.
- **Seguridad Legal**: Aceptación obligatoria de términos bajo la **Ley 81 de Panamá** (Protección de Datos Personales).

### 3. Redirección al Pago (Checkout Manual)
Tras el registro exitoso, el sistema:
1. Crea el usuario en [[Esquema-Base-Datos#User]].
2. Inicia sesión automáticamente.
3. Llama a `/api/payments/checkout` para redirigir al usuario a la pasarela de pago manual.

## Pasarela de Pago Manual (Logística)
- **Métodos**: Yappy Merchant y Transferencia ACH (Configurados en [[Admin-Ajustes]]).
- **Flujo**: El usuario realiza el pago y debe subir un comprobante para que el equipo de [[Admin-Ventas-Pedidos]] valide la transacción y despache el hardware.

## Interconexiones Técnicas
- **Consumo de API**:
    - `POST /api/auth/register`: Creación de la cuenta base.
    - `POST /api/payments/checkout`: Genera la sesión de pago inicial.
- **Impacto**: Una compra exitosa habilita la capacidad de activación en [[Cliente-Dispositivos]].

---
**Protocolo de Obsidian:**
- Relacionado con: [[Admin-Ventas-Pedidos]], [[Admin-Suministro]].
- Nota: Las cuentas corporativas tienen una redirección especial al módulo de contacto para cotizaciones personalizadas.
