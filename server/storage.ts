import { users, type User, type InsertUser, prompts, type Prompt, type InsertPrompt } from "@shared/schema";
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_FILE = path.join(__dirname, '..', 'data', 'prompts.json');

// Ensure the data directory exists
try {
  if (!fs.existsSync(path.join(__dirname, '..', 'data'))) {
    fs.mkdirSync(path.join(__dirname, '..', 'data'), { recursive: true });
  }
  
  // Create the prompts.json file if it doesn't exist
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ prompts: [] }, null, 2));
  }
} catch (error) {
  console.error('Error setting up data storage:', error);
}

// modify the interface with any CRUD methods
// you might need
export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Prompt methods
  getPrompts(): Promise<Prompt[]>;
  getPrompt(id: number): Promise<Prompt | undefined>;
  createPrompt(prompt: InsertPrompt): Promise<Prompt>;
  updatePrompt(id: number, prompt: Partial<InsertPrompt>): Promise<Prompt | undefined>;
  deletePrompt(id: number): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private prompts: Map<number, Prompt>;
  private userCurrentId: number;
  private promptCurrentId: number;

  constructor() {
    this.users = new Map();
    this.prompts = new Map();
    this.userCurrentId = 1;
    this.promptCurrentId = 1;
    
    // Load prompts from JSON file
    this.loadPrompts();
  }
  
  private loadPrompts() {
    try {
      const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
      if (Array.isArray(data.prompts)) {
        data.prompts.forEach((prompt: Prompt) => {
          this.prompts.set(prompt.id, prompt);
          // Update current ID to be greater than the highest ID in the file
          if (prompt.id >= this.promptCurrentId) {
            this.promptCurrentId = prompt.id + 1;
          }
        });
      }
    } catch (error) {
      console.error('Error loading prompts:', error);
    }
  }
  
  private savePrompts() {
    try {
      const prompts = Array.from(this.prompts.values());
      fs.writeFileSync(DATA_FILE, JSON.stringify({ prompts }, null, 2));
    } catch (error) {
      console.error('Error saving prompts:', error);
    }
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userCurrentId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }
  
  // Prompt methods
  async getPrompts(): Promise<Prompt[]> {
    return Array.from(this.prompts.values());
  }
  
  async getPrompt(id: number): Promise<Prompt | undefined> {
    return this.prompts.get(id);
  }
  
  async createPrompt(insertPrompt: InsertPrompt): Promise<Prompt> {
    const id = this.promptCurrentId++;
    const now = new Date();
    const prompt: Prompt = { 
      ...insertPrompt, 
      id, 
      createdAt: now
    };
    
    this.prompts.set(id, prompt);
    this.savePrompts();
    return prompt;
  }
  
  async updatePrompt(id: number, promptData: Partial<InsertPrompt>): Promise<Prompt | undefined> {
    const existingPrompt = this.prompts.get(id);
    
    if (!existingPrompt) {
      return undefined;
    }
    
    const updatedPrompt: Prompt = {
      ...existingPrompt,
      ...promptData,
    };
    
    this.prompts.set(id, updatedPrompt);
    this.savePrompts();
    return updatedPrompt;
  }
  
  async deletePrompt(id: number): Promise<boolean> {
    const deleted = this.prompts.delete(id);
    if (deleted) {
      this.savePrompts();
    }
    return deleted;
  }
}

export const storage = new MemStorage();
