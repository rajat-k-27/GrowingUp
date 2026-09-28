"use client";

import Window from "../Window";
import { AlertCircle } from "lucide-react";

export default function Placeholder({ title, onClose }) {
  return (
    <Window title={title} onClose={onClose}>
      <div className="flex flex-col items-center justify-center p-12 text-gray-500 font-mono gap-4">
        <AlertCircle size={48} className="text-gray-600" />
        <p className="tracking-widest">MODULE UNDER CONSTRUCTION</p>
        <p className="text-xs">Bro is still coding this part.</p>
      </div>
    </Window>
  );
}
