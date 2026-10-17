import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_products_currency" AS ENUM('ARS', 'USD');
  CREATE TYPE "public"."enum_products_tax_rate" AS ENUM('21', '10.5', '0');
  CREATE TYPE "public"."enum_products_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__products_v_version_currency" AS ENUM('ARS', 'USD');
  CREATE TYPE "public"."enum__products_v_version_tax_rate" AS ENUM('21', '10.5', '0');
  CREATE TYPE "public"."enum__products_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_orders_status" AS ENUM('pending_payment', 'paid', 'preparing', 'shipped', 'delivered', 'cancelled', 'refunded');
  CREATE TYPE "public"."enum_orders_payment_method" AS ENUM('mercadopago', 'transfer');
  CREATE TYPE "public"."enum_orders_needs_review" AS ENUM('none', 'oversold', 'amount_mismatch', 'other');
  CREATE TYPE "public"."enum_orders_shipping_address_province" AS ENUM('Buenos Aires', 'CABA', 'Catamarca', 'Chaco', 'Chubut', 'Córdoba', 'Corrientes', 'Entre Ríos', 'Formosa', 'Jujuy', 'La Pampa', 'La Rioja', 'Mendoza', 'Misiones', 'Neuquén', 'Río Negro', 'Salta', 'San Juan', 'San Luis', 'Santa Cruz', 'Santa Fe', 'Santiago del Estero', 'Tierra del Fuego', 'Tucumán');
  CREATE TYPE "public"."enum_customers_addresses_province" AS ENUM('Buenos Aires', 'CABA', 'Catamarca', 'Chaco', 'Chubut', 'Córdoba', 'Corrientes', 'Entre Ríos', 'Formosa', 'Jujuy', 'La Pampa', 'La Rioja', 'Mendoza', 'Misiones', 'Neuquén', 'Río Negro', 'Salta', 'San Juan', 'San Luis', 'Santa Cruz', 'Santa Fe', 'Santiago del Estero', 'Tierra del Fuego', 'Tucumán');
  CREATE TYPE "public"."enum_coupons_type" AS ENUM('percent', 'fixed');
  CREATE TYPE "public"."enum_shipping_zones_provinces" AS ENUM('Buenos Aires', 'CABA', 'Catamarca', 'Chaco', 'Chubut', 'Córdoba', 'Corrientes', 'Entre Ríos', 'Formosa', 'Jujuy', 'La Pampa', 'La Rioja', 'Mendoza', 'Misiones', 'Neuquén', 'Río Negro', 'Salta', 'San Juan', 'San Luis', 'Santa Cruz', 'Santa Fe', 'Santiago del Estero', 'Tierra del Fuego', 'Tucumán');
  CREATE TYPE "public"."enum_payment_events_source" AS ENUM('webhook', 'return', 'reconcile');
  CREATE TYPE "public"."enum_regret_requests_status" AS ENUM('received', 'processing', 'closed');
  CREATE TYPE "public"."enum_pages_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__pages_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_users_role" AS ENUM('admin', 'staff');
  CREATE TYPE "public"."enum_exchange_rate_mode" AS ENUM('auto', 'manual');
  CREATE TABLE "products_options" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar
  );
  
  CREATE TABLE "products" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"slug" varchar,
  	"featured" boolean DEFAULT false,
  	"short_description" varchar,
  	"description" jsonb,
  	"currency" "enum_products_currency" DEFAULT 'ARS',
  	"price" numeric,
  	"compare_at_price" numeric,
  	"tax_rate" "enum_products_tax_rate" DEFAULT '21',
  	"weight_grams" numeric DEFAULT 500,
  	"length_cm" numeric DEFAULT 20,
  	"width_cm" numeric DEFAULT 15,
  	"height_cm" numeric DEFAULT 10,
  	"meta_title" varchar,
  	"meta_description" varchar,
  	"meta_image_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_products_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "products_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "products_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"categories_id" integer,
  	"media_id" integer
  );
  
  CREATE TABLE "_products_v_version_options" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_products_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_title" varchar,
  	"version_slug" varchar,
  	"version_featured" boolean DEFAULT false,
  	"version_short_description" varchar,
  	"version_description" jsonb,
  	"version_currency" "enum__products_v_version_currency" DEFAULT 'ARS',
  	"version_price" numeric,
  	"version_compare_at_price" numeric,
  	"version_tax_rate" "enum__products_v_version_tax_rate" DEFAULT '21',
  	"version_weight_grams" numeric DEFAULT 500,
  	"version_length_cm" numeric DEFAULT 20,
  	"version_width_cm" numeric DEFAULT 15,
  	"version_height_cm" numeric DEFAULT 10,
  	"version_meta_title" varchar,
  	"version_meta_description" varchar,
  	"version_meta_image_id" integer,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__products_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean
  );
  
  CREATE TABLE "_products_v_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "_products_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"categories_id" integer,
  	"media_id" integer
  );
  
  CREATE TABLE "variants_options" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"value" varchar NOT NULL
  );
  
  CREATE TABLE "variants" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"product_id" integer NOT NULL,
  	"sku" varchar NOT NULL,
  	"stock" numeric DEFAULT 0 NOT NULL,
  	"price_override" numeric,
  	"image_id" integer,
  	"active" boolean DEFAULT true,
  	"label" varchar,
  	"title" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "categories" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"slug" varchar,
  	"parent_id" integer,
  	"order" numeric DEFAULT 0,
  	"image_id" integer,
  	"description" varchar,
  	"meta_title" varchar,
  	"meta_description" varchar,
  	"meta_image_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "media" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"alt" varchar NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric,
  	"focal_x" numeric,
  	"focal_y" numeric,
  	"sizes_thumbnail_url" varchar,
  	"sizes_thumbnail_width" numeric,
  	"sizes_thumbnail_height" numeric,
  	"sizes_thumbnail_mime_type" varchar,
  	"sizes_thumbnail_filesize" numeric,
  	"sizes_thumbnail_filename" varchar,
  	"sizes_card_url" varchar,
  	"sizes_card_width" numeric,
  	"sizes_card_height" numeric,
  	"sizes_card_mime_type" varchar,
  	"sizes_card_filesize" numeric,
  	"sizes_card_filename" varchar,
  	"sizes_large_url" varchar,
  	"sizes_large_width" numeric,
  	"sizes_large_height" numeric,
  	"sizes_large_mime_type" varchar,
  	"sizes_large_filesize" numeric,
  	"sizes_large_filename" varchar
  );
  
  CREATE TABLE "orders_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"product_id" integer,
  	"variant_id" integer,
  	"title" varchar,
  	"variant_title" varchar,
  	"sku" varchar,
  	"qty" numeric,
  	"currency_original" varchar,
  	"unit_price_original" numeric,
  	"unit_price" numeric,
  	"line_total" numeric,
  	"weight_grams" numeric
  );
  
  CREATE TABLE "orders_status_history" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"from" varchar,
  	"to" varchar,
  	"at" timestamp(3) with time zone,
  	"by" varchar,
  	"note" varchar
  );
  
  CREATE TABLE "orders" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order_number" varchar,
  	"status" "enum_orders_status" DEFAULT 'pending_payment' NOT NULL,
  	"payment_method" "enum_orders_payment_method" NOT NULL,
  	"needs_review" "enum_orders_needs_review" DEFAULT 'none',
  	"admin_notes" varchar,
  	"customer_id" integer,
  	"first_name" varchar NOT NULL,
  	"last_name" varchar NOT NULL,
  	"email" varchar NOT NULL,
  	"phone" varchar,
  	"dni" varchar,
  	"access_token" varchar,
  	"totals_subtotal" numeric,
  	"totals_coupon_discount" numeric,
  	"totals_transfer_discount" numeric,
  	"totals_shipping" numeric,
  	"totals_total" numeric,
  	"totals_vat_included" numeric,
  	"coupon_code" varchar,
  	"coupon_type" varchar,
  	"coupon_value" numeric,
  	"exchange_rate_rate" numeric,
  	"exchange_rate_source" varchar,
  	"exchange_rate_fetched_at" timestamp(3) with time zone,
  	"shipping_method_rate_id" varchar,
  	"shipping_method_provider" varchar,
  	"shipping_method_service" varchar,
  	"shipping_method_carrier" varchar,
  	"shipping_method_label" varchar,
  	"shipping_method_price" numeric,
  	"shipping_address_street" varchar,
  	"shipping_address_number" varchar,
  	"shipping_address_floor" varchar,
  	"shipping_address_city" varchar,
  	"shipping_address_province" "enum_orders_shipping_address_province",
  	"shipping_address_postal_code" varchar,
  	"shipping_address_notes" varchar,
  	"shipment_carrier" varchar,
  	"shipment_tracking_number" varchar,
  	"shipment_tracking_url" varchar,
  	"shipment_provider_shipment_id" varchar,
  	"shipment_label_url" varchar,
  	"shipment_shipped_at" timestamp(3) with time zone,
  	"mp_preference_id" varchar,
  	"mp_payment_id" varchar,
  	"mp_status" varchar,
  	"mp_status_detail" varchar,
  	"mp_payment_type_id" varchar,
  	"mp_payment_method_id" varchar,
  	"mp_installments" numeric,
  	"mp_transaction_amount" numeric,
  	"mp_net_received_amount" numeric,
  	"mp_approved_at" timestamp(3) with time zone,
  	"mp_init_point" varchar,
  	"paid_at" timestamp(3) with time zone,
  	"reservation_expires_at" timestamp(3) with time zone,
  	"stock_released" boolean DEFAULT false,
  	"coupon_released" boolean DEFAULT false,
  	"invoice_number" varchar,
  	"invoice_cae" varchar,
  	"invoice_url" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "customers_addresses" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"street" varchar NOT NULL,
  	"number" varchar NOT NULL,
  	"floor" varchar,
  	"city" varchar NOT NULL,
  	"province" "enum_customers_addresses_province" NOT NULL,
  	"postal_code" varchar NOT NULL,
  	"is_default" boolean
  );
  
  CREATE TABLE "customers_sessions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"created_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone NOT NULL
  );
  
  CREATE TABLE "customers" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"first_name" varchar,
  	"last_name" varchar,
  	"phone" varchar,
  	"dni" varchar,
  	"marketing_opt_in" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"email" varchar NOT NULL,
  	"reset_password_token" varchar,
  	"reset_password_expiration" timestamp(3) with time zone,
  	"salt" varchar,
  	"hash" varchar,
  	"reset_password_requested_at" timestamp(3) with time zone,
  	"_verified" boolean,
  	"_verificationtoken" varchar,
  	"login_attempts" numeric DEFAULT 0,
  	"lock_until" timestamp(3) with time zone
  );
  
  CREATE TABLE "coupons" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"code" varchar NOT NULL,
  	"active" boolean DEFAULT true,
  	"description" varchar,
  	"type" "enum_coupons_type" DEFAULT 'percent' NOT NULL,
  	"value" numeric NOT NULL,
  	"min_subtotal" numeric DEFAULT 0,
  	"starts_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone,
  	"usage_limit" numeric,
  	"per_customer_limit" numeric,
  	"usage_count" numeric DEFAULT 0,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "shipping_zones_provinces" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_shipping_zones_provinces",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "shipping_zones_postal_ranges" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"from" numeric NOT NULL,
  	"to" numeric NOT NULL
  );
  
  CREATE TABLE "shipping_zones_weight_brackets" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"max_grams" numeric NOT NULL,
  	"price" numeric NOT NULL
  );
  
  CREATE TABLE "shipping_zones" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"priority" numeric DEFAULT 0,
  	"active" boolean DEFAULT true,
  	"extra_per_kg" numeric,
  	"free_eligible" boolean DEFAULT true,
  	"eta_days_min" numeric,
  	"eta_days_max" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payment_events" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"event_key" varchar NOT NULL,
  	"mp_payment_id" varchar,
  	"status" varchar,
  	"status_detail" varchar,
  	"order_id" integer,
  	"source" "enum_payment_events_source",
  	"raw" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "regret_requests" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"code" varchar,
  	"status" "enum_regret_requests_status" DEFAULT 'received',
  	"order_number" varchar NOT NULL,
  	"order_id" integer,
  	"name" varchar NOT NULL,
  	"email" varchar NOT NULL,
  	"phone" varchar,
  	"reason" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "pages" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"slug" varchar,
  	"show_in_footer" boolean DEFAULT true,
  	"content" jsonb,
  	"meta_title" varchar,
  	"meta_description" varchar,
  	"meta_image_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_pages_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "_pages_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_title" varchar,
  	"version_slug" varchar,
  	"version_show_in_footer" boolean DEFAULT true,
  	"version_content" jsonb,
  	"version_meta_title" varchar,
  	"version_meta_description" varchar,
  	"version_meta_image_id" integer,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__pages_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean
  );
  
  CREATE TABLE "exchange_rate_history" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"sell" numeric,
  	"buy" numeric,
  	"source" varchar,
  	"api_updated_at" timestamp(3) with time zone,
  	"accepted" boolean,
  	"note" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "users_sessions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"created_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone NOT NULL
  );
  
  CREATE TABLE "users" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"role" "enum_users_role" DEFAULT 'staff' NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"email" varchar NOT NULL,
  	"reset_password_token" varchar,
  	"reset_password_expiration" timestamp(3) with time zone,
  	"salt" varchar,
  	"hash" varchar,
  	"reset_password_requested_at" timestamp(3) with time zone,
  	"login_attempts" numeric DEFAULT 0,
  	"lock_until" timestamp(3) with time zone
  );
  
  CREATE TABLE "payload_kv" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar NOT NULL,
  	"data" jsonb NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"global_slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"products_id" integer,
  	"variants_id" integer,
  	"categories_id" integer,
  	"media_id" integer,
  	"orders_id" integer,
  	"customers_id" integer,
  	"coupons_id" integer,
  	"shipping_zones_id" integer,
  	"payment_events_id" integer,
  	"regret_requests_id" integer,
  	"pages_id" integer,
  	"exchange_rate_history_id" integer,
  	"users_id" integer
  );
  
  CREATE TABLE "payload_preferences" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar,
  	"value" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_preferences_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"customers_id" integer,
  	"users_id" integer
  );
  
  CREATE TABLE "payload_migrations" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"batch" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "store_settings" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"store_name" varchar DEFAULT 'Tosh' NOT NULL,
  	"tagline" varchar,
  	"legal_name" varchar,
  	"cuit" varchar,
  	"address" varchar,
  	"contact_email" varchar,
  	"whatsapp_number" varchar,
  	"instagram" varchar,
  	"facebook" varchar,
  	"tiktok" varchar,
  	"data_fiscal_url" varchar,
  	"data_fiscal_image_id" integer,
  	"price_rounding_step" numeric DEFAULT 10,
  	"free_shipping_threshold" numeric,
  	"installments_enabled" boolean DEFAULT true,
  	"installments_count" numeric DEFAULT 3,
  	"installments_interest_free" boolean DEFAULT true,
  	"mercado_pago_enabled" boolean DEFAULT true,
  	"transfer_enabled" boolean DEFAULT true,
  	"transfer_discount_percent" numeric DEFAULT 10,
  	"bank_bank_name" varchar,
  	"bank_holder" varchar,
  	"bank_cuit" varchar,
  	"bank_cbu" varchar,
  	"bank_alias" varchar,
  	"reservation_ttl_minutes_m_p" numeric DEFAULT 30,
  	"reservation_ttl_hours_transfer" numeric DEFAULT 48,
  	"ga4_id" varchar,
  	"meta_pixel_id" varchar,
  	"announcement" varchar,
  	"hero_title" varchar,
  	"hero_subtitle" varchar,
  	"hero_image_id" integer,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "store_settings_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "exchange_rate" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"mode" "enum_exchange_rate_mode" DEFAULT 'auto' NOT NULL,
  	"manual_rate" numeric,
  	"effective_rate" numeric,
  	"auto_sell" numeric,
  	"auto_buy" numeric,
  	"api_updated_at" timestamp(3) with time zone,
  	"checked_at" timestamp(3) with time zone,
  	"last_error" varchar,
  	"max_staleness_hours" numeric DEFAULT 6,
  	"max_delta_percent" numeric DEFAULT 15,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "shipping_settings" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"origin_street" varchar,
  	"origin_number" varchar,
  	"origin_city" varchar,
  	"origin_province" varchar,
  	"origin_postal_code" varchar,
  	"pickup_enabled" boolean DEFAULT true,
  	"pickup_address" varchar,
  	"pickup_hours" varchar,
  	"rate_table_enabled" boolean DEFAULT true,
  	"zipnova_enabled" boolean DEFAULT false,
  	"zipnova_account_id" varchar,
  	"zipnova_origin_id" varchar,
  	"zipnova_markup_percent" numeric DEFAULT 0,
  	"correo_argentino_enabled" boolean DEFAULT false,
  	"andreani_enabled" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  ALTER TABLE "products_options" ADD CONSTRAINT "products_options_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products" ADD CONSTRAINT "products_meta_image_id_media_id_fk" FOREIGN KEY ("meta_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "products_texts" ADD CONSTRAINT "products_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_rels" ADD CONSTRAINT "products_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_rels" ADD CONSTRAINT "products_rels_categories_fk" FOREIGN KEY ("categories_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_rels" ADD CONSTRAINT "products_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_version_options" ADD CONSTRAINT "_products_v_version_options_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_products_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v" ADD CONSTRAINT "_products_v_parent_id_products_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_products_v" ADD CONSTRAINT "_products_v_version_meta_image_id_media_id_fk" FOREIGN KEY ("version_meta_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_products_v_texts" ADD CONSTRAINT "_products_v_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_products_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_rels" ADD CONSTRAINT "_products_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_products_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_rels" ADD CONSTRAINT "_products_v_rels_categories_fk" FOREIGN KEY ("categories_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_rels" ADD CONSTRAINT "_products_v_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "variants_options" ADD CONSTRAINT "variants_options_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."variants"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "variants" ADD CONSTRAINT "variants_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "variants" ADD CONSTRAINT "variants_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_categories_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "categories" ADD CONSTRAINT "categories_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "categories" ADD CONSTRAINT "categories_meta_image_id_media_id_fk" FOREIGN KEY ("meta_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "orders_items" ADD CONSTRAINT "orders_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "orders_items" ADD CONSTRAINT "orders_items_variant_id_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."variants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "orders_items" ADD CONSTRAINT "orders_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "orders_status_history" ADD CONSTRAINT "orders_status_history_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "customers_addresses" ADD CONSTRAINT "customers_addresses_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "customers_sessions" ADD CONSTRAINT "customers_sessions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "shipping_zones_provinces" ADD CONSTRAINT "shipping_zones_provinces_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."shipping_zones"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "shipping_zones_postal_ranges" ADD CONSTRAINT "shipping_zones_postal_ranges_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."shipping_zones"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "shipping_zones_weight_brackets" ADD CONSTRAINT "shipping_zones_weight_brackets_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."shipping_zones"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payment_events" ADD CONSTRAINT "payment_events_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "regret_requests" ADD CONSTRAINT "regret_requests_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages" ADD CONSTRAINT "pages_meta_image_id_media_id_fk" FOREIGN KEY ("meta_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v" ADD CONSTRAINT "_pages_v_parent_id_pages_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."pages"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v" ADD CONSTRAINT "_pages_v_version_meta_image_id_media_id_fk" FOREIGN KEY ("version_meta_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "users_sessions" ADD CONSTRAINT "users_sessions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_locked_documents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_products_fk" FOREIGN KEY ("products_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_variants_fk" FOREIGN KEY ("variants_id") REFERENCES "public"."variants"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_categories_fk" FOREIGN KEY ("categories_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_orders_fk" FOREIGN KEY ("orders_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_customers_fk" FOREIGN KEY ("customers_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_coupons_fk" FOREIGN KEY ("coupons_id") REFERENCES "public"."coupons"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_shipping_zones_fk" FOREIGN KEY ("shipping_zones_id") REFERENCES "public"."shipping_zones"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_payment_events_fk" FOREIGN KEY ("payment_events_id") REFERENCES "public"."payment_events"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_regret_requests_fk" FOREIGN KEY ("regret_requests_id") REFERENCES "public"."regret_requests"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_pages_fk" FOREIGN KEY ("pages_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_exchange_rate_history_fk" FOREIGN KEY ("exchange_rate_history_id") REFERENCES "public"."exchange_rate_history"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_preferences"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_customers_fk" FOREIGN KEY ("customers_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "store_settings" ADD CONSTRAINT "store_settings_data_fiscal_image_id_media_id_fk" FOREIGN KEY ("data_fiscal_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "store_settings" ADD CONSTRAINT "store_settings_hero_image_id_media_id_fk" FOREIGN KEY ("hero_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "store_settings_texts" ADD CONSTRAINT "store_settings_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."store_settings"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "products_options_order_idx" ON "products_options" USING btree ("_order");
  CREATE INDEX "products_options_parent_id_idx" ON "products_options" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "products_slug_idx" ON "products" USING btree ("slug");
  CREATE INDEX "products_meta_meta_image_idx" ON "products" USING btree ("meta_image_id");
  CREATE INDEX "products_updated_at_idx" ON "products" USING btree ("updated_at");
  CREATE INDEX "products_created_at_idx" ON "products" USING btree ("created_at");
  CREATE INDEX "products__status_idx" ON "products" USING btree ("_status");
  CREATE INDEX "products_texts_order_parent" ON "products_texts" USING btree ("order","parent_id");
  CREATE INDEX "products_rels_order_idx" ON "products_rels" USING btree ("order");
  CREATE INDEX "products_rels_parent_idx" ON "products_rels" USING btree ("parent_id");
  CREATE INDEX "products_rels_path_idx" ON "products_rels" USING btree ("path");
  CREATE INDEX "products_rels_categories_id_idx" ON "products_rels" USING btree ("categories_id");
  CREATE INDEX "products_rels_media_id_idx" ON "products_rels" USING btree ("media_id");
  CREATE INDEX "_products_v_version_options_order_idx" ON "_products_v_version_options" USING btree ("_order");
  CREATE INDEX "_products_v_version_options_parent_id_idx" ON "_products_v_version_options" USING btree ("_parent_id");
  CREATE INDEX "_products_v_parent_idx" ON "_products_v" USING btree ("parent_id");
  CREATE INDEX "_products_v_version_version_slug_idx" ON "_products_v" USING btree ("version_slug");
  CREATE INDEX "_products_v_version_meta_version_meta_image_idx" ON "_products_v" USING btree ("version_meta_image_id");
  CREATE INDEX "_products_v_version_version_updated_at_idx" ON "_products_v" USING btree ("version_updated_at");
  CREATE INDEX "_products_v_version_version_created_at_idx" ON "_products_v" USING btree ("version_created_at");
  CREATE INDEX "_products_v_version_version__status_idx" ON "_products_v" USING btree ("version__status");
  CREATE INDEX "_products_v_created_at_idx" ON "_products_v" USING btree ("created_at");
  CREATE INDEX "_products_v_updated_at_idx" ON "_products_v" USING btree ("updated_at");
  CREATE INDEX "_products_v_latest_idx" ON "_products_v" USING btree ("latest");
  CREATE INDEX "_products_v_texts_order_parent" ON "_products_v_texts" USING btree ("order","parent_id");
  CREATE INDEX "_products_v_rels_order_idx" ON "_products_v_rels" USING btree ("order");
  CREATE INDEX "_products_v_rels_parent_idx" ON "_products_v_rels" USING btree ("parent_id");
  CREATE INDEX "_products_v_rels_path_idx" ON "_products_v_rels" USING btree ("path");
  CREATE INDEX "_products_v_rels_categories_id_idx" ON "_products_v_rels" USING btree ("categories_id");
  CREATE INDEX "_products_v_rels_media_id_idx" ON "_products_v_rels" USING btree ("media_id");
  CREATE INDEX "variants_options_order_idx" ON "variants_options" USING btree ("_order");
  CREATE INDEX "variants_options_parent_id_idx" ON "variants_options" USING btree ("_parent_id");
  CREATE INDEX "variants_product_idx" ON "variants" USING btree ("product_id");
  CREATE UNIQUE INDEX "variants_sku_idx" ON "variants" USING btree ("sku");
  CREATE INDEX "variants_image_idx" ON "variants" USING btree ("image_id");
  CREATE INDEX "variants_updated_at_idx" ON "variants" USING btree ("updated_at");
  CREATE INDEX "variants_created_at_idx" ON "variants" USING btree ("created_at");
  CREATE UNIQUE INDEX "categories_slug_idx" ON "categories" USING btree ("slug");
  CREATE INDEX "categories_parent_idx" ON "categories" USING btree ("parent_id");
  CREATE INDEX "categories_image_idx" ON "categories" USING btree ("image_id");
  CREATE INDEX "categories_meta_meta_image_idx" ON "categories" USING btree ("meta_image_id");
  CREATE INDEX "categories_updated_at_idx" ON "categories" USING btree ("updated_at");
  CREATE INDEX "categories_created_at_idx" ON "categories" USING btree ("created_at");
  CREATE INDEX "media_updated_at_idx" ON "media" USING btree ("updated_at");
  CREATE INDEX "media_created_at_idx" ON "media" USING btree ("created_at");
  CREATE UNIQUE INDEX "media_filename_idx" ON "media" USING btree ("filename");
  CREATE INDEX "media_sizes_thumbnail_sizes_thumbnail_filename_idx" ON "media" USING btree ("sizes_thumbnail_filename");
  CREATE INDEX "media_sizes_card_sizes_card_filename_idx" ON "media" USING btree ("sizes_card_filename");
  CREATE INDEX "media_sizes_large_sizes_large_filename_idx" ON "media" USING btree ("sizes_large_filename");
  CREATE INDEX "orders_items_order_idx" ON "orders_items" USING btree ("_order");
  CREATE INDEX "orders_items_parent_id_idx" ON "orders_items" USING btree ("_parent_id");
  CREATE INDEX "orders_items_product_idx" ON "orders_items" USING btree ("product_id");
  CREATE INDEX "orders_items_variant_idx" ON "orders_items" USING btree ("variant_id");
  CREATE INDEX "orders_status_history_order_idx" ON "orders_status_history" USING btree ("_order");
  CREATE INDEX "orders_status_history_parent_id_idx" ON "orders_status_history" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "orders_order_number_idx" ON "orders" USING btree ("order_number");
  CREATE INDEX "orders_status_idx" ON "orders" USING btree ("status");
  CREATE INDEX "orders_needs_review_idx" ON "orders" USING btree ("needs_review");
  CREATE INDEX "orders_customer_idx" ON "orders" USING btree ("customer_id");
  CREATE INDEX "orders_email_idx" ON "orders" USING btree ("email");
  CREATE INDEX "orders_mp_mp_payment_id_idx" ON "orders" USING btree ("mp_payment_id");
  CREATE INDEX "orders_reservation_expires_at_idx" ON "orders" USING btree ("reservation_expires_at");
  CREATE INDEX "orders_updated_at_idx" ON "orders" USING btree ("updated_at");
  CREATE INDEX "orders_created_at_idx" ON "orders" USING btree ("created_at");
  CREATE INDEX "customers_addresses_order_idx" ON "customers_addresses" USING btree ("_order");
  CREATE INDEX "customers_addresses_parent_id_idx" ON "customers_addresses" USING btree ("_parent_id");
  CREATE INDEX "customers_sessions_order_idx" ON "customers_sessions" USING btree ("_order");
  CREATE INDEX "customers_sessions_parent_id_idx" ON "customers_sessions" USING btree ("_parent_id");
  CREATE INDEX "customers_updated_at_idx" ON "customers" USING btree ("updated_at");
  CREATE INDEX "customers_created_at_idx" ON "customers" USING btree ("created_at");
  CREATE UNIQUE INDEX "customers_email_idx" ON "customers" USING btree ("email");
  CREATE UNIQUE INDEX "coupons_code_idx" ON "coupons" USING btree ("code");
  CREATE INDEX "coupons_updated_at_idx" ON "coupons" USING btree ("updated_at");
  CREATE INDEX "coupons_created_at_idx" ON "coupons" USING btree ("created_at");
  CREATE INDEX "shipping_zones_provinces_order_idx" ON "shipping_zones_provinces" USING btree ("order");
  CREATE INDEX "shipping_zones_provinces_parent_idx" ON "shipping_zones_provinces" USING btree ("parent_id");
  CREATE INDEX "shipping_zones_postal_ranges_order_idx" ON "shipping_zones_postal_ranges" USING btree ("_order");
  CREATE INDEX "shipping_zones_postal_ranges_parent_id_idx" ON "shipping_zones_postal_ranges" USING btree ("_parent_id");
  CREATE INDEX "shipping_zones_weight_brackets_order_idx" ON "shipping_zones_weight_brackets" USING btree ("_order");
  CREATE INDEX "shipping_zones_weight_brackets_parent_id_idx" ON "shipping_zones_weight_brackets" USING btree ("_parent_id");
  CREATE INDEX "shipping_zones_updated_at_idx" ON "shipping_zones" USING btree ("updated_at");
  CREATE INDEX "shipping_zones_created_at_idx" ON "shipping_zones" USING btree ("created_at");
  CREATE UNIQUE INDEX "payment_events_event_key_idx" ON "payment_events" USING btree ("event_key");
  CREATE INDEX "payment_events_mp_payment_id_idx" ON "payment_events" USING btree ("mp_payment_id");
  CREATE INDEX "payment_events_order_idx" ON "payment_events" USING btree ("order_id");
  CREATE INDEX "payment_events_updated_at_idx" ON "payment_events" USING btree ("updated_at");
  CREATE INDEX "payment_events_created_at_idx" ON "payment_events" USING btree ("created_at");
  CREATE UNIQUE INDEX "regret_requests_code_idx" ON "regret_requests" USING btree ("code");
  CREATE INDEX "regret_requests_order_idx" ON "regret_requests" USING btree ("order_id");
  CREATE INDEX "regret_requests_updated_at_idx" ON "regret_requests" USING btree ("updated_at");
  CREATE INDEX "regret_requests_created_at_idx" ON "regret_requests" USING btree ("created_at");
  CREATE UNIQUE INDEX "pages_slug_idx" ON "pages" USING btree ("slug");
  CREATE INDEX "pages_meta_meta_image_idx" ON "pages" USING btree ("meta_image_id");
  CREATE INDEX "pages_updated_at_idx" ON "pages" USING btree ("updated_at");
  CREATE INDEX "pages_created_at_idx" ON "pages" USING btree ("created_at");
  CREATE INDEX "pages__status_idx" ON "pages" USING btree ("_status");
  CREATE INDEX "_pages_v_parent_idx" ON "_pages_v" USING btree ("parent_id");
  CREATE INDEX "_pages_v_version_version_slug_idx" ON "_pages_v" USING btree ("version_slug");
  CREATE INDEX "_pages_v_version_meta_version_meta_image_idx" ON "_pages_v" USING btree ("version_meta_image_id");
  CREATE INDEX "_pages_v_version_version_updated_at_idx" ON "_pages_v" USING btree ("version_updated_at");
  CREATE INDEX "_pages_v_version_version_created_at_idx" ON "_pages_v" USING btree ("version_created_at");
  CREATE INDEX "_pages_v_version_version__status_idx" ON "_pages_v" USING btree ("version__status");
  CREATE INDEX "_pages_v_created_at_idx" ON "_pages_v" USING btree ("created_at");
  CREATE INDEX "_pages_v_updated_at_idx" ON "_pages_v" USING btree ("updated_at");
  CREATE INDEX "_pages_v_latest_idx" ON "_pages_v" USING btree ("latest");
  CREATE INDEX "exchange_rate_history_updated_at_idx" ON "exchange_rate_history" USING btree ("updated_at");
  CREATE INDEX "exchange_rate_history_created_at_idx" ON "exchange_rate_history" USING btree ("created_at");
  CREATE INDEX "users_sessions_order_idx" ON "users_sessions" USING btree ("_order");
  CREATE INDEX "users_sessions_parent_id_idx" ON "users_sessions" USING btree ("_parent_id");
  CREATE INDEX "users_updated_at_idx" ON "users" USING btree ("updated_at");
  CREATE INDEX "users_created_at_idx" ON "users" USING btree ("created_at");
  CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");
  CREATE UNIQUE INDEX "payload_kv_key_idx" ON "payload_kv" USING btree ("key");
  CREATE INDEX "payload_locked_documents_global_slug_idx" ON "payload_locked_documents" USING btree ("global_slug");
  CREATE INDEX "payload_locked_documents_updated_at_idx" ON "payload_locked_documents" USING btree ("updated_at");
  CREATE INDEX "payload_locked_documents_created_at_idx" ON "payload_locked_documents" USING btree ("created_at");
  CREATE INDEX "payload_locked_documents_rels_order_idx" ON "payload_locked_documents_rels" USING btree ("order");
  CREATE INDEX "payload_locked_documents_rels_parent_idx" ON "payload_locked_documents_rels" USING btree ("parent_id");
  CREATE INDEX "payload_locked_documents_rels_path_idx" ON "payload_locked_documents_rels" USING btree ("path");
  CREATE INDEX "payload_locked_documents_rels_products_id_idx" ON "payload_locked_documents_rels" USING btree ("products_id");
  CREATE INDEX "payload_locked_documents_rels_variants_id_idx" ON "payload_locked_documents_rels" USING btree ("variants_id");
  CREATE INDEX "payload_locked_documents_rels_categories_id_idx" ON "payload_locked_documents_rels" USING btree ("categories_id");
  CREATE INDEX "payload_locked_documents_rels_media_id_idx" ON "payload_locked_documents_rels" USING btree ("media_id");
  CREATE INDEX "payload_locked_documents_rels_orders_id_idx" ON "payload_locked_documents_rels" USING btree ("orders_id");
  CREATE INDEX "payload_locked_documents_rels_customers_id_idx" ON "payload_locked_documents_rels" USING btree ("customers_id");
  CREATE INDEX "payload_locked_documents_rels_coupons_id_idx" ON "payload_locked_documents_rels" USING btree ("coupons_id");
  CREATE INDEX "payload_locked_documents_rels_shipping_zones_id_idx" ON "payload_locked_documents_rels" USING btree ("shipping_zones_id");
  CREATE INDEX "payload_locked_documents_rels_payment_events_id_idx" ON "payload_locked_documents_rels" USING btree ("payment_events_id");
  CREATE INDEX "payload_locked_documents_rels_regret_requests_id_idx" ON "payload_locked_documents_rels" USING btree ("regret_requests_id");
  CREATE INDEX "payload_locked_documents_rels_pages_id_idx" ON "payload_locked_documents_rels" USING btree ("pages_id");
  CREATE INDEX "payload_locked_documents_rels_exchange_rate_history_id_idx" ON "payload_locked_documents_rels" USING btree ("exchange_rate_history_id");
  CREATE INDEX "payload_locked_documents_rels_users_id_idx" ON "payload_locked_documents_rels" USING btree ("users_id");
  CREATE INDEX "payload_preferences_key_idx" ON "payload_preferences" USING btree ("key");
  CREATE INDEX "payload_preferences_updated_at_idx" ON "payload_preferences" USING btree ("updated_at");
  CREATE INDEX "payload_preferences_created_at_idx" ON "payload_preferences" USING btree ("created_at");
  CREATE INDEX "payload_preferences_rels_order_idx" ON "payload_preferences_rels" USING btree ("order");
  CREATE INDEX "payload_preferences_rels_parent_idx" ON "payload_preferences_rels" USING btree ("parent_id");
  CREATE INDEX "payload_preferences_rels_path_idx" ON "payload_preferences_rels" USING btree ("path");
  CREATE INDEX "payload_preferences_rels_customers_id_idx" ON "payload_preferences_rels" USING btree ("customers_id");
  CREATE INDEX "payload_preferences_rels_users_id_idx" ON "payload_preferences_rels" USING btree ("users_id");
  CREATE INDEX "payload_migrations_updated_at_idx" ON "payload_migrations" USING btree ("updated_at");
  CREATE INDEX "payload_migrations_created_at_idx" ON "payload_migrations" USING btree ("created_at");
  CREATE INDEX "store_settings_data_fiscal_image_idx" ON "store_settings" USING btree ("data_fiscal_image_id");
  CREATE INDEX "store_settings_hero_image_idx" ON "store_settings" USING btree ("hero_image_id");
  CREATE INDEX "store_settings_texts_order_parent" ON "store_settings_texts" USING btree ("order","parent_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "products_options" CASCADE;
  DROP TABLE "products" CASCADE;
  DROP TABLE "products_texts" CASCADE;
  DROP TABLE "products_rels" CASCADE;
  DROP TABLE "_products_v_version_options" CASCADE;
  DROP TABLE "_products_v" CASCADE;
  DROP TABLE "_products_v_texts" CASCADE;
  DROP TABLE "_products_v_rels" CASCADE;
  DROP TABLE "variants_options" CASCADE;
  DROP TABLE "variants" CASCADE;
  DROP TABLE "categories" CASCADE;
  DROP TABLE "media" CASCADE;
  DROP TABLE "orders_items" CASCADE;
  DROP TABLE "orders_status_history" CASCADE;
  DROP TABLE "orders" CASCADE;
  DROP TABLE "customers_addresses" CASCADE;
  DROP TABLE "customers_sessions" CASCADE;
  DROP TABLE "customers" CASCADE;
  DROP TABLE "coupons" CASCADE;
  DROP TABLE "shipping_zones_provinces" CASCADE;
  DROP TABLE "shipping_zones_postal_ranges" CASCADE;
  DROP TABLE "shipping_zones_weight_brackets" CASCADE;
  DROP TABLE "shipping_zones" CASCADE;
  DROP TABLE "payment_events" CASCADE;
  DROP TABLE "regret_requests" CASCADE;
  DROP TABLE "pages" CASCADE;
  DROP TABLE "_pages_v" CASCADE;
  DROP TABLE "exchange_rate_history" CASCADE;
  DROP TABLE "users_sessions" CASCADE;
  DROP TABLE "users" CASCADE;
  DROP TABLE "payload_kv" CASCADE;
  DROP TABLE "payload_locked_documents" CASCADE;
  DROP TABLE "payload_locked_documents_rels" CASCADE;
  DROP TABLE "payload_preferences" CASCADE;
  DROP TABLE "payload_preferences_rels" CASCADE;
  DROP TABLE "payload_migrations" CASCADE;
  DROP TABLE "store_settings" CASCADE;
  DROP TABLE "store_settings_texts" CASCADE;
  DROP TABLE "exchange_rate" CASCADE;
  DROP TABLE "shipping_settings" CASCADE;
  DROP TYPE "public"."enum_products_currency";
  DROP TYPE "public"."enum_products_tax_rate";
  DROP TYPE "public"."enum_products_status";
  DROP TYPE "public"."enum__products_v_version_currency";
  DROP TYPE "public"."enum__products_v_version_tax_rate";
  DROP TYPE "public"."enum__products_v_version_status";
  DROP TYPE "public"."enum_orders_status";
  DROP TYPE "public"."enum_orders_payment_method";
  DROP TYPE "public"."enum_orders_needs_review";
  DROP TYPE "public"."enum_orders_shipping_address_province";
  DROP TYPE "public"."enum_customers_addresses_province";
  DROP TYPE "public"."enum_coupons_type";
  DROP TYPE "public"."enum_shipping_zones_provinces";
  DROP TYPE "public"."enum_payment_events_source";
  DROP TYPE "public"."enum_regret_requests_status";
  DROP TYPE "public"."enum_pages_status";
  DROP TYPE "public"."enum__pages_v_version_status";
  DROP TYPE "public"."enum_users_role";
  DROP TYPE "public"."enum_exchange_rate_mode";`)
}
