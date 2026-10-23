-- AlterTable: add passwordLogin setting
ALTER TABLE `Setting`
  ADD COLUMN `passwordLogin` ENUM('OFF', 'OPTIONAL', 'REQUIRED') NOT NULL DEFAULT 'OPTIONAL';
