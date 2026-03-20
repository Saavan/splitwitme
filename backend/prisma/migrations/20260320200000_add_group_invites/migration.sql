-- AlterTable: add joinCode to Group
ALTER TABLE "Group" ADD COLUMN "joinCode" TEXT;
CREATE UNIQUE INDEX "Group_joinCode_key" ON "Group"("joinCode");

-- CreateTable: GroupInvite
CREATE TABLE "GroupInvite" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "invitedName" TEXT NOT NULL,
    "email" TEXT,
    "token" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "claimedAt" TIMESTAMP(3),
    "claimedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "GroupInvite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GroupInvite_token_key" ON "GroupInvite"("token");

-- AddForeignKey
ALTER TABLE "GroupInvite" ADD CONSTRAINT "GroupInvite_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupInvite" ADD CONSTRAINT "GroupInvite_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupInvite" ADD CONSTRAINT "GroupInvite_claimedByUserId_fkey" FOREIGN KEY ("claimedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
