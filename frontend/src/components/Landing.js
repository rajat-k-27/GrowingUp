"use client";

import { motion } from "framer-motion";
import { Terminal, Shield, Zap, Globe, Cpu } from "lucide-react";

export default function Landing({ onEnter }) {
  return (
    <div className="fixed inset-0 bg-black text-white font-mono p-4 sm:p-6 z-50 flex flex-col items-center overflow-y-auto">
      <div className="bg-grid" />
      <div className="crt-noise" />
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1 }}
        className="max-w-4xl w-full flex flex-col items-center relative z-10 py-12 my-auto"
      >
        <div className="text-center relative">
          <div className="absolute inset-0 bg-blue-500 blur-3xl opacity-20 rounded-full animate-pulse"></div>
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1, type: "spring" }}
            className="flex justify-center mb-6 relative"
          >
            <Cpu size={64} className="text-blue-500" />
          </motion.div>
          <motion.h1 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-5xl md:text-7xl font-bold tracking-[0.2em] text-white mb-4 relative"
          >
            BRO_<span className="text-blue-500">OS</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-blue-400 tracking-widest text-sm md:text-base relative"
          >
            A PRIVATE KERNEL FOR SECURE PEER-TO-PEER CONNECTIONS
          </motion.p>
        </div>

        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          onClick={onEnter}
          className="mt-4 mb-8 bg-blue-900/20 border border-blue-500/50 px-12 py-5 text-blue-400 font-bold tracking-[0.2em] hover:bg-blue-600/30 transition-all hover:scale-105"
        >
          INITIALIZE SYSTEM
        </motion.button>

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full mt-4"
        >
          <div className="glass-panel p-8 border border-gray-800 flex flex-col gap-4 hover:border-blue-500/50 transition-colors group">
            <Shield size={28} className="text-blue-500 group-hover:scale-110 transition-transform" />
            <h3 className="font-bold tracking-widest text-lg text-gray-200">SECURE ROOMS</h3>
            <p className="text-sm text-gray-500 leading-relaxed">Establish private, isolated networks. Only those with your unique room code can access your shared environment.</p>
          </div>
          
          <div className="glass-panel p-8 border border-gray-800 flex flex-col gap-4 hover:border-green-500/50 transition-colors group">
            <Terminal size={28} className="text-green-500 group-hover:scale-110 transition-transform" />
            <h3 className="font-bold tracking-widest text-lg text-gray-200">REAL-TIME SYNC</h3>
            <p className="text-sm text-gray-500 leading-relaxed">Instant terminal-style messaging, live system statuses, and real-time collaboration with zero latency.</p>
          </div>
          
          <div className="glass-panel p-8 border border-gray-800 flex flex-col gap-4 hover:border-purple-500/50 transition-colors group">
            <Globe size={28} className="text-purple-500 group-hover:scale-110 transition-transform" />
            <h3 className="font-bold tracking-widest text-lg text-gray-200">SHARED ECOSYSTEM</h3>
            <p className="text-sm text-gray-500 leading-relaxed">Unlock cooperative achievements, share high-res memories, and send encrypted data drops to your peers.</p>
          </div>
          
          <div className="glass-panel p-8 border border-gray-800 flex flex-col gap-4 hover:border-orange-500/50 transition-colors group">
            <Zap size={28} className="text-orange-500 group-hover:scale-110 transition-transform" />
            <h3 className="font-bold tracking-widest text-lg text-gray-200">CYBER AESTHETIC</h3>
            <p className="text-sm text-gray-500 leading-relaxed">Immersive futuristic interface featuring draggable windows, CRT distortions, and premium glassmorphism.</p>
          </div>
        </motion.div>

      </motion.div>
    </div>
  );
}
