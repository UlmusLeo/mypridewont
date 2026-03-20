import { z } from "zod";

export const segmentSchema = z.object({
  start: z.string().datetime(),
  end: z.string().datetime().optional(),
});

export const segmentsSchema = z.array(segmentSchema);

export type Segment = z.infer<typeof segmentSchema>;

/**
 * Compute total elapsed seconds from an array of timer segments.
 * Open segments (no `end`) use Date.now() as the end time.
 */
export function computeTotalSeconds(segments: Segment[]): number {
  return segments.reduce((total, seg) => {
    const start = new Date(seg.start).getTime();
    const end = seg.end ? new Date(seg.end).getTime() : Date.now();
    return total + (end - start) / 1000;
  }, 0);
}
