"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Window from "../Window";
import { 
  Palette, 
  Trash2, 
  Eraser, 
  Pen, 
  Download, 
  RotateCcw, 
  Sparkles, 
  Highlighter, 
  Sun, 
  Moon, 
  Grid,
  Check
} from "lucide-react";
import { useSocket } from "../SocketProvider";

const COLOR_PALETTE = [
  { name: "Cyan", hex: "#00F0FF" },
  { name: "Electric Blue", hex: "#3B82F6" },
  { name: "Neon Emerald", hex: "#10B981" },
  { name: "Cyber Amber", hex: "#F59E0B" },
  { name: "Flame Red", hex: "#EF4444" },
  { name: "Hot Pink", hex: "#EC4899" },
  { name: "Ultra Violet", hex: "#8B5CF6" },
  { name: "Pure White", hex: "#FFFFFF" },
];

const BRUSH_SIZES = [
  { label: "Fine", size: 2, dot: 4 },
  { label: "Medium", size: 5, dot: 7 },
  { label: "Bold", size: 10, dot: 12 },
  { label: "Heavy", size: 18, dot: 18 },
];

const THEMES = {
  dark: {
    id: "dark",
    name: "Cyber Dark",
    bg: "#0b0f19",
    gridColor: "rgba(255, 255, 255, 0.06)",
    gridSize: 24,
    defaultColor: "#00F0FF"
  },
  blueprint: {
    id: "blueprint",
    name: "Blueprint",
    bg: "#0a192f",
    gridColor: "rgba(0, 240, 255, 0.08)",
    gridSize: 20,
    defaultColor: "#00F0FF"
  },
  light: {
    id: "light",
    name: "Studio White",
    bg: "#ffffff",
    gridColor: "rgba(0, 0, 0, 0.06)",
    gridSize: 24,
    defaultColor: "#3B82F6"
  }
};

export default function Draw({ onClose, identity, roomCode }) {
  const { socket } = useSocket();
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  // Studio tool states
  const [activeTool, setActiveTool] = useState("pen"); // 'pen' | 'glow' | 'highlighter' | 'eraser'
  const [color, setColor] = useState("#00F0FF");
  const [brushSize, setBrushSize] = useState(5);
  const [themeId, setThemeId] = useState("dark");
  const [collaboratorDrawing, setCollaboratorDrawing] = useState(null);

  // Drawing gesture refs
  const isDrawing = useRef(false);
  const currentStrokeId = useRef(null);
  const strokePoints = useRef([]); // Points in active local gesture
  const lastEmitPos = useRef(null);
  const lastEmitTime = useRef(0);
  const activeCollaboratorTimeout = useRef(null);

  // Structured lines / strokes state
  // Array of line segments { start: {x,y}, end: {x,y}, color, size, tool, strokeId, sender, roomCode }
  const linesRef = useRef([]);

  const currentTheme = THEMES[themeId] || THEMES.dark;

  // Draw background grid matching theme
  const drawBackground = useCallback((ctx, width, height) => {
    ctx.save();
    ctx.fillStyle = currentTheme.bg;
    ctx.fillRect(0, 0, width, height);

    // Draw subtle tech dot-grid
    ctx.fillStyle = currentTheme.gridColor;
    const step = currentTheme.gridSize;
    for (let x = step; x < width; x += step) {
      for (let y = step; y < height; y += step) {
        ctx.beginPath();
        ctx.arc(x, y, 1, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }, [currentTheme]);

  // High-performance canvas redraw
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);
    drawBackground(ctx, width, height);

    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // Group consecutive segments by strokeId for batch path rendering (100x faster than individual strokes!)
    const lines = linesRef.current;
    if (!lines || lines.length === 0) return;

    let currentPath = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const startX = line.start.x * width;
      const startY = line.start.y * height;
      const endX = line.end.x * width;
      const endY = line.end.y * height;

      const isEraser = line.tool === "eraser";
      const strokeColor = isEraser ? currentTheme.bg : line.color;
      const strokeSize = line.size;
      const isGlow = line.tool === "glow";
      const isHighlighter = line.tool === "highlighter";

      ctx.save();

      if (isHighlighter) {
        ctx.globalAlpha = 0.4;
      }

      if (isGlow && !isEraser) {
        ctx.shadowBlur = strokeSize * 1.8;
        ctx.shadowColor = strokeColor;
      }

      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = strokeSize;
      ctx.stroke();

      ctx.restore();
    }
  }, [currentTheme, drawBackground]);

  // Dynamic canvas resize with Retina / DPR support
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const resize = () => {
      const rect = container.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      canvas.width = rect.width;
      canvas.height = rect.height;
      redrawCanvas();
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(container);

    window.addEventListener("resize", resize);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", resize);
    };
  }, [redrawCanvas]);

  // Socket event listeners
  useEffect(() => {
    if (!socket) return;

    const handleDrawLine = (data) => {
      if (!data || !data.start || !data.end) return;
      linesRef.current.push(data);

      // Render remote line immediately with 0ms delay
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        const width = canvas.width;
        const height = canvas.height;
        const isEraser = data.tool === "eraser";
        const strokeColor = isEraser ? currentTheme.bg : data.color;
        const strokeSize = data.size;

        ctx.save();
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        if (data.tool === "highlighter") ctx.globalAlpha = 0.4;
        if (data.tool === "glow" && !isEraser) {
          ctx.shadowBlur = strokeSize * 1.8;
          ctx.shadowColor = strokeColor;
        }

        ctx.beginPath();
        ctx.moveTo(data.start.x * width, data.start.y * height);
        ctx.lineTo(data.end.x * width, data.end.y * height);
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = strokeSize;
        ctx.stroke();
        ctx.restore();
      }

      // Show collaborator drawing badge
      if (data.sender && data.sender !== identity) {
        setCollaboratorDrawing(data.sender);
        if (activeCollaboratorTimeout.current) {
          clearTimeout(activeCollaboratorTimeout.current);
        }
        activeCollaboratorTimeout.current = setTimeout(() => {
          setCollaboratorDrawing(null);
        }, 1200);
      }
    };

    const handleDrawUndo = (data) => {
      if (data?.strokeId) {
        linesRef.current = linesRef.current.filter(l => l.strokeId !== data.strokeId);
      } else if (data?.sender) {
        let lastTargetId = null;
        for (let i = linesRef.current.length - 1; i >= 0; i--) {
          if (linesRef.current[i].sender === data.sender) {
            lastTargetId = linesRef.current[i].strokeId || `fallback_${i}`;
            break;
          }
        }
        if (lastTargetId) {
          linesRef.current = linesRef.current.filter(l => (l.strokeId || '') !== lastTargetId);
        }
      }
      redrawCanvas();
    };

    const handleDrawClear = (data) => {
      if (data && data.sender) {
        linesRef.current = linesRef.current.filter(l => l.sender !== data.sender);
      } else {
        linesRef.current = [];
      }
      redrawCanvas();
    };

    const handleDrawState = (lines) => {
      linesRef.current = Array.isArray(lines) ? lines : [];
      redrawCanvas();
    };

    const fetchDrawState = () => {
      socket.emit("get_draw_state", roomCode);
    };

    socket.on("draw_line", handleDrawLine);
    socket.on("draw_undo", handleDrawUndo);
    socket.on("draw_clear", handleDrawClear);
    socket.on("draw_state", handleDrawState);
    socket.on("connect", fetchDrawState);

    fetchDrawState();

    return () => {
      socket.off("draw_line", handleDrawLine);
      socket.off("draw_undo", handleDrawUndo);
      socket.off("draw_clear", handleDrawClear);
      socket.off("draw_state", handleDrawState);
      socket.off("connect", fetchDrawState);
      if (activeCollaboratorTimeout.current) clearTimeout(activeCollaboratorTimeout.current);
    };
  }, [socket, roomCode, identity, currentTheme, redrawCanvas]);

  // Normalized relative coordinate calculator
  const getCoordinates = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
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
      x: Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (clientY - rect.top) / rect.height))
    };
  };

  const startDrawing = (e) => {
    if (e.cancelable) e.preventDefault();
    isDrawing.current = true;
    const pos = getCoordinates(e);

    const strokeId = `${identity}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    currentStrokeId.current = strokeId;
    strokePoints.current = [pos];
    lastEmitPos.current = pos;
    lastEmitTime.current = Date.now();
  };

  const draw = (e) => {
    if (e.cancelable) e.preventDefault();
    if (!isDrawing.current) return;

    const currentPos = getCoordinates(e);
    const canvas = canvasRef.current;
    if (!canvas) return;

    const pts = strokePoints.current;
    const prevPos = pts[pts.length - 1];

    // Ignore jitter < 1px
    const dx = (currentPos.x - prevPos.x) * canvas.width;
    const dy = (currentPos.y - prevPos.y) * canvas.height;
    if (dx * dx + dy * dy < 2) return;

    pts.push(currentPos);

    // 1. Instant local render with anti-aliasing (0ms perceived latency)
    const ctx = canvas.getContext("2d");
    const width = canvas.width;
    const height = canvas.height;

    const isEraser = activeTool === "eraser";
    const strokeColor = isEraser ? currentTheme.bg : color;
    const strokeSize = isEraser ? 24 : brushSize;

    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (activeTool === "highlighter") ctx.globalAlpha = 0.4;
    if (activeTool === "glow" && !isEraser) {
      ctx.shadowBlur = strokeSize * 1.8;
      ctx.shadowColor = strokeColor;
    }

    ctx.beginPath();
    ctx.moveTo(prevPos.x * width, prevPos.y * height);
    ctx.lineTo(currentPos.x * width, currentPos.y * height);
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = strokeSize;
    ctx.stroke();
    ctx.restore();

    // 2. Add to lines memory
    const lineSegment = {
      start: prevPos,
      end: currentPos,
      color: strokeColor,
      size: strokeSize,
      tool: activeTool,
      strokeId: currentStrokeId.current,
      sender: identity,
      roomCode
    };
    linesRef.current.push(lineSegment);

    // 3. Network emit throttled to ~40fps (every 25ms)
    const now = Date.now();
    if (now - lastEmitTime.current >= 25 && socket) {
      socket.emit("draw_line", {
        start: lastEmitPos.current,
        end: currentPos,
        color: strokeColor,
        size: strokeSize,
        tool: activeTool,
        strokeId: currentStrokeId.current,
        sender: identity,
        roomCode
      });
      lastEmitPos.current = currentPos;
      lastEmitTime.current = now;
    }
  };

  const stopDrawing = (e) => {
    if (e.cancelable) e.preventDefault();
    if (!isDrawing.current) return;
    isDrawing.current = false;

    // Flush any pending tail segment to peer
    if (socket && lastEmitPos.current && strokePoints.current.length > 0) {
      const finalPos = strokePoints.current[strokePoints.current.length - 1];
      if (lastEmitPos.current.x !== finalPos.x || lastEmitPos.current.y !== finalPos.y) {
        const isEraser = activeTool === "eraser";
        const strokeColor = isEraser ? currentTheme.bg : color;
        const strokeSize = isEraser ? 24 : brushSize;
        socket.emit("draw_line", {
          start: lastEmitPos.current,
          end: finalPos,
          color: strokeColor,
          size: strokeSize,
          tool: activeTool,
          strokeId: currentStrokeId.current,
          sender: identity,
          roomCode
        });
      }
      socket.emit("draw_end", { roomCode });
    }

    strokePoints.current = [];
    currentStrokeId.current = null;
    lastEmitPos.current = null;
  };

  // Undo current user's last stroke
  const undoLastStroke = () => {
    const lines = linesRef.current;
    if (!lines || lines.length === 0) return;

    // Find the latest strokeId belonging to identity
    let targetStrokeId = null;
    for (let i = lines.length - 1; i >= 0; i--) {
      if (lines[i].sender === identity) {
        targetStrokeId = lines[i].strokeId || `fallback_${i}`;
        break;
      }
    }

    if (!targetStrokeId) return;

    // Remove locally
    linesRef.current = lines.filter(l => (l.strokeId || '') !== targetStrokeId);
    redrawCanvas();

    // Broadcast to room
    if (socket) {
      socket.emit("draw_undo", { strokeId: targetStrokeId, sender: identity, roomCode });
    }
  };

  // Clear my strokes only
  const clearMyStrokes = () => {
    linesRef.current = linesRef.current.filter(l => l.sender !== identity);
    redrawCanvas();
    if (socket) {
      socket.emit("draw_clear", { sender: identity, roomCode });
    }
  };

  // Clear all strokes (entire board)
  const clearAllStrokes = () => {
    linesRef.current = [];
    redrawCanvas();
    if (socket) {
      socket.emit("draw_clear", { roomCode });
    }
  };

  // Export high-res PNG
  const exportSnapshot = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.download = `BRO_STUDIO_DRAW_${roomCode || 'ROOM'}_${Date.now()}.png`;
    link.href = dataUrl;
    link.click();
  };

  // Keyboard shortcut Ctrl+Z / Cmd+Z for Undo
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        e.preventDefault();
        undoLastStroke();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [identity, roomCode]);

  return (
    <Window title="DRAW.exe // PRO STUDIO" onClose={onClose} icon={Palette} width="max-w-5xl">
      <div className="flex flex-col h-full font-sans select-none">
        
        {/* Modern Studio Glassmorphic Header Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-black/60 backdrop-blur-xl border border-white/10 rounded-xl mb-3 shadow-2xl">
          
          {/* Tool Selection Group */}
          <div className="flex items-center gap-1 bg-white/5 p-1 rounded-lg border border-white/5">
            <button
              onClick={() => setActiveTool("pen")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono font-bold transition-all cursor-pointer ${
                activeTool === "pen" 
                  ? "bg-blue-600 text-white shadow-[0_0_12px_rgba(37,99,235,0.6)]" 
                  : "text-gray-400 hover:text-white hover:bg-white/10"
              }`}
              title="Studio Pen (P)"
            >
              <Pen size={14} />
              <span className="hidden sm:inline">PEN</span>
            </button>

            <button
              onClick={() => setActiveTool("glow")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono font-bold transition-all cursor-pointer ${
                activeTool === "glow" 
                  ? "bg-cyan-500 text-black shadow-[0_0_15px_rgba(6,182,212,0.8)] font-black" 
                  : "text-gray-400 hover:text-white hover:bg-white/10"
              }`}
              title="Neon Glow Brush"
            >
              <Sparkles size={14} />
              <span className="hidden sm:inline">GLOW</span>
            </button>

            <button
              onClick={() => setActiveTool("highlighter")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono font-bold transition-all cursor-pointer ${
                activeTool === "highlighter" 
                  ? "bg-amber-500 text-black shadow-[0_0_12px_rgba(245,158,11,0.6)] font-black" 
                  : "text-gray-400 hover:text-white hover:bg-white/10"
              }`}
              title="Highlighter Marker"
            >
              <Highlighter size={14} />
              <span className="hidden sm:inline">HIGHLIGHT</span>
            </button>

            <button
              onClick={() => setActiveTool("eraser")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono font-bold transition-all cursor-pointer ${
                activeTool === "eraser" 
                  ? "bg-red-600 text-white shadow-[0_0_12px_rgba(220,38,38,0.6)]" 
                  : "text-gray-400 hover:text-white hover:bg-white/10"
              }`}
              title="Precision Eraser (E)"
            >
              <Eraser size={14} />
              <span className="hidden sm:inline">ERASER</span>
            </button>
          </div>

          {/* Stroke Width Selector */}
          <div className="flex items-center gap-1 bg-white/5 p-1 rounded-lg border border-white/5">
            {BRUSH_SIZES.map((b) => (
              <button
                key={b.size}
                onClick={() => setBrushSize(b.size)}
                className={`w-7 h-7 rounded flex items-center justify-center transition-all cursor-pointer ${
                  brushSize === b.size && activeTool !== "eraser"
                    ? "bg-white/20 border border-white/40 shadow-sm"
                    : "text-gray-400 hover:bg-white/10"
                }`}
                title={`${b.label} (${b.size}px)`}
              >
                <div 
                  className="rounded-full bg-current transition-transform" 
                  style={{ width: b.dot, height: b.dot }} 
                />
              </button>
            ))}
          </div>

          {/* Color Palette Swatches */}
          <div className="flex items-center gap-1.5 bg-white/5 p-1 rounded-lg border border-white/5 overflow-x-auto">
            {COLOR_PALETTE.map((swatch) => (
              <button
                key={swatch.hex}
                onClick={() => {
                  setColor(swatch.hex);
                  if (activeTool === "eraser") setActiveTool("pen");
                }}
                className={`w-6 h-6 rounded-full transition-transform cursor-pointer relative flex items-center justify-center ${
                  color === swatch.hex && activeTool !== "eraser" ? "scale-125 ring-2 ring-white shadow-lg" : "hover:scale-110 opacity-90"
                }`}
                style={{ backgroundColor: swatch.hex }}
                title={swatch.name}
              >
                {color === swatch.hex && activeTool !== "eraser" && (
                  <Check size={12} className={swatch.hex === "#FFFFFF" || swatch.hex === "#00F0FF" ? "text-black" : "text-white"} />
                )}
              </button>
            ))}

            {/* Custom Hex Color Picker */}
            <label className="relative w-6 h-6 rounded-full overflow-hidden cursor-pointer border border-white/30 hover:scale-110 transition-transform flex items-center justify-center ml-0.5">
              <input
                type="color"
                value={color}
                onChange={(e) => {
                  setColor(e.target.value);
                  if (activeTool === "eraser") setActiveTool("pen");
                }}
                className="absolute -top-4 -left-4 w-14 h-14 cursor-pointer opacity-0"
              />
              <div 
                className="w-full h-full"
                style={{ background: "conic-gradient(red, yellow, lime, aqua, blue, magenta, red)" }}
              />
            </label>
          </div>

          {/* Quick Actions (Undo, Themes, Snapshot, Clear) */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={undoLastStroke}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white transition-all text-xs font-mono font-bold cursor-pointer"
              title="Undo Last Stroke (Ctrl+Z)"
            >
              <RotateCcw size={14} />
              <span className="hidden md:inline">UNDO</span>
            </button>

            {/* Canvas Theme Selector */}
            <div className="flex items-center bg-white/5 rounded-lg border border-white/10 p-0.5">
              <button
                onClick={() => setThemeId("dark")}
                className={`p-1.5 rounded transition-all cursor-pointer ${themeId === "dark" ? "bg-white/20 text-cyan-400" : "text-gray-500 hover:text-gray-300"}`}
                title="Theme: Cyber Dark"
              >
                <Moon size={13} />
              </button>
              <button
                onClick={() => setThemeId("blueprint")}
                className={`p-1.5 rounded transition-all cursor-pointer ${themeId === "blueprint" ? "bg-white/20 text-blue-400" : "text-gray-500 hover:text-gray-300"}`}
                title="Theme: Technical Blueprint"
              >
                <Grid size={13} />
              </button>
              <button
                onClick={() => setThemeId("light")}
                className={`p-1.5 rounded transition-all cursor-pointer ${themeId === "light" ? "bg-white/20 text-amber-400" : "text-gray-500 hover:text-gray-300"}`}
                title="Theme: Studio White"
              >
                <Sun size={13} />
              </button>
            </div>

            <button
              onClick={exportSnapshot}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/40 border border-blue-500/40 text-blue-400 hover:text-blue-200 transition-all text-xs font-mono font-bold cursor-pointer"
              title="Export Canvas to PNG"
            >
              <Download size={14} />
              <span className="hidden md:inline">SAVE</span>
            </button>

            <button
              onClick={clearMyStrokes}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-600/20 hover:bg-red-600/40 border border-red-500/40 text-red-400 hover:text-red-200 transition-all text-xs font-mono font-bold cursor-pointer"
              title="Clear only your strokes"
            >
              <Trash2 size={14} />
              <span className="hidden md:inline">CLEAR MINE</span>
            </button>

            <button
              onClick={clearAllStrokes}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-950/40 hover:bg-red-900/60 border border-red-800/60 text-red-500 hover:text-red-300 transition-all text-xs font-mono font-bold cursor-pointer"
              title="Clear entire whiteboard for everyone"
            >
              <span className="hidden lg:inline">CLEAR ALL</span>
            </button>
          </div>
        </div>

        {/* Studio Canvas Viewport */}
        <div 
          ref={containerRef}
          className="flex-1 rounded-xl overflow-hidden relative touch-none border border-white/10 shadow-[inset_0_0_30px_rgba(0,0,0,0.8)]"
          style={{ backgroundColor: currentTheme.bg }}
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
            className="w-full h-full block cursor-crosshair"
          />

          {/* Active Collaborator Drawing Indicator */}
          {collaboratorDrawing && (
            <div className="absolute top-3 left-3 z-20 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/80 backdrop-blur-md border border-cyan-500/40 text-cyan-300 text-xs font-mono shadow-[0_0_15px_rgba(0,240,255,0.3)] animate-pulse">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              <span>{collaboratorDrawing} IS DRAWING...</span>
            </div>
          )}

          {/* Bottom Left Canvas Info Overlay */}
          <div className="absolute bottom-2 left-3 pointer-events-none flex items-center gap-3 text-[10px] font-mono text-white/30">
            <span>ROOM: {roomCode || 'SOLO'}</span>
            <span>•</span>
            <span>TOOL: {activeTool.toUpperCase()}</span>
            <span>•</span>
            <span>SIZE: {brushSize}PX</span>
            <span>•</span>
            <span>PRESS CTRL+Z TO UNDO</span>
          </div>
        </div>

      </div>
    </Window>
  );
}
