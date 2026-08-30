-- CreateTable
CREATE TABLE "annotations" (
    "id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "recording_id" TEXT NOT NULL,
    "at_seconds" INTEGER NOT NULL,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "annotations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "annotations_recording_id_at_seconds_idx" ON "annotations"("recording_id", "at_seconds");

-- CreateIndex
CREATE INDEX "annotations_owner_id_created_at_idx" ON "annotations"("owner_id", "created_at");
