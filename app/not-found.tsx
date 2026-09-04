import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6 text-center">
      <div>
        <p className="text-sm font-bold uppercase tracking-widest text-brand">404</p>
        <h1 className="mt-3 text-3xl font-black text-slate-900">Página no encontrada</h1>
        <p className="mt-3 text-slate-600">La dirección no existe o ya no está disponible.</p>
        <Link href="/" className="mt-8 inline-flex rounded-xl bg-slate-900 px-5 py-3 font-bold text-white">
          Volver al inicio
        </Link>
      </div>
    </main>
  );
}
