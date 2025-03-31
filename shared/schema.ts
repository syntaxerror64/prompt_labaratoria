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
