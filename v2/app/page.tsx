import Link from "next/link";

export default function Home() {
  return (
    <main className="hero">
      <div className="eyebrow">PreRescatePTY 2.0 · Preview privado</div>
      <h1>El nuevo núcleo de PreRescate empieza aquí.</h1>
      <p>
        Estamos reconstruyendo primero el sistema que conecta al cliente con la operación interna:
        perfiles, dispositivos, activaciones, escaneos y alertas sobre un mismo backend.
      </p>
      <div className="actions">
        <Link className="button" href="/dashboard">Entrar al Panel Cliente</Link>
        <Link className="button secondary" href="/admin">Entrar al Panel Admin</Link>
      </div>
      <section className="section grid">
        <article className="card">
          <div className="eyebrow">Cliente</div>
          <h2>Mi protección</h2>
          <p className="muted">Perfiles, contactos, dispositivos, escaneos y alertas.</p>
        </article>
        <article className="card">
          <div className="eyebrow">Administración</div>
          <h2>Centro de operaciones</h2>
          <p className="muted">Clientes, inventario, activaciones, actividad y auditoría.</p>
        </article>
        <article className="card">
          <div className="eyebrow">Backend</div>
          <h2>Una sola fuente de verdad</h2>
          <p className="muted">Cliente y Admin comparten el mismo estado en Supabase.</p>
        </article>
        <article className="card">
          <div className="eyebrow">Estado</div>
          <h2>V2 aislada</h2>
          <p className="muted">Este Preview no reemplaza todavía la web de producción.</p>
        </article>
      </section>
    </main>
  );
}
