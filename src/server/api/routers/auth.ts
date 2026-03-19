import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import {
  hashPassword,
  verifyPassword,
  createSessionToken,
} from "~/server/auth";

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
      return { success: true, token };
    }),
});
