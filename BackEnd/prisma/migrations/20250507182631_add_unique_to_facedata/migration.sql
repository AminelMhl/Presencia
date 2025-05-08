/*
  Warnings:

  - A unique constraint covering the columns `[userId]` on the table `face_data` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "face_data_userId_key" ON "face_data"("userId");
