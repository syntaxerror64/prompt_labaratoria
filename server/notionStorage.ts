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
    
    // Инициализируем схему базы данных
    this.initializeDatabase();
  }
  
  // Метод для инициализации схемы в базе данных Notion
  private async initializeDatabase() {
    try {
      // Получаем текущую схему базы данных
      const database = await this.notionClient.databases.retrieve({
        database_id: this.databaseId
      });
      
      log('Retrieved Notion database', 'notion');
      
      // Проверяем наличие необходимых свойств и создаем их при необходимости
      const properties = database.properties;
      const requiredProperties = {
        content: { rich_text: {} },
        category: { select: {
          options: [
            { name: 'creative', color: 'blue' },
            { name: 'academic', color: 'green' },
            { name: 'business', color: 'orange' },
            { name: 'technical', color: 'gray' },
            { name: 'other', color: 'default' }
          ]
        }},
        tags: { multi_select: {
          options: [
            { name: 'gpt', color: 'green' },
            { name: 'writing', color: 'blue' },
            { name: 'code', color: 'gray' },
            { name: 'business', color: 'orange' },
            { name: 'academic', color: 'red' }
          ]
        }},
        createdAt: { date: {} }
      };
      
      // Собираем недостающие свойства
      const missingProperties: Record<string, any> = {};
      
      Object.entries(requiredProperties).forEach(([key, value]) => {
        if (!properties[key]) {
          missingProperties[key] = value;
        }
      });
      
      // Если есть недостающие свойства, обновляем базу данных
      if (Object.keys(missingProperties).length > 0) {
        log('Updating Notion database schema with missing properties: ' + Object.keys(missingProperties).join(', '), 'notion');
        
        await this.notionClient.databases.update({
          database_id: this.databaseId,
          properties: missingProperties
        });
        
        log('Notion database schema updated successfully', 'notion');
      } else {
        log('Notion database schema is up-to-date', 'notion');
      }
    } catch (error) {
      console.error('Error initializing Notion database schema:', error);
    }
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
      // Запрос без сортировки, так как поле может не существовать
      const response = await this.notionClient.databases.query({
        database_id: this.databaseId
      });

      return response.results.map((page: any) => this.mapNotionPageToPrompt(page));
    } catch (error) {
      console.error('Error fetching prompts from Notion:', error);
      return [];
    }
  }

  async getPrompt(id: number): Promise<Prompt | undefined> {
    try {
      // Получаем UUID Notion из маппинга
      const notionUuid = this.idMapping.get(id);
      
      if (!notionUuid) {
        console.error(`No Notion UUID found for numeric ID ${id}`);
        return undefined;
      }
      
      // Получаем страницу по UUID
      const response = await this.notionClient.pages.retrieve({
        page_id: notionUuid
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

      // Получаем UUID страницы Notion
      const notionUuid = response.id;
      
      // Создаем новый числовой ID
      const numericId = this.nextId++;
      
      // Добавляем маппинг
      this.idMapping.set(numericId, notionUuid);
      
      // Возвращаем созданный промпт в формате нашего приложения
      return {
        id: numericId,
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
      // Получаем UUID Notion из маппинга
      const notionUuid = this.idMapping.get(id);
      
      if (!notionUuid) {
        console.error(`No Notion UUID found for numeric ID ${id}`);
        return undefined;
      }
      
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
        page_id: notionUuid,
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
      // Получаем UUID Notion из маппинга
      const notionUuid = this.idMapping.get(id);
      
      if (!notionUuid) {
        console.error(`No Notion UUID found for numeric ID ${id}`);
        return false;
      }
      
      // В Notion API нет прямого удаления, поэтому архивируем страницу
      await this.notionClient.pages.update({
        page_id: notionUuid,
        archived: true
      });
      
      // Удаляем из маппинга
      this.idMapping.delete(id);
      
      return true;
    } catch (error) {
      console.error(`Error deleting prompt ${id} from Notion:`, error);
      return false;
    }
  }

  // Приватное поле для хранения маппинга между числовыми ID и UUID Notion
  private idMapping: Map<number, string> = new Map();
  private nextId: number = 1;

  // Вспомогательный метод для преобразования страницы Notion в формат нашего приложения
  private mapNotionPageToPrompt(notionPage: any): Prompt {
    const properties = notionPage.properties;
    
    // Получаем UUID страницы Notion
    const notionUuid = notionPage.id;
    
    // Сначала проверяем, есть ли уже маппинг для этого UUID
    let numericId = -1;
    
    // Ищем среди существующих маппингов
    this.idMapping.forEach((uuid, id) => {
      if (uuid === notionUuid) {
        numericId = id;
      }
    });
    
    // Если маппинг не найден, создаем новый
    if (numericId === -1) {
      numericId = this.nextId++;
      this.idMapping.set(numericId, notionUuid);
    }
    
    // Получаем заголовок (это поле всегда есть в Notion)
    const title = properties.title?.title?.map((t: any) => t.plain_text).join('') || 'Untitled';
    
    // Получаем содержимое (может не быть, если поле только что создано)
    const content = properties.content?.rich_text?.map((t: any) => t.plain_text).join('') || '';
    
    // Получаем категорию
    const category = properties.category?.select?.name || 'other';
    
    // Получаем теги
    const tags = properties.tags?.multi_select?.map((tag: any) => tag.name) || [];
    
    // Получаем дату создания
    const createdAtStr = properties.createdAt?.date?.start;
    const createdAt = createdAtStr ? new Date(createdAtStr) : new Date();
    
    return {
      id: numericId,
      title,
      content,
      category,
      tags,
      createdAt
    };
  }
}