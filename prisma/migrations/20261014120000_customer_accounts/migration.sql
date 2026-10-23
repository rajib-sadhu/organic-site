-- Optional customer accounts (ARCHITECTURE §6.6)
-- AlterTable
ALTER TABLE `Customer` ADD COLUMN `emailVerifiedAt` DATETIME(3) NULL,
    ADD COLUMN `shipCity` VARCHAR(191) NULL,
    ADD COLUMN `shipLine1` VARCHAR(191) NULL,
    ADD COLUMN `shipLine2` VARCHAR(191) NULL,
    ADD COLUMN `shipName` VARCHAR(191) NULL,
    ADD COLUMN `shipPincode` VARCHAR(191) NULL,
    ADD COLUMN `shipState` VARCHAR(191) NULL,
    ADD COLUMN `tokenVersion` INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `Setting` ADD COLUMN `customerAccounts` ENUM('OFF', 'OPTIONAL', 'REQUIRED') NOT NULL DEFAULT 'OPTIONAL';

-- CreateTable
CREATE TABLE `CustomerWishlistItem` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `customerId` INTEGER NOT NULL,
    `variantId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `CustomerWishlistItem_variantId_idx`(`variantId`),
    UNIQUE INDEX `CustomerWishlistItem_customerId_variantId_key`(`customerId`, `variantId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CustomerToken` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `purpose` ENUM('LOGIN_CODE', 'VERIFY_EMAIL', 'RESET_PASSWORD') NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `customerId` INTEGER NULL,
    `secretHash` VARCHAR(191) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `consumedAt` DATETIME(3) NULL,
    `attempts` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `CustomerToken_secretHash_key`(`secretHash`),
    INDEX `CustomerToken_email_purpose_createdAt_idx`(`email`, `purpose`, `createdAt`),
    INDEX `CustomerToken_customerId_idx`(`customerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `CustomerWishlistItem` ADD CONSTRAINT `CustomerWishlistItem_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CustomerWishlistItem` ADD CONSTRAINT `CustomerWishlistItem_variantId_fkey` FOREIGN KEY (`variantId`) REFERENCES `ProductVariant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CustomerToken` ADD CONSTRAINT `CustomerToken_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

