-- Product: add tags, highlights, benefits, howToUse, ingredients, nutritionInfo, shelfLife, storage, metaKeywords
ALTER TABLE `Product` ADD COLUMN `tags` JSON NOT NULL DEFAULT ('[]');
ALTER TABLE `Product` ADD COLUMN `highlights` JSON NOT NULL DEFAULT ('[]');
ALTER TABLE `Product` ADD COLUMN `benefits` JSON NOT NULL DEFAULT ('[]');
ALTER TABLE `Product` ADD COLUMN `howToUse` TEXT NULL;
ALTER TABLE `Product` ADD COLUMN `ingredients` TEXT NULL;
ALTER TABLE `Product` ADD COLUMN `nutritionInfo` JSON NULL;
ALTER TABLE `Product` ADD COLUMN `shelfLife` VARCHAR(191) NULL;
ALTER TABLE `Product` ADD COLUMN `storage` VARCHAR(191) NULL;
ALTER TABLE `Product` ADD COLUMN `metaKeywords` TEXT NULL;

-- ProductVariant: add mrpPaise, weightGrams
ALTER TABLE `ProductVariant` ADD COLUMN `mrpPaise` INT NULL;
ALTER TABLE `ProductVariant` ADD COLUMN `weightGrams` INT NULL;
