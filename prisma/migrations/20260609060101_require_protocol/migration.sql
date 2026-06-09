/*
  Warnings:

  - You are about to drop the column `sittingBreaksTarget` on the `DailyLog` table. All the data in the column will be lost.
  - Made the column `protocolId` on table `DailyLog` required. This step will fail if there are existing NULL values in that column.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_DailyLog" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "date" DATETIME NOT NULL,
    "pain" INTEGER NOT NULL,
    "reflux" INTEGER NOT NULL,
    "walkedToday" BOOLEAN NOT NULL,
    "strengthToday" BOOLEAN NOT NULL,
    "sleepHours" REAL NOT NULL,
    "sittingBreaksActual" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "protocolId" INTEGER NOT NULL,
    CONSTRAINT "DailyLog_protocolId_fkey" FOREIGN KEY ("protocolId") REFERENCES "Protocol" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_DailyLog" ("createdAt", "date", "id", "notes", "pain", "protocolId", "reflux", "sittingBreaksActual", "sleepHours", "strengthToday", "updatedAt", "walkedToday") SELECT "createdAt", "date", "id", "notes", "pain", "protocolId", "reflux", "sittingBreaksActual", "sleepHours", "strengthToday", "updatedAt", "walkedToday" FROM "DailyLog";
DROP TABLE "DailyLog";
ALTER TABLE "new_DailyLog" RENAME TO "DailyLog";
CREATE UNIQUE INDEX "DailyLog_date_key" ON "DailyLog"("date");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
