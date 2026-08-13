export default function AdminPage() {
  const metrics = [
    ["Clientes", "0", "Cuentas activas"],
    ["Perfiles", "0", "Personas protegidas"],
    ["Dispositivos", "0", "Unidades registradas"],
    ["Escaneos hoy", "0", "Actividad del día"]
  ];

  return (
    <main className="main">
      <div className="topbar">
        <div>
          <div className="eyebrow">Administración · V2</div>
          <h1 className="title">Centro de operaciones</h1>
        </div>
        <span className="badge">Sistema V2</span>
      </div>
      <section className="grid">
        {metrics.map(([label, value, detail]) => (
          <article className="card" key={label}>
            <div className="muted">{label}</div>
            <div className="metric">{value}</div>
            <div className="muted">{detail}</div>
          </article>
        ))}
      </section>
      <section className="section card">
        <div className="eyebrow">Operación principal</div>
        <h2>Flujo PreRescate</h2>
        <div className="list">
          <div className="row"><strong>Inventario y dispositivos</strong><span>IN_STOCK</span></div>
          <div className="row"><strong>Clientes y perfiles</strong><span>ACTIVOS</span></div>
          <div className="row"><strong>Activaciones</strong><span>PENDIENTES</span></div>
          <div className="row"><strong>Escaneos y alertas</strong><span>MONITOREO</span></div>
          <div className="row"><strong>Auditoría</strong><span>INMUTABLE</span></div>
        </div>
      </section>
    </main>
  );
}
