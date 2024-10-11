-- CreateTable
CREATE TABLE "chamado" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "requester" TEXT NOT NULL,
    "subtitle" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "ticket" TEXT NOT NULL,
    "typeproblem" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chamado_pkey" PRIMARY KEY ("id")
);
