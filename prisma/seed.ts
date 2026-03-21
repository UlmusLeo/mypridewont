import { PrismaClient } from "../generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  // Create users
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

  // App config
  await prisma.appConfig.upsert({
    where: { key: "marathon_date" },
    update: {},
    create: { key: "marathon_date", value: "2027-03-14" },
  });
  await prisma.appConfig.upsert({
    where: { key: "app_password_hash" },
    update: {},
    create: { key: "app_password_hash", value: "" }, // Set during first deploy
  });
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
