"use client";

import Window from "../Window";
import { MessageSquare, Send, Paperclip, X, Mic, Square } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useSocket } from "../SocketProvider";
import AudioPlayer from "../AudioPlayer";
import ImageViewer from "../ImageViewer";

export default function Chat({ onClose, identity }) {
  const { socket } = useSocket();
  
  const [messages, setMessages] = useState([
    { id: 1, sender: "SYSTEM", text: "Secure peer-to-peer chat established." }
  ]);
  const [input, setInput] = useState("");
  const [mediaBase64, setMediaBase64] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [expandedImage, setExpandedImage] = useState(null);
  const endRef = useRef(null);
  const fileInputRef = useRef(null);
  
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  
  useEffect(() => {
    if (!socket) return;
    
    const handleNewMessage = (msg) => {
      setMessages(prev => [...prev, msg]);
    };

    const handleChatHistory = (history) => {
      setMessages(history);
    };
    
    socket.on("newChatMessage", handleNewMessage);
    socket.on("chatHistory", handleChatHistory);

    socket.emit("getChatHistory");

    return () => {
      socket.off("newChatMessage", handleNewMessage);
      socket.off("chatHistory", handleChatHistory);
    };
  }, [socket]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (evt) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement("canvas");
            const MAX_WIDTH = 1200;
            const MAX_HEIGHT = 1200;
            let width = img.width;
            let height = img.height;

            if (width > height) {
              if (width > MAX_WIDTH) {
                height *= MAX_WIDTH / width;
                width = MAX_WIDTH;
              }
            } else {
              if (height > MAX_HEIGHT) {
                width *= MAX_HEIGHT / height;
                height = MAX_HEIGHT;
              }
            }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(img, 0, 0, width, height);
            const compressedBase64 = canvas.toDataURL("image/jpeg", 0.7);
            setMediaBase64(compressedBase64);
          };
          img.src = evt.target.result;
        };
        reader.readAsDataURL(file);
      } else {
        const reader = new FileReader();
        reader.onload = (evt) => {
          setMediaBase64(evt.target.result);
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const reader = new FileReader();
        reader.onloadend = () => {
          setMediaBase64(reader.result);
        };
        reader.readAsDataURL(audioBlob);
        
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("Microphone access denied. Please allow microphone permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleSend = (e) => {
    e.preventDefault();
    if ((!input.trim() && !mediaBase64) || !socket) return;
    
    const newMsg = { id: Date.now(), sender: identity, text: input, mediaBase64 };
    socket.emit("chatMessage", newMsg);
    
    setInput("");
    setMediaBase64(null);
  };

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <Window title="SECURE_CHAT.exe" onClose={onClose} icon={MessageSquare}>
      <div className="flex flex-col h-full font-sans">
        <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2 pb-4 hide-scrollbar">
          {messages.map((msg, idx) => (
            <div key={msg._id || msg.id || idx} className={`flex flex-col ${msg.sender === identity ? "items-end" : msg.sender === "SYSTEM" ? "items-center" : "items-start"}`}>
              {msg.sender !== "SYSTEM" && (
                <span className="text-[10px] text-gray-500 font-mono mb-1 tracking-widest">{msg.sender}</span>
              )}
              <div className={`px-4 py-2.5 rounded-2xl max-w-[85%] break-words shadow-lg ${
                msg.sender === identity ? "bg-gradient-to-br from-green-600/30 to-green-800/30 border border-green-500/40 text-green-50 rounded-tr-sm" :
                msg.sender === "SYSTEM" ? "bg-gray-900 border border-gray-800 text-gray-500 font-mono text-xs px-4 py-1 rounded-full" :
                "bg-gradient-to-br from-blue-600/30 to-blue-800/30 border border-blue-500/40 text-blue-50 rounded-tl-sm"
              }`}>
                {msg.mediaUrl && (
                  <div className="mb-2">
                    {msg.mediaType === "video" || msg.mediaType === "audio" || msg.mediaUrl.endsWith(".webm") || msg.mediaUrl.endsWith(".mp4") ? (
                      <AudioPlayer src={msg.mediaUrl} />
                    ) : (
                      <img 
                        src={msg.mediaUrl} 
                        alt="attachment" 
                        className="rounded-xl max-w-full sm:max-w-xs max-h-64 object-cover border border-white/10 cursor-pointer hover:opacity-90 transition-opacity" 
                        loading="lazy" 
                        onClick={() => setExpandedImage(msg.mediaUrl)}
                      />
                    )}
                  </div>
                )}
                {msg.text && <span className="leading-relaxed">{msg.text}</span>}
              </div>
            </div>
          ))}
          <div ref={endRef} />
        </div>

        {mediaBase64 && (
          <div className="relative mb-3 bg-gray-900 border border-gray-700 p-2 rounded-xl inline-block max-w-max self-start ml-12">
            <button 
              type="button" 
              onClick={() => setMediaBase64(null)}
              className="absolute -top-2 -right-2 z-10 bg-red-500 text-white rounded-full p-1 shadow hover:bg-red-600"
            >
              <X size={12} />
            </button>
            {mediaBase64.startsWith("data:audio") || mediaBase64.startsWith("data:video") ? (
               <audio src={mediaBase64} controls className="h-10 w-48" />
            ) : (
               <img src={mediaBase64} alt="upload preview" className="h-20 rounded object-cover" />
            )}
          </div>
        )}

        <form onSubmit={handleSend} className="flex gap-2 relative bg-[#111] p-2 rounded-full border border-gray-800">
          {isRecording ? (
            <div className="flex-1 flex items-center gap-3 px-4">
              <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
              <span className="text-red-400 font-mono text-sm flex-1">Recording...</span>
              <button 
                type="button"
                onClick={stopRecording}
                className="bg-red-500/20 hover:bg-red-500/40 text-red-500 p-2 rounded-full transition-colors"
              >
                <Square size={16} className="fill-current" />
              </button>
            </div>
          ) : (
            <>
              <input 
                type="file" 
                accept="image/*, audio/*"
                ref={fileInputRef}
                className="hidden" 
                onChange={handleFileChange}
              />
              <button 
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-gray-400 hover:text-white p-2 rounded-full transition-colors flex items-center justify-center shrink-0"
              >
                <Paperclip size={18} />
              </button>
              
              <button 
                type="button"
                onClick={startRecording}
                className="text-gray-400 hover:text-red-400 p-2 rounded-full transition-colors flex items-center justify-center shrink-0"
              >
                <Mic size={18} />
              </button>

              <input 
                type="text" 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Secure message..."
                className="flex-1 bg-transparent border-none px-2 text-sm focus:outline-none text-white placeholder-gray-600 min-w-0"
              />
              <button 
                type="submit" 
                disabled={!input.trim() && !mediaBase64}
                className="bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:hover:bg-green-600 text-white p-2.5 rounded-full flex items-center justify-center transition-all shadow-[0_0_10px_rgba(22,163,74,0.3)] shrink-0"
              >
                <Send size={16} className={(!input.trim() && !mediaBase64) ? "opacity-50" : ""} />
              </button>
            </>
          )}
        </form>
      </div>
      {expandedImage && (
        <ImageViewer src={expandedImage} onClose={() => setExpandedImage(null)} />
      )}
    </Window>
  );
}
