-- CreateTable
CREATE TABLE "ProtocolChange" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "fromProtocolId" INTEGER NOT NULL,
    "toProtocolId" INTEGER NOT NULL,
    "changedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" TEXT,
    "changes" TEXT NOT NULL,
    CONSTRAINT "ProtocolChange_fromProtocolId_fkey" FOREIGN KEY ("fromProtocolId") REFERENCES "Protocol" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ProtocolChange_toProtocolId_fkey" FOREIGN KEY ("toProtocolId") REFERENCES "Protocol" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
