"use client";

import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";

export default function BootSequence({ onComplete }) {
  const [lines, setLines] = useState([]);
  const [showError, setShowError] = useState(false);
  const containerRef = useRef(null);

  const bootLines = [
    "BOOTING BRO.exe...",
    "[OK] Loading friendship kernel...",
    "[OK] Connecting to BRO-NET...",
    "[OK] Searching for second braincell...",
    "[FAILED]",
    "Retrying...",
    "[FAILED]",
    "Whatever.",
    "Continuing...",
    "IDENTITY DETECTED:",
    "RAJAT",
    "REMOTE IDENTITY:",
    "BRO",
    "DESTINATION:",
    "JAPAN 🇯🇵",
    "DISTANCE:",
    "~5,900 KM",
    "FRIENDSHIP STATUS:",
    "PERMANENT",
    "BRAINROT LEVEL:",
    "97%",
    "COMMON SENSE:",
    "ERROR",
    "EMOTIONAL DAMAGE:",
    "LOADING...",
    "████████████████████ 100%",
    "WELCOME TO BRO.exe",
  ];

  useEffect(() => {
    let isMounted = true;

    const runSequence = async () => {
      for (let i = 0; i < bootLines.length; i++) {
        if (!isMounted) return;
        const line = bootLines[i];
        
        // Slightly faster delay for better UX, but still random
        const delay = Math.random() * 150 + 50;
        
        await new Promise((resolve) => setTimeout(resolve, delay));
        if (!isMounted) return;
        
        setLines((prev) => [...prev, line]);
        
        // Auto-scroll
        setTimeout(() => {
          if (containerRef.current) {
            containerRef.current.scrollTop = containerRef.current.scrollHeight;
          }
        }, 10);

        if (i === bootLines.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 800));
          if (isMounted) {
            setShowError(true);
            setTimeout(() => {
              if (containerRef.current) {
                containerRef.current.scrollTop = containerRef.current.scrollHeight;
              }
            }, 10);
          }
        }
      }
    };

    runSequence();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-black text-green-500 font-mono p-6 z-50 flex flex-col h-full">
      <div className="crt-noise" />
      <div className="scanline" />
      <div 
        ref={containerRef}
        className="flex-1 overflow-auto space-y-2 text-sm sm:text-base pb-8"
        style={{ scrollBehavior: 'smooth' }}
      >
        {lines.map((line, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={line.includes("ERROR") || line.includes("FAILED") ? "text-red-500" : ""}
          >
            {line}
          </motion.div>
        ))}

        {showError && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8 border border-red-500 p-4 max-w-md bg-red-950/20 text-red-400"
          >
            <h2 className="text-xl font-bold mb-4 text-red-500">ERROR 404</h2>
            <p className="mb-4">BEST FRIEND NOT FOUND NEARBY.</p>
            <p className="mb-2">Possible causes:</p>
            <ul className="list-disc pl-5 mb-6 space-y-1">
              <li>He moved to Japan.</li>
              <li>You miss him.</li>
              <li>Skill issue.</li>
            </ul>
            <button
              onClick={onComplete}
              className="bg-red-500 text-black font-bold px-4 py-2 hover:bg-red-400 transition-colors uppercase tracking-widest"
            >
              [ FIX ERROR ]
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
