CREATE TABLE `api_blacklist` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`value` text NOT NULL,
	`reason` text,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `api_blacklist_value_unique` ON `api_blacklist` (`value`);--> statement-breakpoint
CREATE INDEX `api_blacklist_active_idx` ON `api_blacklist` (`is_active`);--> statement-breakpoint
CREATE INDEX `api_blacklist_type_idx` ON `api_blacklist` (`type`);--> statement-breakpoint
CREATE TABLE `api_blacklist_audit` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`action` text NOT NULL,
	`blacklist_id` text,
	`type` text,
	`value` text,
	`actor_id` text,
	`actor_email` text,
	`before` text,
	`after` text
);
--> statement-breakpoint
CREATE INDEX `api_blacklist_audit_created_at_idx` ON `api_blacklist_audit` (`created_at`);--> statement-breakpoint
CREATE INDEX `api_blacklist_audit_action_idx` ON `api_blacklist_audit` (`action`);--> statement-breakpoint
CREATE INDEX `api_blacklist_audit_value_idx` ON `api_blacklist_audit` (`value`);--> statement-breakpoint
CREATE INDEX `api_blacklist_audit_actor_idx` ON `api_blacklist_audit` (`actor_email`);--> statement-breakpoint
CREATE TABLE `api_keys` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`key_prefix` text NOT NULL,
	`key_hash` text NOT NULL,
	`checksum` text NOT NULL,
	`plan_id` text,
	`owner_email` text,
	`status` text DEFAULT 'active' NOT NULL,
	`revoked_at` integer,
	`expires_at` integer,
	`last_used_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`plan_id`) REFERENCES `api_plans`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `api_keys_hash_unique` ON `api_keys` (`key_hash`);--> statement-breakpoint
CREATE INDEX `api_keys_status_idx` ON `api_keys` (`status`);--> statement-breakpoint
CREATE INDEX `api_keys_plan_idx` ON `api_keys` (`plan_id`);--> statement-breakpoint
CREATE INDEX `api_keys_owner_idx` ON `api_keys` (`owner_email`);--> statement-breakpoint
CREATE TABLE `api_plans` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`daily_quota` integer NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `api_plans_slug_unique` ON `api_plans` (`slug`);--> statement-breakpoint
CREATE INDEX `api_plans_active_idx` ON `api_plans` (`is_active`);--> statement-breakpoint
CREATE TABLE `api_usage_daily` (
	`id` text PRIMARY KEY NOT NULL,
	`day` text NOT NULL,
	`subject` text NOT NULL,
	`key_id` text,
	`domain` text NOT NULL,
	`ip` text,
	`count` integer DEFAULT 0 NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`key_id`) REFERENCES `api_keys`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `api_usage_daily_day_idx` ON `api_usage_daily` (`day`);--> statement-breakpoint
CREATE INDEX `api_usage_daily_subject_idx` ON `api_usage_daily` (`subject`);--> statement-breakpoint
CREATE INDEX `api_usage_daily_key_idx` ON `api_usage_daily` (`key_id`);--> statement-breakpoint
CREATE INDEX `api_usage_daily_domain_idx` ON `api_usage_daily` (`domain`);--> statement-breakpoint
CREATE UNIQUE INDEX `api_usage_daily_subject_day_domain_ip_unique` ON `api_usage_daily` (`subject`,`day`,`domain`,`ip`);--> statement-breakpoint
CREATE TABLE `api_usage_window` (
	`id` text PRIMARY KEY NOT NULL,
	`window` text NOT NULL,
	`subject` text NOT NULL,
	`domain` text NOT NULL,
	`count` integer DEFAULT 0 NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `api_usage_window_window_idx` ON `api_usage_window` (`window`);--> statement-breakpoint
CREATE INDEX `api_usage_window_subject_idx` ON `api_usage_window` (`subject`);--> statement-breakpoint
CREATE INDEX `api_usage_window_domain_idx` ON `api_usage_window` (`domain`);--> statement-breakpoint
CREATE UNIQUE INDEX `api_usage_window_subject_window_domain_unique` ON `api_usage_window` (`subject`,`window`,`domain`);--> statement-breakpoint
CREATE TABLE `api_whitelist` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`value` text NOT NULL,
	`note` text,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `api_whitelist_value_unique` ON `api_whitelist` (`value`);--> statement-breakpoint
CREATE INDEX `api_whitelist_active_idx` ON `api_whitelist` (`is_active`);--> statement-breakpoint
CREATE INDEX `api_whitelist_type_idx` ON `api_whitelist` (`type`);--> statement-breakpoint
CREATE TABLE `api_whitelist_audit` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`action` text NOT NULL,
	`whitelist_id` text,
	`type` text,
	`value` text,
	`actor_id` text,
	`actor_email` text,
	`before` text,
	`after` text
);
--> statement-breakpoint
CREATE INDEX `api_whitelist_audit_created_at_idx` ON `api_whitelist_audit` (`created_at`);--> statement-breakpoint
CREATE INDEX `api_whitelist_audit_action_idx` ON `api_whitelist_audit` (`action`);--> statement-breakpoint
CREATE INDEX `api_whitelist_audit_value_idx` ON `api_whitelist_audit` (`value`);--> statement-breakpoint
CREATE INDEX `api_whitelist_audit_actor_idx` ON `api_whitelist_audit` (`actor_email`);--> statement-breakpoint
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
	`status` text DEFAULT 'published' NOT NULL,
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
CREATE INDEX `fonts_brand_idx` ON `fonts` (`brand_id`);--> statement-breakpoint
CREATE TABLE `security_switches` (
	`id` text PRIMARY KEY NOT NULL,
	`key` text NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `security_switches_key_unique` ON `security_switches` (`key`);--> statement-breakpoint
CREATE INDEX `security_switches_enabled_idx` ON `security_switches` (`enabled`);--> statement-breakpoint
CREATE TABLE `security_switches_audit` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`action` text NOT NULL,
	`switch_key` text,
	`actor_id` text,
	`actor_email` text,
	`before` text,
	`after` text
);
--> statement-breakpoint
CREATE INDEX `security_switches_audit_created_at_idx` ON `security_switches_audit` (`created_at`);--> statement-breakpoint
CREATE INDEX `security_switches_audit_action_idx` ON `security_switches_audit` (`action`);--> statement-breakpoint
CREATE INDEX `security_switches_audit_switch_key_idx` ON `security_switches_audit` (`switch_key`);--> statement-breakpoint
CREATE INDEX `security_switches_audit_actor_idx` ON `security_switches_audit` (`actor_email`);--> statement-breakpoint
CREATE TABLE `styles` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`description` text,
	`order` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `styles_name_unique` ON `styles` (`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `styles_slug_unique` ON `styles` (`slug`);
