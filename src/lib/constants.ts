export const USERS = ["Jake", "Calder", "Son"] as const;
export type UserName = (typeof USERS)[number];

export const USER_COLORS: Record<UserName, string> = {
  Jake: "blue-steel",
  Calder: "amber",
  Son: "purple-muted",
};

// Tailwind class maps for dynamic user coloring
export const USER_TEXT_CLASS: Record<UserName, string> = {
  Jake: "text-blue-steel",
  Calder: "text-amber",
  Son: "text-purple-muted",
};

export const USER_BG_CLASS: Record<UserName, string> = {
  Jake: "bg-blue-steel/15",
  Calder: "bg-amber/15",
  Son: "bg-purple-muted/15",
};

export const USER_BORDER_CLASS: Record<UserName, string> = {
  Jake: "border-blue-steel",
  Calder: "border-amber",
  Son: "border-purple-muted",
};

export const ACTIVITY_TYPES = [
  "run", "bike", "swim", "strength", "yoga", "hike", "walk", "other",
] as const;
export type ActivityType = (typeof ACTIVITY_TYPES)[number];

export const ACTIVITY_LABELS: Record<ActivityType, string> = {
  run: "Run", bike: "Bike", swim: "Swim", strength: "Strength",
  yoga: "Yoga", hike: "Hike", walk: "Walk", other: "Other",
};

// Activity types that have distance
export const DISTANCE_TYPES: ActivityType[] = ["run", "bike", "swim", "hike", "walk"];
