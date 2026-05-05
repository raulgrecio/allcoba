CREATE SCHEMA "scraper";
--> statement-breakpoint
CREATE TABLE "scraper"."scraped_general" (
	"id" uuid PRIMARY KEY NOT NULL,
	"display_name" text,
	"phones" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"telegram" jsonb,
	"address" jsonb,
	"description" text,
	"price" jsonb,
	"images" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"vertical" text NOT NULL,
	"external_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"verification_status" text NOT NULL,
	"confidence_score" jsonb NOT NULL,
	"signals" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"attributes" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"last_scraped_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scraper"."scraped_jobs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"display_name" text,
	"phones" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"telegram" jsonb,
	"address" jsonb,
	"description" text,
	"price" jsonb,
	"images" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"vertical" text NOT NULL,
	"external_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"verification_status" text NOT NULL,
	"confidence_score" jsonb NOT NULL,
	"signals" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"attributes" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"last_scraped_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scraper"."scraped_motor" (
	"id" uuid PRIMARY KEY NOT NULL,
	"display_name" text,
	"phones" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"telegram" jsonb,
	"address" jsonb,
	"description" text,
	"price" jsonb,
	"images" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"vertical" text NOT NULL,
	"external_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"verification_status" text NOT NULL,
	"confidence_score" jsonb NOT NULL,
	"signals" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"attributes" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"last_scraped_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scraper"."scraped_real_estate" (
	"id" uuid PRIMARY KEY NOT NULL,
	"display_name" text,
	"phones" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"telegram" jsonb,
	"address" jsonb,
	"description" text,
	"price" jsonb,
	"images" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"vertical" text NOT NULL,
	"external_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"verification_status" text NOT NULL,
	"confidence_score" jsonb NOT NULL,
	"signals" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"attributes" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"last_scraped_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scraper"."scraped_services" (
	"id" uuid PRIMARY KEY NOT NULL,
	"display_name" text,
	"phones" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"telegram" jsonb,
	"address" jsonb,
	"description" text,
	"price" jsonb,
	"images" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"vertical" text NOT NULL,
	"external_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"verification_status" text NOT NULL,
	"confidence_score" jsonb NOT NULL,
	"signals" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"attributes" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"last_scraped_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
