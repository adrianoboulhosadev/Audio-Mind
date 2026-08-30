-- CreateTable
CREATE TABLE "tasks" (
    "id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "recording_id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "done_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tasks_owner_id_done_at_idx" ON "tasks"("owner_id", "done_at");

-- CreateIndex
CREATE UNIQUE INDEX "tasks_recording_id_text_key" ON "tasks"("recording_id", "text");
