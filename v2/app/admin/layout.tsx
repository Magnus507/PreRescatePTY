import Link from "next/link";

export default function AdminLayout({children}:{children:React.ReactNode}){
  return <div className="shell"><aside className="sidebar"><div className="brand">PreRescate Admin</div><nav className="nav"><Link href="/admin">Dashboard</Link><Link href="/admin/clientes">Clientes</Link><Link href="/admin/inventario">Inventario</Link><Link href="/admin/escaneos">Escaneos</Link><Link href="/dashboard">Volver al cliente</Link></nav></aside>{children}</div>;
}
