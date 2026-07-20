CREATE TABLE "contracts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"contract_number" text NOT NULL,
	"contract_type" text NOT NULL,
	"plan_code" text NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"renewal_date" date,
	"annual_value" numeric(12, 2),
	"implementation_fee" numeric(12, 2),
	"facility_limit" integer,
	"user_limit" integer,
	"ai_limit" integer,
	"payment_terms" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"signed_at" timestamp with time zone,
	"document_reference" text,
	"internal_notes" text,
	"created_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"invoice_number" text NOT NULL,
	"purchase_order_number" text,
	"issue_date" date NOT NULL,
	"due_date" date,
	"amount_due" numeric(12, 2) NOT NULL,
	"amount_paid" numeric(12, 2) DEFAULT '0' NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"status" text DEFAULT 'not_issued' NOT NULL,
	"payment_terms" text,
	"billing_email" text,
	"description" text,
	"paid_at" timestamp with time zone,
	"voided_at" timestamp with time zone,
	"created_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "legal_name" text;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "display_name" text;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "subscription_status" text DEFAULT 'pending_activation' NOT NULL;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "plan_code" text DEFAULT 'individual' NOT NULL;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "billing_type" text DEFAULT 'manual_agreement' NOT NULL;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "billing_email" text;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "billing_contact_name" text;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "purchase_order_number" text;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "contract_number" text;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "contract_start_date" date;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "contract_end_date" date;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "renewal_date" date;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "payment_terms" text;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "invoice_status" text DEFAULT 'not_issued' NOT NULL;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "invoice_number" text;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "amount_contracted" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "currency" text DEFAULT 'USD' NOT NULL;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "facility_limit" integer;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "user_limit" integer;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "monthly_ai_request_limit" integer;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "grace_period_ends_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "activated_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "activated_by_user_id" uuid;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "suspended_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "restricted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "internal_billing_notes" text;--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "contract_number_uq" ON "contracts" USING btree ("contract_number");--> statement-breakpoint
CREATE INDEX "contract_org_idx" ON "contracts" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "contract_org_status_idx" ON "contracts" USING btree ("organization_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "invoice_number_uq" ON "invoices" USING btree ("invoice_number");--> statement-breakpoint
CREATE INDEX "invoice_org_idx" ON "invoices" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "invoice_org_status_idx" ON "invoices" USING btree ("organization_id","status");--> statement-breakpoint
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_activated_by_user_id_users_id_fk" FOREIGN KEY ("activated_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;