-- AlterTable
-- Every row that already exists gets 'other', which is the generic template —
-- i.e. exactly the summary they were produced with.
ALTER TABLE "recordings" ADD COLUMN     "kind" TEXT NOT NULL DEFAULT 'other';
