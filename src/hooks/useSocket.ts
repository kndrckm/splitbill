import { useEffect, useRef, useCallback } from 'react';

export const useSocket = (roomId: string | null, onUpdate: (data: any) => void) => {
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!roomId) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const socket = new WebSocket(`${protocol}//${window.location.host}`);
    socketRef.current = socket;

    socket.onopen = () => {
      console.log('Connected to WebSocket');
      socket.send(JSON.stringify({ type: 'join', roomId }));
    };

    socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === 'update') {
          onUpdate(payload.data);
        }
      } catch (e) {
        console.error('WS Message Error:', e);
      }
    };

    socket.onclose = () => {
      console.log('Disconnected from WebSocket');
    };

    return () => {
      socket.close();
    };
  }, [roomId, onUpdate]);

  const broadcastUpdate = useCallback((data: any) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: 'update', data }));
    }
  }, []);

  return { broadcastUpdate };
};
