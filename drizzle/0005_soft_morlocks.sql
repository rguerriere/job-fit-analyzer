CREATE TABLE `qa_questions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`default_key` text,
	`group_id` text NOT NULL,
	`sort_order` integer NOT NULL,
	`text` text NOT NULL,
	`hint` text,
	`star` integer DEFAULT false NOT NULL,
	`answer` text DEFAULT '' NOT NULL,
	`grade` text,
	`feedback` text,
	`graded_answer` text,
	`graded_for` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `qa_questions_default_idx` ON `qa_questions` (`user_id`,`default_key`);