import { Prompt } from "@shared/schema";

export type Category =
  | "all"
  | "creative"
  | "academic"
  | "business"
  | "technical"
  | "other";

export type CategoryInfo = {
  id: Category;
  name: string;
  icon: string;
};

export const CATEGORIES: CategoryInfo[] = [
  { id: "all", name: "Все промпты", icon: "globe" },
  { id: "creative", name: "Творческое письмо", icon: "paint-brush" },
  { id: "academic", name: "Учебные", icon: "graduation-cap" },
  { id: "business", name: "Бизнес", icon: "briefcase" },
  { id: "technical", name: "Технические", icon: "code" },
  { id: "short_prompt", name: "Короткие", icon: "code" },
  { id: "other", name: "Другое", icon: "ellipsis-h" },
];

export interface PromptWithDateString extends Omit<Prompt, "createdAt"> {
  createdAt: string;
}
