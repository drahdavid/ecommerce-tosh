import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "orders" ADD COLUMN "client_ip" varchar;
  ALTER TABLE "store_settings" ADD COLUMN "max_pending_orders_per_email" numeric DEFAULT 2;
  ALTER TABLE "store_settings" ADD COLUMN "max_pending_orders_per_ip" numeric DEFAULT 5;
  CREATE INDEX "orders_client_ip_idx" ON "orders" USING btree ("client_ip");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP INDEX "orders_client_ip_idx";
  ALTER TABLE "orders" DROP COLUMN "client_ip";
  ALTER TABLE "store_settings" DROP COLUMN "max_pending_orders_per_email";
  ALTER TABLE "store_settings" DROP COLUMN "max_pending_orders_per_ip";`)
}
