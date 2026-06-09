-- CreateIndex
CREATE UNIQUE INDEX "unique_active_protocol" ON "Protocol"("active") WHERE "active" = true;
