import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import {
  hashPassword,
  verifyPassword,
  createSessionToken,
  setSessionCookie,
  clearSessionCookie,
} from "~/server/auth";

// In-memory session store (fine for 3 users; survives until server restart)
const activeSessions = new Set<string>();

export function isValidSession(token: string): boolean {
  return activeSessions.has(token);
}

export const authRouter = createTRPCRouter({
  login: publicProcedure
    .input(z.object({ password: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const config = await ctx.db.appConfig.findUnique({
        where: { key: "app_password_hash" },
      });

      if (!config || !config.value) {
        // First login: set the password
        await ctx.db.appConfig.upsert({
          where: { key: "app_password_hash" },
          update: { value: hashPassword(input.password) },
          create: { key: "app_password_hash", value: hashPassword(input.password) },
        });
      } else if (!verifyPassword(input.password, config.value)) {
        throw new Error("Wrong password");
      }

      const token = createSessionToken();
      activeSessions.add(token);
      await setSessionCookie(token);
      return { success: true };
    }),

  logout: publicProcedure.mutation(async () => {
    await clearSessionCookie();
    return { success: true };
  }),
});
