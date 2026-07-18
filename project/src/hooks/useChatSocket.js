import { useEffect, useRef, useState } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { useAuth } from '../context/AuthContext';

export function useChatSocket() {
  const { profile } = useAuth();
  const [messages, setMessages] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const clientRef = useRef(null);
  const sessionIdRef = useRef(Math.random().toString(36).substring(7));

  useEffect(() => {
    // We only connect when the user mounts the widget, but we can do it on hook initialization
    const client = new Client({
      webSocketFactory: () => {
        const wsUrl = import.meta.env.VITE_WS_URL || 'https://cinebook-backend-6e0a.onrender.com/ws-chat';
        return new SockJS(wsUrl);
      },
      connectHeaders: {
        Authorization: `Bearer ${localStorage.getItem('cb_token') || ''}`,
      },
      debug: function (str) {
        // console.log(str);
      },
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
    });

    client.onConnect = (frame) => {
      setIsConnected(true);
      // Subscribe to the session-specific topic
      client.subscribe(`/topic/chat/${sessionIdRef.current}`, (message) => {
        if (message.body) {
          const receivedMsg = JSON.parse(message.body);
          setMessages((prev) => [...prev, receivedMsg]);
        }
      });
    };

    client.onStompError = (frame) => {
      console.error('Broker reported error: ' + frame.headers['message']);
      console.error('Additional details: ' + frame.body);
    };

    client.activate();
    clientRef.current = client;

    return () => {
      client.deactivate();
    };
  }, []);

  const sendMessage = (text) => {
    if (clientRef.current && clientRef.current.connected) {
      const msg = {
        sessionId: sessionIdRef.current,
        userId: profile?.id?.toString(),
        sender: 'user',
        message: text,
        timestamp: new Date().toISOString(),
      };

      // Add to local state immediately
      setMessages((prev) => [...prev, msg]);

      // Send to server
      clientRef.current.publish({
        destination: '/app/chat.send',
        body: JSON.stringify(msg),
      });
    }
  };

  return {
    messages,
    sendMessage,
    isConnected,
  };
}
