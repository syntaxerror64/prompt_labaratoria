import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertPromptSchema, insertUserSchema, updateCredentialsSchema, updateNotionSettingsSchema } from "@shared/schema";
import { z } from "zod";
import { fromZodError } from "zod-validation-error";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import session from "express-session";

// Расширяем типы для Express
interface RequestWithSession extends Request {
  session: session.Session & {
    userId?: number;
  }
}

// Вспомогательные функции для хеширования паролей
const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Middleware для проверки аутентификации
  function requireAuth(req: RequestWithSession, res: Response, next: NextFunction) {
    if (req.session.userId) {
      return next();
    }
    return res.status(401).json({ message: 'Требуется авторизация' });
  }
  
  // API маршруты для аутентификации
  app.post('/api/login', async (req: RequestWithSession, res: Response) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ message: 'Необходимо указать имя пользователя и пароль' });
      }
      
      const user = await storage.getUserByUsername(username);
      
      if (!user) {
        return res.status(401).json({ message: 'Неверное имя пользователя или пароль' });
      }
      
      // Проверяем пароль, используя сравнение хешей если пароль выглядит как хеш
      let passwordMatch = false;
      
      if (user.password.includes('.')) {
        // Это хешированный пароль
        passwordMatch = await comparePasswords(password, user.password);
      } else {
        // Простое сравнение для тестовых/демо-паролей
        passwordMatch = password === user.password;
      }
      
      if (!passwordMatch) {
        return res.status(401).json({ message: 'Неверное имя пользователя или пароль' });
      }
      
      // Устанавливаем сессию пользователя
      req.session.userId = user.id;
      
      // Возвращаем только безопасные данные пользователя (без пароля)
      res.json({
        id: user.id,
        username: user.username
      });
    } catch (error) {
      console.error('Error during login:', error);
      res.status(500).json({ message: 'Ошибка авторизации' });
    }
  });
  
  app.post('/api/logout', (req: RequestWithSession, res: Response) => {
    req.session.destroy(err => {
      if (err) {
        return res.status(500).json({ message: 'Ошибка при выходе из системы' });
      }
      res.status(200).json({ message: 'Успешный выход из системы' });
    });
  });
  
  app.get('/api/user', (req: RequestWithSession, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: 'Пользователь не авторизован' });
    }
    
    storage.getUser(req.session.userId)
      .then(user => {
        if (!user) {
          return res.status(404).json({ message: 'Пользователь не найден' });
        }
        
        // Возвращаем только безопасные данные пользователя (без пароля)
        res.json({
          id: user.id,
          username: user.username
        });
      })
      .catch(error => {
        console.error('Error fetching user:', error);
        res.status(500).json({ message: 'Ошибка получения данных пользователя' });
      });
  });
  
  // API маршруты для настроек
  app.get('/api/settings/:key', requireAuth, async (req: RequestWithSession, res: Response) => {
    try {
      const key = req.params.key;
      const value = await storage.getSetting(key);
      
      if (value === undefined) {
        return res.status(404).json({ message: 'Настройка не найдена' });
      }
      
      res.json({ key, value });
    } catch (error) {
      console.error('Error fetching setting:', error);
      res.status(500).json({ message: 'Ошибка получения настройки' });
    }
  });
  
  app.post('/api/settings/:key', requireAuth, async (req: RequestWithSession, res: Response) => {
    try {
      const { key } = req.params;
      const { value } = req.body;
      
      if (value === undefined) {
        return res.status(400).json({ message: 'Необходимо указать значение' });
      }
      
      await storage.setSetting(key, value);
      res.status(200).json({ key, value });
    } catch (error) {
      console.error('Error setting value:', error);
      res.status(500).json({ message: 'Ошибка сохранения настройки' });
    }
  });
  
  // API маршрут для обновления учетных данных
  app.post('/api/update-credentials', requireAuth, async (req: RequestWithSession, res: Response) => {
    try {
      const result = updateCredentialsSchema.safeParse(req.body);
      
      if (!result.success) {
        const validationError = fromZodError(result.error);
        return res.status(400).json({ message: validationError.message });
      }
      
      const { username, currentPassword, newPassword } = result.data;
      const userId = req.session.userId!;
      
      // Получаем текущего пользователя
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: 'Пользователь не найден' });
      }
      
      // Проверяем текущий пароль
      let passwordMatch = false;
      
      if (user.password.includes('.')) {
        // Это хешированный пароль
        passwordMatch = await comparePasswords(currentPassword, user.password);
      } else {
        // Простое сравнение для тестовых/демо-паролей
        passwordMatch = currentPassword === user.password;
      }
      
      if (!passwordMatch) {
        return res.status(401).json({ message: 'Неверный текущий пароль' });
      }
      
      // Хешируем новый пароль перед сохранением
      const hashedPassword = await hashPassword(newPassword);
      
      // Обновляем учетные данные
      const updatedUser = await storage.updateUser(userId, username, hashedPassword);
      
      if (!updatedUser) {
        return res.status(500).json({ message: 'Ошибка обновления учетных данных' });
      }
      
      res.json({ message: 'Учетные данные успешно обновлены' });
    } catch (error) {
      console.error('Error updating credentials:', error);
      res.status(500).json({ message: 'Ошибка обновления учетных данных' });
    }
  });
  
  // API маршрут для обновления настроек Notion
  app.post('/api/update-notion-settings', requireAuth, async (req: RequestWithSession, res: Response) => {
    try {
      const result = updateNotionSettingsSchema.safeParse(req.body);
      
      if (!result.success) {
        const validationError = fromZodError(result.error);
        return res.status(400).json({ message: validationError.message });
      }
      
      const { notionApiToken, notionDatabaseId } = result.data;
      
      // Обновляем настройки
      await storage.updateNotionSettings(notionApiToken, notionDatabaseId);
      
      res.json({ message: 'Настройки Notion успешно обновлены' });
    } catch (error) {
      console.error('Error updating Notion settings:', error);
      res.status(500).json({ message: 'Ошибка обновления настроек Notion' });
    }
  });
  
  // API маршруты для управления промптами (с проверкой аутентификации)
  app.get('/api/prompts', requireAuth, async (req: RequestWithSession, res: Response) => {
    try {
      const prompts = await storage.getPrompts();
      res.json(prompts);
    } catch (error) {
      console.error('Error fetching prompts:', error);
      res.status(500).json({ message: 'Ошибка получения промптов' });
    }
  });
  
  app.get('/api/prompts/:id', requireAuth, async (req: RequestWithSession, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Некорректный ID промпта' });
      }
      
      const prompt = await storage.getPrompt(id);
      
      if (!prompt) {
        return res.status(404).json({ message: 'Промпт не найден' });
      }
      
      res.json(prompt);
    } catch (error) {
      console.error('Error fetching prompt:', error);
      res.status(500).json({ message: 'Ошибка получения промпта' });
    }
  });
  
  app.post('/api/prompts', requireAuth, async (req: RequestWithSession, res: Response) => {
    try {
      const result = insertPromptSchema.safeParse(req.body);
      
      if (!result.success) {
        const validationError = fromZodError(result.error);
        return res.status(400).json({ message: validationError.message });
      }
      
      const prompt = await storage.createPrompt(result.data);
      res.status(201).json(prompt);
    } catch (error) {
      console.error('Error creating prompt:', error);
      res.status(500).json({ message: 'Ошибка создания промпта' });
    }
  });
  
  app.put('/api/prompts/:id', requireAuth, async (req: RequestWithSession, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Некорректный ID промпта' });
      }
      
      const result = insertPromptSchema.safeParse(req.body);
      
      if (!result.success) {
        const validationError = fromZodError(result.error);
        return res.status(400).json({ message: validationError.message });
      }
      
      const updatedPrompt = await storage.updatePrompt(id, result.data);
      
      if (!updatedPrompt) {
        return res.status(404).json({ message: 'Промпт не найден' });
      }
      
      res.json(updatedPrompt);
    } catch (error) {
      console.error('Error updating prompt:', error);
      res.status(500).json({ message: 'Ошибка обновления промпта' });
    }
  });
  
  app.delete('/api/prompts/:id', requireAuth, async (req: RequestWithSession, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Некорректный ID промпта' });
      }
      
      // Вместо прямого удаления перемещаем в корзину
      const success = await storage.moveToTrash(id);
      
      if (!success) {
        return res.status(404).json({ message: 'Промпт не найден' });
      }
      
      res.status(200).json({ message: 'Промпт перемещен в корзину' });
    } catch (error) {
      console.error('Error moving prompt to trash:', error);
      res.status(500).json({ message: 'Ошибка перемещения промпта в корзину' });
    }
  });
  
  // Маршруты для корзины (Trash)
  app.get('/api/trash', requireAuth, async (req: RequestWithSession, res: Response) => {
    try {
      const deletedPrompts = await storage.getDeletedPrompts();
      res.status(200).json(deletedPrompts);
    } catch (error) {
      console.error('Error fetching prompts from trash:', error);
      res.status(500).json({ message: 'Ошибка получения промптов из корзины' });
    }
  });
  
  app.post('/api/trash/:id/restore', requireAuth, async (req: RequestWithSession, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Некорректный ID удаленного промпта' });
      }
      
      const restored = await storage.restoreFromTrash(id);
      
      if (!restored) {
        return res.status(404).json({ message: 'Удаленный промпт не найден' });
      }
      
      res.status(200).json({ message: 'Промпт успешно восстановлен из корзины' });
    } catch (error) {
      console.error('Error restoring prompt from trash:', error);
      res.status(500).json({ message: 'Ошибка восстановления промпта из корзины' });
    }
  });
  
  app.delete('/api/trash/:id', requireAuth, async (req: RequestWithSession, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Некорректный ID удаленного промпта' });
      }
      
      const deleted = await storage.deleteFromTrash(id);
      
      if (!deleted) {
        return res.status(404).json({ message: 'Удаленный промпт не найден' });
      }
      
      res.status(200).json({ message: 'Промпт окончательно удален из корзины' });
    } catch (error) {
      console.error('Error deleting prompt from trash:', error);
      res.status(500).json({ message: 'Ошибка удаления промпта из корзины' });
    }
  });
  
  app.delete('/api/trash', requireAuth, async (req: RequestWithSession, res: Response) => {
    try {
      const emptied = await storage.emptyTrash();
      
      if (!emptied) {
        return res.status(500).json({ message: 'Не удалось очистить корзину' });
      }
      
      res.status(200).json({ message: 'Корзина успешно очищена' });
    } catch (error) {
      console.error('Error emptying trash:', error);
      res.status(500).json({ message: 'Ошибка сервера при очистке корзины' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
