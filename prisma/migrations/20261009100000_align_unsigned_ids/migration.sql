-- FeatureCard / PromoMessage were hand-created with INT UNSIGNED ids; align with schema (INT).

-- AlterTable
ALTER TABLE `FeatureCard` DROP PRIMARY KEY,
    MODIFY `id` INTEGER NOT NULL AUTO_INCREMENT,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `PromoMessage` DROP PRIMARY KEY,
    MODIFY `id` INTEGER NOT NULL AUTO_INCREMENT,
    ADD PRIMARY KEY (`id`);
