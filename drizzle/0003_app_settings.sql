CREATE TABLE "app_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"hearing_template" text DEFAULT 'שלום {client_name},
תזכורת: נקבע דיון בתיק "{case_title}" בתאריך {date} בשעה {time}{court}.
לכל שאלה ניתן לפנות למשרד.' NOT NULL,
	"deadline_template" text DEFAULT 'שלום {client_name},
תזכורת בנוגע לתיק "{case_title}": {title} — עד לתאריך {date}.
לכל שאלה ניתן לפנות למשרד.' NOT NULL,
	"hearing_days_before" jsonb DEFAULT '[3,1]'::jsonb NOT NULL,
	"deadline_critical_days" jsonb DEFAULT '[7,1]'::jsonb NOT NULL,
	"deadline_high_days" jsonb DEFAULT '[3]'::jsonb NOT NULL,
	"default_channel" "reminder_channel" DEFAULT 'whatsapp' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
