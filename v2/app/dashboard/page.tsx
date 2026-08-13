export default function DashboardPage() {
  const cards = [
    ["Perfiles", "0", "Personas protegidas"],
    ["Dispositivos", "0", "NFC y QR activos"],
    ["Contactos", "0", "Contactos de emergencia"],
    ["Último escaneo", "—", "Sin actividad todavía"]
  ];

  return (
    <main className="main">
      <div className="topbar">
        <div>
          <div className="eyebrow">Panel del cliente · V2</div>
          <h1 className="title">Mi protección</h1>
        </div>
        <span className="badge">Protección activa</span>
      </div>
      <section className="grid">
        {cards.map(([label, value, detail]) => (
          <article className="card" key={label}>
            <div className="muted">{label}</div>
            <div className="metric">{value}</div>
            <div className="muted">{detail}</div>
          </article>
        ))}
      </section>
      <section className="section card">
        <div className="eyebrow">Configuración inicial</div>
        <h2>Completa tu protección</h2>
        <div className="list">
          <div className="row"><div><strong>Crear perfil</strong><div className="muted">Información médica y de emergencia.</div></div><span>1</span></div>
          <div className="row"><div><strong>Agregar contactos</strong><div className="muted">Personas que deben ser avisadas.</div></div><span>2</span></div>
          <div className="row"><div><strong>Activar dispositivo</strong><div className="muted">Vincula tu NFC o QR con un perfil.</div></div><span>3</span></div>
        </div>
      </section>
    </main>
  );
}
