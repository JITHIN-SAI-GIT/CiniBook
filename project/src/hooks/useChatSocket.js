import { useEffect, useRef, useState } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { useAuth } from '../context/AuthContext';

export function useChatSocket() {
  const { profile } = useAuth();
  const [messages, setMessages] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isFallback, setIsFallback] = useState(false);
  const clientRef = useRef(null);
  const sessionIdRef = useRef(Math.random().toString(36).substring(7));

  useEffect(() => {
    let fallbackTimer = setTimeout(() => {
      if (!clientRef.current?.connected) {
        setIsFallback(true);
      }
    }, 3000);

    const client = new Client({
      webSocketFactory: () => {
        // In dev, '/ws-chat' routes through the Vite proxy.
        // In production, derive the WS URL from the API base URL or use VITE_WS_URL.
        let wsUrl = import.meta.env.VITE_WS_URL;
        if (!wsUrl) {
          const apiBase = import.meta.env.VITE_API_BASE_URL || '';
          if (apiBase.startsWith('http')) {
            // Production: absolute API URL like https://cinebook-backend-6e0a.onrender.com/api
            wsUrl = apiBase.replace(/\/api\/?$/, '') + '/ws-chat';
          } else {
            // Dev: relative path, Vite proxy handles it
            wsUrl = '/ws-chat';
          }
        }
        // Use websocket-only transport to avoid SockJS xhr_send fallbacks that get 403'd by CORS
        return new SockJS(wsUrl, null, { transports: ['websocket'] });
      },
      connectHeaders: {
        Authorization: `Bearer ${localStorage.getItem('cb_token') || ''}`,
      },
      debug: function (str) {},
      reconnectDelay: 30000, // 30s between retries — prevents flooding network with 403s
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
    });

    client.onConnect = (frame) => {
      setIsConnected(true);
      setIsFallback(false);
      clearTimeout(fallbackTimer);
      client.subscribe(`/topic/chat/${sessionIdRef.current}`, (message) => {
        if (message.body) {
          const receivedMsg = JSON.parse(message.body);
          setMessages((prev) => [...prev, receivedMsg]);
        }
      });
    };
    
    client.onWebSocketClose = () => {
      setIsConnected(false);
      setIsFallback(true);
    };

    client.onStompError = (frame) => {
      console.error('Broker reported error: ' + frame.headers['message']);
      setIsFallback(true);
    };

    client.activate();
    clientRef.current = client;

    return () => {
      clearTimeout(fallbackTimer);
      client.deactivate();
    };
  }, []);

  const sendMessage = async (text) => {
    const msg = {
      sessionId: sessionIdRef.current,
      userId: profile?.id?.toString(),
      sender: 'user',
      message: text,
      timestamp: new Date().toISOString(),
    };

    // Add to local state immediately
    setMessages((prev) => [...prev, msg]);

    if (clientRef.current && clientRef.current.connected) {
      // Send via WebSocket
      clientRef.current.publish({
        destination: '/app/chat.send',
        body: JSON.stringify(msg),
      });
    } else {
      // HTTP Fallback
      setIsFallback(true);
      try {
        const baseUrl = import.meta.env.VITE_API_URL || '/api';
        const res = await fetch(`${baseUrl}/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('cb_token') || ''}`
          },
          body: JSON.stringify(msg)
        });
        if (res.ok) {
          const data = await res.json();
          setMessages((prev) => [...prev, data]);
        }
      } catch (err) {
        console.error("HTTP Fallback failed", err);
        setMessages((prev) => [...prev, {
          sessionId: sessionIdRef.current,
          userId: profile?.id?.toString(),
          sender: 'bot',
          message: "I'm currently offline. Please check your connection.",
          type: 'ERROR',
          timestamp: new Date().toISOString()
        }]);
      }
    }
  };

  return {
    messages,
    sendMessage,
    isConnected: isConnected || isFallback,
    isFallback
  };
}
