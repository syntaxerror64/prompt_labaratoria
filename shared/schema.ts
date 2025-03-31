import { pgTable, text, serial, integer, boolean, json, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Keep the existing users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Define the prompts table schema
export const prompts = pgTable("prompts", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  category: text("category").notNull(),
  tags: text("tags").array().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertPromptSchema = createInsertSchema(prompts).omit({
  id: true,
  createdAt: true,
});

export type InsertPrompt = z.infer<typeof insertPromptSchema>;
export type Prompt = typeof prompts.$inferSelect;

// Определение схемы таблицы настроек
export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Схема для вставки настроек
export const insertSettingSchema = createInsertSchema(settings).omit({
  id: true,
  updatedAt: true,
});

export type InsertSetting = z.infer<typeof insertSettingSchema>;
export type Setting = typeof settings.$inferSelect;

// Схема для обновления учетных данных
export const updateCredentialsSchema = z.object({
  username: z.string().min(3, "Имя пользователя должно содержать не менее 3 символов"),
  currentPassword: z.string().min(1, "Текущий пароль обязателен"),
  newPassword: z.string().min(6, "Новый пароль должен содержать не менее 6 символов"),
});

// Схема для обновления настроек Notion
export const updateNotionSettingsSchema = z.object({
  notionApiToken: z.string().min(1, "API токен обязателен"),
  notionDatabaseId: z.string().min(1, "ID базы данных обязателен"),
});

export type UpdateCredentials = z.infer<typeof updateCredentialsSchema>;
export type UpdateNotionSettings = z.infer<typeof updateNotionSettingsSchema>;

// Схема для удаленных промптов (корзина)
export const deletedPrompts = pgTable("deleted_prompts", {
  id: serial("id").primaryKey(),
  originalId: integer("original_id").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  category: text("category").notNull(),
  tags: text("tags").array().notNull(),
  createdAt: timestamp("created_at").notNull(),
  deletedAt: timestamp("deleted_at").defaultNow().notNull(),
  // Автоматическое удаление через 7 дней
  expiryDate: timestamp("expiry_date").notNull(),
});

export const insertDeletedPromptSchema = createInsertSchema(deletedPrompts).omit({
  id: true,
  deletedAt: true,
  expiryDate: true,
});

export type InsertDeletedPrompt = z.infer<typeof insertDeletedPromptSchema>;
export type DeletedPrompt = typeof deletedPrompts.$inferSelect;
