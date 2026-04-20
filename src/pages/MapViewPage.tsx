import { useEffect, useMemo, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Tooltip, useMap, FeatureGroup } from 'react-leaflet';
import { useViolations } from '../context/ViolationsContext';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.heat';
import 'leaflet-draw/dist/leaflet.draw.css';
import { exportViolationsAsCSV, exportViolationsAsPDF } from '../utils/mapExport';

// Fix for default markers in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom violation marker icons with enhanced styling
const createViolationIcon = (severity: string) => {
  const colors = {
    High: '#ef4444',
    Medium: '#f59e0b',
    Low: '#06b6d4',
  };

  return L.divIcon({
    html: `<div style="background-color: ${colors[severity as keyof typeof colors]}; width: 28px; height: 28px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; font-weight: bold; color: white; font-size: 12px;">📍</div>`,
    className: 'custom-violation-marker',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
};

// Heatmap component
function HeatmapLayer({ points }: { points: [number, number, number][] }) {
  const map = useMap();

  useEffect(() => {
    if (!points.length) return;

    const heat = (L as any).heatLayer(points, {
      radius: 25,
      blur: 15,
      maxZoom: 10,
      max: 1.0,
      gradient: {
        0.2: 'blue',
        0.4: 'lime',
        0.6: 'yellow',
        0.8: 'orange',
        1.0: 'red',
      },
    }).addTo(map);

    return () => {
      map.removeLayer(heat);
    };
  }, [map, points]);

  return null;
}

// Map bounds component to fit all markers
function FitBounds({ alerts }: { alerts: any[] }) {
  const map = useMap();

  useEffect(() => {
    if (alerts.length === 0) return;

    const bounds = L.latLngBounds(
      alerts.map((alert) => [alert.location_lat || 0, alert.location_lng || 0])
    );

    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [20, 20] });
    }
  }, [map, alerts]);

  return null;
}

// Drawing tools component
function DrawingTools() {
  const map = useMap();
  const featureGroupRef = useRef<any>(null);

  useEffect(() => {
    if (!map || !featureGroupRef.current) return;

    try {
      const Draw = require('leaflet-draw').Draw;
      const EditControl = require('leaflet-draw').EditControl;

      const editableLayers = new L.FeatureGroup();
      map.addLayer(editableLayers);

      const drawControl = new Draw.Control({
        position: 'topleft',
        draw: {
          polygon: true,
          polyline: false,
          rectangle: true,
          circle: true,
          marker: false,
          circlemarker: false,
        },
        edit: {
          featureGroup: editableLayers,
          remove: true,
        },
      });

      map.addControl(drawControl);

      map.on('draw:created', function (e: any) {
        const layer = e.layer;
        editableLayers.addLayer(layer);
      });

      return () => {
        map.removeControl(drawControl);
      };
    } catch (err) {
      console.log('Leaflet Draw not fully initialized');
    }
  }, [map]);

  return <FeatureGroup ref={featureGroupRef} />;
}

export default function MapViewPage() {
  const { violations, websocketAlerts, isConnected } = useViolations();
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showDrawing, setShowDrawing] = useState(false);
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const mapContainerRef = useRef<HTMLDivElement>(null);

  // Use all violations with coordinates, prioritizing recent WebSocket alerts
  const violationsWithCoords = useMemo(() => {
    return violations
      .filter(v => v.location_lat && v.location_lng)
      .map((violation) => ({
        ...violation,
        location_lat: violation.location_lat || 12.9716,
        location_lng: violation.location_lng || 77.5946,
      }));
  }, [violations]);

  // Filter violations based on selected severity
  const filteredAlerts = useMemo(() => {
    if (selectedSeverity === 'all') return violationsWithCoords;
    return violationsWithCoords.filter((alert) => alert.severity === selectedSeverity);
  }, [violationsWithCoords, selectedSeverity]);

  // Prepare heatmap data
  const heatmapPoints = useMemo(() => {
    return filteredAlerts.map((alert) => [
      alert.location_lat,
      alert.location_lng,
      alert.severity === 'High' ? 1.0 : alert.severity === 'Medium' ? 0.6 : 0.3,
    ] as [number, number, number]);
  }, [filteredAlerts]);

  const severityStats = useMemo(() => {
    const stats = { High: 0, Medium: 0, Low: 0 };
    filteredAlerts.forEach((alert) => {
      stats[alert.severity as keyof typeof stats]++;
    });
    return stats;
  }, [filteredAlerts]);

  const handleExportCSV = () => {
    const transformedData = filteredAlerts.map(alert => ({
      id: alert.id,
      vehicle_id: alert.vehicle_number,
      violation_type: alert.violation_type,
      severity: alert.severity,
      location: alert.location,
      timestamp: alert.timestamp,
      confidence: alert.confidence || 0,
      location_lat: alert.location_lat,
      location_lng: alert.location_lng,
    } as any));
    exportViolationsAsCSV(transformedData, `violations-${new Date().toISOString().split('T')[0]}.csv`);
  };

  const handleExportPDF = () => {
    const transformedData = filteredAlerts.map(alert => ({
      id: alert.id,
      vehicle_id: alert.vehicle_number,
      violation_type: alert.violation_type,
      severity: alert.severity,
      location: alert.location,
      timestamp: alert.timestamp,
      confidence: alert.confidence || 0,
      location_lat: alert.location_lat,
      location_lng: alert.location_lng,
    } as any));
    exportViolationsAsPDF(transformedData, mapContainerRef.current, `violations-report-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-[2rem] border border-slate-800/80 bg-slate-950/85 p-8 shadow-glow">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.35em] text-sky-300/80">Map Integration</p>
            <h1 className="mt-2 text-3xl font-semibold text-white">Violation Hotspots</h1>
            <p className="mt-3 max-w-2xl text-slate-400">
              Interactive map with real-time violations, heatmap overlay, geofence drawing, and detailed analytics.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></span>
            <span className="text-sm text-slate-400">
              {isConnected ? 'Live' : 'Offline'}
            </span>
          </div>
        </div>

        {/* Control Buttons */}
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            onClick={() => setShowHeatmap(!showHeatmap)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              showHeatmap
                ? 'bg-rose-500 text-slate-950 hover:bg-rose-400'
                : 'bg-slate-800 text-slate-100 hover:bg-slate-700'
            }`}
          >
            {showHeatmap ? '🔥 Hide Heatmap' : '🔥 Show Heatmap'}
          </button>

          <button
            onClick={() => setShowDrawing(!showDrawing)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              showDrawing
                ? 'bg-sky-500 text-slate-950 hover:bg-sky-400'
                : 'bg-slate-800 text-slate-100 hover:bg-slate-700'
            }`}
          >
            {showDrawing ? '📐 Drawing On' : '📐 Draw Geofence'}
          </button>

          <button
            onClick={handleExportCSV}
            className="rounded-full bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:bg-slate-700"
          >
            📥 Export CSV
          </button>

          <button
            onClick={handleExportPDF}
            className="rounded-full bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:bg-slate-700"
          >
            📄 Export PDF
          </button>
        </div>

        {/* Filter Controls */}
        <div className="mt-6 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-400">Filter by severity:</span>
            <select
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-sky-500 focus:outline-none"
            >
              <option value="all">All ({filteredAlerts.length})</option>
              <option value="High">High ({severityStats.High})</option>
              <option value="Medium">Medium ({severityStats.Medium})</option>
              <option value="Low">Low ({severityStats.Low})</option>
            </select>
          </div>

          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-rose-500"></div>
              <span className="text-slate-400">High</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-amber-500"></div>
              <span className="text-slate-400">Medium</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-sky-500"></div>
              <span className="text-slate-400">Low</span>
            </div>
          </div>
        </div>
      </div>

      {/* Map Container */}
      <div className="rounded-[2rem] border border-slate-800/80 bg-slate-950/85 p-6 shadow-glow">
        <div ref={mapContainerRef} className="h-[600px] overflow-hidden rounded-2xl">
          <MapContainer
            center={[12.9716, 77.5946]}
            zoom={12}
            style={{ height: '100%', width: '100%' }}
            className="rounded-2xl"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {showHeatmap && <HeatmapLayer points={heatmapPoints} />}

            {showDrawing && <DrawingTools />}

            {filteredAlerts.map((alert) => (
              <Marker
                key={alert.id}
                position={[alert.location_lat, alert.location_lng]}
                icon={createViolationIcon(alert.severity)}
              >
                <Tooltip direction="top" offset={[0, -10]} opacity={0.9}>
                  <div className="text-xs font-semibold">
                    <p>{alert.vehicle_number}</p>
                    <p>{alert.violation_type}</p>
                    <p className="text-slate-600">{alert.confidence ? (alert.confidence * 100).toFixed(0) : 'N/A'}%</p>
                  </div>
                </Tooltip>

                <Popup className="custom-popup">
                  <div className="min-w-[250px] p-3">
                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="text-lg font-bold text-slate-900">
                        {alert.violation_type}
                      </h3>
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        alert.severity === 'High'
                          ? 'bg-rose-100 text-rose-800'
                          : alert.severity === 'Medium'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-sky-100 text-sky-800'
                      }`}>
                        {alert.severity}
                      </span>
                    </div>

                    <div className="space-y-2 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
                      <div className="flex justify-between">
                        <strong>Vehicle:</strong>
                        <span className="font-mono">{alert.vehicle_number}</span>
                      </div>
                      <div className="flex justify-between">
                        <strong>Location:</strong>
                        <span>{alert.location}</span>
                      </div>
                      <div className="flex justify-between">
                        <strong>Confidence:</strong>
                        <span>{alert.confidence ? (alert.confidence * 100).toFixed(1) : 'N/A'}%</span>
                      </div>
                      <div className="flex justify-between">
                        <strong>Detected:</strong>
                        <span>{new Date(alert.timestamp).toLocaleTimeString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <strong>Coordinates:</strong>
                        <span className="text-xs">{alert.location_lat.toFixed(4)}, {alert.location_lng.toFixed(4)}</span>
                      </div>
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}

            <FitBounds alerts={filteredAlerts} />
          </MapContainer>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-800/80 bg-slate-950/85 p-6 shadow-glow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.35em] text-slate-400">Total Violations</p>
              <p className="mt-2 text-2xl font-semibold text-white">{filteredAlerts.length}</p>
            </div>
            <div className="rounded-full bg-slate-900/80 p-3">
              <span className="text-2xl">🚨</span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800/80 bg-slate-950/85 p-6 shadow-glow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.35em] text-slate-400">High Priority</p>
              <p className="mt-2 text-2xl font-semibold text-rose-400">{severityStats.High}</p>
            </div>
            <div className="rounded-full bg-rose-500/10 p-3">
              <span className="text-2xl">🔴</span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800/80 bg-slate-950/85 p-6 shadow-glow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.35em] text-slate-400">Medium Priority</p>
              <p className="mt-2 text-2xl font-semibold text-amber-400">{severityStats.Medium}</p>
            </div>
            <div className="rounded-full bg-amber-500/10 p-3">
              <span className="text-2xl">🟡</span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800/80 bg-slate-950/85 p-6 shadow-glow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.35em] text-slate-400">Low Priority</p>
              <p className="mt-2 text-2xl font-semibold text-sky-400">{severityStats.Low}</p>
            </div>
            <div className="rounded-full bg-sky-500/10 p-3">
              <span className="text-2xl">🔵</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}