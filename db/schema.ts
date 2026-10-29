import {sqliteTable,text,integer,index} from 'drizzle-orm/sqlite-core';
export const reports=sqliteTable('reports',{id:text('id').primaryKey(),zone:integer('zone').notNull(),createdAt:text('created_at').notNull(),data:text('data').notNull()},t=>[index('reports_zone_date').on(t.zone,t.createdAt)]);
export const tickets=sqliteTable('analysis_tickets',{token:text('token').primaryKey(),photoHash:text('photo_hash').notNull(),analysis:text('analysis').notNull(),expiresAt:integer('expires_at').notNull()});
export const limits=sqliteTable('rate_limits',{bucket:text('bucket').primaryKey(),requests:integer('requests').notNull(),expiresAt:integer('expires_at').notNull()});
