import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode, useMemo } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';
import { getViolations } from '../services/api';

export interface Violation {
  id: string;
  vehicle_number: string;
  violation_type: string;
  location: string;
  severity: 'High' | 'Medium' | 'Low';
  timestamp: string;
  status: string;
  confidence?: number;
  image_url?: string;
  location_lat?: number;
  location_lng?: number;
}

interface ViolationsContextType {
  violations: Violation[];
  recentViolations: Violation[];
  websocketAlerts: Violation[];
  isLoading: boolean;
  error: string | null;
  totalViolations: number;
  alertsToday: number;
  repeatOffenders: number;
  refreshViolations: () => Promise<void>;
  addViolation: (violation: Violation) => void;
  updateViolation: (id: string, updates: Partial<Violation>) => void;
  isConnected: boolean;
}

const ViolationsContext = createContext<ViolationsContextType | undefined>(undefined);

export const useViolations = () => {
  const context = useContext(ViolationsContext);
  if (!context) {
    throw new Error('useViolations must be used within a ViolationsProvider');
  }
  return context;
};

interface ViolationsProviderProps {
  children: ReactNode;
}

export const ViolationsProvider: React.FC<ViolationsProviderProps> = ({ children }) => {
  const [violations, setViolations] = useState<Violation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<number>(0);

  // WebSocket for real-time alerts
  const { alerts: websocketAlerts, isConnected, lastAlert } = useWebSocket('ws://localhost:8000/ws/violations');

  // Transform WebSocket alerts to Violation format
  const transformedWebsocketAlerts = useMemo(() =>
    websocketAlerts.map(alert => ({
      id: alert.id,
      vehicle_number: alert.vehicle_id,
      violation_type: alert.violation_type,
      location: alert.location,
      severity: alert.severity,
      timestamp: alert.timestamp,
      status: 'Active',
      confidence: alert.confidence,
      image_url: alert.image_url,
      location_lat: alert.location_lat,
      location_lng: alert.location_lng,
    })), [websocketAlerts]
  );

  // Deduplication set to track processed alert IDs
  const processedAlertIds = new Set<string>();

  // Add new violation from WebSocket or API
  const addViolation = useCallback((violation: Violation) => {
    setViolations(prev => {
      // Check if violation already exists
      const exists = prev.some(v => v.id === violation.id);
      if (exists) return prev;

      // Add to beginning for real-time feel
      const newViolations = [violation, ...prev];

      // Keep only last 1000 violations to prevent memory issues
      return newViolations.slice(0, 1000);
    });
  }, []);

  // Update existing violation
  const updateViolation = useCallback((id: string, updates: Partial<Violation>) => {
    setViolations(prev =>
      prev.map(violation =>
        violation.id === id ? { ...violation, ...updates } : violation
      )
    );
  }, []);

  // Refresh violations from API
  const refreshViolations = useCallback(async () => {
    try {
      setError(null);
      const data = await getViolations();

      const formattedViolations: Violation[] = data.map((item: any) => ({
        id: String(item.id),
        vehicle_number: item.vehicle_number || item.vehicle || 'Unknown',
        violation_type: item.violation_type || item.type || 'Unknown',
        location: item.location || 'Unknown Location',
        severity: (item.severity as 'High' | 'Medium' | 'Low') || 'Low',
        timestamp: item.timestamp || item.time || new Date().toISOString(),
        status: item.status || 'Pending',
        confidence: item.confidence,
        image_url: item.image_url,
        location_lat: item.location_lat,
        location_lng: item.location_lng,
      }));

      setViolations(prev => {
        // Merge API data with existing violations, preferring newer data
        const existingIds = new Set(prev.map(v => v.id));
        const newFromApi = formattedViolations.filter(v => !existingIds.has(v.id));
        const updatedExisting = prev.map(existing => {
          const apiVersion = formattedViolations.find(v => v.id === existing.id);
          return apiVersion ? { ...existing, ...apiVersion } : existing;
        });

        return [...newFromApi, ...updatedExisting].sort(
          (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
      });

      setLastRefresh(Date.now());
    } catch (err) {
      console.error('Failed to refresh violations:', err);
      setError('Failed to refresh violations data');
    }
  }, []);

  // Handle WebSocket alerts - add them to violations if not already present
  useEffect(() => {
    if (lastAlert && !processedAlertIds.has(lastAlert.id)) {
      processedAlertIds.add(lastAlert.id);
      addViolation({
        id: lastAlert.id,
        vehicle_number: lastAlert.vehicle_id || 'Unknown',
        violation_type: lastAlert.violation_type,
        location: lastAlert.location,
        severity: lastAlert.severity,
        timestamp: lastAlert.timestamp,
        status: 'Active',
        confidence: lastAlert.confidence,
        image_url: lastAlert.image_url,
        location_lat: lastAlert.location_lat,
        location_lng: lastAlert.location_lng,
      });
    }
  }, [lastAlert, addViolation]);

  // Initial load and periodic refresh
  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoading(true);
      await refreshViolations();
      setIsLoading(false);
    };

    loadInitialData();

    // Refresh every 30 seconds instead of 5 to reduce load
    const interval = setInterval(refreshViolations, 30000);
    return () => clearInterval(interval);
  }, [refreshViolations]);

  // Computed values
  const recentViolations = violations.slice(0, 10);

  const totalViolations = violations.length;

  const alertsToday = violations.filter(violation => {
    const violationTime = new Date(violation.timestamp).getTime();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return violationTime >= today.getTime();
  }).length;

  const repeatOffenders = violations.reduce((acc, violation) => {
    acc[violation.vehicle_number] = (acc[violation.vehicle_number] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const repeatOffendersCount = Object.values(repeatOffenders).filter(count => count > 1).length;

  const value: ViolationsContextType = {
    violations,
    recentViolations,
    websocketAlerts: transformedWebsocketAlerts,
    isLoading,
    error,
    totalViolations,
    alertsToday,
    repeatOffenders: repeatOffendersCount,
    refreshViolations,
    addViolation,
    updateViolation,
    isConnected,
  };

  return (
    <ViolationsContext.Provider value={value}>
      {children}
    </ViolationsContext.Provider>
  );
};