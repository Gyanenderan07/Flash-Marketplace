CREATE TABLE `disputes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` int NOT NULL,
	`buyerClaim` text NOT NULL,
	`sellerDefense` text,
	`status` enum('open','seller-response','resolved') NOT NULL DEFAULT 'open',
	`resolution` enum('refund-buyer','release-funds'),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `disputes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `listings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sellerId` int NOT NULL,
	`title` varchar(240) NOT NULL,
	`sku` varchar(80) NOT NULL,
	`status` enum('active','draft','suppressed') NOT NULL DEFAULT 'draft',
	`stock` int NOT NULL DEFAULT 0,
	`basePrice` decimal(14,2) NOT NULL,
	`tiers` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `listings_id` PRIMARY KEY(`id`),
	CONSTRAINT `listings_sku_unique` UNIQUE(`sku`)
);
--> statement-breakpoint
CREATE TABLE `marketplaceOrders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`buyerId` int NOT NULL,
	`status` enum('pending-approval','confirmed','awaiting-dispatch','shipped','delivered','returned') NOT NULL DEFAULT 'confirmed',
	`subtotal` decimal(14,2) NOT NULL,
	`tax` decimal(14,2) NOT NULL,
	`total` decimal(14,2) NOT NULL,
	`approvalRequired` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `marketplaceOrders_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `quotes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`buyerId` int NOT NULL,
	`sellerId` int NOT NULL,
	`listingId` int NOT NULL,
	`quantity` int NOT NULL,
	`targetPrice` decimal(14,2) NOT NULL,
	`counterPrice` decimal(14,2),
	`status` enum('draft','sent','countered','accepted','declined') NOT NULL DEFAULT 'draft',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `quotes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sellers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(180) NOT NULL,
	`status` enum('pending','verified','suppressed') NOT NULL DEFAULT 'pending',
	`accountHealth` int NOT NULL DEFAULT 100,
	`payoutBalance` decimal(14,2) NOT NULL DEFAULT '0',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sellers_id` PRIMARY KEY(`id`)
);
