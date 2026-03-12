CREATE TABLE `api_domain_blacklist` (
	`id` text PRIMARY KEY NOT NULL,
	`domain` text NOT NULL,
	`reason` text,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `api_domain_blacklist_domain_unique` ON `api_domain_blacklist` (`domain`);--> statement-breakpoint
CREATE INDEX `api_domain_blacklist_active_idx` ON `api_domain_blacklist` (`is_active`);--> statement-breakpoint
CREATE TABLE `api_domain_whitelist` (
	`id` text PRIMARY KEY NOT NULL,
	`domain` text NOT NULL,
	`note` text,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `api_domain_whitelist_domain_unique` ON `api_domain_whitelist` (`domain`);--> statement-breakpoint
CREATE INDEX `api_domain_whitelist_active_idx` ON `api_domain_whitelist` (`is_active`);--> statement-breakpoint
CREATE TABLE `api_domain_whitelist_audit` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`action` text NOT NULL,
	`whitelist_id` text,
	`domain` text,
	`actor_id` text,
	`actor_email` text,
	`before` text,
	`after` text
);
--> statement-breakpoint
CREATE INDEX `api_domain_whitelist_audit_created_at_idx` ON `api_domain_whitelist_audit` (`created_at`);--> statement-breakpoint
CREATE INDEX `api_domain_whitelist_audit_action_idx` ON `api_domain_whitelist_audit` (`action`);--> statement-breakpoint
CREATE INDEX `api_domain_whitelist_audit_domain_idx` ON `api_domain_whitelist_audit` (`domain`);--> statement-breakpoint
CREATE INDEX `api_domain_whitelist_audit_actor_idx` ON `api_domain_whitelist_audit` (`actor_email`);--> statement-breakpoint
CREATE TABLE `api_ip_whitelist` (
	`id` text PRIMARY KEY NOT NULL,
	`ip` text NOT NULL,
	`note` text,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `api_ip_whitelist_ip_unique` ON `api_ip_whitelist` (`ip`);--> statement-breakpoint
CREATE INDEX `api_ip_whitelist_active_idx` ON `api_ip_whitelist` (`is_active`);--> statement-breakpoint
CREATE TABLE `api_ip_whitelist_audit` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`action` text NOT NULL,
	`whitelist_id` text,
	`ip` text,
	`actor_id` text,
	`actor_email` text,
	`before` text,
	`after` text
);
--> statement-breakpoint
CREATE INDEX `api_ip_whitelist_audit_created_at_idx` ON `api_ip_whitelist_audit` (`created_at`);--> statement-breakpoint
CREATE INDEX `api_ip_whitelist_audit_action_idx` ON `api_ip_whitelist_audit` (`action`);--> statement-breakpoint
CREATE INDEX `api_ip_whitelist_audit_ip_idx` ON `api_ip_whitelist_audit` (`ip`);--> statement-breakpoint
CREATE INDEX `api_ip_whitelist_audit_actor_idx` ON `api_ip_whitelist_audit` (`actor_email`);