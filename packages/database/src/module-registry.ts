import { pgTable, text, integer, timestamp, jsonb, boolean, index } from 'drizzle-orm/pg-core';

export const moduleRegistry = pgTable(
  'module_registry',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    version: text('version').notNull(),
    description: text('description').notNull(),
    icon: text('icon').notNull().default('extension'),
    entry: text('entry').notNull(),
    type: text('type').notNull().default('external'),
    checksum: text('checksum').notNull(),
    manifestUrl: text('manifest_url'),
    bundleUrl: text('bundle_url'),
    permissions: jsonb('permissions').$type<string[]>().default([]),
    author: text('author'),
    homepage: text('homepage'),
    categories: jsonb('categories').$type<string[]>().default([]),
    screenshots: jsonb('screenshots').$type<string[]>().default([]),
    downloads: integer('downloads').notNull().default(0),
    rating: integer('rating').default(0),
    verified: boolean('verified').notNull().default(false),
    signature: text('signature'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    nameIdx: index('idx_module_name').on(table.name),
    authorIdx: index('idx_module_author').on(table.author),
    categoryIdx: index('idx_module_categories').on(table.categories),
    searchIdx: index('idx_module_search').on(table.name, table.description),
  }),
);

export const moduleVersions = pgTable(
  'module_versions',
  {
    id: text('id').primaryKey(),
    moduleId: text('module_id')
      .notNull()
      .references(() => moduleRegistry.id, { onDelete: 'cascade' }),
    version: text('version').notNull(),
    checksum: text('checksum').notNull(),
    permissions: jsonb('permissions').$type<string[]>().default([]),
    changelog: text('changelog'),
    bundleSize: integer('bundle_size'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    moduleVersionIdx: index('idx_module_version').on(table.moduleId, table.version),
  }),
);

export const moduleReviews = pgTable('module_reviews', {
  id: text('id').primaryKey(),
  moduleId: text('module_id')
    .notNull()
    .references(() => moduleRegistry.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull(),
  rating: integer('rating').notNull(),
  comment: text('comment'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export type ModuleRecord = typeof moduleRegistry.$inferSelect;
export type ModuleInsert = typeof moduleRegistry.$inferInsert;
export type ModuleVersionRecord = typeof moduleVersions.$inferSelect;
export type ModuleReviewRecord = typeof moduleReviews.$inferSelect;
