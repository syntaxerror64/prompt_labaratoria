import { Client } from '@notionhq/client';
import { IStorage } from './storage';
import { Prompt, User, InsertPrompt, InsertUser, DeletedPrompt } from '@shared/schema';
import { log } from './vite';
import session from 'express-session';
import createMemoryStore from "memorystore";

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
  private settingsCache: Map<string, string> = new Map();
  private contentPartStorage: Map<number, string[]> = new Map(); // Хранение дополнительных частей контента
  private deletedPrompts: Map<number, DeletedPrompt> = new Map();
  private deletedPromptCurrentId: number = 1;
  private idMapping: Map<number, string> = new Map();
  private nextId: number = 1;
  public sessionStore: session.Store;

  constructor() {
    // Создаем хранилище сессий в памяти
    const MemoryStore = createMemoryStore(session);
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // очищает просроченные сессии каждые 24 часа
    });

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
    
    // Инициализируем кэш настроек
    this.settingsCache.set('notionApiToken', apiKey);
    this.settingsCache.set('notionDatabaseId', databaseId);

    log('NotionStorage initialized with database ID: ' + this.databaseId, 'notion');
    
    // Создаем учетную запись администратора по умолчанию
    const adminUser: User = {
      id: this.userCurrentId++,
      username: 'admin',
      password: 'admin' // В реальном приложении это должен быть хешированный пароль
    };
    this.users.set(adminUser.id, adminUser);
    
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
      console.log('Creating prompt with title:', prompt.title);
      
      // Подготовка хранения длинного текста в Notion
      // Основной текст храним в обычном поле content с ограничением
      const MAX_CONTENT_LENGTH = 1990; // Оставляем небольшой запас
      let mainContent = prompt.content;
      let contentParts: string[] = [];
      
      // Если текст длиннее максимальной длины, разбиваем его на части
      if (prompt.content.length > MAX_CONTENT_LENGTH) {
        console.log(`Long content detected: ${prompt.content.length} characters. Splitting into parts.`);
        mainContent = prompt.content.substring(0, MAX_CONTENT_LENGTH) + "...";
        
        // Разбиваем оставшийся текст на части по MAX_CONTENT_LENGTH символов
        let remainingContent = prompt.content.substring(MAX_CONTENT_LENGTH);
        while (remainingContent.length > 0) {
          if (remainingContent.length <= MAX_CONTENT_LENGTH) {
            contentParts.push(remainingContent);
            remainingContent = "";
          } else {
            contentParts.push(remainingContent.substring(0, MAX_CONTENT_LENGTH));
            remainingContent = remainingContent.substring(MAX_CONTENT_LENGTH);
          }
        }
        
        console.log(`Content split into ${contentParts.length + 1} parts`);
      }
      
      // Создаем объект свойств для страницы
      const properties: any = {
        title: {
          title: [{ text: { content: prompt.title } }]
        },
        content: {
          rich_text: [{ text: { content: mainContent } }]
        },
        contentPartCount: {
          number: contentParts.length
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
      };
      
      console.log('Creating page with properties:', JSON.stringify(properties));
      
      // Создаем новую запись в Notion
      const response = await this.notionClient.pages.create({
        parent: { database_id: this.databaseId },
        properties: properties
      });
      
      console.log('Created page. Response ID:', response.id);
      
      // Если есть дополнительные части контента, создаем дочерние страницы для них
      if (contentParts.length > 0) {
        console.log(`Creating ${contentParts.length} content parts as child pages`);
        
        // Сохраняем ID родительской страницы для связывания
        const parentId = response.id;
        
        // Создаем дочерние страницы для каждой части контента
        for (let i = 0; i < contentParts.length; i++) {
          try {
            const partProperties: any = {
              title: {
                title: [{ text: { content: `${prompt.title} - Part ${i + 1}` } }]
              },
              content: {
                rich_text: [{ text: { content: contentParts[i] } }]
              },
              partIndex: {
                number: i + 1
              },
              parentPromptId: {
                rich_text: [{ text: { content: parentId } }]
              }
            };
            
            // Создаем дочернюю страницу
            const childResponse = await this.notionClient.pages.create({
              parent: { database_id: this.databaseId },
              properties: partProperties
            });
            
            console.log(`Created content part ${i + 1} with ID: ${childResponse.id}`);
          } catch (partError) {
            console.error(`Error creating content part ${i + 1}:`, partError);
          }
        }
      }

      // Получаем UUID страницы Notion
      const notionUuid = response.id;
      
      // Создаем новый числовой ID
      const numericId = this.nextId++;
      
      // Добавляем маппинг
      this.idMapping.set(numericId, notionUuid);
      
      // Просто логируем успешное создание
      console.log('Created page with ID:', notionUuid);
      
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

      // Готовим обновленные данные для основной страницы
      const properties: any = {};
      
      if (promptData.title) {
        console.log('Updating prompt title to:', promptData.title);
        properties.title = {
          title: [{ text: { content: promptData.title } }]
        };
      }
      
      // Проверка длины контента и обработка для Notion API
      if (promptData.content) {
        const MAX_CONTENT_LENGTH = 1990; // Для Notion API
        let mainContent = promptData.content;
        let contentParts: string[] = [];
        
        // Если контент слишком длинный, разбиваем на части
        if (promptData.content.length > MAX_CONTENT_LENGTH) {
          console.log(`Long content detected on update: ${promptData.content.length} characters`);
          mainContent = promptData.content.substring(0, MAX_CONTENT_LENGTH) + "...";
          
          // Разбиваем оставшийся текст на части
          let remainingContent = promptData.content.substring(MAX_CONTENT_LENGTH);
          while (remainingContent.length > 0) {
            if (remainingContent.length <= MAX_CONTENT_LENGTH) {
              contentParts.push(remainingContent);
              remainingContent = "";
            } else {
              contentParts.push(remainingContent.substring(0, MAX_CONTENT_LENGTH));
              remainingContent = remainingContent.substring(MAX_CONTENT_LENGTH);
            }
          }
          
          console.log(`Content split into ${contentParts.length + 1} parts for update`);
          
          // Обновляем число частей
          properties.contentPartCount = {
            number: contentParts.length
          };
        } else {
          // Если контент короткий, убираем все дополнительные части
          properties.contentPartCount = {
            number: 0
          };
        }
        
        // Обновляем основное содержимое
        properties.content = {
          rich_text: [{ text: { content: mainContent } }]
        };
        
        // Удаляем старые части контента из Notion
        try {
          const existingParts = await this.notionClient.databases.query({
            database_id: this.databaseId,
            filter: {
              property: 'parentPromptId',
              rich_text: {
                equals: notionUuid
              }
            }
          });
          
          // Архивируем все найденные части
          for (const part of existingParts.results) {
            await this.notionClient.pages.update({
              page_id: part.id,
              archived: true
            });
            console.log(`Archived old content part: ${part.id}`);
          }
        } catch (archiveError) {
          console.error('Error archiving old content parts:', archiveError);
        }
        
        // Если есть новые части, создаем их
        if (contentParts.length > 0) {
          for (let i = 0; i < contentParts.length; i++) {
            try {
              const partProperties: any = {
                title: {
                  title: [{ text: { content: `${promptData.title || existingPrompt.title} - Part ${i + 1}` } }]
                },
                content: {
                  rich_text: [{ text: { content: contentParts[i] } }]
                },
                partIndex: {
                  number: i + 1
                },
                parentPromptId: {
                  rich_text: [{ text: { content: notionUuid } }]
                }
              };
              
              // Создаем дочернюю страницу
              const childResponse = await this.notionClient.pages.create({
                parent: { database_id: this.databaseId },
                properties: partProperties
              });
              
              console.log(`Created updated content part ${i + 1} with ID: ${childResponse.id}`);
            } catch (partError) {
              console.error(`Error creating updated content part ${i + 1}:`, partError);
            }
          }
          
          // Обновляем кэш частей контента
          this.contentPartStorage.set(id, contentParts);
        } else {
          // Если частей нет, очищаем кэш
          this.contentPartStorage.delete(id);
        }
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
  
  // User management methods
  async updateUser(id: number, username: string, password: string): Promise<User | undefined> {
    const existingUser = await this.getUser(id);
    
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
    return this.settingsCache.get(key) || undefined;
  }
  
  async setSetting(key: string, value: string): Promise<void> {
    this.settingsCache.set(key, value);
  }
  
  async updateNotionSettings(apiToken: string, databaseId: string): Promise<void> {
    // Сохраняем новые настройки в кэше
    this.settingsCache.set('notionApiToken', apiToken);
    this.settingsCache.set('notionDatabaseId', databaseId);
    
    // Обновляем переменные окружения
    process.env.NOTION_API_TOKEN = apiToken;
    process.env.NOTION_DATABASE_ID = databaseId;
    
    // Пересоздаем клиент Notion с новым токеном
    this.notionClient = new Client({ auth: apiToken });
    this.databaseId = databaseId;
    
    // Переинициализируем базу данных со схемой
    await this.initializeDatabase();
  }
  
  // Реализация методов корзины для Notion
  // Для Notion мы храним удаленные промпты в памяти, так как в Notion
  // архивирование страниц - это одностороннее действие
  async getDeletedPrompts(): Promise<DeletedPrompt[]> {
    return Array.from(this.deletedPrompts.values());
  }
  
  async moveToTrash(promptId: number): Promise<boolean> {
    // Получаем промпт из Notion
    const prompt = await this.getPrompt(promptId);
    if (!prompt) {
      return false;
    }
    
    // Сначала архивируем в Notion
    const deleted = await this.deletePrompt(promptId);
    if (!deleted) {
      return false;
    }
    
    // Добавляем в локальную корзину
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
    return true;
  }
  
  async restoreFromTrash(deletedPromptId: number): Promise<boolean> {
    const deletedPrompt = this.deletedPrompts.get(deletedPromptId);
    if (!deletedPrompt) {
      return false;
    }
    
    // Восстанавливаем промпт в Notion, создавая новую страницу
    try {
      const restoredPrompt = await this.createPrompt({
        title: deletedPrompt.title,
        content: deletedPrompt.content,
        category: deletedPrompt.category,
        tags: deletedPrompt.tags
      });
      
      // Удаляем из локальной корзины
      this.deletedPrompts.delete(deletedPromptId);
      return true;
    } catch (error) {
      console.error('Error restoring prompt from trash:', error);
      return false;
    }
  }
  
  async deleteFromTrash(deletedPromptId: number): Promise<boolean> {
    return this.deletedPrompts.delete(deletedPromptId);
  }
  
  async emptyTrash(): Promise<boolean> {
    this.deletedPrompts.clear();
    return true;
  }

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
    
    // Получаем заголовок из свойства title
    let title = 'Untitled';
    try {
      // Проверяем разные форматы для поля title в Notion
      if (properties.title) {
        // Проверка на основные форматы
        if (Array.isArray(properties.title.title)) {
          // Стандартный формат с массивом текстовых блоков
          const titleTexts = properties.title.title
            .filter((t: any) => t && t.text && t.text.content)
            .map((t: any) => t.text.content);
          
          if (titleTexts.length > 0) {
            title = titleTexts.join('');
          }
        } else if (properties.title.rich_text) {
          // Альтернативный формат с rich_text
          const titleTexts = properties.title.rich_text
            .filter((t: any) => t && t.text && t.text.content)
            .map((t: any) => t.text.content);
          
          if (titleTexts.length > 0) {
            title = titleTexts.join('');
          }
        } else if (typeof properties.title === 'string') {
          // Прямое строковое значение
          title = properties.title;
        }
      } else if (properties.Name) {
        // Fallback для Notion, который иногда использует "Name" вместо "title"
        if (Array.isArray(properties.Name.title)) {
          const titleTexts = properties.Name.title
            .filter((t: any) => t && t.text && t.text.content)
            .map((t: any) => t.text.content);
          
          if (titleTexts.length > 0) {
            title = titleTexts.join('');
          }
        }
      }
    } catch (error) {
      console.error('Error parsing title from Notion:', error);
    }
    
    // Получаем контент из свойства content
    let content = '';
    try {
      if (properties.content && properties.content.rich_text) {
        const contentTexts = properties.content.rich_text
          .filter((t: any) => t && t.text && t.text.content)
          .map((t: any) => t.text.content);
        
        if (contentTexts.length > 0) {
          content = contentTexts.join('\n');
        }
        
        // Проверяем, есть ли у страницы дополнительные части контента
        let contentPartCount = 0;
        if (properties.contentPartCount && properties.contentPartCount.number !== undefined) {
          contentPartCount = properties.contentPartCount.number;
        }
        
        // Если есть части контента, используем части из кэша
        if (contentPartCount > 0) {
          console.log(`Found prompt with ${contentPartCount} additional content parts, notionUuid: ${notionUuid}`);
          
          // Загружаем части из кэша, если они доступны
          const parts = this.contentPartStorage.get(numericId) || [];
          if (parts.length > 0) {
            console.log(`Using cached ${parts.length} content parts for prompt ${numericId}`);
            // Объединяем части с основным контентом
            const fullContent = content.replace(/\.\.\.$/, '') + parts.join('');
            content = fullContent;
          } else {
            console.log(`No cached content parts found, will load them asynchronously`);
            // В фоновом режиме загрузим части и обновим кэш для следующего запроса
            // TODO: Реализовать асинхронную загрузку частей
            // this.loadContentPartsAsync(numericId, notionUuid);
          }
        }
      }
    } catch (error) {
      console.error('Error parsing content from Notion:', error);
    }
    
    // Получаем категорию из свойства category
    let category = 'other';
    try {
      if (properties.category && properties.category.select && properties.category.select.name) {
        category = properties.category.select.name;
      }
    } catch (error) {
      console.error('Error parsing category from Notion:', error);
    }
    
    // Получаем теги из свойства tags
    let tags: string[] = [];
    try {
      if (properties.tags && properties.tags.multi_select) {
        tags = properties.tags.multi_select
          .filter((t: any) => t && t.name)
          .map((t: any) => t.name);
      }
    } catch (error) {
      console.error('Error parsing tags from Notion:', error);
    }
    
    // Получаем дату создания из свойства createdAt
    let createdAt = new Date();
    try {
      if (properties.createdAt && properties.createdAt.date && properties.createdAt.date.start) {
        createdAt = new Date(properties.createdAt.date.start);
      }
    } catch (error) {
      console.error('Error parsing createdAt from Notion:', error);
    }
    
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