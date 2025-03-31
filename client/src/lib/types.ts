import { Prompt } from "@shared/schema";

export type Category = "all" | "creative" | "academic" | "business" | "technical" | "other";

export type CategoryInfo = {
  id: Category;
  name: string;
  icon: string;
};

export const CATEGORIES: CategoryInfo[] = [
  { id: "all", name: "All Prompts", icon: "globe" },
  { id: "creative", name: "Creative Writing", icon: "paint-brush" },
  { id: "academic", name: "Academic", icon: "graduation-cap" },
  { id: "business", name: "Business", icon: "briefcase" },
  { id: "technical", name: "Technical", icon: "code" },
  { id: "other", name: "Other", icon: "ellipsis-h" }
];

export interface PromptWithDateString extends Omit<Prompt, 'createdAt'> {
  createdAt: string;
}
