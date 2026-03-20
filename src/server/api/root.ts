import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";
import { authRouter } from "~/server/api/routers/auth";
import { userRouter } from "~/server/api/routers/user";
import { activityRouter } from "~/server/api/routers/activity";
import { goalRouter } from "~/server/api/routers/goal";
import { timerRouter } from "~/server/api/routers/timer";

export const appRouter = createTRPCRouter({
  auth: authRouter,
  user: userRouter,
  activity: activityRouter,
  goal: goalRouter,
  timer: timerRouter,
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);
