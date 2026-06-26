-- Add description field to Coupon
ALTER TABLE `Coupon` ADD COLUMN `description` TEXT NULL AFTER `code`;
