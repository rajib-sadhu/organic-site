-- Product: add rating fields
ALTER TABLE `Product` ADD COLUMN `ratingAvg` DOUBLE NOT NULL DEFAULT 0;
ALTER TABLE `Product` ADD COLUMN `ratingCount` INT NOT NULL DEFAULT 0;

-- Order: add optional customerId
ALTER TABLE `Order` ADD COLUMN `customerId` INT NULL;

-- Setting: add announcement fields
ALTER TABLE `Setting` ADD COLUMN `announcementText` VARCHAR(191) NULL;
ALTER TABLE `Setting` ADD COLUMN `announcementHref` VARCHAR(191) NULL;

-- Customer accounts
CREATE TABLE `Customer` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `email` VARCHAR(191) NOT NULL,
  `passwordHash` VARCHAR(191) NULL,
  `name` VARCHAR(191) NULL,
  `phone` VARCHAR(191) NULL,
  `isActive` BOOLEAN NOT NULL DEFAULT true,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `Customer_email_key`(`email`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Reviews
CREATE TABLE `Review` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `productId` INT NOT NULL,
  `customerId` INT NULL,
  `authorName` VARCHAR(191) NOT NULL,
  `rating` INT NOT NULL,
  `title` VARCHAR(191) NULL,
  `body` TEXT NOT NULL,
  `isVerified` BOOLEAN NOT NULL DEFAULT false,
  `status` ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `Review_productId_status_idx`(`productId`, `status`),
  INDEX `Review_customerId_idx`(`customerId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Blog posts
CREATE TABLE `BlogPost` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `slug` VARCHAR(191) NOT NULL,
  `title` VARCHAR(191) NOT NULL,
  `excerpt` TEXT NULL,
  `body` LONGTEXT NOT NULL,
  `coverImage` VARCHAR(191) NULL,
  `status` ENUM('DRAFT', 'PUBLISHED') NOT NULL DEFAULT 'DRAFT',
  `publishedAt` DATETIME(3) NULL,
  `metaTitle` VARCHAR(191) NULL,
  `metaDescription` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `BlogPost_slug_key`(`slug`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Newsletter subscribers
CREATE TABLE `NewsletterSubscriber` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `email` VARCHAR(191) NOT NULL,
  `isConfirmed` BOOLEAN NOT NULL DEFAULT false,
  `source` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `unsubAt` DATETIME(3) NULL,
  UNIQUE INDEX `NewsletterSubscriber_email_key`(`email`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Foreign keys
ALTER TABLE `Order` ADD CONSTRAINT `Order_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `Review` ADD CONSTRAINT `Review_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `Review` ADD CONSTRAINT `Review_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
