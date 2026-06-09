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
    "sittingBreaksTarget" INTEGER NOT NULL DEFAULT 10,
    "sittingBreaksActual" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "protocolId" INTEGER,
    CONSTRAINT "DailyLog_protocolId_fkey" FOREIGN KEY ("protocolId") REFERENCES "Protocol" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_DailyLog" ("createdAt", "date", "id", "notes", "pain", "reflux", "sittingBreaksActual", "sittingBreaksTarget", "sleepHours", "strengthToday", "updatedAt", "walkedToday") SELECT "createdAt", "date", "id", "notes", "pain", "reflux", "sittingBreaksActual", "sittingBreaksTarget", "sleepHours", "strengthToday", "updatedAt", "walkedToday" FROM "DailyLog";
DROP TABLE "DailyLog";
ALTER TABLE "new_DailyLog" RENAME TO "DailyLog";
CREATE UNIQUE INDEX "DailyLog_date_key" ON "DailyLog"("date");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
