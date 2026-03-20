import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { computePace } from "~/lib/utils";

export const activityRouter = createTRPCRouter({
  create: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        date: z.string(), // ISO date string "2026-03-19"
        type: z.string(),
        durationSec: z.number().int().positive(),
        distanceMi: z.number().positive().optional(),
        notes: z.string().optional(),
        source: z.string().default("manual"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const paceSecPerMi =
        input.distanceMi && input.type === "run"
          ? computePace(input.distanceMi, input.durationSec)
          : null;

      return ctx.db.activity.create({
        data: {
          userId: input.userId,
          date: new Date(input.date),
          type: input.type,
          durationSec: input.durationSec,
          distanceMi: input.distanceMi ?? null,
          paceSecPerMi: paceSecPerMi,
          notes: input.notes ?? null,
          source: input.source,
        },
      });
    }),

  list: publicProcedure
    .input(
      z.object({
        userId: z.string().optional(),
        type: z.string().optional(),
        from: z.string().optional(),
        to: z.string().optional(),
        limit: z.number().int().min(1).max(100).default(50),
        cursor: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const where: Record<string, unknown> = {};
      if (input.userId) where.userId = input.userId;
      if (input.type) where.type = input.type;
      if (input.from || input.to) {
        where.date = {
          ...(input.from ? { gte: new Date(input.from) } : {}),
          ...(input.to ? { lte: new Date(input.to) } : {}),
        };
      }

      const items = await ctx.db.activity.findMany({
        where,
        include: { user: true },
        orderBy: { date: "desc" },
        take: input.limit + 1,
        ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
      });

      let nextCursor: string | undefined;
      if (items.length > input.limit) {
        const next = items.pop();
        nextCursor = next?.id;
      }

      return { items, nextCursor };
    }),

  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(({ ctx, input }) => {
      return ctx.db.activity.findUnique({
        where: { id: input.id },
        include: { user: true, splits: { orderBy: { mileNumber: "asc" } } },
      });
    }),

  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ ctx, input }) => {
      return ctx.db.activity.delete({ where: { id: input.id } });
    }),

  update: publicProcedure
    .input(
      z.object({
        id: z.string(),
        date: z.string().optional(),
        type: z.string().optional(),
        durationSec: z.number().int().positive().optional(),
        distanceMi: z.number().positive().nullable().optional(),
        notes: z.string().nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...fields } = input;

      // Get existing activity to compute pace if needed
      const existing = await ctx.db.activity.findUniqueOrThrow({
        where: { id },
      });

      const newType = fields.type ?? existing.type;
      const newDuration = fields.durationSec ?? existing.durationSec;
      const newDistance =
        fields.distanceMi !== undefined
          ? fields.distanceMi
          : existing.distanceMi;

      // Recompute pace
      let paceSecPerMi: number | null = null;
      if (newType === "run" && newDistance && newDuration) {
        paceSecPerMi = computePace(newDistance, newDuration);
      }

      return ctx.db.activity.update({
        where: { id },
        data: {
          ...(fields.date !== undefined && { date: new Date(fields.date) }),
          ...(fields.type !== undefined && { type: fields.type }),
          ...(fields.durationSec !== undefined && {
            durationSec: fields.durationSec,
          }),
          ...(fields.distanceMi !== undefined && {
            distanceMi: fields.distanceMi,
          }),
          ...(fields.notes !== undefined && { notes: fields.notes }),
          paceSecPerMi,
        },
      });
    }),

  recentFeed: publicProcedure
    .input(z.object({ limit: z.number().int().default(10) }))
    .query(({ ctx, input }) => {
      return ctx.db.activity.findMany({
        include: { user: true },
        orderBy: { date: "desc" },
        take: input.limit,
      });
    }),

  weekSummary: publicProcedure
    .input(z.object({ weekStart: z.string(), weekEnd: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.activity.findMany({
        where: {
          date: {
            gte: new Date(input.weekStart),
            lte: new Date(input.weekEnd),
          },
        },
        include: { user: true },
        orderBy: { date: "asc" },
      });
    }),
});
