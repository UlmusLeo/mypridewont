"use client";

import dynamic from "next/dynamic";

const RouteMap = dynamic(
  () => import("~/components/route-map").then((m) => ({ default: m.RouteMap })),
  { ssr: false },
);

export function RouteMapLoader({ polyline }: { polyline: string }) {
  return <RouteMap polyline={polyline} />;
}
