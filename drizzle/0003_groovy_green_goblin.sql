CREATE TABLE `deep_dive_answers` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`position_id` text NOT NULL,
	`bullet_index` integer NOT NULL,
	`answer` text NOT NULL,
	`grade` text,
	`feedback` text,
	`graded_answer` text,
	`graded_for` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`position_id`) REFERENCES `deep_dive_positions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `deep_dive_answers_target_idx` ON `deep_dive_answers` (`position_id`,`bullet_index`);--> statement-breakpoint
CREATE TABLE `deep_dive_positions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`source_entry_id` text,
	`section` text DEFAULT 'experience' NOT NULL,
	`sort_order` integer NOT NULL,
	`title` text NOT NULL,
	`organization` text,
	`start_date` text,
	`end_date` text,
	`description` text,
	`bullets` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `deep_dive_positions_user_idx` ON `deep_dive_positions` (`user_id`);--> statement-breakpoint
CREATE TABLE `interview_prep_state` (
	`user_id` text PRIMARY KEY NOT NULL,
	`acknowledged_fingerprint` text NOT NULL,
	`acknowledged_at` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
