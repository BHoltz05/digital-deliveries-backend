-- CreateEnum
CREATE TYPE "App" AS ENUM ('DD', 'RF');

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "app" "App" NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "unified_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dd_profile" (
    "id" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dd_profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Store" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Store_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "accounts_email_idx" ON "accounts"("email");

-- CreateIndex
CREATE INDEX "accounts_unified_user_id_idx" ON "accounts"("unified_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_app_email_key" ON "accounts"("app", "email");

-- CreateIndex
CREATE UNIQUE INDEX "dd_profile_account_id_key" ON "dd_profile"("account_id");

-- AddForeignKey
ALTER TABLE "dd_profile" ADD CONSTRAINT "dd_profile_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
