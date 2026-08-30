-- CreateTable
CREATE TABLE "share_links" (
    "id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "recording_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "includes_transcript" BOOLEAN NOT NULL DEFAULT false,
    "includes_audio" BOOLEAN NOT NULL DEFAULT false,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "view_count" INTEGER NOT NULL DEFAULT 0,
    "last_viewed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "share_links_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "share_links_token_key" ON "share_links"("token");

-- CreateIndex
CREATE INDEX "share_links_owner_id_created_at_idx" ON "share_links"("owner_id", "created_at");

-- CreateIndex
CREATE INDEX "share_links_recording_id_idx" ON "share_links"("recording_id");
