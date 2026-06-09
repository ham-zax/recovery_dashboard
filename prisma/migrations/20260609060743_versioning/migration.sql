/*
  Warnings:

  - Added the required column `updatedAt` to the `Protocol` table without a default value. This is not possible if the table is not empty.
  - Added the required column `protocolId` to the `WorkoutSession` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `WorkoutSession` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Protocol" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "version" TEXT NOT NULL,
    "walkingTarget" INTEGER NOT NULL DEFAULT 1,
    "sittingTarget" INTEGER NOT NULL DEFAULT 10,
    "recoveryWeights" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Protocol" ("active", "createdAt", "id", "recoveryWeights", "sittingTarget", "version", "walkingTarget") SELECT "active", "createdAt", "id", "recoveryWeights", "sittingTarget", "version", "walkingTarget" FROM "Protocol";
DROP TABLE "Protocol";
ALTER TABLE "new_Protocol" RENAME TO "Protocol";
CREATE UNIQUE INDEX "Protocol_version_key" ON "Protocol"("version");
CREATE TABLE "new_WorkoutSession" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "date" DATETIME NOT NULL,
    "type" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "protocolId" INTEGER NOT NULL,
    CONSTRAINT "WorkoutSession_protocolId_fkey" FOREIGN KEY ("protocolId") REFERENCES "Protocol" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_WorkoutSession" ("createdAt", "date", "id", "notes", "type") SELECT "createdAt", "date", "id", "notes", "type" FROM "WorkoutSession";
DROP TABLE "WorkoutSession";
ALTER TABLE "new_WorkoutSession" RENAME TO "WorkoutSession";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
