// Plain JS seed script for Docker production startup.
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { PrismaClient } = require("../generated/prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

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
