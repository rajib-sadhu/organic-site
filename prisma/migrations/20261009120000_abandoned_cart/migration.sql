-- Abandoned-cart recovery (ARCHITECTURE §6.10)

-- AlterTable
ALTER TABLE `Cart` ADD COLUMN `activityAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `lastReminderAt` DATETIME(3) NULL,
    ADD COLUMN `recoveryToken` VARCHAR(191) NULL,
    ADD COLUMN `remindersSent` INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `Setting` ADD COLUMN `abandonedCartCouponId` INTEGER NULL,
    ADD COLUMN `abandonedCartOn` BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE `EmailOptOut` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `email` VARCHAR(191) NOT NULL,
    `scope` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `EmailOptOut_email_scope_key`(`email`, `scope`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `Cart_recoveryToken_key` ON `Cart`(`recoveryToken`);

-- CreateIndex
CREATE INDEX `Cart_remindersSent_activityAt_idx` ON `Cart`(`remindersSent`, `activityAt`);

-- AddForeignKey
ALTER TABLE `Setting` ADD CONSTRAINT `Setting_abandonedCartCouponId_fkey` FOREIGN KEY (`abandonedCartCouponId`) REFERENCES `Coupon`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

