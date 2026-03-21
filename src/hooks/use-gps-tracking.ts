"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { api } from "~/trpc/react";
import type { GpsPoint } from "~/lib/geo";

const FLUSH_INTERVAL_MS = 30_000;

export function useGpsTracking(
  enabled: boolean,
  userId: string,
): { pointCount: number; error: string | null } {
  const bufferRef = useRef<GpsPoint[]>([]);
  const pointCountRef = useRef(0);
  const errorRef = useRef<string | null>(null);
  const [, setTick] = useState(0); // Force re-render counter

  const addGpsPoints = api.timer.addGpsPoints.useMutation();
  // Store mutate in a ref to avoid dependency churn (useMutation returns a new object each render)
  const mutateRef = useRef(addGpsPoints.mutate);
  mutateRef.current = addGpsPoints.mutate;

  const flush = useCallback(() => {
    if (bufferRef.current.length === 0) return;
    const points = [...bufferRef.current];
    mutateRef.current(
      { userId, points },
      {
        onSuccess: () => {
          // Only clear the points that were successfully sent
          bufferRef.current = bufferRef.current.slice(points.length);
        },
        // On failure: retain points in buffer, retry next interval
      },
    );
  }, [userId]);

  useEffect(() => {
    if (!enabled) return;

    if (!navigator.geolocation) {
      errorRef.current = "Geolocation not supported";
      setTick((t) => t + 1);
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const point: GpsPoint = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: new Date(position.timestamp).toISOString(),
        };
        bufferRef.current.push(point);
        pointCountRef.current += 1;
        errorRef.current = null;
        setTick((t) => t + 1);
      },
      (err) => {
        // Log but don't stop — GPS often recovers
        console.warn("GPS error:", err.message);
        if (err.code === err.PERMISSION_DENIED) {
          errorRef.current = "Location permission denied";
          setTick((t) => t + 1);
        }
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 },
    );

    // Periodic flush
    const flushId = setInterval(flush, FLUSH_INTERVAL_MS);

    return () => {
      navigator.geolocation.clearWatch(watchId);
      clearInterval(flushId);
      // Flush remaining points on cleanup
      flush();
    };
  }, [enabled, flush]);

  return {
    pointCount: pointCountRef.current,
    error: errorRef.current,
  };
}
