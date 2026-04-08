-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('PENDING', 'ANSWERED', 'IGNORED');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'VIEWER');

-- CreateTable
CREATE TABLE "reviews" (
    "id" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "appPackageName" TEXT NOT NULL,
    "userName" TEXT NOT NULL,
    "userImage" TEXT,
    "rating" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "originalLanguage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "status" "ReviewStatus" NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reply_suggestions" (
    "id" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "suggestionTextKr" TEXT NOT NULL,
    "suggestionTextOriginal" TEXT,
    "confidenceScore" DOUBLE PRECISION,
    "selected" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reply_suggestions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reply_history" (
    "id" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "replyText" TEXT NOT NULL,
    "repliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "repliedBy" TEXT NOT NULL,

    CONSTRAINT "reply_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "knowledge_base" (
    "id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "questionPattern" TEXT NOT NULL,
    "answerTemplate" TEXT NOT NULL,
    "keywords" TEXT[],
    "priority" INTEGER NOT NULL DEFAULT 0,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "knowledge_base_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'ADMIN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "reviews_reviewId_key" ON "reviews"("reviewId");

-- CreateIndex
CREATE INDEX "reviews_status_idx" ON "reviews"("status");

-- CreateIndex
CREATE INDEX "reviews_createdAt_idx" ON "reviews"("createdAt");

-- CreateIndex
CREATE INDEX "reply_suggestions_reviewId_idx" ON "reply_suggestions"("reviewId");

-- CreateIndex
CREATE INDEX "reply_history_reviewId_idx" ON "reply_history"("reviewId");

-- CreateIndex
CREATE INDEX "knowledge_base_category_idx" ON "knowledge_base"("category");

-- CreateIndex
CREATE INDEX "knowledge_base_enabled_idx" ON "knowledge_base"("enabled");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- AddForeignKey
ALTER TABLE "reply_suggestions" ADD CONSTRAINT "reply_suggestions_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reply_history" ADD CONSTRAINT "reply_history_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;
