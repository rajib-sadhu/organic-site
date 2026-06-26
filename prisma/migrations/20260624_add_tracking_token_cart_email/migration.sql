-- Add trackingToken to Order (magic-link order status page)
ALTER TABLE `Order` ADD COLUMN `trackingToken` VARCHAR(191) NULL;
UPDATE `Order` SET `trackingToken` = UUID() WHERE `trackingToken` IS NULL;
ALTER TABLE `Order` MODIFY COLUMN `trackingToken` VARCHAR(191) NOT NULL;
CREATE UNIQUE INDEX `Order_trackingToken_key` ON `Order`(`trackingToken`);

-- Add email to Cart (abandoned-cart recovery)
ALTER TABLE `Cart` ADD COLUMN `email` VARCHAR(191) NULL;
