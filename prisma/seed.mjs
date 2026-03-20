// Plain JS seed script for Docker production startup.
// Uses require() so the generated Prisma client resolves relative to this file.
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { PrismaClient } = require("../generated/prisma");

const prisma = new PrismaClient();

async function main() {
  await prisma.user.upsert({
    where: { name: "Jake" },
    update: {},
    create: { name: "Jake", dataSource: "strava" },
  });
  await prisma.user.upsert({
    where: { name: "Calder" },
    update: {},
    create: { name: "Calder", dataSource: "manual" },
  });
  await prisma.user.upsert({
    where: { name: "Son" },
    update: {},
    create: { name: "Son", dataSource: "strava" },
  });

  await prisma.appConfig.upsert({
    where: { key: "marathon_date" },
    update: {},
    create: { key: "marathon_date", value: "2027-03-14" },
  });
  await prisma.appConfig.upsert({
    where: { key: "app_password_hash" },
    update: {},
    create: { key: "app_password_hash", value: "" },
  });
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error("Seed failed:", e);
    prisma.$disconnect();
    process.exit(1);
  });
