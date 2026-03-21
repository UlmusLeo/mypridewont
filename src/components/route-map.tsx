"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { decodePolyline } from "~/lib/geo";

export function RouteMap({ polyline }: { polyline: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const points = decodePolyline(polyline);
    if (points.length === 0) return;

    const latLngs = points.map(([lat, lng]) => L.latLng(lat, lng));

    const map = L.map(containerRef.current, {
      zoomControl: false,
      attributionControl: false,
      dragging: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      touchZoom: false,
    });
    mapRef.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
    }).addTo(map);

    const line = L.polyline(latLngs, {
      color: "#c4342d",
      weight: 3,
      opacity: 0.9,
    }).addTo(map);

    map.fitBounds(line.getBounds(), { padding: [20, 20] });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [polyline]);

  return <div ref={containerRef} className="h-48 w-full rounded-sm" />;
}
