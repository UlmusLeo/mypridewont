import { PrismaClient } from "../generated/prisma";

const prisma = new PrismaClient();

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
