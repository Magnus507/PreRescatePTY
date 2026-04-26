import { 
  Package, 
  Search, 
  Calendar, 
  CheckCircle2,
  MoreVertical,
  Plus
} from "lucide-react";

export default function LotesPage() {
  const lotes = [
    { id: "LOT-01-2026", name: "Lote Especial Enero", chips: 500, status: "Terminado", date: "2026-01-15" },
    { id: "LOT-02-2026", name: "Lote Distribución PTY", chips: 1200, status: "En Proceso", date: "2026-02-01" },
    { id: "LOT-03-2026", name: "Lote Reserva", chips: 200, status: "Pendiente", date: "2026-02-10" },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-end mb-10">
        <div>
          <h1 className="text-3xl font-black text-zinc-900 dark:text-white">Inventario de Lotes</h1>
          <p className="text-zinc-500 italic">Control de stock físico y generación de códigos</p>
        </div>
        <button className="bg-brand text-white px-8 py-3 rounded-premium font-black flex items-center gap-2 shadow-xl shadow-brand/20 hover:scale-[1.02] transition-transform">
          <Plus className="w-5 h-5" /> CREAR LOTE MAESTRO
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-brand transition-colors w-5 h-5" />
          <input 
            type="text" 
            placeholder="Buscar por ID o nombre..." 
            className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-12 pr-4 py-4 focus:ring-2 focus:ring-brand focus:border-transparent outline-none transition-all"
          />
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-zinc-50 dark:bg-zinc-800/50">
              <tr>
                <th className="px-6 py-4 text-xs font-black text-zinc-500 uppercase tracking-tighter">Identificador</th>
                <th className="px-6 py-4 text-xs font-black text-zinc-500 uppercase tracking-tighter">Nombre del Lote</th>
                <th className="px-6 py-4 text-xs font-black text-zinc-500 uppercase tracking-tighter text-center">Cantidad</th>
                <th className="px-6 py-4 text-xs font-black text-zinc-500 uppercase tracking-tighter">Estado</th>
                <th className="px-6 py-4 text-xs font-black text-zinc-500 uppercase tracking-tighter">Fecha</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {lotes.map((lote) => (
                <tr key={lote.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-zinc-100 dark:bg-zinc-800 rounded-lg flex items-center justify-center">
                        <Package className="w-4 h-4 text-zinc-500" />
                      </div>
                      <span className="font-mono text-xs font-bold text-zinc-600 dark:text-zinc-400">{lote.id}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-bold text-zinc-900 dark:text-white">{lote.name}</td>
                  <td className="px-6 py-4 text-center font-mono text-zinc-500">{lote.chips} unds</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                      lote.status === "Terminado" ? "bg-green-100 text-green-700" : 
                      lote.status === "En Proceso" ? "bg-blue-100 text-blue-700" : 
                      "bg-amber-100 text-amber-700"
                    }`}>
                      <CheckCircle2 className="w-3 h-3" /> {lote.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-zinc-500 text-sm">
                      <Calendar className="w-4 h-4" /> {lote.date}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors">
                      <MoreVertical className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
