'use client';
import React from 'react';

export const StickerDesign = () => {
  return (
    <div className="relative w-full aspect-video max-w-[600px] mx-auto group perspective-1000">
      {/* Container with 3D Effect */}
      <div className="relative w-full h-full transform-gpu transition-all duration-700 ease-out group-hover:rotate-y-12 group-hover:rotate-x-12 group-hover:scale-110">
        
        {/* Glow / Shadow Effect */}
        <div className="absolute inset-0 rounded-[2rem] bg-red-600/20 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
        
        {/* Main Sticker PNG */}
        <div className="relative rounded-[2rem] overflow-hidden shadow-2xl border-4 border-white/10 bg-white/5 backdrop-blur-sm">
          <img 
            src="/sticker-official.png" 
            alt="Pre Rescate PTY Official Sticker" 
            className="w-full h-auto object-contain transition-transform duration-700 group-hover:scale-105"
          />
          
          {/* Glossy Overlay */}
          <div className="absolute inset-0 bg-gradient-to-tr from-white/10 via-transparent to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
        </div>

        {/* Floating Accent Elements */}
        <div className="absolute -top-4 -right-4 w-24 h-24 bg-red-600/10 rounded-full blur-2xl animate-pulse" />
        <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-blue-600/10 rounded-full blur-2xl animate-pulse delay-1000" />
      </div>

      {/* Caption / Label below */}
      <div className="mt-8 text-center opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-4 group-hover:translate-y-0">
        <p className="text-sm font-bold tracking-[0.3em] text-red-500 uppercase italic">
          Tecnología NFC + QR Inteligente
        </p>
      </div>
    </div>
  );
};
