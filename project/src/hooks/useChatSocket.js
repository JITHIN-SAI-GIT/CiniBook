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
        const wsUrl = import.meta.env.VITE_WS_URL || 'https://cinebook-backend-6e0a.onrender.com/ws-chat';
        return new SockJS(wsUrl);
      },
      connectHeaders: {
        Authorization: `Bearer ${localStorage.getItem('cb_token') || ''}`,
      },
      debug: function (str) {},
      reconnectDelay: 5000,
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
        const baseUrl = import.meta.env.VITE_API_URL || 'https://cinebook-backend-6e0a.onrender.com/api';
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
