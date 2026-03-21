-- AlterTable
ALTER TABLE "ActiveTimer" ADD COLUMN     "trackGps" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "gpsPoints" JSONB;
