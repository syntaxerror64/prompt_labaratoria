import { Client } from '@notionhq/client';
import { IStorage } from './storage';
import { Prompt, User, InsertPrompt, InsertUser } from '@shared/schema';
import { log } from './vite';

interface NotionPrompt {
  id: string;
  properties: {
    title: { title: Array<{ plain_text: string }> };
    content: { rich_text: Array<{ plain_text: string }> };
    category: { select: { name: string } };
    tags: { multi_select: Array<{ name: string }> };
    createdAt: { date: { start: string } };
  };
}

export class NotionStorage implements IStorage {
  private notionClient: Client;
  private databaseId: string;
  private users: Map<number, User>;
  private userCurrentId: number;

  constructor() {
    // Создаем клиент Notion API
    const apiKey = process.env.NOTION_API_TOKEN;
    const databaseId = process.env.NOTION_DATABASE_ID;

    if (!apiKey || !databaseId) {
      throw new Error('Missing Notion API credentials in environment variables');
    }

    this.notionClient = new Client({ auth: apiKey });
    this.databaseId = databaseId;
    this.users = new Map();
    this.userCurrentId = 1;

    log('NotionStorage initialized with database ID: ' + this.databaseId, 'notion');
  }

  // User methods (используем in-memory хранение для пользователей)
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userCurrentId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Prompt methods (используем Notion API)
  async getPrompts(): Promise<Prompt[]> {
    try {
      const response = await this.notionClient.databases.query({
        database_id: this.databaseId,
        sorts: [{ property: 'createdAt', direction: 'descending' }]
      });

      return response.results.map((page: any) => this.mapNotionPageToPrompt(page));
    } catch (error) {
      console.error('Error fetching prompts from Notion:', error);
      return [];
    }
  }

  async getPrompt(id: number): Promise<Prompt | undefined> {
    try {
      // Преобразуем ID в строковый формат Notion
      const pageId = id.toString();
      
      // Получаем страницу по ID
      const response = await this.notionClient.pages.retrieve({
        page_id: pageId
      });

      return this.mapNotionPageToPrompt(response as any);
    } catch (error) {
      console.error(`Error fetching prompt ${id} from Notion:`, error);
      return undefined;
    }
  }

  async createPrompt(prompt: InsertPrompt): Promise<Prompt> {
    try {
      // Создаем новую запись в Notion
      const response = await this.notionClient.pages.create({
        parent: { database_id: this.databaseId },
        properties: {
          title: {
            title: [{ text: { content: prompt.title } }]
          },
          content: {
            rich_text: [{ text: { content: prompt.content } }]
          },
          category: {
            select: { name: prompt.category }
          },
          tags: {
            multi_select: prompt.tags.map(tag => ({ name: tag }))
          },
          createdAt: {
            date: { start: new Date().toISOString() }
          }
        }
      });

      // Преобразуем ID из Notion в числовой для совместимости
      const id = parseInt(response.id.replace(/-/g, '').substring(0, 8), 16);
      
      // Возвращаем созданный промпт в формате нашего приложения
      return {
        id,
        title: prompt.title,
        content: prompt.content,
        category: prompt.category,
        tags: prompt.tags,
        createdAt: new Date()
      };
    } catch (error) {
      console.error('Error creating prompt in Notion:', error);
      throw new Error('Failed to create prompt in Notion');
    }
  }

  async updatePrompt(id: number, promptData: Partial<InsertPrompt>): Promise<Prompt | undefined> {
    try {
      // Получаем текущий промпт
      const existingPrompt = await this.getPrompt(id);
      if (!existingPrompt) {
        return undefined;
      }

      // Готовим обновленные данные
      const properties: any = {};
      
      if (promptData.title) {
        properties.title = {
          title: [{ text: { content: promptData.title } }]
        };
      }
      
      if (promptData.content) {
        properties.content = {
          rich_text: [{ text: { content: promptData.content } }]
        };
      }
      
      if (promptData.category) {
        properties.category = {
          select: { name: promptData.category }
        };
      }
      
      if (promptData.tags) {
        properties.tags = {
          multi_select: promptData.tags.map(tag => ({ name: tag }))
        };
      }

      // Отправляем обновление в Notion
      await this.notionClient.pages.update({
        page_id: id.toString(),
        properties
      });

      // Возвращаем обновленный промпт
      return {
        ...existingPrompt,
        ...promptData
      };
    } catch (error) {
      console.error(`Error updating prompt ${id} in Notion:`, error);
      return undefined;
    }
  }

  async deletePrompt(id: number): Promise<boolean> {
    try {
      // В Notion API нет прямого удаления, поэтому архивируем страницу
      await this.notionClient.pages.update({
        page_id: id.toString(),
        archived: true
      });
      
      return true;
    } catch (error) {
      console.error(`Error deleting prompt ${id} from Notion:`, error);
      return false;
    }
  }

  // Вспомогательный метод для преобразования страницы Notion в формат нашего приложения
  private mapNotionPageToPrompt(notionPage: any): Prompt {
    const properties = notionPage.properties;
    
    // Получаем ID и преобразуем его в числовой формат для совместимости
    const id = parseInt(notionPage.id.replace(/-/g, '').substring(0, 8), 16);
    
    // Получаем заголовок
    const title = properties.title.title.map((t: any) => t.plain_text).join('');
    
    // Получаем содержимое
    const content = properties.content.rich_text.map((t: any) => t.plain_text).join('');
    
    // Получаем категорию
    const category = properties.category.select?.name || 'other';
    
    // Получаем теги
    const tags = properties.tags.multi_select.map((tag: any) => tag.name);
    
    // Получаем дату создания
    const createdAtStr = properties.createdAt.date?.start;
    const createdAt = createdAtStr ? new Date(createdAtStr) : new Date();
    
    return {
      id,
      title,
      content,
      category,
      tags,
      createdAt
    };
  }
}