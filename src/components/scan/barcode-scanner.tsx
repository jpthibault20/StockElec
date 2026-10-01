"use client";

import { useEffect, useRef, useState } from "react";
import type { BarcodeDetector, BarcodeFormat } from "barcode-detector/ponyfill";

type ScannerStatus = "starting" | "running" | "denied" | "unavailable" | "error";

const SCAN_INTERVAL_MS = 200;
const REPEAT_DELAY_MS = 2000;

let detectorModule: Promise<typeof import("barcode-detector/ponyfill")> | null = null;

// Loads the zxing-based BarcodeDetector ponyfill once, with its WASM served
// from our own origin (copied to public/zxing on postinstall).
function loadDetectorModule() {
  detectorModule ??= import("barcode-detector/ponyfill").then((module) => {
    module.prepareZXingModule({
      overrides: {
        locateFile: (path: string, prefix: string) =>
          path.endsWith(".wasm") ? `/zxing/${path}` : prefix + path,
      },
    });
    return module;
  });
  return detectorModule;
}

type BarcodeScannerProps = {
  formats: BarcodeFormat[];
  // Called for every new code read; the same value is ignored for 2 s.
  onDetect: (value: string, format: BarcodeFormat) => void;
};

// Live camera preview that reads barcodes / QR codes (rear camera).
export function BarcodeScanner({ formats, onDetect }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const onDetectRef = useRef(onDetect);
  const [status, setStatus] = useState<ScannerStatus>("starting");
  const formatsKey = formats.join(",");

  useEffect(() => {
    onDetectRef.current = onDetect;
  }, [onDetect]);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let stopped = false;
    let last = { value: "", at: 0 };

    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setStatus("unavailable");
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 } },
          audio: false,
        });
      } catch (error) {
        setStatus(error instanceof DOMException && error.name === "NotAllowedError" ? "denied" : "unavailable");
        return;
      }
      if (stopped) return;

      const video = videoRef.current!;
      video.srcObject = stream;
      await video.play().catch(() => undefined);

      let detector: BarcodeDetector;
      try {
        const { BarcodeDetector } = await loadDetectorModule();
        detector = new BarcodeDetector({ formats: formatsKey.split(",") as BarcodeFormat[] });
      } catch {
        setStatus("error");
        return;
      }
      if (stopped) return;
      setStatus("running");

      const tick = async () => {
        if (stopped) return;
        if (video.readyState >= video.HAVE_CURRENT_DATA) {
          try {
            const [code] = await detector.detect(video);
            const now = Date.now();
            if (code && (code.rawValue !== last.value || now - last.at > REPEAT_DELAY_MS)) {
              last = { value: code.rawValue, at: now };
              navigator.vibrate?.(40);
              onDetectRef.current(code.rawValue, code.format);
            }
          } catch {
            // A single failed frame is not an error; try the next one.
          }
        }
        timer = setTimeout(tick, SCAN_INTERVAL_MS);
      };
      tick();
    }

    start();
    return () => {
      stopped = true;
      clearTimeout(timer);
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [formatsKey]);

  return (
    <div className="relative aspect-[3/4] w-full overflow-hidden rounded-card bg-black sm:aspect-video">
      <video ref={videoRef} muted playsInline className="size-full object-cover" />
      {status === "running" && (
        <div aria-hidden className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="size-3/5 max-w-72 rounded-card border-4 border-white/85 shadow-[0_0_0_100vmax_rgb(0_0_0/0.35)]" />
        </div>
      )}
      {status !== "running" && (
        <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-white">
          <p role={status === "starting" ? "status" : "alert"}>{STATUS_MESSAGES[status]}</p>
        </div>
      )}
    </div>
  );
}

const STATUS_MESSAGES: Record<Exclude<ScannerStatus, "running">, string> = {
  starting: "Ouverture de la caméra…",
  denied: "Accès à la caméra refusé. Autorise la caméra dans les réglages du navigateur.",
  unavailable: "Caméra indisponible. Le scan nécessite une connexion HTTPS et une caméra.",
  error: "Le lecteur de codes n'a pas pu démarrer. Réessaie.",
};
