import React, { useEffect, useState, useCallback } from 'react';
import './ViolationMonitor.css';

/**
 * Real-time Violation Monitor Component
 * 
 * Connects to TRINETRA WebSocket API and displays live violations
 * with real-time frame processing and AI detections.
 */
export function ViolationMonitor({ 
  videoSource = '0', 
  skipFrames = 2,
  monitorType = 'violations' // 'violations', 'detections', or 'all'
}) {
  const [violations, setViolations] = useState([]);
  const [frameCount, setFrameCount] = useState(0);
  const [fps, setFps] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    totalViolations: 0,
    helmetCount: 0,
    speedingCount: 0,
    redLightCount: 0,
  });
  const [detectionCount, setDetectionCount] = useState(0);

  const connectWebSocket = useCallback(() => {
    try {
      setError(null);
      
      // Choose endpoint based on monitor type
      let endpoint = '/ws/violations-stream';
      if (monitorType === 'detections') endpoint = '/ws/live-detections';
      
      const url = new URL(
        endpoint,
        `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}`
      );
      
      url.searchParams.append('video_source', videoSource);
      url.searchParams.append('skip_frames', skipFrames);

      const ws = new WebSocket(url.toString());

      ws.onopen = () => {
        console.log('✓ WebSocket connected');
        setIsConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);

          if (message.type === 'violation_alert') {
            // Update current violations
            setViolations(message.violations || []);
            setFrameCount(message.frame_number || 0);
            setDetectionCount(message.detections_count || 0);

            // Update stats
            const newViolations = message.violations || [];
            setStats(prev => ({
              totalViolations: prev.totalViolations + newViolations.length,
              helmetCount: prev.helmetCount + (newViolations.filter(v => v.violation_type === 'helmet').length),
              speedingCount: prev.speedingCount + (newViolations.filter(v => v.violation_type === 'speeding').length),
              redLightCount: prev.redLightCount + (newViolations.filter(v => v.violation_type === 'red_light').length),
            }));

            // Play alert sound if violations detected
            if (newViolations.length > 0) {
              playAlertSound();
            }
          } else if (message.type === 'detection_frame') {
            // Handle all detections
            const data = message.data;
            setFrameCount(data.frame_number || 0);
            setFps(data.fps || 0);
            setDetectionCount(data.detections?.length || 0);
            
            if (data.violations?.length > 0) {
              setViolations(data.violations);
              playAlertSound();
            }
          } else if (message.type === 'error') {
            setError(message.message);
          }
        } catch (e) {
          console.error('Error parsing WebSocket message:', e);
        }
      };

      ws.onerror = (event) => {
        console.error('WebSocket error:', event);
        setError('Connection error - check if camera/video source is available');
        setIsConnected(false);
      };

      ws.onclose = () => {
        console.log('WebSocket closed');
        setIsConnected(false);
      };

      return ws;
    } catch (err) {
      setError(`Failed to connect: ${err.message}`);
      setIsConnected(false);
      return null;
    }
  }, [videoSource, skipFrames, monitorType]);

  useEffect(() => {
    const ws = connectWebSocket();

    return () => {
      if (ws) ws.close();
    };
  }, [connectWebSocket]);

  const playAlertSound = () => {
    // Create a simple beep sound (you can replace with audio file)
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 800;
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
  };

  const getSeverityColor = (severity) => {
    switch (severity?.toLowerCase()) {
      case 'high':
        return '#ff4444';
      case 'medium':
        return '#ffaa00';
      case 'low':
        return '#ffdd00';
      default:
        return '#999';
    }
  };

  const getViolationIcon = (type) => {
    switch (type?.toLowerCase()) {
      case 'helmet':
        return '🪖';
      case 'speeding':
        return '⚡';
      case 'red_light':
        return '🚨';
      case 'wrong_side':
        return '↔️';
      case 'triple_riding':
        return '🚲';
      default:
        return '⚠️';
    }
  };

  return (
    <div className="violation-monitor">
      <style>{`
        .violation-monitor {
          background: linear-gradient(135deg, #1a1a2e 0%, #0f3460 100%);
          color: #e0e0e0;
          padding: 24px;
          border-radius: 12px;
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        }

        .monitor-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
          border-bottom: 2px solid #00d4ff;
          padding-bottom: 16px;
        }

        .monitor-title {
          font-size: 24px;
          font-weight: bold;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .status-badge {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          background: ${isConnected ? '#00ff44' : '#ff4444'};
          color: #000;
          border-radius: 20px;
          font-weight: bold;
          font-size: 14px;
          animation: ${isConnected ? 'pulse 2s infinite' : 'none'};
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }

        .status-indicator {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: currentColor;
          animation: ${isConnected ? 'blink 1s infinite' : 'none'};
        }

        @keyframes blink {
          0%, 49%, 100% { opacity: 1; }
          50%, 99% { opacity: 0.3; }
        }

        .monitor-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 16px;
          margin-bottom: 24px;
        }

        .stat-card {
          background: rgba(0, 212, 255, 0.1);
          border: 1px solid #00d4ff;
          padding: 16px;
          border-radius: 8px;
          text-align: center;
        }

        .stat-label {
          font-size: 12px;
          color: #00d4ff;
          text-transform: uppercase;
          margin-bottom: 8px;
        }

        .stat-value {
          font-size: 28px;
          font-weight: bold;
          color: #00ff44;
        }

        .monitor-content {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
        }

        @media (max-width: 1024px) {
          .monitor-content {
            grid-template-columns: 1fr;
          }
        }

        .frame-info {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid #00d4ff;
          padding: 16px;
          border-radius: 8px;
          margin-bottom: 16px;
        }

        .frame-stat {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid rgba(0, 212, 255, 0.2);
        }

        .frame-stat:last-child {
          border-bottom: none;
        }

        .frame-stat-label {
          color: #888;
        }

        .frame-stat-value {
          font-weight: bold;
          color: #00ff44;
        }

        .violations-list {
          max-height: 400px;
          overflow-y: auto;
        }

        .violation-item {
          background: rgba(255, 68, 68, 0.1);
          border-left: 4px solid;
          padding: 16px;
          margin-bottom: 12px;
          border-radius: 4px;
          animation: slideIn 0.3s ease-out;
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        .violation-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }

        .violation-type {
          font-size: 18px;
          font-weight: bold;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .severity-badge {
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: bold;
          text-transform: uppercase;
          background: rgba(0, 0, 0, 0.3);
        }

        .violation-details {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          font-size: 13px;
          color: #aaa;
        }

        .empty-state {
          text-align: center;
          padding: 40px;
          color: #666;
        }

        .empty-icon {
          font-size: 48px;
          margin-bottom: 16px;
        }

        .error-message {
          background: rgba(255, 68, 68, 0.2);
          border: 1px solid #ff4444;
          color: #ff8888;
          padding: 12px;
          border-radius: 4px;
          margin-bottom: 16px;
        }
      `}</style>

      {/* Header */}
      <div className="monitor-header">
        <div className="monitor-title">
          📹 Real-time Violation Monitor
        </div>
        <div className="status-badge" style={{
          background: isConnected ? '#00ff44' : '#ff4444'
        }}>
          <div className="status-indicator"></div>
          {isConnected ? 'STREAMING' : 'DISCONNECTED'}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="error-message">
          ⚠️ {error}
        </div>
      )}

      {/* Statistics */}
      <div className="monitor-stats">
        <div className="stat-card">
          <div className="stat-label">Total Violations</div>
          <div className="stat-value">{stats.totalViolations}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">No Helmet</div>
          <div className="stat-value">{stats.helmetCount}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Speeding</div>
          <div className="stat-value">{stats.speedingCount}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Red Light</div>
          <div className="stat-value">{stats.redLightCount}</div>
        </div>
      </div>

      {/* Main Content */}
      <div className="monitor-content">
        {/* Left: Frame Info */}
        <div>
          <div className="frame-info">
            <div className="frame-stat">
              <span className="frame-stat-label">Current Frame</span>
              <span className="frame-stat-value">{frameCount}</span>
            </div>
            <div className="frame-stat">
              <span className="frame-stat-label">FPS</span>
              <span className="frame-stat-value">{fps.toFixed(1)}</span>
            </div>
            <div className="frame-stat">
              <span className="frame-stat-label">Objects Detected</span>
              <span className="frame-stat-value">{detectionCount}</span>
            </div>
            <div className="frame-stat">
              <span className="frame-stat-label">Video Source</span>
              <span className="frame-stat-value">{videoSource}</span>
            </div>
            <div className="frame-stat">
              <span className="frame-stat-label">Skip Frames</span>
              <span className="frame-stat-value">{skipFrames}</span>
            </div>
          </div>

          {/* Connection Status Details */}
          <div className="frame-info">
            <div className="frame-stat">
              <span className="frame-stat-label">Connection</span>
              <span className="frame-stat-value" style={{
                color: isConnected ? '#00ff44' : '#ff4444'
              }}>
                {isConnected ? '✓ Active' : '✗ Offline'}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Violations List */}
        <div>
          <h3 style={{ marginBottom: '16px', color: '#00d4ff' }}>⚠️ Detected Violations</h3>
          <div className="violations-list">
            {violations.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">✓</div>
                <div>No violations detected</div>
                <div style={{ fontSize: '12px', marginTop: '8px' }}>
                  {isConnected ? 'Monitoring in progress...' : 'Waiting for connection...'}
                </div>
              </div>
            ) : (
              violations.map((v, idx) => (
                <div
                  key={idx}
                  className="violation-item"
                  style={{
                    borderColor: getSeverityColor(v.severity)
                  }}
                >
                  <div className="violation-header">
                    <div className="violation-type">
                      {getViolationIcon(v.violation_type)}
                      {v.violation_type.replace('_', ' ').toUpperCase()}
                    </div>
                    <div className="severity-badge" style={{
                      background: getSeverityColor(v.severity),
                      color: '#000'
                    }}>
                      {v.severity}
                    </div>
                  </div>
                  <div className="violation-details">
                    <div>
                      <strong>Vehicle:</strong> {v.vehicle_type}
                    </div>
                    <div>
                      <strong>Confidence:</strong> {(v.confidence * 100).toFixed(1)}%
                    </div>
                    <div>
                      <strong>Location:</strong> {v.location}
                    </div>
                    <div>
                      <strong>Status:</strong> {v.status}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ViolationMonitor;
