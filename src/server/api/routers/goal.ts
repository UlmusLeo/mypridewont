import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

export const goalRouter = createTRPCRouter({
  create: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        activityType: z.string(),
        timesPerWeek: z.number().int().positive(),
        targetDistanceMi: z.number().positive().optional(),
        targetDurationMin: z.number().int().positive().optional(),
        startDate: z.string(),
        endDate: z.string().optional(),
      }),
    )
    .mutation(({ ctx, input }) => {
      return ctx.db.weeklyGoal.create({
        data: {
          userId: input.userId,
          activityType: input.activityType,
          timesPerWeek: input.timesPerWeek,
          targetDistanceMi: input.targetDistanceMi ?? null,
          targetDurationMin: input.targetDurationMin ?? null,
          startDate: new Date(input.startDate),
          endDate: input.endDate ? new Date(input.endDate) : null,
        },
      });
    }),

  list: publicProcedure
    .input(z.object({ userId: z.string().optional() }))
    .query(({ ctx, input }) => {
      return ctx.db.weeklyGoal.findMany({
        where: input.userId ? { userId: input.userId } : {},
        include: { user: true },
        orderBy: [{ startDate: "asc" }, { activityType: "asc" }],
      });
    }),

  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ ctx, input }) => {
      return ctx.db.weeklyGoal.delete({ where: { id: input.id } });
    }),

  clearPlan: publicProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(({ ctx, input }) => {
      return ctx.db.weeklyGoal.deleteMany({ where: { userId: input.userId } });
    }),

  importPlan: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        planText: z.string(),
        replaceExisting: z.boolean().default(true),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (input.replaceExisting) {
        await ctx.db.weeklyGoal.deleteMany({ where: { userId: input.userId } });
      }

      const lines = input.planText
        .split("\n")
        .map((l) => l.replace(/#.*$/, "").trim())
        .filter(Boolean);

      const goals = [];
      const currentYear = new Date().getFullYear();

      for (const line of lines) {
        const parsed = parsePlanLine(line, currentYear);
        if (!parsed) continue;

        const goal = await ctx.db.weeklyGoal.create({
          data: {
            userId: input.userId,
            activityType: parsed.activityType,
            timesPerWeek: parsed.timesPerWeek,
            targetDistanceMi: parsed.targetDistanceMi,
            startDate: parsed.startDate,
            endDate: parsed.endDate,
          },
        });
        goals.push(goal);
      }

      return { created: goals.length };
    }),

  weekProgress: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        weekStart: z.string(),
        weekEnd: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const goals = await ctx.db.weeklyGoal.findMany({
        where: {
          userId: input.userId,
          startDate: { lte: new Date(input.weekEnd) },
          OR: [
            { endDate: null },
            { endDate: { gte: new Date(input.weekStart) } },
          ],
        },
      });

      const activities = await ctx.db.activity.findMany({
        where: {
          userId: input.userId,
          date: {
            gte: new Date(input.weekStart),
            lte: new Date(input.weekEnd),
          },
        },
      });

      return goals.map((goal) => {
        const matching = activities.filter((a) => {
          if (a.type !== goal.activityType) return false;
          if (goal.targetDistanceMi && a.distanceMi) {
            return a.distanceMi >= goal.targetDistanceMi;
          }
          return true;
        });

        return {
          goal,
          completed: matching.length,
          target: goal.timesPerWeek,
          met: matching.length >= goal.timesPerWeek,
        };
      });
    }),
});

function parsePlanLine(
  line: string,
  year: number,
): {
  activityType: string;
  timesPerWeek: number;
  targetDistanceMi: number | null;
  startDate: Date;
  endDate: Date | null;
} | null {
  const match = line.match(
    /^(\w+)\s*(?:(\d+(?:\.\d+)?)mi\s*)?x(\d+)\s*,\s*(.+)$/i,
  );
  if (!match) return null;

  const [, type, dist, freq, dateStr] = match;
  if (!type || !freq || !dateStr) return null;

  const activityType = type.toLowerCase();
  const timesPerWeek = parseInt(freq, 10);
  const targetDistanceMi = dist ? parseFloat(dist) : null;

  const dateParts = dateStr.split("-").map((s) => s.trim());
  const startDate = parseShortDate(dateParts[0]!, year);
  if (!startDate) return null;

  const endDate = dateParts[1] ? parseShortDate(dateParts[1], year) : null;

  return { activityType, timesPerWeek, targetDistanceMi, startDate, endDate };
}

function parseShortDate(str: string, year: number): Date | null {
  const months: Record<string, number> = {
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
    jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
  };
  const match = str.match(/^(\w{3})\s+(\d{1,2})$/i);
  if (!match) return null;
  const month = months[match[1]!.toLowerCase()];
  if (month === undefined) return null;
  return new Date(year, month, parseInt(match[2]!, 10));
}
