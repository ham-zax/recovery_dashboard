-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Protocol" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "version" TEXT NOT NULL,
    "walkingTarget" INTEGER NOT NULL DEFAULT 1,
    "sittingTarget" INTEGER NOT NULL DEFAULT 10,
    "recoveryWeights" TEXT,
    "workoutSchedule" TEXT NOT NULL DEFAULT '{"mon":"LOWER","tue":"UPPER","wed":"REST","thu":"LOWER","fri":"UPPER","sat":"REST","sun":"REST"}',
    "active" BOOLEAN NOT NULL DEFAULT false,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "clonedFromId" INTEGER,
    CONSTRAINT "Protocol_clonedFromId_fkey" FOREIGN KEY ("clonedFromId") REFERENCES "Protocol" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Protocol" ("active", "createdAt", "endedAt", "id", "recoveryWeights", "sittingTarget", "startedAt", "updatedAt", "version", "walkingTarget", "workoutSchedule") SELECT "active", "createdAt", "endedAt", "id", "recoveryWeights", "sittingTarget", "startedAt", "updatedAt", "version", "walkingTarget", "workoutSchedule" FROM "Protocol";
DROP TABLE "Protocol";
ALTER TABLE "new_Protocol" RENAME TO "Protocol";
CREATE UNIQUE INDEX "Protocol_version_key" ON "Protocol"("version");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
