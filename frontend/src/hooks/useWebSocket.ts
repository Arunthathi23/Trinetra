import { useEffect, useRef, useState, useCallback } from 'react';

export interface ViolationAlert {
  id: string;
  timestamp: string;
  location: string;
  violation_type: string;
  vehicle_id: string;
  confidence: number;
  severity: 'High' | 'Medium' | 'Low';
  image_url?: string;
  location_lat?: number;
  location_lng?: number;
}

export function useWebSocket(url: string) {
  const [isConnected, setIsConnected] = useState(false);
  const [alerts, setAlerts] = useState<ViolationAlert[]>([]);
  const [lastAlert, setLastAlert] = useState<ViolationAlert | null>(null);
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimeout = useRef<ReturnType<typeof setTimeout>>();
  const reconnectAttempts = useRef(0);
  const shouldReconnect = useRef(true);
  const maxReconnectAttempts = 5;

  const connect = useCallback(() => {
    if (!shouldReconnect.current) return;
    if (ws.current?.readyState === WebSocket.OPEN || ws.current?.readyState === WebSocket.CONNECTING) return;

    try {
      ws.current = new WebSocket(url);

      ws.current.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        reconnectAttempts.current = 0;
      };

      ws.current.onmessage = (event) => {
        try {
          const data: ViolationAlert = JSON.parse(event.data);
          console.log('Received alert:', data);

          // Add mock coordinates for demo purposes (Bangalore area)
          const alertWithCoords: ViolationAlert = {
            ...data,
            location_lat: data.location_lat || (12.9716 + (Math.random() - 0.5) * 0.1),
            location_lng: data.location_lng || (77.5946 + (Math.random() - 0.5) * 0.1),
          };

          setAlerts(prev => [alertWithCoords, ...prev.slice(0, 9)]); // Keep last 10 alerts
          setLastAlert(alertWithCoords);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      ws.current.onclose = () => {
        console.log('WebSocket disconnected');
        setIsConnected(false);
        ws.current = null;

        // Attempt to reconnect
        if (shouldReconnect.current && reconnectAttempts.current < maxReconnectAttempts) {
          reconnectAttempts.current += 1;
          reconnectTimeout.current = setTimeout(() => {
            console.log(`Attempting to reconnect (${reconnectAttempts.current}/${maxReconnectAttempts})`);
            connect();
          }, 2000 * reconnectAttempts.current); // Exponential backoff
        }
      };

      ws.current.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
    }
  }, [url]);

  const disconnect = useCallback(() => {
    shouldReconnect.current = false;
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
      reconnectTimeout.current = undefined;
    }
    if (ws.current) {
      if (ws.current.readyState === WebSocket.OPEN || ws.current.readyState === WebSocket.CONNECTING) {
        ws.current.close();
      }
      ws.current = null;
    }
    setIsConnected(false);
  }, []);

  useEffect(() => {
    shouldReconnect.current = true;
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    isConnected,
    alerts,
    lastAlert,
    connect,
    disconnect,
  };
}