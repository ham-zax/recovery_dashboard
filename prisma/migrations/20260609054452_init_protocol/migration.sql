-- CreateTable
CREATE TABLE "Protocol" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "version" TEXT NOT NULL,
    "walkingTarget" INTEGER NOT NULL DEFAULT 1,
    "sittingTarget" INTEGER NOT NULL DEFAULT 10,
    "recoveryWeights" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "Protocol_version_key" ON "Protocol"("version");
