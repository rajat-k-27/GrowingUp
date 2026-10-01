"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import toast from "react-hot-toast";

export default function IdentitySelector({ onLogin }) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!username.trim() || !password.trim()) {
      toast.error("FIELDS CANNOT BE EMPTY");
      return;
    }
    
    setIsLoading(true);

    try {
      const defaultBackend = typeof window !== 'undefined' 
        ? `${window.location.protocol}//${window.location.hostname}:5000` 
        : "http://localhost:5000";
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || defaultBackend;
      
      const endpoint = isLogin ? "/api/login" : "/api/register";
      const res = await fetch(`${backendUrl}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          username: username.trim().toUpperCase(), 
          password 
        })
      });

      const data = await res.json();

      if (res.ok) {
        toast.success(isLogin ? "AUTHENTICATED" : "REGISTERED");
        onLogin(data);
      } else {
        toast.error(data.error || "AUTHENTICATION FAILED");
      }
    } catch (err) {
      toast.error("NETWORK ERROR. SERVER OFFLINE.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black text-white font-mono z-50 overflow-y-auto">
      <div className="min-h-full w-full flex flex-col items-center justify-center py-10 px-4 sm:px-6 relative">
      <div className="crt-noise" />
      <div className="scanline" />
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-panel p-8 max-w-md w-full border border-gray-800 flex flex-col items-center gap-6"
      >
        <h2 className="text-2xl font-bold text-center tracking-widest text-blue-500">
          BRO-NET AUTH
        </h2>
        <div className="flex w-full text-xs tracking-widest mb-4">
          <button 
            type="button" 
            onClick={() => setIsLogin(true)} 
            className={`flex-1 p-2 border-b-2 ${isLogin ? 'border-blue-500 text-blue-400' : 'border-gray-800 text-gray-500 hover:text-gray-300'}`}
          >
            LOGIN
          </button>
          <button 
            type="button" 
            onClick={() => setIsLogin(false)} 
            className={`flex-1 p-2 border-b-2 ${!isLogin ? 'border-blue-500 text-blue-400' : 'border-gray-800 text-gray-500 hover:text-gray-300'}`}
          >
            REGISTER
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-6">
          <div>
            <label className="text-xs text-gray-500 mb-2 block tracking-widest">USERNAME</label>
            <input
              type="text"
              placeholder="AGENT CODENAME"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-black border border-gray-700 p-4 text-center tracking-[0.5em] focus:outline-none focus:border-blue-500 uppercase"
              autoFocus
              disabled={isLoading}
            />
          </div>
          
          <div>
            <label className="text-xs text-gray-500 mb-2 block tracking-widest">PASSWORD</label>
            <input
              type="password"
              placeholder="SECRET KEY"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-black border border-gray-700 p-4 text-center tracking-[1em] focus:outline-none focus:border-blue-500"
              disabled={isLoading}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white font-bold tracking-[0.2em] py-4 rounded transition-colors shadow-[0_0_15px_rgba(37,99,235,0.4)]"
          >
            {isLogin ? 'AUTHENTICATE' : 'INITIALIZE'}
          </button>
        </form>
      </motion.div>
      </div>
    </div>
  );
}
