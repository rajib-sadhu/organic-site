-- Notification outbox (ARCHITECTURE §6.14)

-- CreateTable
CREATE TABLE `Notification` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `channel` ENUM('EMAIL', 'SMS') NOT NULL,
    `priority` ENUM('HIGH', 'NORMAL', 'LOW') NOT NULL DEFAULT 'NORMAL',
    `status` ENUM('PENDING', 'SENDING', 'SENT', 'FAILED') NOT NULL DEFAULT 'PENDING',
    `toAddress` VARCHAR(191) NOT NULL,
    `subject` VARCHAR(191) NULL,
    `body` TEXT NOT NULL,
    `template` VARCHAR(191) NOT NULL,
    `orderId` INTEGER NULL,
    `attachInvoiceForOrderId` INTEGER NULL,
    `dedupeKey` VARCHAR(191) NULL,
    `attempts` INTEGER NOT NULL DEFAULT 0,
    `maxAttempts` INTEGER NOT NULL DEFAULT 10,
    `lastError` TEXT NULL,
    `scheduledFor` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `sentAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Notification_dedupeKey_key`(`dedupeKey`),
    INDEX `Notification_status_scheduledFor_idx`(`status`, `scheduledFor`),
    INDEX `Notification_channel_status_idx`(`channel`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
