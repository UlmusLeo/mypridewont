import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { segmentsSchema } from "~/lib/timer";
import type { Segment } from "~/lib/timer";
import { computePace } from "~/lib/utils";
import { gpsPointsSchema, haversineDistanceMi, encodePolyline } from "~/lib/geo";
import { TRPCError } from "@trpc/server";

export const timerRouter = createTRPCRouter({
  start: publicProcedure
    .input(z.object({ userId: z.string(), activityType: z.string(), trackGps: z.boolean().optional() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.activeTimer.findUnique({
        where: { userId: input.userId },
      });
      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "A timer is already running for this user",
        });
      }

      const now = new Date().toISOString();
      return ctx.db.activeTimer.create({
        data: {
          userId: input.userId,
          activityType: input.activityType,
          segments: [{ start: now }],
          status: "running",
          trackGps: input.trackGps ?? false,
        },
      });
    }),

  pause: publicProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const timer = await ctx.db.activeTimer.findUnique({
        where: { userId: input.userId },
      });
      if (!timer) {
        throw new TRPCError({ code: "NOT_FOUND", message: "No active timer" });
      }

      const segments = segmentsSchema.parse(timer.segments);
      const last = segments[segments.length - 1]!;
      last.end = new Date().toISOString();

      return ctx.db.activeTimer.update({
        where: { userId: input.userId },
        data: { segments, status: "paused" },
      });
    }),

  resume: publicProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const timer = await ctx.db.activeTimer.findUnique({
        where: { userId: input.userId },
      });
      if (!timer) {
        throw new TRPCError({ code: "NOT_FOUND", message: "No active timer" });
      }

      const segments = segmentsSchema.parse(timer.segments);
      const now = new Date().toISOString();
      segments.push({ start: now });

      return ctx.db.activeTimer.update({
        where: { userId: input.userId },
        data: { segments, status: "running" },
      });
    }),

  addGpsPoints: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        points: gpsPointsSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const timer = await ctx.db.activeTimer.findUnique({
        where: { userId: input.userId },
      });
      if (!timer) {
        throw new TRPCError({ code: "NOT_FOUND", message: "No active timer" });
      }

      const existing = timer.gpsPoints
        ? gpsPointsSchema.parse(timer.gpsPoints)
        : [];
      const updated = [...existing, ...input.points];

      return ctx.db.activeTimer.update({
        where: { userId: input.userId },
        data: { gpsPoints: updated },
      });
    }),

  end: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        distanceMi: z.number().positive().optional(),
        durationOverrideSec: z.number().int().positive().optional(),
        notes: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const timer = await ctx.db.activeTimer.findUnique({
        where: { userId: input.userId },
      });
      if (!timer) {
        throw new TRPCError({ code: "NOT_FOUND", message: "No active timer" });
      }

      const segments = segmentsSchema.parse(timer.segments);

      // Close last segment if still running
      const last = segments[segments.length - 1]!;
      if (!last.end) {
        last.end = new Date().toISOString();
      }

      // Compute total duration from segments
      const computedSec = Math.round(
        segments.reduce((total: number, seg: Segment) => {
          const start = new Date(seg.start).getTime();
          const end = new Date(seg.end!).getTime();
          return total + (end - start) / 1000;
        }, 0),
      );

      const durationSec = input.durationOverrideSec ?? computedSec;

      // GPS: compute distance and encode polyline if GPS data exists
      const rawGpsPoints = timer.gpsPoints
        ? gpsPointsSchema.parse(timer.gpsPoints)
        : [];
      const hasGpsData = rawGpsPoints.length > 0;

      const gpsDistanceMi = hasGpsData
        ? haversineDistanceMi(rawGpsPoints)
        : null;
      const routePolyline = hasGpsData
        ? encodePolyline(rawGpsPoints)
        : null;

      // Use provided distance, fall back to GPS-computed distance
      const finalDistanceMi = input.distanceMi ?? gpsDistanceMi ?? null;

      // Compute pace for runs
      const paceSecPerMi =
        finalDistanceMi && timer.activityType === "run"
          ? computePace(finalDistanceMi, durationSec)
          : null;

      // Use date-only string so @db.Date stores the correct calendar day
      const startDate = timer.startedAt.toISOString().split("T")[0]!;

      // Atomic: create activity + delete timer
      const [activity] = await ctx.db.$transaction([
        ctx.db.activity.create({
          data: {
            userId: input.userId,
            date: new Date(startDate),
            type: timer.activityType,
            durationSec,
            distanceMi: finalDistanceMi,
            paceSecPerMi,
            routePolyline,
            notes: input.notes ?? null,
            source: "timer",
          },
        }),
        ctx.db.activeTimer.delete({
          where: { userId: input.userId },
        }),
      ]);

      return activity;
    }),

  active: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ ctx, input }) => {
      const timer = await ctx.db.activeTimer.findUnique({
        where: { userId: input.userId },
      });
      if (!timer) return null;

      // Validate segments on read
      segmentsSchema.parse(timer.segments);
      return timer;
    }),
});
