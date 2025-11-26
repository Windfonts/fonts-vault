CREATE TABLE `brands` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`logo_url` text,
	`banner_url` text,
	`description` text,
	`website` text,
	`social_links` text,
	`status` text DEFAULT 'published' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `brands_slug_unique` ON `brands` (`slug`);--> statement-breakpoint
CREATE TABLE `categories` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`description` text,
	`order` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `categories_name_unique` ON `categories` (`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `categories_slug_unique` ON `categories` (`slug`);--> statement-breakpoint
CREATE TABLE `fonts` (
	`id` text PRIMARY KEY NOT NULL,
	`normalized_name` text NOT NULL,
	`name` text NOT NULL,
	`english_name` text,
	`chinese_name` text,
	`font_family` text NOT NULL,
	`original_name` text,
	`weights` text NOT NULL,
	`version` text NOT NULL,
	`copyright` text,
	`description` text,
	`designer` text,
	`foundry` text,
	`release_year` integer,
	`category` text,
	`font_category` text,
	`style` text,
	`category_id` text,
	`brand_id` text,
	`tags` text DEFAULT '[]',
	`font_tags` text DEFAULT '[]',
	`languages` text DEFAULT '[]',
	`use_cases` text DEFAULT '[]',
	`license` text,
	`license_type` text,
	`price` real,
	`purchase_url` text,
	`license_description` text,
	`oss_path` text NOT NULL,
	`view_count` integer DEFAULT 0 NOT NULL,
	`download_count` integer DEFAULT 0 NOT NULL,
	`api_call_count` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`brand_id`) REFERENCES `brands`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `fonts_normalized_name_unique` ON `fonts` (`normalized_name`);--> statement-breakpoint
CREATE INDEX `fonts_name_idx` ON `fonts` (`name`);--> statement-breakpoint
CREATE INDEX `fonts_family_idx` ON `fonts` (`font_family`);--> statement-breakpoint
CREATE INDEX `fonts_category_idx` ON `fonts` (`category_id`);--> statement-breakpoint
CREATE INDEX `fonts_brand_idx` ON `fonts` (`brand_id`);