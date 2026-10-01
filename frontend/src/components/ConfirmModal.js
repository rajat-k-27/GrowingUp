import { motion } from "framer-motion";
import { AlertTriangle, X } from "lucide-react";

export default function ConfirmModal({ isOpen, onClose, onConfirm, title, message }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-black border border-red-500/50 rounded-xl w-full max-w-sm overflow-hidden shadow-[0_0_30px_rgba(239,68,68,0.2)]"
      >
        <div className="p-4 border-b border-red-900/50 flex justify-between items-center bg-red-950/20">
          <div className="flex items-center gap-2 text-red-500">
            <AlertTriangle size={18} />
            <h2 className="font-bold font-mono tracking-widest text-sm">{title || "WARNING"}</h2>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white"><X size={18} /></button>
        </div>

        <div className="p-6">
          <p className="text-gray-300 text-sm font-mono leading-relaxed mb-6">
            {message || "Are you sure you want to proceed with this action?"}
          </p>
          
          <div className="flex gap-3">
            <button 
              onClick={onClose}
              className="flex-1 bg-gray-900 border border-gray-700 hover:bg-gray-800 text-gray-300 py-2.5 rounded-lg text-xs font-bold tracking-widest transition-colors"
            >
              CANCEL
            </button>
            <button 
              onClick={() => { onConfirm(); onClose(); }}
              className="flex-1 bg-red-600 hover:bg-red-500 text-white py-2.5 rounded-lg text-xs font-bold tracking-widest transition-colors shadow-[0_0_15px_rgba(239,68,68,0.4)]"
            >
              DELETE
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
