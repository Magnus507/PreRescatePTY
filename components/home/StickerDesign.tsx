'use client';
import React from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';

export const StickerDesign = () => {
  return (
    <div className="relative w-full aspect-video max-w-[600px] mx-auto group perspective-1000">
      <motion.div 
        initial={{ rotateY: -10, rotateX: 5 }}
        whileHover={{ rotateY: 0, rotateX: 0, scale: 1.02 }}
        className="relative w-full h-full transform-gpu transition-all duration-700 ease-out"
      >
        {/* Glow / Shadow Effect */}
        <div className="absolute -inset-4 rounded-[2.5rem] bg-brand/30 blur-[80px] opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
        <div className="absolute inset-0 rounded-[2rem] bg-black/40 blur-2xl group-hover:blur-3xl transition-all duration-700" />
        
        {/* Main Sticker Container */}
        <div className="relative rounded-[2rem] overflow-hidden shadow-2xl border border-white/20 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-md">
          <Image 
            src="/sticker-official.png" 
            alt="Pre Rescate PTY Official Sticker" 
            width={600}
            height={337}
            className="w-full h-auto object-contain transition-transform duration-1000 group-hover:scale-105"
            priority
          />
          
          {/* Dynamic Light Overlay (Shine) */}
          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 ease-in-out" />
          
          {/* Edge Glow */}
          <div className="absolute inset-0 rounded-[2rem] border border-white/30 pointer-events-none" />
        </div>

        {/* Floating Accent Elements */}
        <motion.div 
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-6 -right-6 w-16 h-16 bg-brand/20 rounded-full blur-2xl" 
        />
        <motion.div 
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -bottom-10 -left-10 w-24 h-24 bg-blue-600/20 rounded-full blur-3xl" 
        />
      </motion.div>

      {/* Caption / Label below */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        className="mt-12 text-center"
      >
        <p className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-[10px] font-black tracking-[0.3em] text-brand uppercase italic shadow-premium">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-brand"></span>
          </span>
          Tecnología NFC + QR Inteligente v2.0
        </p>
      </motion.div>
    </div>
  );
};
