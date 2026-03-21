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

    // Desaturated map tiles via CSS filter on the tile pane
    const tilePane = map.getPane("tilePane");
    if (tilePane) {
      tilePane.style.filter = "saturate(0.15) contrast(1.1) brightness(0.95)";
    }

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
    }).addTo(map);

    // Sepia-tinted overlay to blend with cream/ink palette
    const overlayPane = map.getPane("overlayPane");
    if (overlayPane) {
      overlayPane.style.mixBlendMode = "multiply";
    }

    const line = L.polyline(latLngs, {
      color: "#c4342d",
      weight: 3.5,
      opacity: 1,
      lineCap: "square",
      lineJoin: "miter",
    }).addTo(map);

    // Start/end markers as simple circles
    if (latLngs.length > 0) {
      L.circleMarker(latLngs[0]!, {
        radius: 5,
        color: "#1a1714",
        fillColor: "#22c55e",
        fillOpacity: 1,
        weight: 2,
      }).addTo(map);
      if (latLngs.length > 1) {
        L.circleMarker(latLngs[latLngs.length - 1]!, {
          radius: 5,
          color: "#1a1714",
          fillColor: "#c4342d",
          fillOpacity: 1,
          weight: 2,
        }).addTo(map);
      }
    }

    map.fitBounds(line.getBounds(), { padding: [30, 30] });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [polyline]);

  return (
    <div className="relative z-0 overflow-hidden rounded-sm border-2 border-ink">
      <div ref={containerRef} className="h-52 w-full" />
    </div>
  );
}
