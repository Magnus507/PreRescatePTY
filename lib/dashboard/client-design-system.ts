export const CLIENT_DESIGN_SYSTEM_NAME = "Sistema Cliente Premium Emergency";

export const CLIENT_DESIGN_SYSTEM_PRINCIPLES = [
  "proteccion inmediata",
  "confianza medica",
  "tecnologia discreta",
  "emergencia sin caos",
  "premium sin perder legibilidad",
  "operativo pero humano",
] as const;

export const CLIENT_DESIGN_SYSTEM_PALETTES = {
  red: {
    role: ["marca", "accion principal", "emergencia controlada", "CTA principal"],
    note: "No usar rojo solo por decoracion.",
  },
  navy: {
    role: ["heroes", "modulos premium", "zonas de proteccion", "tarjetas protagonistas"],
    note: "Reservar para pantallas de presencia fuerte.",
  },
  slate: {
    role: ["formularios", "informacion detallada", "listas", "lectura prolongada"],
    note: "Usar cuando haga falta aire visual.",
  },
  green: {
    role: ["exito real", "activo", "protegido", "comprobante enviado", "vinculacion activa"],
    note: "Solo para confirmacion verificable.",
  },
  blue: {
    role: ["informacion", "guia", "estado neutro importante", "pago en revision"],
    note: "Apoyo semantico, no color principal.",
  },
  violet: {
    role: ["modulos secundarios", "produccion", "sistema"],
    note: "Usar con moderacion.",
  },
  amber: {
    role: ["pendiente", "advertencia", "requiere accion"],
    note: "Alerta, no decoracion.",
  },
} as const;

export type ClientScreenPattern =
  | "premium-home"
  | "clinical-functional"
  | "transactional-operational";

export const CLIENT_SCREEN_PATTERNS: Record<
  ClientScreenPattern,
  {
    label: string;
    useCases: string[];
    characteristics: string[];
  }
> = {
  "premium-home": {
    label: "Pantalla principal premium",
    useCases: ["Inicio", "Mis dispositivos", "Tienda"],
    characteristics: ["hero dark", "titulo fuerte", "subtitulo corto", "CTA principal", "resumen rapido"],
  },
  "clinical-functional": {
    label: "Pantalla funcional clínica",
    useCases: ["Perfiles médicos", "Ajustes"],
    characteristics: ["header claro", "cards blancas amplias", "badges semanticos", "acciones ordenadas"],
  },
  "transactional-operational": {
    label: "Pantalla operativa transaccional",
    useCases: ["Mis pedidos", "Empresa"],
    characteristics: ["titulo claro", "estado visible", "resumen operativo primero", "detalle despues"],
  },
};

export const CLIENT_STATUS_COLORS = {
  success: "green",
  active: "green",
  protected: "green",
  info: "blue",
  neutral: "blue",
  pending: "amber",
  warning: "amber",
  brand: "red",
  primaryAction: "red",
  secondaryModule: "violet",
} as const;
