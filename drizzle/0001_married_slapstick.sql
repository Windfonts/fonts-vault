PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_fonts` (
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
	`tags` text,
	`font_tags` text,
	`languages` text,
	`use_cases` text,
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
INSERT INTO `__new_fonts`("id", "normalized_name", "name", "english_name", "chinese_name", "font_family", "original_name", "weights", "version", "copyright", "description", "designer", "foundry", "release_year", "category", "font_category", "style", "category_id", "brand_id", "tags", "font_tags", "languages", "use_cases", "license", "license_type", "price", "purchase_url", "license_description", "oss_path", "view_count", "download_count", "api_call_count", "created_at", "updated_at") SELECT "id", "normalized_name", "name", "english_name", "chinese_name", "font_family", "original_name", "weights", "version", "copyright", "description", "designer", "foundry", "release_year", "category", "font_category", "style", "category_id", "brand_id", "tags", "font_tags", "languages", "use_cases", "license", "license_type", "price", "purchase_url", "license_description", "oss_path", "view_count", "download_count", "api_call_count", "created_at", "updated_at" FROM `fonts`;--> statement-breakpoint
DROP TABLE `fonts`;--> statement-breakpoint
ALTER TABLE `__new_fonts` RENAME TO `fonts`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `fonts_normalized_name_unique` ON `fonts` (`normalized_name`);--> statement-breakpoint
CREATE INDEX `fonts_name_idx` ON `fonts` (`name`);--> statement-breakpoint
CREATE INDEX `fonts_family_idx` ON `fonts` (`font_family`);--> statement-breakpoint
CREATE INDEX `fonts_category_idx` ON `fonts` (`category_id`);--> statement-breakpoint
CREATE INDEX `fonts_brand_idx` ON `fonts` (`brand_id`);