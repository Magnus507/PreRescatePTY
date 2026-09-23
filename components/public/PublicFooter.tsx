import Image from "next/image";
import Link from "next/link";

const groups = [
  {
    title: "Producto",
    links: [
      ["/como-funciona", "Cómo funciona"],
      ["/para-quien-es", "Para quién es"],
      ["/comprar", "Productos"],
      ["/faq", "Preguntas frecuentes"],
      ["/proyecto", "Proyecto · Próximamente"],
    ],
  },
  {
    title: "Cuenta",
    links: [
      ["/login", "Iniciar sesión"],
      ["/registro", "Crear cuenta"],
      ["/activar", "Activar identificador"],
    ],
  },
  {
    title: "Legal y soporte",
    links: [
      ["/contacto", "Contacto"],
      ["/legal/privacidad", "Privacidad"],
      ["/legal/terminos", "Términos"],
      ["/legal/cookies", "Cookies"],
    ],
  },
] as const;

export default function PublicFooter() {
  return (
    <footer className="border-t border-white/10 bg-[#060a12] text-slate-300">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[1.1fr_1.9fr]">
          <div>
            <Link href="/" className="inline-flex items-center gap-3" aria-label="PreRescue ID — Inicio">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white">
                <Image src="/logo.png" alt="" width={30} height={30} sizes="30px" className="h-7 w-7 object-contain" aria-hidden />
              </span>
              <span className="text-lg font-black text-white">
                PreRescue <span className="text-[#ff4d55]">ID</span>
              </span>
            </Link>
            <p className="mt-4 max-w-sm text-sm leading-6 text-slate-400">
              Identificación de emergencia y retorno seguro con QR + NFC. La información visible es configurable por el titular o responsable.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            {groups.map((group) => (
              <div key={group.title}>
                <h2 className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                  {group.title}
                </h2>
                <ul className="mt-3 space-y-1">
                  {group.links.map(([href, label]) => (
                    <li key={href}>
                      <Link href={href} className="inline-flex min-h-9 items-center text-sm text-slate-400 hover:text-white">
                        {label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <p className="mt-9 border-t border-white/10 pt-6 text-xs leading-5 text-slate-500">
          © {new Date().getFullYear()} PreRescue ID · Panamá. PreRescue ID no reemplaza al 911, a los servicios médicos profesionales ni a los canales oficiales de emergencia.
        </p>
      </div>
    </footer>
  );
}
