CREATE TABLE `rate_limits` (
	`bucket` text PRIMARY KEY NOT NULL,
	`requests` integer NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `reports` (
	`id` text PRIMARY KEY NOT NULL,
	`zone` integer NOT NULL,
	`created_at` text NOT NULL,
	`data` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `reports_zone_date` ON `reports` (`zone`,`created_at`);--> statement-breakpoint
CREATE TABLE `analysis_tickets` (
	`token` text PRIMARY KEY NOT NULL,
	`photo_hash` text NOT NULL,
	`analysis` text NOT NULL,
	`expires_at` integer NOT NULL
);
