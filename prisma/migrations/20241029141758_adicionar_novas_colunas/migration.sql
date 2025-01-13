/*
  Warnings:

  - You are about to drop the column `name` on the `chamado` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[ticket]` on the table `chamado` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `email` to the `chamado` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "chamado" DROP COLUMN "name",
ADD COLUMN     "attributedAt" TIMESTAMP(3),
ADD COLUMN     "attributedByUser" TEXT,
ADD COLUMN     "email" TEXT NOT NULL,
ADD COLUMN     "finishedAt" TIMESTAMP(3),
ADD COLUMN     "finishedByUser" TEXT,
ADD COLUMN     "reasonFinished" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "chamado_ticket_key" ON "chamado"("ticket");
