-- Product: tagline + shortDescription
ALTER TABLE `Product` ADD COLUMN `tagline` VARCHAR(191) NULL;
ALTER TABLE `Product` ADD COLUMN `shortDescription` TEXT NULL;

-- ProductImage: isThumbnail flag
ALTER TABLE `ProductImage` ADD COLUMN `isThumbnail` BOOLEAN NOT NULL DEFAULT false;

-- Banner table for home page carousel
CREATE TABLE `Banner` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(191) NULL,
    `subtitle` VARCHAR(191) NULL,
    `ctaText` VARCHAR(191) NULL,
    `ctaLink` VARCHAR(191) NULL,
    `image` VARCHAR(191) NOT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
