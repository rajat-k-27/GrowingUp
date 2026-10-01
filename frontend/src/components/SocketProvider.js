"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { io } from "socket.io-client";

const SocketContext = createContext(null);

export const useSocket = () => {
  return useContext(SocketContext);
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  const connect = (token) => {
    if (socket) return; // Already connected

    const defaultBackend = typeof window !== 'undefined' 
      ? `${window.location.protocol}//${window.location.hostname}:5000` 
      : "http://localhost:5000";
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || defaultBackend;
    
    // Pass the secure token during handshake
    const socketInstance = io(backendUrl, {
      auth: { token }
    });

    socketInstance.on("connect", () => setIsConnected(true));
    socketInstance.on("disconnect", () => setIsConnected(false));

    setSocket(socketInstance);
  };

  const disconnect = () => {
    if (socket) {
      socket.disconnect();
      setSocket(null);
      setIsConnected(false);
    }
  };

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      if (socket) socket.disconnect();
    };
  }, [socket]);

  return (
    <SocketContext.Provider value={{ socket, isConnected, connect, disconnect }}>
      {children}
    </SocketContext.Provider>
  );
};
