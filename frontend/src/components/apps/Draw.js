"use client";

import { useState, useEffect, useRef } from "react";
import Window from "../Window";
import { Palette, Trash2, Eraser, Pen, Download } from "lucide-react";
import { useSocket } from "../SocketProvider";

export default function Draw({ onClose, identity }) {
  const { socket } = useSocket();
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState("#3b82f6");
  const [brushSize, setBrushSize] = useState(3);
  const [isEraser, setIsEraser] = useState(false);
  
  const lastPos = useRef({ x: 0, y: 0 });
  const linesRef = useRef([]); // Stores all drawn lines { start, end, color, size, sender }

  const redrawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    
    // Wipe clean
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Redraw all stored lines
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    linesRef.current.forEach(line => {
      const startX = line.start.x * canvas.width;
      const startY = line.start.y * canvas.height;
      const endX = line.end.x * canvas.width;
      const endY = line.end.y * canvas.height;

      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.strokeStyle = line.color;
      ctx.lineWidth = line.size;
      ctx.stroke();
      ctx.closePath();
    });
  };

  useEffect(() => {
    if (!socket) return;
    
    const handleDrawLine = (data) => {
      linesRef.current.push(data);
      drawLine(data.start, data.end, data.color, data.size);
    };

    const handleDrawClear = (data) => {
      if (data && data.sender) {
        // Someone cleared ONLY their lines
        linesRef.current = linesRef.current.filter(l => l.sender !== data.sender);
        redrawCanvas();
      } else {
        // Global clear (legacy fallback)
        linesRef.current = [];
        redrawCanvas();
      }
    };

    socket.on("draw_line", handleDrawLine);
    socket.on("draw_clear", handleDrawClear);
    
    return () => {
      socket.off("draw_line", handleDrawLine);
      socket.off("draw_clear", handleDrawClear);
    };
  }, [socket]);

  // Handle dynamic canvas sizing
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    redrawCanvas();

    const handleResize = () => {
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
      redrawCanvas();
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Returns RELATIVE coordinates (0.0 to 1.0) so it scales across different screen sizes!
  const getCoordinates = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    
    let clientX, clientY;
    if (e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    
    return {
      x: (clientX - rect.left) / rect.width,
      y: (clientY - rect.top) / rect.height
    };
  };

  const drawLine = (start, end, strokeColor, strokeSize) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    
    const startX = start.x * canvas.width;
    const startY = start.y * canvas.height;
    const endX = end.x * canvas.width;
    const endY = end.y * canvas.height;

    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = strokeSize;
    ctx.stroke();
    ctx.closePath();
  };

  const startDrawing = (e) => {
    if (e.cancelable) e.preventDefault();
    setIsDrawing(true);
    lastPos.current = getCoordinates(e);
  };

  const draw = (e) => {
    if (e.cancelable) e.preventDefault();
    if (!isDrawing) return;
    
    const currentPos = getCoordinates(e);
    const strokeColor = isEraser ? "#ffffff" : color;
    const strokeSize = isEraser ? 20 : brushSize;
    
    drawLine(lastPos.current, currentPos, strokeColor, strokeSize);
    
    const lineData = {
      start: lastPos.current,
      end: currentPos,
      color: strokeColor,
      size: strokeSize,
      sender: identity
    };
    
    linesRef.current.push(lineData);
    
    if (socket) {
      socket.emit("draw_line", lineData);
    }
    
    lastPos.current = currentPos;
  };

  const stopDrawing = (e) => {
    if (e.cancelable) e.preventDefault();
    setIsDrawing(false);
  };

  const clearMyDrawing = () => {
    // 1. Erase MY lines from local state
    linesRef.current = linesRef.current.filter(l => l.sender !== identity);
    
    // 2. Redraw the canvas using only the remaining (other user's) lines
    redrawCanvas();
    
    // 3. Tell the other user to erase MY lines from their screen too
    if (socket) {
      socket.emit("draw_clear", { sender: identity });
    }
  };

  const saveDrawing = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.download = `BRO_OS_DRAWING_${Date.now()}.png`;
    link.href = dataUrl;
    link.click();
  };

  return (
    <Window title="DRAW.exe" onClose={onClose} icon={Palette}>
      <div className="flex flex-col h-full font-sans gap-4">
        {/* Toolbar */}
        <div className="flex flex-wrap gap-4 p-3 bg-gray-900 border border-gray-800 rounded-xl items-center justify-between shadow-lg">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsEraser(false)}
              className={`p-2 rounded transition-colors ${!isEraser ? 'bg-blue-500/20 text-blue-400' : 'text-gray-400 hover:bg-gray-800'}`}
              title="Pen"
            >
              <Pen size={20} />
            </button>
            <button
              onClick={() => setIsEraser(true)}
              className={`p-2 rounded transition-colors ${isEraser ? 'bg-blue-500/20 text-blue-400' : 'text-gray-400 hover:bg-gray-800'}`}
              title="Eraser"
            >
              <Eraser size={20} />
            </button>
            
            <div className="h-6 w-px bg-gray-700 mx-2"></div>
            
            <input 
              type="color" 
              value={color}
              onChange={(e) => setColor(e.target.value)}
              disabled={isEraser}
              className={`w-8 h-8 rounded cursor-pointer bg-transparent border-0 ${isEraser ? 'opacity-50' : ''}`}
            />
            
            <input 
              type="range"
              min="1"
              max="20"
              value={brushSize}
              onChange={(e) => setBrushSize(parseInt(e.target.value))}
              disabled={isEraser}
              className={`w-24 accent-blue-500 ${isEraser ? 'opacity-50' : ''}`}
            />
          </div>
          
          <div className="flex gap-2">
            <button 
              onClick={saveDrawing}
              className="flex items-center gap-2 px-3 py-1.5 bg-blue-950/30 text-blue-400 hover:bg-blue-900/50 rounded-lg border border-blue-900/50 transition-colors text-sm font-bold tracking-widest cursor-pointer"
            >
              <Download size={16} /> SAVE
            </button>
            <button 
              onClick={clearMyDrawing}
              className="flex items-center gap-2 px-3 py-1.5 bg-red-950/30 text-red-400 hover:bg-red-900/50 rounded-lg border border-red-900/50 transition-colors text-sm font-bold tracking-widest cursor-pointer"
            >
              <Trash2 size={16} /> CLEAR
            </button>
          </div>
        </div>
        
        {/* Canvas Area */}
        <div 
          ref={containerRef}
          className="flex-1 bg-white border-2 border-gray-800 rounded-xl overflow-hidden relative touch-none shadow-inner"
        >
          <canvas
            ref={canvasRef}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
            className="cursor-crosshair w-full h-full block"
          />
        </div>
      </div>
    </Window>
  );
}
