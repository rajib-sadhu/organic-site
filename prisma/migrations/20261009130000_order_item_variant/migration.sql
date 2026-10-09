-- Link order items to their variant so cancellations can release stock reliably

-- AlterTable
ALTER TABLE `OrderItem` ADD COLUMN `variantId` INTEGER NULL;

-- CreateIndex
CREATE INDEX `OrderItem_variantId_idx` ON `OrderItem`(`variantId`);

-- AddForeignKey
ALTER TABLE `OrderItem` ADD CONSTRAINT `OrderItem_variantId_fkey` FOREIGN KEY (`variantId`) REFERENCES `ProductVariant`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;


-- Backfill existing items by SKU (natural key)
UPDATE `OrderItem` oi JOIN `ProductVariant` v ON v.`sku` = oi.`sku` SET oi.`variantId` = v.`id` WHERE oi.`variantId` IS NULL;
