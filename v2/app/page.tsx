import Link from "next/link";

export default function Home() {
  return (
    <main className="hero">
      <div className="eyebrow">PreRescatePTY 2.0 - Preview privado</div>
      <h1>El nuevo nucleo de PreRescate empieza aqui.</h1>
      <p>
        Estamos reconstruyendo primero el sistema que conecta al cliente con la operacion interna:
        perfiles, dispositivos, activaciones, escaneos y respuesta de emergencia sobre un mismo backend.
      </p>
      <div className="actions">
        <Link className="button" href="/login">
          Entrar al Panel Cliente
        </Link>
        <Link className="button secondary" href="/admin">
          Entrar al Panel Admin
        </Link>
      </div>
      <section className="section grid">
        <article className="card">
          <div className="eyebrow">Cliente</div>
          <h2>Mi proteccion</h2>
          <p className="muted">Perfiles, contactos, dispositivos y escaneos.</p>
        </article>
        <article className="card">
          <div className="eyebrow">Administracion</div>
          <h2>Centro de operaciones</h2>
          <p className="muted">Clientes, inventario, codigos de reclamo y actividad.</p>
        </article>
        <article className="card">
          <div className="eyebrow">Emergencia</div>
          <h2>Perfil publico seguro</h2>
          <p className="muted">La ruta /e/[token] muestra solo datos permitidos.</p>
        </article>
        <article className="card">
          <div className="eyebrow">Estado</div>
          <h2>V2 aislada</h2>
          <p className="muted">Este preview no reemplaza todavia la web de produccion.</p>
        </article>
      </section>
    </main>
  );
}
