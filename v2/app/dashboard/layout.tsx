import Link from "next/link";

export default function DashboardLayout({children}:{children:React.ReactNode}){
  return <div className="shell"><aside className="sidebar"><div className="brand">PreRescate</div><nav className="nav"><Link href="/dashboard">Inicio</Link><Link href="/dashboard/perfiles">Perfiles</Link><Link href="/dashboard/dispositivos">Dispositivos</Link><Link href="/dashboard/contactos">Contactos</Link><Link href="/dashboard/actividad">Actividad</Link><Link href="/dashboard/cuenta">Mi cuenta</Link></nav></aside>{children}</div>;
}
