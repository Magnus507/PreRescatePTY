'use client';
import { Shield, Smartphone, Activity, Heart } from 'lucide-react';

export const StickerDesign = () => {
  return (
    <div className="relative w-full aspect-square max-w-[450px] mx-auto group perspective-1000">
      {/* Premium Metallic Sticker Container */}
      <div className="absolute inset-0 rounded-[2.5rem] bg-gradient-to-br from-[#DA1A21] via-[#b5141a] to-[#8a0f14] shadow-[0_30px_60px_rgba(218,26,33,0.4)] border-[4px] border-white/30 overflow-hidden flex flex-col p-8 text-white transform-gpu transition-all duration-700 group-hover:rotate-y-6 group-hover:shadow-[0_40px_80px_rgba(218,26,33,0.5)]">
        
        {/* Real Glossy Polish Effect */}
        <div className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%] bg-gradient-to-br from-white/20 via-transparent to-transparent rotate-45 pointer-events-none group-hover:translate-x-10 group-hover:translate-y-10 transition-transform duration-1000" />

        {/* Branding Header */}
        <div className="flex items-center gap-4 mb-6 relative z-10">
          <div className="bg-white rounded-2xl p-3 shadow-2xl transform">
            <Shield className="h-12 w-12 text-[#DA1A21]" fill="#DA1A21" />
          </div>
          <div>
            <h2 className="text-4xl font-black tracking-tighter leading-none italic uppercase drop-shadow-md">
              PRE RESCATE <span className="text-white/70">PTY</span>
            </h2>
            <p className="text-[0.7rem] font-bold tracking-[0.25em] uppercase text-white/50 mt-1">SISTEMA MÉDICO INTELIGENTE</p>
          </div>
        </div>

        {/* Central Identification Core */}
        <div className="flex-1 bg-black/10 rounded-[2rem] border border-white/5 p-6 backdrop-blur-md shadow-inner flex flex-col justify-center items-center gap-6 text-center relative overflow-hidden group/inner">
            
            {/* Animated Glow */}
            <div className="absolute inset-0 bg-red-400/5 animate-pulse" />

            <div className="flex flex-col items-center relative z-10">
                <span className="text-[0.65rem] font-black uppercase tracking-[0.3em] text-red-200 mb-2">ESCÁNEO DE EMERGENCIA</span>
                <div className="bg-white rounded-3xl p-5 shadow-2xl border-[6px] border-[#DA1A21]/10 group-hover/inner:scale-105 transition-transform">
                     {/* Stylized QR Vector */}
                     <div className="w-28 h-28 grid grid-cols-7 grid-rows-7 gap-1">
                        {[...Array(49)].map((_, i) => (
                           <div key={i} className={`bg-[#0C2444] rounded-[2px] ${
                             (i < 9 || i % 7 < 3 || i % 7 > 4 || i > 40) ? 'opacity-100' : 'opacity-20'
                           }`} />
                        ))}
                     </div>
                </div>
            </div>
            
            <div className="flex gap-8 items-center justify-center relative z-10">
                <div className="flex flex-col items-center transition-all group-hover:scale-110">
                     <Smartphone className="h-7 w-7 text-white/90 mb-1.5" />
                     <span className="text-[0.55rem] font-black uppercase tracking-widest text-white/60">NFC CHIP</span>
                </div>
                <div className="h-10 w-px bg-white/10" />
                <div className="flex flex-col items-center transition-all group-hover:scale-110 delay-75">
                     <Activity className="h-7 w-7 text-white/90 mb-1.5" />
                     <span className="text-[0.55rem] font-black uppercase tracking-widest text-white/60">WEB APP</span>
                </div>
                <div className="h-10 w-px bg-white/10" />
                <div className="flex flex-col items-center transition-all group-hover:scale-110 delay-150">
                     <Heart className="h-7 w-7 text-white/90 mb-1.5" />
                     <span className="text-[0.55rem] font-black uppercase tracking-widest text-white/60">VITAL DATA</span>
                </div>
            </div>
        </div>

        {/* Anti-Counterfeit Section */}
        <div className="mt-6 flex justify-between items-end px-2 relative z-10 opacity-60">
            <div className="flex flex-col items-start leading-none">
                <span className="text-[0.55rem] font-bold text-white/30 font-mono tracking-tighter">AUTHENTIC GEAR — MODEL 2024</span>
                <span className="text-[0.6rem] font-black text-white/50 tracking-widest mt-1 uppercase">PANAMÁ CITY</span>
            </div>
            <div className="flex gap-1.5 mb-1">
                 <div className="w-2.5 h-2.5 rounded-full bg-white/30 animate-pulse" />
                 <div className="w-2.5 h-2.5 rounded-full bg-white/20 animate-pulse delay-100" />
                 <div className="w-2.5 h-2.5 rounded-full bg-white/10 animate-pulse delay-200" />
            </div>
        </div>

        {/* Micro-text border ring effect placeholder */}
        <div className="absolute inset-0 border border-white/5 rounded-[2.5rem] pointer-events-none" />
      </div>
    </div>
  );
};
