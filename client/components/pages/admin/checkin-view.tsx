"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { checkinService } from "@/services/checkin-service";
import { CheckInResponseData, ApiError } from "@/lib/types";
import {
  QrCode,
  Loader2,
  AlertCircle,
  CheckCircle2,
  LogIn,
  LogOut,
  ScanLine,
  Camera,
  Keyboard,
  UploadCloud,
  RefreshCw,
  Volume2,
  VolumeX,
  FlipHorizontal,
  History,
  X,
} from "lucide-react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";

type ScanMode = "camera" | "manual" | "upload";

interface ScanHistoryItem {
  id: string;
  token: string;
  seatNumber: string;
  zoneName: string;
  action: "check_in" | "check_out";
  time: string;
}

export function CheckInView() {
  const [mode, setMode] = useState<ScanMode>("camera");
  const [qrToken, setQrToken] = useState("");
  const [result, setResult] = useState<CheckInResponseData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>("");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [history, setHistory] = useState<ScanHistoryItem[]>([]);

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const isScanningLockedRef = useRef(false);

  // Play gentle sound feedback
  const playBeep = useCallback(
    (isSuccess: boolean) => {
      if (!soundEnabled) return;
      try {
        const audioCtx = new (window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        osc.connect(gain);
        gain.connect(audioCtx.destination);

        if (isSuccess) {
          osc.type = "sine";
          osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
          osc.frequency.exponentialRampToValueAtTime(1320, audioCtx.currentTime + 0.15); // E6
          gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
          osc.start();
          osc.stop(audioCtx.currentTime + 0.2);
        } else {
          osc.type = "square";
          osc.frequency.setValueAtTime(300, audioCtx.currentTime);
          osc.frequency.setValueAtTime(200, audioCtx.currentTime + 0.1);
          gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.25);
          osc.start();
          osc.stop(audioCtx.currentTime + 0.25);
        }
      } catch {
        // AudioContext may be restricted by browser policy if no user interaction yet
      }
    },
    [soundEnabled]
  );

  // Core verification dispatcher
  const verifyToken = useCallback(
    async (tokenToVerify: string) => {
      const cleanToken = tokenToVerify.trim();
      if (!cleanToken) return;

      setIsProcessing(true);
      setError(null);

      try {
        const res = await checkinService.scan({ qrToken: cleanToken });
        const resData = res.data;
        if (resData) {
          setResult(resData);
          playBeep(true);

          // Add to recent history log
          const actionType = resData.action as "check_in" | "check_out";
          const historyItem: ScanHistoryItem = {
            id: Math.random().toString(36).substring(2, 9),
            token: cleanToken,
            seatNumber: resData.booking.seat?.seatNumber ?? "—",
            zoneName: resData.booking.seat?.zone?.name ?? "—",
            action: actionType,
            time: new Date().toLocaleTimeString(),
          };
          setHistory((prev) => [historyItem, ...prev.slice(0, 7)]);
        }
        setQrToken("");
      } catch (err: unknown) {
        const apiErr = err as ApiError;
        const msg = apiErr?.message ?? "Failed to process QR token.";
        setError(msg);
        playBeep(false);
      } finally {
        setIsProcessing(false);
        // Unlock camera scanner after a short cooldown
        setTimeout(() => {
          isScanningLockedRef.current = false;
        }, 2200);
      }
    },
    [playBeep]
  );

  // Stop camera helper
  const stopCameraScanner = useCallback(async () => {
    if (html5QrCodeRef.current) {
      try {
        if (html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.stop();
        }
        await html5QrCodeRef.current.clear();
      } catch (err) {
        console.warn("Error stopping scanner:", err);
      }
      html5QrCodeRef.current = null;
    }
    setIsCameraActive(false);
  }, []);

  // Start camera helper
  const startCameraScanner = useCallback(async () => {
    setCameraError(null);

    // Make sure previous scanner instance is cleared
    await stopCameraScanner();

    try {
      const qrScannerElement = document.getElementById("qr-reader-container");
      if (!qrScannerElement) return;

      const html5QrCode = new Html5Qrcode("qr-reader-container", {
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        verbose: false,
      });
      html5QrCodeRef.current = html5QrCode;

      // Query available camera devices if not yet populated
      const devices = await Html5Qrcode.getCameras();
      if (devices && devices.length > 0) {
        setCameras(devices);
        const cameraToUse = selectedCameraId || devices[devices.length - 1].id; // default to environment/back camera if available

        await html5QrCode.start(
          cameraToUse,
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
          },
          (decodedText) => {
            if (isScanningLockedRef.current) return;
            isScanningLockedRef.current = true;
            verifyToken(decodedText);
          },
          () => {
            // Frame scan miss, do nothing
          }
        );
        setIsCameraActive(true);
      } else {
        setCameraError("No camera devices detected on this device.");
      }
    } catch (err) {
      console.error("Camera scanner initialization error:", err);
      setCameraError(
        "Could not access camera. Please ensure camera permissions are granted in your browser."
      );
      setIsCameraActive(false);
    }
  }, [selectedCameraId, stopCameraScanner, verifyToken]);

  // Handle mode switches
  useEffect(() => {
    if (mode === "camera") {
      startCameraScanner();
    } else {
      stopCameraScanner();
    }

    return () => {
      stopCameraScanner();
    };
  }, [mode, startCameraScanner, stopCameraScanner]);

  // Handle Manual Form Submit
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!qrToken.trim() || isProcessing) return;
    verifyToken(qrToken);
  };

  // Handle Image File Upload Scan
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setError(null);
    setResult(null);

    try {
      // Create temporary scanner instance to decode uploaded image
      const tempScanner = new Html5Qrcode("temp-upload-reader");
      const decodedText = await tempScanner.scanFile(file, true);
      tempScanner.clear();
      await verifyToken(decodedText);
    } catch (err) {
      console.error("Failed to decode QR code from image file:", err);
      setError("No valid QR code could be detected in the uploaded image. Please try a clearer image.");
      playBeep(false);
      setIsProcessing(false);
    } finally {
      // Clear file input value
      e.target.value = "";
    }
  };

  const isCheckIn = result?.action === "check_in";

  return (
    <div className="space-y-6 pb-12 max-w-4xl mx-auto">
      {/* Hidden container for image scan processing */}
      <div id="temp-upload-reader" className="hidden"></div>

        {/* ── Top Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="kicker-label">ADMINISTRATION &rsaquo; ENTRANCE SCANNER</p>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 mt-1">
              QR Check-In & Check-Out
            </h1>
            <p className="mt-0.5 text-xs sm:text-sm text-slate-500">
              Multiple verification methods: live camera, hardware scanner, or file upload
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="pulse-button-secondary py-2 px-3 text-xs"
              title={soundEnabled ? "Mute audio feedback" : "Enable audio feedback"}
            >
              {soundEnabled ? (
                <>
                  <Volume2 className="h-4 w-4 text-emerald-600" />
                  <span className="text-slate-700">Audio On</span>
                </>
              ) : (
                <>
                  <VolumeX className="h-4 w-4 text-slate-400" />
                  <span className="text-slate-400">Audio Muted</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* ── Mode Selection Tabs (Flat UI) ── */}
        <div className="flex rounded-xl bg-slate-200/70 p-1 border border-slate-300/60 max-w-md">
          <button
            onClick={() => setMode("camera")}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
              mode === "camera"
                ? "bg-white text-slate-900 shadow-xs border border-slate-200/80"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Camera className="h-3.5 w-3.5" />
            <span>Live Camera</span>
          </button>

          <button
            onClick={() => setMode("manual")}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
              mode === "manual"
                ? "bg-white text-slate-900 shadow-xs border border-slate-200/80"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Keyboard className="h-3.5 w-3.5" />
            <span>Scanner / Input</span>
          </button>

          <button
            onClick={() => setMode("upload")}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
              mode === "upload"
                ? "bg-white text-slate-900 shadow-xs border border-slate-200/80"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <UploadCloud className="h-3.5 w-3.5" />
            <span>Upload Pass</span>
          </button>
        </div>

        {/* ── MODE 1: Camera Scanner ── */}
        {mode === "camera" && (
          <div className="pulse-card p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white">
                  <Camera className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-extrabold text-slate-900 text-base">Live Camera Scanner</h2>
                  <p className="text-xs text-slate-500 font-medium">
                    Point camera at student&apos;s digital QR code
                  </p>
                </div>
              </div>

              {cameras.length > 1 && (
                <div className="flex items-center gap-1.5">
                  <FlipHorizontal className="h-3.5 w-3.5 text-slate-400" />
                  <select
                    value={selectedCameraId}
                    onChange={(e) => {
                      setSelectedCameraId(e.target.value);
                    }}
                    className="text-xs rounded-lg border border-slate-200 bg-white py-1.5 px-2 text-slate-700 font-medium focus:outline-none"
                  >
                    {cameras.map((c, i) => (
                      <option key={c.id} value={c.id}>
                        {c.label || `Camera ${i + 1}`}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Camera Viewport Container */}
            <div className="relative mx-auto max-w-sm rounded-2xl overflow-hidden border border-slate-200 bg-slate-950 aspect-square flex items-center justify-center shadow-inner">
              <div
                id="qr-reader-container"
                className="w-full h-full [&_video]:w-full [&_video]:h-full [&_video]:object-cover"
              ></div>

              {!isCameraActive && !cameraError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center text-slate-400">
                  <Loader2 className="h-8 w-8 animate-spin text-slate-400 mb-2" />
                  <p className="text-xs font-semibold">Starting camera...</p>
                </div>
              )}

              {/* Scanning Target Overlay */}
              {isCameraActive && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="relative h-56 w-56 rounded-2xl border-2 border-emerald-400/80 bg-emerald-500/5 shadow-[0_0_0_9999px_rgba(15,23,42,0.45)]">
                    {/* Corner Reticles */}
                    <div className="absolute -top-0.5 -left-0.5 h-4 w-4 border-t-4 border-l-4 border-emerald-400 rounded-tl-sm"></div>
                    <div className="absolute -top-0.5 -right-0.5 h-4 w-4 border-t-4 border-r-4 border-emerald-400 rounded-tr-sm"></div>
                    <div className="absolute -bottom-0.5 -left-0.5 h-4 w-4 border-b-4 border-l-4 border-emerald-400 rounded-bl-sm"></div>
                    <div className="absolute -bottom-0.5 -right-0.5 h-4 w-4 border-b-4 border-r-4 border-emerald-400 rounded-br-sm"></div>
                    
                    {/* Scanning Laser Line */}
                    <div className="absolute inset-x-0 top-0 h-0.5 bg-emerald-400 shadow-[0_0_8px_#34d399] animate-pulse"></div>
                  </div>
                </div>
              )}
            </div>

            {cameraError && (
              <div className="mt-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-800">
                <AlertCircle className="h-5 w-5 shrink-0 mt-0.5 text-amber-600" />
                <div className="flex-1">
                  <p className="font-bold text-xs">Camera Access Required</p>
                  <p className="text-xs mt-0.5 font-medium">{cameraError}</p>
                </div>
                <button
                  onClick={startCameraScanner}
                  className="pulse-button-secondary py-1.5 px-2.5 text-xs text-amber-900 border-amber-300 hover:bg-amber-100 shrink-0"
                >
                  <RefreshCw className="h-3 w-3" />
                  Retry
                </button>
              </div>
            )}

            <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
              <span className="flex items-center gap-1.5">
                <span
                  className={`h-2 w-2 rounded-full ${
                    isCameraActive ? "bg-emerald-500 animate-ping" : "bg-slate-300"
                  }`}
                ></span>
                {isCameraActive ? "Scanner Active & Ready" : "Scanner Standby"}
              </span>
              <span>Position QR code inside the box</span>
            </div>
          </div>
        )}

        {/* ── MODE 2: Manual / Hardware Barcode Input ── */}
        {mode === "manual" && (
          <div className="pulse-card p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white">
                <Keyboard className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-extrabold text-slate-900 text-base">Barcode Scanner & Manual Entry</h2>
                <p className="text-xs text-slate-500 font-medium">
                  Plug in USB/Bluetooth scanner or enter student pass token
                </p>
              </div>
            </div>

            <form onSubmit={handleManualSubmit} className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <QrCode className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={qrToken}
                  onChange={(e) => setQrToken(e.target.value)}
                  placeholder="Scan with barcode gun or paste QR token UUID…"
                  autoFocus
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-3 pl-10 pr-4 font-mono text-sm text-slate-900 placeholder-slate-400 focus:border-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 font-medium"
                />
              </div>
              <button
                type="submit"
                disabled={isProcessing || !qrToken.trim()}
                className="pulse-button-primary py-3 shrink-0"
              >
                {isProcessing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ScanLine className="h-4 w-4" />
                )}
                {isProcessing ? "Verifying…" : "Process Pass"}
              </button>
            </form>
          </div>
        )}

        {/* ── MODE 3: Upload Image File Pass ── */}
        {mode === "upload" && (
          <div className="pulse-card p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white">
                <UploadCloud className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-extrabold text-slate-900 text-base">Upload QR Pass Image</h2>
                <p className="text-xs text-slate-500 font-medium">
                  Decode QR code from a screenshot or saved library pass file
                </p>
              </div>
            </div>

            <label className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/50 p-8 text-center cursor-pointer hover:bg-slate-100/60 hover:border-slate-400 transition-colors">
              <UploadCloud className="h-10 w-10 text-slate-400 mb-3" />
              <p className="font-bold text-sm text-slate-800">
                Click to browse or drop pass image
              </p>
              <p className="text-xs text-slate-500 mt-1">Supports PNG, JPG, WEBP pass screenshots</p>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                disabled={isProcessing}
                className="hidden"
              />
            </label>
          </div>
        )}

        {/* ── Result Alert / Success Card ── */}
        {result && (
          <div
            className={`pulse-card p-6 border transition-all ${
              isCheckIn
                ? "border-emerald-200 bg-emerald-50/40"
                : "border-indigo-200 bg-indigo-50/40"
            }`}
          >
            <div className="flex items-start justify-between gap-3 mb-5">
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
                    isCheckIn
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-indigo-100 text-indigo-700"
                  }`}
                >
                  {isCheckIn ? <LogIn className="h-6 w-6" /> : <LogOut className="h-6 w-6" />}
                </div>
                <div>
                  <p
                    className={`text-lg font-extrabold ${
                      isCheckIn ? "text-emerald-900" : "text-indigo-900"
                    }`}
                  >
                    {isCheckIn ? "✓ Entry Check-In Successful" : "✓ Exit Check-Out Successful"}
                  </p>
                  <p className="text-xs text-slate-600 font-medium">
                    {isCheckIn
                      ? "Student assigned to seat and marked active."
                      : "Seat occupancy released and session completed."}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setResult(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200/60 text-xs font-semibold"
                title="Dismiss"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-medium">
              <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-2xs">
                <p className="text-slate-400 text-[11px] mb-0.5">Seat Number</p>
                <p className="font-extrabold text-slate-900 text-base">
                  {result.booking.seat?.seatNumber ?? "—"}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-2xs">
                <p className="text-slate-400 text-[11px] mb-0.5">Study Zone</p>
                <p className="font-bold text-slate-800 text-sm">
                  {result.booking.seat?.zone?.name ?? "—"}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-2xs">
                <p className="text-slate-400 text-[11px] mb-0.5">Status</p>
                <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold uppercase bg-emerald-100 text-emerald-800">
                  <CheckCircle2 className="h-3 w-3" />
                  {result.booking.status.replace("_", " ")}
                </span>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-2xs">
                <p className="text-slate-400 text-[11px] mb-0.5">Timestamp</p>
                <p className="font-bold text-slate-800 text-xs">
                  {isCheckIn
                    ? result.booking.checkedInAt
                      ? new Date(result.booking.checkedInAt).toLocaleTimeString()
                      : "—"
                    : result.booking.checkedOutAt
                    ? new Date(result.booking.checkedOutAt).toLocaleTimeString()
                    : "—"}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── Error Message ── */}
        {error && (
          <div className="flex items-start justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-5 text-rose-700">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 shrink-0 mt-0.5 text-rose-600" />
              <div>
                <p className="font-bold text-sm">Pass Verification Rejected</p>
                <p className="text-xs mt-0.5 text-rose-600 font-medium">{error}</p>
              </div>
            </div>
            <button
              onClick={() => setError(null)}
              className="rounded-lg p-1 text-rose-500 hover:bg-rose-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* ── Recent Scan Log ── */}
        {history.length > 0 && (
          <div className="pulse-card p-5 shadow-2xs space-y-3">
            <div className="flex items-center gap-2 text-slate-700">
              <History className="h-4 w-4 text-slate-500" />
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-600">
                Recent Scans (Session Log)
              </h3>
            </div>

            <div className="divide-y divide-slate-100">
              {history.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between py-2.5 text-xs font-medium"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase ${
                        item.action === "check_in"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-indigo-100 text-indigo-800"
                      }`}
                    >
                      {item.action === "check_in" ? "Entry" : "Exit"}
                    </span>
                    <span className="font-extrabold text-slate-900">{item.seatNumber}</span>
                    <span className="text-slate-500 font-normal">({item.zoneName})</span>
                  </div>
                  <div className="flex items-center gap-3 text-slate-400 font-mono text-[11px]">
                    <span>{item.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
    </div>
  );
}

export default CheckInView;
