import { users, type User, type InsertUser, prompts, type Prompt, type InsertPrompt, type DeletedPrompt } from "@shared/schema";
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { log } from './vite';
import { NotionStorage } from './notionStorage';
import session from 'express-session';
import createMemoryStore from "memorystore";

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
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, username: string, password: string): Promise<User | undefined>;
  
  // Prompt methods
  getPrompts(): Promise<Prompt[]>;
  getPrompt(id: number): Promise<Prompt | undefined>;
  createPrompt(prompt: InsertPrompt): Promise<Prompt>;
  updatePrompt(id: number, prompt: Partial<InsertPrompt>): Promise<Prompt | undefined>;
  deletePrompt(id: number): Promise<boolean>;
  
  // Trash (корзина) methods
  getDeletedPrompts(): Promise<DeletedPrompt[]>;
  moveToTrash(promptId: number): Promise<boolean>;
  restoreFromTrash(deletedPromptId: number): Promise<boolean>;
  deleteFromTrash(deletedPromptId: number): Promise<boolean>;
  emptyTrash(): Promise<boolean>;
  
  // Settings methods
  getSetting(key: string): Promise<string | undefined>;
  setSetting(key: string, value: string): Promise<void>;
  updateNotionSettings(apiToken: string, databaseId: string): Promise<void>;
  
  // Session store
  sessionStore: session.Store;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private prompts: Map<number, Prompt>;
  private deletedPrompts: Map<number, DeletedPrompt>;
  private settings: Map<string, string>;
  private userCurrentId: number;
  private promptCurrentId: number;
  private deletedPromptCurrentId: number;
  public sessionStore: session.Store;

  constructor() {
    this.users = new Map();
    this.prompts = new Map();
    this.deletedPrompts = new Map();
    this.settings = new Map();
    this.userCurrentId = 1;
    this.promptCurrentId = 1;
    this.deletedPromptCurrentId = 1;
    
    // Создаем хранилище сессий в памяти
    const MemoryStore = createMemoryStore(session);
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // очищает просроченные сессии каждые 24 часа
    });
    
    // Инициализация дефолтных настроек
    this.settings.set('notionApiToken', process.env.NOTION_API_TOKEN || '');
    this.settings.set('notionDatabaseId', process.env.NOTION_DATABASE_ID || '');
    
    // Создаем тестового пользователя admin/admin если у нас нет пользователей
    this.createDefaultAdminUser();
    
    // Load prompts from JSON file
    this.loadPrompts();
  }
  
  private async createDefaultAdminUser() {
    // Проверим, есть ли у нас пользователь admin
    const adminUser = await this.getUserByUsername('admin');
    if (!adminUser) {
      // Создаем администратора
      await this.createUser({
        username: 'admin',
        password: 'admin'
      });
      log('Created default admin user', 'storage');
    }
  }
  
  private loadPrompts() {
    try {
      const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
      if (Array.isArray(data.prompts)) {
        data.prompts.forEach((prompt: Prompt) => {
          // Убедимся, что createdAt - это объект Date
          if (typeof prompt.createdAt === 'string') {
            prompt.createdAt = new Date(prompt.createdAt);
          }
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
  
  // User management methods
  async updateUser(id: number, username: string, password: string): Promise<User | undefined> {
    const existingUser = this.users.get(id);
    
    if (!existingUser) {
      return undefined;
    }
    
    const updatedUser: User = {
      ...existingUser,
      username,
      password
    };
    
    this.users.set(id, updatedUser);
    return updatedUser;
  }
  
  // Settings methods
  async getSetting(key: string): Promise<string | undefined> {
    return this.settings.get(key);
  }
  
  async setSetting(key: string, value: string): Promise<void> {
    this.settings.set(key, value);
  }
  
  async updateNotionSettings(apiToken: string, databaseId: string): Promise<void> {
    this.settings.set('notionApiToken', apiToken);
    this.settings.set('notionDatabaseId', databaseId);
    
    // Обновляем переменные окружения (для текущей сессии)
    process.env.NOTION_API_TOKEN = apiToken;
    process.env.NOTION_DATABASE_ID = databaseId;
  }
  
  // Методы для работы с корзиной
  async getDeletedPrompts(): Promise<DeletedPrompt[]> {
    return Array.from(this.deletedPrompts.values());
  }
  
  async moveToTrash(promptId: number): Promise<boolean> {
    const prompt = this.prompts.get(promptId);
    if (!prompt) {
      return false;
    }
    
    const id = this.deletedPromptCurrentId++;
    const now = new Date();
    
    // Срок хранения - 7 дней
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 7);
    
    const deletedPrompt: DeletedPrompt = {
      id,
      originalId: prompt.id,
      title: prompt.title,
      content: prompt.content,
      category: prompt.category,
      tags: prompt.tags,
      createdAt: prompt.createdAt,
      deletedAt: now,
      expiryDate: expiryDate
    };
    
    this.deletedPrompts.set(id, deletedPrompt);
    
    // Удаляем из основного хранилища
    const deleted = this.prompts.delete(promptId);
    if (deleted) {
      this.savePrompts();
    }
    
    return true;
  }
  
  async restoreFromTrash(deletedPromptId: number): Promise<boolean> {
    const deletedPrompt = this.deletedPrompts.get(deletedPromptId);
    if (!deletedPrompt) {
      return false;
    }
    
    // Проверяем, существует ли уже промпт с исходным ID
    const existingId = this.prompts.has(deletedPrompt.originalId) ? 
      this.promptCurrentId++ : deletedPrompt.originalId;
    
    const restoredPrompt: Prompt = {
      id: existingId,
      title: deletedPrompt.title,
      content: deletedPrompt.content,
      category: deletedPrompt.category,
      tags: deletedPrompt.tags,
      createdAt: deletedPrompt.createdAt
    };
    
    this.prompts.set(existingId, restoredPrompt);
    this.deletedPrompts.delete(deletedPromptId);
    this.savePrompts();
    
    return true;
  }
  
  async deleteFromTrash(deletedPromptId: number): Promise<boolean> {
    return this.deletedPrompts.delete(deletedPromptId);
  }
  
  async emptyTrash(): Promise<boolean> {
    this.deletedPrompts.clear();
    return true;
  }
}

// Выбираем хранилище в зависимости от настроек окружения
let storage: IStorage;

try {
  // Проверяем наличие переменных окружения для Notion
  if (process.env.NOTION_API_TOKEN && process.env.NOTION_DATABASE_ID) {
    log('Using Notion storage for prompts', 'storage');
    storage = new NotionStorage();
  } else {
    log('Using memory storage for prompts', 'storage');
    storage = new MemStorage();
  }
} catch (error) {
  console.error('Error initializing Notion storage:', error);
  log('Fallback to memory storage due to Notion initialization error', 'storage');
  storage = new MemStorage();
}

export { storage };
