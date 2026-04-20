import { useState, useMemo, useEffect, useRef } from 'react';
import { uploadVideo, detectVideo, detectFrame } from '../services/api';

type DetectedViolation = {
  id: string;
  vehicle_number: string;
  violation_type: string;
  severity: 'low' | 'medium' | 'high';
  confidence: number;
  location: string;
  timestamp: string;
  status: string;
};

type FrameDetection = {
  class_id: number;
  label: string;
  confidence: number;
  bbox: number[];
};

const sampleViolations = [
  {
    id: 1,
    image: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=800&q=80',
    vehicle: 'TR-0123',
    violation: 'Speeding',
    confidence: 0.94,
    timestamp: '2026-04-07 14:23:45',
    location: 'Highway 4, Lane 2',
    reasoning: {
      speed: '78 km/h (limit: 60 km/h)',
      context: 'Vehicle detected exceeding speed limit by 30% in monitored zone',
      evidence: 'Optical flow analysis confirms sustained high velocity',
      risk: 'High risk to pedestrian safety and traffic flow',
    },
    boundingBox: { x: '25%', y: '35%', width: '20%', height: '15%' },
  },
  {
    id: 2,
    image: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=800&q=80',
    vehicle: 'VG-4911',
    violation: 'Illegal Stop',
    confidence: 0.87,
    timestamp: '2026-04-07 16:45:12',
    location: 'Main Street Intersection',
    reasoning: {
      duration: '4.2 seconds stationary',
      context: 'Vehicle stopped in prohibited zone during peak traffic',
      evidence: 'Motion detection algorithms confirm unauthorized halt',
      risk: 'Impeding emergency vehicle access and causing traffic congestion',
    },
    boundingBox: { x: '40%', y: '50%', width: '18%', height: '12%' },
  },
  {
    id: 3,
    image: 'https://images.unsplash.com/photo-1472396961693-142e6e269027?auto=format&fit=crop&w=800&q=80',
    vehicle: 'ML-8842',
    violation: 'Red Light',
    confidence: 0.91,
    timestamp: '2026-04-07 19:12:33',
    location: 'Bridge Ave & 5th St',
    reasoning: {
      timing: '0.8 seconds after signal change',
      context: 'Vehicle entered intersection after traffic light turned red',
      evidence: 'Signal synchronization and vehicle trajectory analysis',
      risk: 'Increased collision probability with cross-traffic',
    },
    boundingBox: { x: '60%', y: '45%', width: '22%', height: '16%' },
  },
];

export default function ExplainableAIPage() {
  const [selectedViolation, setSelectedViolation] = useState(sampleViolations[0]);
  const [showReasoning, setShowReasoning] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadedFilename, setUploadedFilename] = useState<string>('');
  const [detectionStatus, setDetectionStatus] = useState<'idle' | 'uploading' | 'analyzing' | 'done' | 'error'>('idle');
  const [detectionResults, setDetectionResults] = useState<DetectedViolation[]>([]);
  const [detectionMessage, setDetectionMessage] = useState<string | null>(null);

  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraStatus, setCameraStatus] = useState<'idle' | 'starting' | 'active' | 'stopped' | 'error'>('idle');
  const [webcamMessage, setWebcamMessage] = useState<string | null>(null);
  const [frameDetections, setFrameDetections] = useState<FrameDetection[]>([]);
  const [frameViolations, setFrameViolations] = useState<DetectedViolation[]>([]);
  const [isFrameSending, setIsFrameSending] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const captureIntervalRef = useRef<number | null>(null);
  const isFrameSendingRef = useRef(false);

  const confidenceColor = useMemo(() => {
    if (selectedViolation.confidence >= 0.9) return 'text-emerald-400';
    if (selectedViolation.confidence >= 0.8) return 'text-amber-400';
    return 'text-rose-400';
  }, [selectedViolation.confidence]);

  const confidenceBg = useMemo(() => {
    if (selectedViolation.confidence >= 0.9) return 'bg-emerald-500/10 border-emerald-500/20';
    if (selectedViolation.confidence >= 0.8) return 'bg-amber-500/10 border-amber-500/20';
    return 'bg-rose-500/10 border-rose-500/20';
  }, [selectedViolation.confidence]);

  const isProcessing = detectionStatus === 'uploading' || detectionStatus === 'analyzing';

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setSelectedFile(file);
    setDetectionResults([]);
    setUploadedFilename('');
    setDetectionStatus('idle');
    setDetectionMessage(null);
  };

  const handleStartDetection = async () => {
    if (!selectedFile) {
      setDetectionMessage('Choose a valid video file before starting detection.');
      setDetectionStatus('error');
      return;
    }

    setDetectionStatus('uploading');
    setDetectionMessage('Uploading video to TRINETRA...');

    try {
      const uploadResponse = await uploadVideo(selectedFile);
      const filename = uploadResponse.filename;
      setUploadedFilename(filename);
      setDetectionStatus('analyzing');
      setDetectionMessage('Analyzing video with AI detection...');

      const detectResponse = await detectVideo(filename);
      const results = Array.isArray(detectResponse?.violations) ? detectResponse.violations : [];
      setDetectionResults(results);
      setDetectionStatus('done');
      setDetectionMessage(`Detected ${results.length} violation${results.length === 1 ? '' : 's'}.`);
    } catch (error: any) {
      const message = error?.response?.data?.detail || error?.message || 'Video detection failed. Please try again.';
      setDetectionMessage(message);
      setDetectionStatus('error');
    }
  };

  const stopWebcam = () => {
    if (captureIntervalRef.current) {
      window.clearInterval(captureIntervalRef.current);
      captureIntervalRef.current = null;
    }

    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }

    setIsCameraActive(false);
    setCameraStatus('stopped');
    setWebcamMessage('Webcam stopped.');
  };

  const sendWebcamFrame = async (blob: Blob) => {
    setIsFrameSending(true);
    isFrameSendingRef.current = true;

    try {
      const response = await detectFrame(blob);
      const detections = Array.isArray(response?.detections) ? response.detections : [];
      const violations = Array.isArray(response?.violations) ? response.violations : [];
      setFrameDetections(detections);
      setFrameViolations(violations);
      setWebcamMessage(`Frame processed at ${new Date().toLocaleTimeString()}`);
    } catch (error: any) {
      setWebcamMessage(error?.response?.data?.detail || 'Webcam frame detection failed.');
    } finally {
      setIsFrameSending(false);
      isFrameSendingRef.current = false;
    }
  };

  const captureFrame = () => {
    if (!videoRef.current || !canvasRef.current || isFrameSendingRef.current) {
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const width = video.videoWidth || 640;
    const height = video.videoHeight || 480;
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, width, height);
    canvas.toBlob((blob) => {
      if (blob) {
        sendWebcamFrame(blob);
      }
    }, 'image/jpeg', 0.7);
  };

  const startWebcam = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraStatus('error');
      setWebcamMessage('Webcam is not supported in this browser.');
      return;
    }

    setCameraStatus('starting');
    setWebcamMessage('Initializing webcam...');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 }, audio: false });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      if (!canvasRef.current) {
        canvasRef.current = document.createElement('canvas');
      }

      setIsCameraActive(true);
      setCameraStatus('active');
      setWebcamMessage('Webcam active. Sending frames every second.');

      captureIntervalRef.current = window.setInterval(() => {
        captureFrame();
      }, 1000);
    } catch (error: any) {
      console.error('Webcam error', error);
      setCameraStatus('error');
      setWebcamMessage('Unable to access the webcam.');
    }
  };

  useEffect(() => {
    return () => {
      stopWebcam();
    };
  }, []);

  return (
    <div className="space-y-6">
      <div className="rounded-[2rem] border border-slate-800/80 bg-slate-950/85 p-8 shadow-glow">
        <div className="space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.35em] text-sky-300/80">Explainable AI</p>
              <h1 className="text-3xl font-semibold text-white">Model Transparency</h1>
              <p className="max-w-2xl text-slate-400">
                Understand how our AI makes decisions with detailed reasoning and confidence metrics.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-400">AI Reasoning</span>
              <button
                onClick={() => setShowReasoning(!showReasoning)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  showReasoning ? 'bg-sky-500' : 'bg-slate-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    showReasoning ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-[2rem] border border-slate-800/80 bg-slate-950/85 p-8 shadow-glow">
        <div className="space-y-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.35em] text-sky-300/80">AI Detection</p>
              <h2 className="text-2xl font-semibold text-white">Upload Video for Detection</h2>
              <p className="max-w-2xl text-slate-400">
                Upload a traffic video and let the backend process it for detected violations.
              </p>
            </div>
            <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
              <span className={`rounded-full px-4 py-2 text-sm font-semibold ${
                detectionStatus === 'uploading' ? 'bg-sky-500/15 text-sky-300' :
                detectionStatus === 'analyzing' ? 'bg-amber-500/15 text-amber-300' :
                detectionStatus === 'done' ? 'bg-emerald-500/15 text-emerald-300' :
                detectionStatus === 'error' ? 'bg-rose-500/15 text-rose-300' :
                'bg-slate-800/80 text-slate-300'
              }`}> 
                {detectionStatus === 'idle' ? 'Ready to process' : detectionStatus === 'uploading' ? 'Uploading' : detectionStatus === 'analyzing' ? 'Analyzing' : detectionStatus === 'done' ? 'Complete' : 'Error'}
              </span>
              <span className="text-sm text-slate-400">{detectionMessage ?? 'Select a video and start detection.'}</span>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.8fr_1fr]">
            <div className="rounded-[1.75rem] border border-slate-800/80 bg-slate-950/90 p-6">
              <label className="block text-sm font-medium text-slate-300">Video file</label>
              <input
                type="file"
                accept="video/*"
                onChange={handleFileChange}
                disabled={isProcessing}
                className="mt-3 w-full rounded-2xl border border-slate-700 bg-slate-950/90 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-sky-400"
              />
              <button
                onClick={handleStartDetection}
                disabled={isProcessing}
                className="mt-4 inline-flex items-center justify-center rounded-full bg-sky-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:bg-slate-700"
              >
                {isProcessing ? 'Processing…' : 'Start Detection'}
              </button>
            </div>

            <div className="rounded-[1.75rem] border border-slate-800/80 bg-slate-950/90 p-6">
              <div className="space-y-4">
                <div>
                  <p className="text-sm uppercase tracking-[0.35em] text-slate-400">Video Status</p>
                  <p className="mt-2 text-xl font-semibold text-white">{uploadedFilename || 'No file selected'}</p>
                </div>
                <div className="rounded-3xl bg-slate-900/70 p-4 text-slate-300">
                  <p className="text-sm text-slate-400">Detected violations</p>
                  <p className="mt-2 text-3xl font-semibold text-white">{detectionResults.length}</p>
                </div>
                {uploadedFilename ? (
                  <div className="rounded-3xl bg-slate-900/70 p-4 text-slate-300">
                    <p className="text-sm text-slate-400">Uploaded file</p>
                    <p className="mt-2 truncate text-white">{uploadedFilename}</p>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-slate-800/80 bg-slate-950/90 p-6">
            <div className="space-y-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-white">Webcam Detection</h3>
                  <p className="text-sm text-slate-400">Capture live frames and send them every second for AI detection.</p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={startWebcam}
                    disabled={isCameraActive}
                    className="rounded-full bg-sky-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:bg-slate-700"
                  >
                    Start Webcam
                  </button>
                  <button
                    onClick={stopWebcam}
                    disabled={!isCameraActive}
                    className="rounded-full bg-rose-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-400 disabled:cursor-not-allowed disabled:bg-slate-700"
                  >
                    Stop Webcam
                  </button>
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
                <div className="rounded-[1.75rem] border border-slate-800/80 bg-slate-950/90 p-4">
                  <div className="relative overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/80">
                    <video
                      ref={videoRef}
                      className="h-full w-full bg-black object-cover"
                      muted
                      playsInline
                    />
                    <div className="pointer-events-none absolute inset-0">
                      {frameDetections.map((detection, index) => {
                        const videoWidth = videoRef.current?.videoWidth || 640;
                        const videoHeight = videoRef.current?.videoHeight || 480;
                        const [x1, y1, x2, y2] = detection.bbox;
                        const left = `${(x1 / videoWidth) * 100}%`;
                        const top = `${(y1 / videoHeight) * 100}%`;
                        const width = `${((x2 - x1) / videoWidth) * 100}%`;
                        const height = `${((y2 - y1) / videoHeight) * 100}%`;

                        return (
                          <div
                            key={`${detection.label}-${index}`}
                            className="absolute rounded-md border border-sky-400/80 bg-sky-500/10"
                            style={{ left, top, width, height }}
                          >
                            <span className="block truncate bg-slate-950/90 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-100">
                              {detection.label} {(detection.confidence * 100).toFixed(0)}%
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="rounded-[1.75rem] border border-slate-800/80 bg-slate-950/90 p-4">
                    <p className="text-sm text-slate-400">Webcam status</p>
                    <p className="mt-2 text-white font-semibold">{cameraStatus === 'active' ? 'Active' : cameraStatus === 'starting' ? 'Starting' : cameraStatus === 'error' ? 'Error' : cameraStatus === 'stopped' ? 'Stopped' : 'Idle'}</p>
                    <p className="text-sm text-slate-500 mt-2">{webcamMessage ?? 'Press start to open webcam.'}</p>
                  </div>
                  <div className="rounded-[1.75rem] border border-slate-800/80 bg-slate-950/90 p-4">
                    <p className="text-sm text-slate-400">Frame detections</p>
                    <p className="mt-2 text-3xl font-semibold text-white">{frameDetections.length}</p>
                  </div>
                  <div className="rounded-[1.75rem] border border-slate-800/80 bg-slate-950/90 p-4">
                    <p className="text-sm text-slate-400">Violations this frame</p>
                    <div className="mt-3 space-y-2">
                      {frameViolations.length === 0 ? (
                        <p className="text-sm text-slate-500">No violations detected yet.</p>
                      ) : (
                        frameViolations.slice(0, 3).map((violation) => (
                          <div key={violation.id} className="rounded-2xl bg-slate-900/80 p-3 text-sm text-slate-200">
                            <p className="font-semibold text-white">{violation.violation_type}</p>
                            <p className="text-slate-400">{violation.location} • {(violation.confidence * 100).toFixed(1)}%</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-slate-800/80 bg-slate-950/90 p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Detection Results</h3>
              <span className="text-sm text-slate-400">{detectionStatus === 'done' ? 'Latest run' : 'Awaiting upload'}</span>
            </div>

            <div className="mt-4 space-y-3">
              {detectionStatus === 'idle' ? (
                <div className="rounded-3xl border border-slate-800/70 bg-slate-900/75 p-6 text-slate-400">
                  Upload a sample video to review AI detections here.
                </div>
              ) : detectionStatus === 'error' ? (
                <div className="rounded-3xl border border-rose-500/70 bg-rose-500/10 p-6 text-rose-200">
                  <p className="font-medium">Detection error</p>
                  <p className="mt-2 text-sm text-slate-300">{detectionMessage}</p>
                </div>
              ) : detectionStatus === 'uploading' || detectionStatus === 'analyzing' ? (
                <div className="rounded-3xl border border-slate-800/70 bg-slate-900/75 p-6 text-slate-400">
                  <p className="font-medium">Processing</p>
                  <p className="mt-2 text-sm text-slate-300">{detectionMessage}</p>
                </div>
              ) : detectionResults.length === 0 ? (
                <div className="rounded-3xl border border-slate-800/70 bg-slate-900/75 p-6 text-slate-400">
                  No violations were detected in this video.
                </div>
              ) : (
                <div className="space-y-3">
                  {detectionResults.map((violation) => (
                    <div key={violation.id} className="rounded-3xl border border-slate-800/70 bg-slate-900/80 p-4 transition hover:border-sky-500/40">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="font-semibold text-white">{violation.violation_type}</p>
                          <p className="text-sm text-slate-400 mt-1">{violation.vehicle_number} • {violation.location}</p>
                        </div>
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          violation.severity === 'high' ? 'bg-rose-500/15 text-rose-300' :
                          violation.severity === 'medium' ? 'bg-amber-500/15 text-amber-300' :
                          'bg-sky-500/15 text-sky-300'
                        }`}>
                          {violation.severity.toUpperCase()}
                        </span>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-slate-400">
                        <span>Confidence: {(violation.confidence * 100).toFixed(1)}%</span>
                        <span>Timestamp: {new Date(violation.timestamp).toLocaleString()}</span>
                        <span>Status: {violation.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-[2rem] border border-slate-800/80 bg-slate-950/85 p-6 shadow-glow">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-white">AI Analysis</h2>
                <div className={`rounded-full px-4 py-2 text-sm font-semibold ${confidenceBg} ${confidenceColor} border`}>
                  {(selectedViolation.confidence * 100).toFixed(1)}% Confidence
                </div>
              </div>

              <div className="relative aspect-video overflow-hidden rounded-2xl bg-slate-900/90 shadow-inner">
                <img
                  src={selectedViolation.image}
                  alt="Violation analysis"
                  className="h-full w-full object-cover"
                />

                <div
                  className="absolute border-2 border-rose-500/80 bg-rose-500/10"
                  style={{
                    left: selectedViolation.boundingBox.x,
                    top: selectedViolation.boundingBox.y,
                    width: selectedViolation.boundingBox.width,
                    height: selectedViolation.boundingBox.height,
                  }}
                >
                  <div className="absolute -top-8 left-0 rounded-lg bg-rose-500 px-2 py-1 text-xs font-semibold text-white">
                    {selectedViolation.violation}
                  </div>
                  <div className="absolute -bottom-8 left-0 rounded-lg bg-slate-900/90 px-2 py-1 text-xs text-slate-300 border border-slate-700">
                    {selectedViolation.vehicle}
                  </div>
                </div>

                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent" />
                <div className="absolute bottom-4 left-4 right-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="rounded-full bg-slate-900/80 px-3 py-1 text-slate-300">
                      {selectedViolation.location}
                    </span>
                    <span className="rounded-full bg-slate-900/80 px-3 py-1 text-slate-300">
                      {selectedViolation.timestamp}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {showReasoning && (
            <div className="rounded-[2rem] border border-slate-800/80 bg-slate-950/85 p-6 shadow-glow">
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-white">AI Decision Reasoning</h3>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-4">
                    <div className="rounded-2xl bg-slate-900/60 p-4 border border-slate-800/50">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="h-8 w-8 rounded-xl bg-blue-500/15 flex items-center justify-center">
                          <span className="text-blue-400">📊</span>
                        </div>
                        <h4 className="font-semibold text-white">Detection Metrics</h4>
                      </div>
                      <div className="space-y-2 text-sm">
                        <p className="text-slate-300">
                          <span className="font-medium text-slate-400">Speed:</span> {selectedViolation.reasoning.speed}
                        </p>
                        <p className="text-slate-300">
                          <span className="font-medium text-slate-400">Duration:</span> {selectedViolation.reasoning.duration}
                        </p>
                        <p className="text-slate-300">
                          <span className="font-medium text-slate-400">Timing:</span> {selectedViolation.reasoning.timing}
                        </p>
                      </div>
                    </div>

                    <div className="rounded-2xl bg-slate-900/60 p-4 border border-slate-800/50">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="h-8 w-8 rounded-xl bg-purple-500/15 flex items-center justify-center">
                          <span className="text-purple-400">🧠</span>
                        </div>
                        <h4 className="font-semibold text-white">AI Analysis</h4>
                      </div>
                      <p className="text-sm text-slate-300">{selectedViolation.reasoning.context}</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="rounded-2xl bg-slate-900/60 p-4 border border-slate-800/50">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="h-8 w-8 rounded-xl bg-emerald-500/15 flex items-center justify-center">
                          <span className="text-emerald-400">🔍</span>
                        </div>
                        <h4 className="font-semibold text-white">Evidence Chain</h4>
                      </div>
                      <p className="text-sm text-slate-300">{selectedViolation.reasoning.evidence}</p>
                    </div>

                    <div className="rounded-2xl bg-slate-900/60 p-4 border border-slate-800/50">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="h-8 w-8 rounded-xl bg-rose-500/15 flex items-center justify-center">
                          <span className="text-rose-400">⚠️</span>
                        </div>
                        <h4 className="font-semibold text-white">Risk Assessment</h4>
                      </div>
                      <p className="text-sm text-slate-300">{selectedViolation.reasoning.risk}</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl bg-gradient-to-r from-slate-900/60 to-slate-800/60 p-6 border border-slate-700/50">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-10 w-10 rounded-xl bg-sky-500/15 flex items-center justify-center">
                      <span className="text-sky-400">🤖</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-white">Model Confidence</h4>
                      <p className="text-sm text-slate-400">Neural network decision certainty</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-300">Confidence Level</span>
                      <span className={`font-semibold ${confidenceColor}`}>
                        {(selectedViolation.confidence * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-1000 ${
                          selectedViolation.confidence >= 0.9 ? 'bg-emerald-500' :
                          selectedViolation.confidence >= 0.8 ? 'bg-amber-500' : 'bg-rose-500'
                        }`}
                        style={{ width: `${selectedViolation.confidence * 100}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-slate-400">
                      <span>Low</span>
                      <span>Medium</span>
                      <span>High</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="rounded-[2rem] border border-slate-800/80 bg-slate-950/85 p-6 shadow-glow">
            <h3 className="text-lg font-semibold text-white mb-4">Recent Violations</h3>
            <div className="space-y-3">
              {sampleViolations.map((violation) => (
                <button
                  key={violation.id}
                  onClick={() => setSelectedViolation(violation)}
                  className={`w-full rounded-2xl border p-4 text-left transition ${
                    selectedViolation.id === violation.id
                      ? 'border-sky-500/50 bg-sky-500/5'
                      : 'border-slate-800/50 bg-slate-900/50 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-white">{violation.vehicle}</span>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      violation.confidence >= 0.9 ? 'bg-emerald-500/15 text-emerald-400' :
                      violation.confidence >= 0.8 ? 'bg-amber-500/15 text-amber-400' :
                      'bg-rose-500/15 text-rose-400'
                    }`}>
                      {(violation.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                  <p className="text-sm text-slate-400 mb-1">{violation.violation}</p>
                  <p className="text-xs text-slate-500">{violation.timestamp}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-slate-800/80 bg-slate-950/85 p-6 shadow-glow">
            <h3 className="text-lg font-semibold text-white mb-4">Model Performance</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">Accuracy</span>
                <span className="text-sm font-semibold text-emerald-400">94.2%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">Precision</span>
                <span className="text-sm font-semibold text-blue-400">91.8%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">Recall</span>
                <span className="text-sm font-semibold text-purple-400">89.5%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">F1 Score</span>
                <span className="text-sm font-semibold text-amber-400">90.6%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
