"use client";

import { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import { io } from "socket.io-client";

const SocketContext = createContext(null);

export const useSocket = () => {
  return useContext(SocketContext);
};

export const SocketProvider = ({ children }) => {
  const socketRef = useRef(null);
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  const connect = useCallback((token) => {
    // If socket is already active and connected, do not re-instantiate
    if (socketRef.current && socketRef.current.connected) {
      return;
    }

    // If socket instance already exists but is disconnected, reconnect it
    if (socketRef.current) {
      if (token) socketRef.current.auth = { token };
      socketRef.current.connect();
      return;
    }

    const defaultBackend = typeof window !== 'undefined' 
      ? `${window.location.protocol}//${window.location.hostname}:5000` 
      : "http://localhost:5000";
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || defaultBackend;
    
    // Connect with websocket prioritized and polling fallback for mobile proxies
    const socketInstance = io(backendUrl, {
      auth: { token },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 45000
    });

    socketInstance.on("connect", () => {
      setIsConnected(true);
    });

    socketInstance.on("disconnect", (reason) => {
      console.warn("Socket disconnected:", reason);
      setIsConnected(false);
    });

    socketInstance.on("connect_error", (err) => {
      console.warn("Socket connection error:", err.message);
    });

    socketRef.current = socketInstance;
    setSocket(socketInstance);
  }, []);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setSocket(null);
      setIsConnected(false);
    }
  }, []);

  // ONLY disconnect when the entire app unmounts (browser tab closed)
  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket, isConnected, connect, disconnect }}>
      {children}
    </SocketContext.Provider>
  );
};
