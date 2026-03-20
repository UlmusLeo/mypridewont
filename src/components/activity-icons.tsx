import {
  Footprints,
  Bike,
  Waves,
  Dumbbell,
  Flower2,
  Mountain,
  PersonStanding,
  Ellipsis,
} from "lucide-react";
import type { LucideIcon, LucideProps } from "lucide-react";
import type { ActivityType } from "~/lib/constants";

/** Shared props for angular/brutalist icon style across the app */
export const ICON_STYLE: Pick<LucideProps, "strokeLinecap" | "strokeLinejoin"> = {
  strokeLinecap: "square",
  strokeLinejoin: "miter",
};

export const ACTIVITY_ICON_COMPONENTS: Record<ActivityType, LucideIcon> = {
  run: Footprints,
  bike: Bike,
  swim: Waves,
  strength: Dumbbell,
  yoga: Flower2,
  hike: Mountain,
  walk: PersonStanding,
  other: Ellipsis,
};
