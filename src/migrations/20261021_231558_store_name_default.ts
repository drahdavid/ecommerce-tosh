import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "store_settings" ALTER COLUMN "store_name" SET DEFAULT 'Servicio Técnico';`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "store_settings" ALTER COLUMN "store_name" SET DEFAULT 'Tosh';`)
}
