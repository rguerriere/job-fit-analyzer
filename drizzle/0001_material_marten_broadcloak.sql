CREATE TABLE `analyses` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`job_title` text NOT NULL,
	`company` text,
	`posting_text` text NOT NULL,
	`score` integer,
	`previous_score` integer,
	`requirements` text NOT NULL,
	`entry_titles` text NOT NULL,
	`analyzed_at` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `analyses_user_idx` ON `analyses` (`user_id`);