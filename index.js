// server/index.ts
import express2 from "express";

// server/routes.ts
import { createServer } from "http";

// server/storage.ts
import fs2 from "fs";
import path3 from "path";
import { fileURLToPath as fileURLToPath3 } from "url";

// server/vite.ts
import express from "express";
import fs from "fs";
import path2, { dirname as dirname2 } from "path";
import { fileURLToPath as fileURLToPath2 } from "url";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import themePlugin from "@replit/vite-plugin-shadcn-theme-json";
import path, { dirname } from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import { fileURLToPath } from "url";
var __filename = fileURLToPath(import.meta.url);
var __dirname = dirname(__filename);
var vite_config_default = defineConfig({
  base: "/prompt_labaratoria/",
  plugins: [
    react(),
    runtimeErrorOverlay(),
    themePlugin(),
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("@replit/vite-plugin-cartographer").then(
        (m) => m.cartographer()
      )
    ] : []
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client", "src"),
      "@shared": path.resolve(__dirname, "shared"),
      "@assets": path.resolve(__dirname, "attached_assets")
    }
  },
  root: path.resolve(__dirname, "client"),
  build: {
    outDir: path.resolve(__dirname, "dist/public"),
    emptyOutDir: true
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var __filename2 = fileURLToPath2(import.meta.url);
var __dirname2 = dirname2(__filename2);
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path2.resolve(
        __dirname2,
        "..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path2.resolve(__dirname2, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// server/notionStorage.ts
import { Client } from "@notionhq/client";
import session from "express-session";
import createMemoryStore from "memorystore";
var NotionStorage = class {
  notionClient;
  databaseId;
  users;
  userCurrentId;
  settingsCache = /* @__PURE__ */ new Map();
  contentPartStorage = /* @__PURE__ */ new Map();
  // Хранение дополнительных частей контента
  deletedPrompts = /* @__PURE__ */ new Map();
  deletedPromptCurrentId = 1;
  idMapping = /* @__PURE__ */ new Map();
  nextId = 1;
  sessionStore;
  constructor() {
    const MemoryStore2 = createMemoryStore(session);
    this.sessionStore = new MemoryStore2({
      checkPeriod: 864e5
      // очищает просроченные сессии каждые 24 часа
    });
    const apiKey = process.env.NOTION_API_TOKEN;
    const databaseId = process.env.NOTION_DATABASE_ID;
    if (!apiKey || !databaseId) {
      throw new Error("Missing Notion API credentials in environment variables");
    }
    this.notionClient = new Client({ auth: apiKey });
    this.databaseId = databaseId;
    this.users = /* @__PURE__ */ new Map();
    this.userCurrentId = 1;
    this.settingsCache.set("notionApiToken", apiKey);
    this.settingsCache.set("notionDatabaseId", databaseId);
    log("NotionStorage initialized with database ID: " + this.databaseId, "notion");
    const adminUser = {
      id: this.userCurrentId++,
      username: "admin",
      password: "admin"
      // В реальном приложении это должен быть хешированный пароль
    };
    this.users.set(adminUser.id, adminUser);
    this.initializeDatabase();
  }
  // Метод для инициализации схемы в базе данных Notion
  async initializeDatabase() {
    try {
      const database = await this.notionClient.databases.retrieve({
        database_id: this.databaseId
      });
      log("Retrieved Notion database", "notion");
      const properties = database.properties;
      const requiredProperties = {
        content: { rich_text: {} },
        category: { select: {
          options: [
            { name: "creative", color: "blue" },
            { name: "academic", color: "green" },
            { name: "business", color: "orange" },
            { name: "technical", color: "gray" },
            { name: "other", color: "default" }
          ]
        } },
        tags: { multi_select: {
          options: [
            { name: "gpt", color: "green" },
            { name: "writing", color: "blue" },
            { name: "code", color: "gray" },
            { name: "business", color: "orange" },
            { name: "academic", color: "red" }
          ]
        } },
        createdAt: { date: {} },
        contentPartCount: { number: {} },
        partIndex: { number: {} },
        parentPromptId: { rich_text: {} }
      };
      const missingProperties = {};
      Object.entries(requiredProperties).forEach(([key, value]) => {
        if (!properties[key]) {
          missingProperties[key] = value;
        }
      });
      if (Object.keys(missingProperties).length > 0) {
        log("Updating Notion database schema with missing properties: " + Object.keys(missingProperties).join(", "), "notion");
        await this.notionClient.databases.update({
          database_id: this.databaseId,
          properties: missingProperties
        });
        log("Notion database schema updated successfully", "notion");
      } else {
        log("Notion database schema is up-to-date", "notion");
      }
    } catch (error) {
      console.error("Error initializing Notion database schema:", error);
    }
  }
  // User methods (используем in-memory хранение для пользователей)
  async getUser(id) {
    return this.users.get(id);
  }
  async getUserByUsername(username) {
    return Array.from(this.users.values()).find((user) => user.username === username);
  }
  async createUser(insertUser) {
    const id = this.userCurrentId++;
    const user = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }
  // Prompt methods (используем Notion API)
  async getPrompts() {
    try {
      const response = await this.notionClient.databases.query({
        database_id: this.databaseId,
        filter: {
          or: [
            {
              property: "parentPromptId",
              rich_text: {
                is_empty: true
              }
            },
            {
              property: "parentPromptId",
              rich_text: {
                does_not_contain: "-"
              }
            }
          ]
        }
      });
      const prompts2 = await Promise.all(response.results.map(async (page) => {
        const prompt = this.mapNotionPageToPrompt(page);
        if (prompt) {
          const fullPrompt = await this.getFullPromptContent(prompt);
          return fullPrompt;
        }
        return prompt;
      }));
      return prompts2.filter((p) => p !== void 0);
    } catch (error) {
      console.error("Error fetching prompts from Notion:", error);
      return [];
    }
  }
  // Метод для загрузки и объединения всех частей промпта
  async getFullPromptContent(prompt) {
    try {
      const notionUuid = this.idMapping.get(prompt.id);
      if (!notionUuid) {
        return prompt;
      }
      const partsResponse = await this.notionClient.databases.query({
        database_id: this.databaseId,
        filter: {
          property: "parentPromptId",
          rich_text: {
            equals: notionUuid
          }
        },
        sorts: [
          {
            property: "partIndex",
            direction: "ascending"
          }
        ]
      });
      if (partsResponse.results.length === 0) {
        return prompt;
      }
      const contentParts = [];
      for (const part of partsResponse.results) {
        try {
          const properties = part.properties;
          if (properties.content && properties.content.rich_text) {
            const contentTexts = properties.content.rich_text.filter((t) => t && t.text && t.text.content).map((t) => t.text.content);
            if (contentTexts.length > 0) {
              contentParts.push(contentTexts.join(""));
            }
          }
        } catch (err) {
          console.error("Error extracting content from part:", err);
        }
      }
      let fullContent = prompt.content;
      if (fullContent.endsWith("...")) {
        fullContent = fullContent.slice(0, -3);
      }
      fullContent += contentParts.join("");
      this.contentPartStorage.set(prompt.id, contentParts);
      return {
        ...prompt,
        content: fullContent
      };
    } catch (error) {
      console.error(`Error loading full content for prompt ${prompt.id}:`, error);
      return prompt;
    }
  }
  async getPrompt(id) {
    try {
      const notionUuid = this.idMapping.get(id);
      if (!notionUuid) {
        console.error(`No Notion UUID found for numeric ID ${id}`);
        return void 0;
      }
      const response = await this.notionClient.pages.retrieve({
        page_id: notionUuid
      });
      const prompt = this.mapNotionPageToPrompt(response);
      if (prompt) {
        return await this.getFullPromptContent(prompt);
      }
      return prompt;
    } catch (error) {
      console.error(`Error fetching prompt ${id} from Notion:`, error);
      return void 0;
    }
  }
  async createPrompt(prompt) {
    try {
      console.log("Creating prompt with title:", prompt.title);
      const MAX_CONTENT_LENGTH = 1990;
      let mainContent = prompt.content;
      let contentParts = [];
      if (prompt.content.length > MAX_CONTENT_LENGTH) {
        console.log(`Long content detected: ${prompt.content.length} characters. Splitting into parts.`);
        mainContent = prompt.content.substring(0, MAX_CONTENT_LENGTH) + "...";
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
      const MAX_TITLE_LENGTH = 1990;
      const limitedTitle = prompt.title.length > MAX_TITLE_LENGTH ? prompt.title.substring(0, MAX_TITLE_LENGTH) + "..." : prompt.title;
      const properties = {
        title: {
          title: [{ text: { content: limitedTitle } }]
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
          multi_select: prompt.tags.map((tag) => ({ name: tag }))
        },
        createdAt: {
          date: { start: (/* @__PURE__ */ new Date()).toISOString() }
        }
      };
      console.log("Creating page with properties:", JSON.stringify(properties));
      const response = await this.notionClient.pages.create({
        parent: { database_id: this.databaseId },
        properties
      });
      console.log("Created page. Response ID:", response.id);
      if (contentParts.length > 0) {
        console.log(`Creating ${contentParts.length} content parts as child pages`);
        const parentId = response.id;
        for (let i = 0; i < contentParts.length; i++) {
          try {
            const MAX_PART_TITLE_LENGTH = 100;
            const partTitle = prompt.title.length > MAX_PART_TITLE_LENGTH ? prompt.title.substring(0, MAX_PART_TITLE_LENGTH) + "... - Part " + (i + 1) : `${prompt.title} - Part ${i + 1}`;
            const partProperties = {
              title: {
                title: [{ text: { content: partTitle } }]
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
      const notionUuid = response.id;
      const numericId = this.nextId++;
      this.idMapping.set(numericId, notionUuid);
      console.log("Created page with ID:", notionUuid);
      return {
        id: numericId,
        title: prompt.title,
        content: prompt.content,
        category: prompt.category,
        tags: prompt.tags,
        createdAt: /* @__PURE__ */ new Date()
      };
    } catch (error) {
      console.error("Error creating prompt in Notion:", error);
      throw new Error("Failed to create prompt in Notion");
    }
  }
  async updatePrompt(id, promptData) {
    try {
      const notionUuid = this.idMapping.get(id);
      if (!notionUuid) {
        console.error(`No Notion UUID found for numeric ID ${id}`);
        return void 0;
      }
      const existingPrompt = await this.getPrompt(id);
      if (!existingPrompt) {
        return void 0;
      }
      const properties = {};
      if (promptData.title) {
        console.log("Updating prompt title to:", promptData.title);
        const MAX_TITLE_LENGTH = 1990;
        const limitedTitle = promptData.title.length > MAX_TITLE_LENGTH ? promptData.title.substring(0, MAX_TITLE_LENGTH) + "..." : promptData.title;
        properties.title = {
          title: [{ text: { content: limitedTitle } }]
        };
      }
      if (promptData.content) {
        const MAX_CONTENT_LENGTH = 1990;
        let mainContent = promptData.content;
        let contentParts = [];
        if (promptData.content.length > MAX_CONTENT_LENGTH) {
          console.log(`Long content detected on update: ${promptData.content.length} characters`);
          mainContent = promptData.content.substring(0, MAX_CONTENT_LENGTH) + "...";
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
          properties.contentPartCount = {
            number: contentParts.length
          };
        } else {
          properties.contentPartCount = {
            number: 0
          };
        }
        properties.content = {
          rich_text: [{ text: { content: mainContent } }]
        };
        try {
          const existingParts = await this.notionClient.databases.query({
            database_id: this.databaseId,
            filter: {
              property: "parentPromptId",
              rich_text: {
                equals: notionUuid
              }
            }
          });
          for (const part of existingParts.results) {
            await this.notionClient.pages.update({
              page_id: part.id,
              archived: true
            });
            console.log(`Archived old content part: ${part.id}`);
          }
        } catch (archiveError) {
          console.error("Error archiving old content parts:", archiveError);
        }
        if (contentParts.length > 0) {
          for (let i = 0; i < contentParts.length; i++) {
            try {
              const MAX_PART_TITLE_LENGTH = 100;
              const titleToUse = promptData.title || existingPrompt.title;
              const partTitle = titleToUse.length > MAX_PART_TITLE_LENGTH ? titleToUse.substring(0, MAX_PART_TITLE_LENGTH) + "... - Part " + (i + 1) : `${titleToUse} - Part ${i + 1}`;
              const partProperties = {
                title: {
                  title: [{ text: { content: partTitle } }]
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
              const childResponse = await this.notionClient.pages.create({
                parent: { database_id: this.databaseId },
                properties: partProperties
              });
              console.log(`Created updated content part ${i + 1} with ID: ${childResponse.id}`);
            } catch (partError) {
              console.error(`Error creating updated content part ${i + 1}:`, partError);
            }
          }
          this.contentPartStorage.set(id, contentParts);
        } else {
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
          multi_select: promptData.tags.map((tag) => ({ name: tag }))
        };
      }
      await this.notionClient.pages.update({
        page_id: notionUuid,
        properties
      });
      return {
        ...existingPrompt,
        ...promptData
      };
    } catch (error) {
      console.error(`Error updating prompt ${id} in Notion:`, error);
      return void 0;
    }
  }
  async deletePrompt(id) {
    try {
      const notionUuid = this.idMapping.get(id);
      if (!notionUuid) {
        console.error(`No Notion UUID found for numeric ID ${id}`);
        return false;
      }
      await this.notionClient.pages.update({
        page_id: notionUuid,
        archived: true
      });
      this.idMapping.delete(id);
      return true;
    } catch (error) {
      console.error(`Error deleting prompt ${id} from Notion:`, error);
      return false;
    }
  }
  // User management methods
  async updateUser(id, username, password) {
    const existingUser = await this.getUser(id);
    if (!existingUser) {
      return void 0;
    }
    const updatedUser = {
      ...existingUser,
      username,
      password
    };
    this.users.set(id, updatedUser);
    return updatedUser;
  }
  // Settings methods
  async getSetting(key) {
    return this.settingsCache.get(key) || void 0;
  }
  async setSetting(key, value) {
    this.settingsCache.set(key, value);
  }
  async updateNotionSettings(apiToken, databaseId) {
    this.settingsCache.set("notionApiToken", apiToken);
    this.settingsCache.set("notionDatabaseId", databaseId);
    process.env.NOTION_API_TOKEN = apiToken;
    process.env.NOTION_DATABASE_ID = databaseId;
    this.notionClient = new Client({ auth: apiToken });
    this.databaseId = databaseId;
    await this.initializeDatabase();
  }
  // Реализация методов корзины для Notion
  // Для Notion мы храним удаленные промпты в памяти, так как в Notion
  // архивирование страниц - это одностороннее действие
  async getDeletedPrompts() {
    return Array.from(this.deletedPrompts.values());
  }
  async moveToTrash(promptId) {
    const prompt = await this.getPrompt(promptId);
    if (!prompt) {
      return false;
    }
    const deleted = await this.deletePrompt(promptId);
    if (!deleted) {
      return false;
    }
    const id = this.deletedPromptCurrentId++;
    const now = /* @__PURE__ */ new Date();
    const expiryDate = /* @__PURE__ */ new Date();
    expiryDate.setDate(expiryDate.getDate() + 7);
    const deletedPrompt = {
      id,
      originalId: prompt.id,
      title: prompt.title,
      content: prompt.content,
      category: prompt.category,
      tags: prompt.tags,
      createdAt: prompt.createdAt,
      deletedAt: now,
      expiryDate
    };
    this.deletedPrompts.set(id, deletedPrompt);
    return true;
  }
  async restoreFromTrash(deletedPromptId) {
    const deletedPrompt = this.deletedPrompts.get(deletedPromptId);
    if (!deletedPrompt) {
      return false;
    }
    try {
      const restoredPrompt = await this.createPrompt({
        title: deletedPrompt.title,
        content: deletedPrompt.content,
        category: deletedPrompt.category,
        tags: deletedPrompt.tags
      });
      this.deletedPrompts.delete(deletedPromptId);
      return true;
    } catch (error) {
      console.error("Error restoring prompt from trash:", error);
      return false;
    }
  }
  async deleteFromTrash(deletedPromptId) {
    return this.deletedPrompts.delete(deletedPromptId);
  }
  async emptyTrash() {
    this.deletedPrompts.clear();
    return true;
  }
  // Вспомогательный метод для преобразования страницы Notion в формат нашего приложения
  mapNotionPageToPrompt(notionPage) {
    const properties = notionPage.properties;
    const notionUuid = notionPage.id;
    let numericId = -1;
    this.idMapping.forEach((uuid, id) => {
      if (uuid === notionUuid) {
        numericId = id;
      }
    });
    if (numericId === -1) {
      numericId = this.nextId++;
      this.idMapping.set(numericId, notionUuid);
    }
    let title = "Untitled";
    try {
      if (properties.title) {
        if (Array.isArray(properties.title.title)) {
          const titleTexts = properties.title.title.filter((t) => t && t.text && t.text.content).map((t) => t.text.content);
          if (titleTexts.length > 0) {
            title = titleTexts.join("");
          }
        } else if (properties.title.rich_text) {
          const titleTexts = properties.title.rich_text.filter((t) => t && t.text && t.text.content).map((t) => t.text.content);
          if (titleTexts.length > 0) {
            title = titleTexts.join("");
          }
        } else if (typeof properties.title === "string") {
          title = properties.title;
        }
      } else if (properties.Name) {
        if (Array.isArray(properties.Name.title)) {
          const titleTexts = properties.Name.title.filter((t) => t && t.text && t.text.content).map((t) => t.text.content);
          if (titleTexts.length > 0) {
            title = titleTexts.join("");
          }
        }
      }
    } catch (error) {
      console.error("Error parsing title from Notion:", error);
    }
    let content = "";
    try {
      if (properties.content && properties.content.rich_text) {
        const contentTexts = properties.content.rich_text.filter((t) => t && t.text && t.text.content).map((t) => t.text.content);
        if (contentTexts.length > 0) {
          content = contentTexts.join("\n");
        }
        let contentPartCount = 0;
        if (properties.contentPartCount && properties.contentPartCount.number !== void 0) {
          contentPartCount = properties.contentPartCount.number;
        }
        if (contentPartCount > 0) {
          console.log(`Found prompt with ${contentPartCount} additional content parts, notionUuid: ${notionUuid}`);
          const parts = this.contentPartStorage.get(numericId) || [];
          if (parts.length > 0) {
            console.log(`Using cached ${parts.length} content parts for prompt ${numericId}`);
            const fullContent = content.replace(/\.\.\.$/, "") + parts.join("");
            content = fullContent;
          } else {
            console.log(`No cached content parts found, will load them asynchronously`);
          }
        }
      }
    } catch (error) {
      console.error("Error parsing content from Notion:", error);
    }
    let category = "other";
    try {
      if (properties.category && properties.category.select && properties.category.select.name) {
        category = properties.category.select.name;
      }
    } catch (error) {
      console.error("Error parsing category from Notion:", error);
    }
    let tags = [];
    try {
      if (properties.tags && properties.tags.multi_select) {
        tags = properties.tags.multi_select.filter((t) => t && t.name).map((t) => t.name);
      }
    } catch (error) {
      console.error("Error parsing tags from Notion:", error);
    }
    let createdAt = /* @__PURE__ */ new Date();
    try {
      if (properties.createdAt && properties.createdAt.date && properties.createdAt.date.start) {
        createdAt = new Date(properties.createdAt.date.start);
      }
    } catch (error) {
      console.error("Error parsing createdAt from Notion:", error);
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
};

// server/storage.ts
import session2 from "express-session";
import createMemoryStore2 from "memorystore";
var __filename3 = fileURLToPath3(import.meta.url);
var __dirname3 = path3.dirname(__filename3);
var DATA_FILE = path3.join(__dirname3, "..", "data", "prompts.json");
try {
  if (!fs2.existsSync(path3.join(__dirname3, "..", "data"))) {
    fs2.mkdirSync(path3.join(__dirname3, "..", "data"), { recursive: true });
  }
  if (!fs2.existsSync(DATA_FILE)) {
    fs2.writeFileSync(DATA_FILE, JSON.stringify({ prompts: [] }, null, 2));
  }
} catch (error) {
  console.error("Error setting up data storage:", error);
}
var MemStorage = class {
  users;
  prompts;
  deletedPrompts;
  settings;
  userCurrentId;
  promptCurrentId;
  deletedPromptCurrentId;
  sessionStore;
  constructor() {
    this.users = /* @__PURE__ */ new Map();
    this.prompts = /* @__PURE__ */ new Map();
    this.deletedPrompts = /* @__PURE__ */ new Map();
    this.settings = /* @__PURE__ */ new Map();
    this.userCurrentId = 1;
    this.promptCurrentId = 1;
    this.deletedPromptCurrentId = 1;
    const MemoryStore2 = createMemoryStore2(session2);
    this.sessionStore = new MemoryStore2({
      checkPeriod: 864e5
      // очищает просроченные сессии каждые 24 часа
    });
    this.settings.set("notionApiToken", process.env.NOTION_API_TOKEN || "");
    this.settings.set("notionDatabaseId", process.env.NOTION_DATABASE_ID || "");
    this.createDefaultAdminUser();
    this.loadPrompts();
  }
  async createDefaultAdminUser() {
    const adminUser = await this.getUserByUsername("admin");
    if (!adminUser) {
      await this.createUser({
        username: "admin",
        password: "admin"
      });
      log("Created default admin user", "storage");
    }
  }
  loadPrompts() {
    try {
      const data = JSON.parse(fs2.readFileSync(DATA_FILE, "utf8"));
      if (Array.isArray(data.prompts)) {
        data.prompts.forEach((prompt) => {
          if (typeof prompt.createdAt === "string") {
            prompt.createdAt = new Date(prompt.createdAt);
          }
          this.prompts.set(prompt.id, prompt);
          if (prompt.id >= this.promptCurrentId) {
            this.promptCurrentId = prompt.id + 1;
          }
        });
      }
    } catch (error) {
      console.error("Error loading prompts:", error);
    }
  }
  savePrompts() {
    try {
      const prompts2 = Array.from(this.prompts.values());
      fs2.writeFileSync(DATA_FILE, JSON.stringify({ prompts: prompts2 }, null, 2));
    } catch (error) {
      console.error("Error saving prompts:", error);
    }
  }
  // User methods
  async getUser(id) {
    return this.users.get(id);
  }
  async getUserByUsername(username) {
    return Array.from(this.users.values()).find(
      (user) => user.username === username
    );
  }
  async createUser(insertUser) {
    const id = this.userCurrentId++;
    const user = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }
  // Prompt methods
  async getPrompts() {
    return Array.from(this.prompts.values());
  }
  async getPrompt(id) {
    return this.prompts.get(id);
  }
  async createPrompt(insertPrompt) {
    const id = this.promptCurrentId++;
    const now = /* @__PURE__ */ new Date();
    const prompt = {
      ...insertPrompt,
      id,
      createdAt: now
    };
    this.prompts.set(id, prompt);
    this.savePrompts();
    return prompt;
  }
  async updatePrompt(id, promptData) {
    const existingPrompt = this.prompts.get(id);
    if (!existingPrompt) {
      return void 0;
    }
    const updatedPrompt = {
      ...existingPrompt,
      ...promptData
    };
    this.prompts.set(id, updatedPrompt);
    this.savePrompts();
    return updatedPrompt;
  }
  async deletePrompt(id) {
    const deleted = this.prompts.delete(id);
    if (deleted) {
      this.savePrompts();
    }
    return deleted;
  }
  // User management methods
  async updateUser(id, username, password) {
    const existingUser = this.users.get(id);
    if (!existingUser) {
      return void 0;
    }
    const updatedUser = {
      ...existingUser,
      username,
      password
    };
    this.users.set(id, updatedUser);
    return updatedUser;
  }
  // Settings methods
  async getSetting(key) {
    return this.settings.get(key);
  }
  async setSetting(key, value) {
    this.settings.set(key, value);
  }
  async updateNotionSettings(apiToken, databaseId) {
    this.settings.set("notionApiToken", apiToken);
    this.settings.set("notionDatabaseId", databaseId);
    process.env.NOTION_API_TOKEN = apiToken;
    process.env.NOTION_DATABASE_ID = databaseId;
  }
  // Методы для работы с корзиной
  async getDeletedPrompts() {
    return Array.from(this.deletedPrompts.values());
  }
  async moveToTrash(promptId) {
    const prompt = this.prompts.get(promptId);
    if (!prompt) {
      return false;
    }
    const id = this.deletedPromptCurrentId++;
    const now = /* @__PURE__ */ new Date();
    const expiryDate = /* @__PURE__ */ new Date();
    expiryDate.setDate(expiryDate.getDate() + 7);
    const deletedPrompt = {
      id,
      originalId: prompt.id,
      title: prompt.title,
      content: prompt.content,
      category: prompt.category,
      tags: prompt.tags,
      createdAt: prompt.createdAt,
      deletedAt: now,
      expiryDate
    };
    this.deletedPrompts.set(id, deletedPrompt);
    const deleted = this.prompts.delete(promptId);
    if (deleted) {
      this.savePrompts();
    }
    return true;
  }
  async restoreFromTrash(deletedPromptId) {
    const deletedPrompt = this.deletedPrompts.get(deletedPromptId);
    if (!deletedPrompt) {
      return false;
    }
    const existingId = this.prompts.has(deletedPrompt.originalId) ? this.promptCurrentId++ : deletedPrompt.originalId;
    const restoredPrompt = {
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
  async deleteFromTrash(deletedPromptId) {
    return this.deletedPrompts.delete(deletedPromptId);
  }
  async emptyTrash() {
    this.deletedPrompts.clear();
    return true;
  }
};
var storage;
try {
  if (process.env.NOTION_API_TOKEN && process.env.NOTION_DATABASE_ID) {
    log("Using Notion storage for prompts", "storage");
    storage = new NotionStorage();
  } else {
    log("Using memory storage for prompts", "storage");
    storage = new MemStorage();
  }
} catch (error) {
  console.error("Error initializing Notion storage:", error);
  log("Fallback to memory storage due to Notion initialization error", "storage");
  storage = new MemStorage();
}

// shared/schema.ts
import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
var users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull()
});
var insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true
});
var prompts = pgTable("prompts", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  category: text("category").notNull(),
  tags: text("tags").array().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});
var insertPromptSchema = createInsertSchema(prompts).omit({
  id: true,
  createdAt: true
});
var settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var insertSettingSchema = createInsertSchema(settings).omit({
  id: true,
  updatedAt: true
});
var updateCredentialsSchema = z.object({
  username: z.string().min(3, "\u0418\u043C\u044F \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044F \u0434\u043E\u043B\u0436\u043D\u043E \u0441\u043E\u0434\u0435\u0440\u0436\u0430\u0442\u044C \u043D\u0435 \u043C\u0435\u043D\u0435\u0435 3 \u0441\u0438\u043C\u0432\u043E\u043B\u043E\u0432"),
  currentPassword: z.string().min(1, "\u0422\u0435\u043A\u0443\u0449\u0438\u0439 \u043F\u0430\u0440\u043E\u043B\u044C \u043E\u0431\u044F\u0437\u0430\u0442\u0435\u043B\u0435\u043D"),
  newPassword: z.string().min(6, "\u041D\u043E\u0432\u044B\u0439 \u043F\u0430\u0440\u043E\u043B\u044C \u0434\u043E\u043B\u0436\u0435\u043D \u0441\u043E\u0434\u0435\u0440\u0436\u0430\u0442\u044C \u043D\u0435 \u043C\u0435\u043D\u0435\u0435 6 \u0441\u0438\u043C\u0432\u043E\u043B\u043E\u0432")
});
var updateNotionSettingsSchema = z.object({
  notionApiToken: z.string().min(1, "API \u0442\u043E\u043A\u0435\u043D \u043E\u0431\u044F\u0437\u0430\u0442\u0435\u043B\u0435\u043D"),
  notionDatabaseId: z.string().min(1, "ID \u0431\u0430\u0437\u044B \u0434\u0430\u043D\u043D\u044B\u0445 \u043E\u0431\u044F\u0437\u0430\u0442\u0435\u043B\u0435\u043D")
});
var deletedPrompts = pgTable("deleted_prompts", {
  id: serial("id").primaryKey(),
  originalId: integer("original_id").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  category: text("category").notNull(),
  tags: text("tags").array().notNull(),
  createdAt: timestamp("created_at").notNull(),
  deletedAt: timestamp("deleted_at").defaultNow().notNull(),
  // Автоматическое удаление через 7 дней
  expiryDate: timestamp("expiry_date").notNull()
});
var insertDeletedPromptSchema = createInsertSchema(deletedPrompts).omit({
  id: true,
  deletedAt: true,
  expiryDate: true
});

// server/routes.ts
import { fromZodError } from "zod-validation-error";

// server/auth.ts
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import session3 from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
var scryptAsync = promisify(scrypt);
async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const buf = await scryptAsync(password, salt, 64);
  return `${buf.toString("hex")}.${salt}`;
}
async function comparePasswords(supplied, stored) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = await scryptAsync(supplied, salt, 64);
  return timingSafeEqual(hashedBuf, suppliedBuf);
}
function setupAuth(app2) {
  const sessionSettings = {
    secret: process.env.SESSION_SECRET || "your-secret-key",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      maxAge: 7 * 24 * 60 * 60 * 1e3,
      // 7 дней
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax"
    }
  };
  app2.set("trust proxy", 1);
  app2.use(session3(sessionSettings));
  app2.use(passport.initialize());
  app2.use(passport.session());
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user) {
          return done(null, false);
        }
        let passwordMatch = false;
        if (user.password.includes(".")) {
          passwordMatch = await comparePasswords(password, user.password);
        } else {
          passwordMatch = password === user.password;
        }
        if (!passwordMatch) {
          return done(null, false);
        }
        return done(null, user);
      } catch (error) {
        return done(error);
      }
    })
  );
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });
  app2.post("/api/register", async (req, res, next) => {
    try {
      const existingUser = await storage.getUserByUsername(req.body.username);
      if (existingUser) {
        return res.status(400).json({ message: "\u0418\u043C\u044F \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044F \u0443\u0436\u0435 \u0437\u0430\u043D\u044F\u0442\u043E" });
      }
      const user = await storage.createUser({
        ...req.body,
        password: await hashPassword(req.body.password)
      });
      req.login(user, (err) => {
        if (err) return next(err);
        const userWithoutPassword = {
          id: user.id,
          username: user.username
        };
        res.status(201).json(userWithoutPassword);
      });
    } catch (err) {
      log(`\u041E\u0448\u0438\u0431\u043A\u0430 \u0440\u0435\u0433\u0438\u0441\u0442\u0440\u0430\u0446\u0438\u0438: ${err}`, "auth");
      next(err);
    }
  });
  app2.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err, user, info) => {
      if (err) return next(err);
      if (!user) {
        return res.status(401).json({ message: "\u041D\u0435\u0432\u0435\u0440\u043D\u043E\u0435 \u0438\u043C\u044F \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044F \u0438\u043B\u0438 \u043F\u0430\u0440\u043E\u043B\u044C" });
      }
      req.login(user, (err2) => {
        if (err2) return next(err2);
        const userWithoutPassword = {
          id: user.id,
          username: user.username
        };
        res.status(200).json(userWithoutPassword);
      });
    })(req, res, next);
  });
  app2.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });
  app2.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "\u041F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044C \u043D\u0435 \u0430\u0432\u0442\u043E\u0440\u0438\u0437\u043E\u0432\u0430\u043D" });
    }
    const userWithoutPassword = {
      id: req.user.id,
      username: req.user.username
    };
    res.json(userWithoutPassword);
  });
}

// server/routes.ts
import { scrypt as scrypt2, randomBytes as randomBytes2, timingSafeEqual as timingSafeEqual2 } from "crypto";
import { promisify as promisify2 } from "util";
var scryptAsync2 = promisify2(scrypt2);
async function hashPassword2(password) {
  const salt = randomBytes2(16).toString("hex");
  const buf = await scryptAsync2(password, salt, 64);
  return `${buf.toString("hex")}.${salt}`;
}
async function comparePasswords2(supplied, stored) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = await scryptAsync2(supplied, salt, 64);
  return timingSafeEqual2(hashedBuf, suppliedBuf);
}
async function registerRoutes(app2) {
  setupAuth(app2);
  function requireAuth(req, res, next) {
    if (req.isAuthenticated()) {
      return next();
    }
    return res.status(401).json({ message: "\u0422\u0440\u0435\u0431\u0443\u0435\u0442\u0441\u044F \u0430\u0432\u0442\u043E\u0440\u0438\u0437\u0430\u0446\u0438\u044F" });
  }
  app2.get("/api/settings/:key", requireAuth, async (req, res) => {
    try {
      const key = req.params.key;
      const value = await storage.getSetting(key);
      if (value === void 0) {
        return res.status(404).json({ message: "\u041D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0430 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u0430" });
      }
      res.json({ key, value });
    } catch (error) {
      console.error("Error fetching setting:", error);
      res.status(500).json({ message: "\u041E\u0448\u0438\u0431\u043A\u0430 \u043F\u043E\u043B\u0443\u0447\u0435\u043D\u0438\u044F \u043D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438" });
    }
  });
  app2.post("/api/settings/:key", requireAuth, async (req, res) => {
    try {
      const { key } = req.params;
      const { value } = req.body;
      if (value === void 0) {
        return res.status(400).json({ message: "\u041D\u0435\u043E\u0431\u0445\u043E\u0434\u0438\u043C\u043E \u0443\u043A\u0430\u0437\u0430\u0442\u044C \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0435" });
      }
      await storage.setSetting(key, value);
      res.status(200).json({ key, value });
    } catch (error) {
      console.error("Error setting value:", error);
      res.status(500).json({ message: "\u041E\u0448\u0438\u0431\u043A\u0430 \u0441\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u0438\u044F \u043D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438" });
    }
  });
  app2.post("/api/update-credentials", requireAuth, async (req, res) => {
    try {
      const result = updateCredentialsSchema.safeParse(req.body);
      if (!result.success) {
        const validationError = fromZodError(result.error);
        return res.status(400).json({ message: validationError.message });
      }
      const { username, currentPassword, newPassword } = result.data;
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "\u041F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044C \u043D\u0435 \u0430\u0432\u0442\u043E\u0440\u0438\u0437\u043E\u0432\u0430\u043D" });
      }
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "\u041F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044C \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D" });
      }
      let passwordMatch = false;
      if (user.password.includes(".")) {
        passwordMatch = await comparePasswords2(currentPassword, user.password);
      } else {
        passwordMatch = currentPassword === user.password;
      }
      if (!passwordMatch) {
        return res.status(401).json({ message: "\u041D\u0435\u0432\u0435\u0440\u043D\u044B\u0439 \u0442\u0435\u043A\u0443\u0449\u0438\u0439 \u043F\u0430\u0440\u043E\u043B\u044C" });
      }
      const hashedPassword = await hashPassword2(newPassword);
      const updatedUser = await storage.updateUser(userId, username, hashedPassword);
      if (!updatedUser) {
        return res.status(500).json({ message: "\u041E\u0448\u0438\u0431\u043A\u0430 \u043E\u0431\u043D\u043E\u0432\u043B\u0435\u043D\u0438\u044F \u0443\u0447\u0435\u0442\u043D\u044B\u0445 \u0434\u0430\u043D\u043D\u044B\u0445" });
      }
      res.json({ message: "\u0423\u0447\u0435\u0442\u043D\u044B\u0435 \u0434\u0430\u043D\u043D\u044B\u0435 \u0443\u0441\u043F\u0435\u0448\u043D\u043E \u043E\u0431\u043D\u043E\u0432\u043B\u0435\u043D\u044B" });
    } catch (error) {
      console.error("Error updating credentials:", error);
      res.status(500).json({ message: "\u041E\u0448\u0438\u0431\u043A\u0430 \u043E\u0431\u043D\u043E\u0432\u043B\u0435\u043D\u0438\u044F \u0443\u0447\u0435\u0442\u043D\u044B\u0445 \u0434\u0430\u043D\u043D\u044B\u0445" });
    }
  });
  app2.post("/api/update-notion-settings", requireAuth, async (req, res) => {
    try {
      const result = updateNotionSettingsSchema.safeParse(req.body);
      if (!result.success) {
        const validationError = fromZodError(result.error);
        return res.status(400).json({ message: validationError.message });
      }
      const { notionApiToken, notionDatabaseId } = result.data;
      await storage.updateNotionSettings(notionApiToken, notionDatabaseId);
      res.json({ message: "\u041D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438 Notion \u0443\u0441\u043F\u0435\u0448\u043D\u043E \u043E\u0431\u043D\u043E\u0432\u043B\u0435\u043D\u044B" });
    } catch (error) {
      console.error("Error updating Notion settings:", error);
      res.status(500).json({ message: "\u041E\u0448\u0438\u0431\u043A\u0430 \u043E\u0431\u043D\u043E\u0432\u043B\u0435\u043D\u0438\u044F \u043D\u0430\u0441\u0442\u0440\u043E\u0435\u043A Notion" });
    }
  });
  app2.get("/api/prompts", requireAuth, async (req, res) => {
    try {
      const prompts2 = await storage.getPrompts();
      res.json(prompts2);
    } catch (error) {
      console.error("Error fetching prompts:", error);
      res.status(500).json({ message: "\u041E\u0448\u0438\u0431\u043A\u0430 \u043F\u043E\u043B\u0443\u0447\u0435\u043D\u0438\u044F \u043F\u0440\u043E\u043C\u043F\u0442\u043E\u0432" });
    }
  });
  app2.get("/api/prompts/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "\u041D\u0435\u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u044B\u0439 ID \u043F\u0440\u043E\u043C\u043F\u0442\u0430" });
      }
      const prompt = await storage.getPrompt(id);
      if (!prompt) {
        return res.status(404).json({ message: "\u041F\u0440\u043E\u043C\u043F\u0442 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D" });
      }
      res.json(prompt);
    } catch (error) {
      console.error("Error fetching prompt:", error);
      res.status(500).json({ message: "\u041E\u0448\u0438\u0431\u043A\u0430 \u043F\u043E\u043B\u0443\u0447\u0435\u043D\u0438\u044F \u043F\u0440\u043E\u043C\u043F\u0442\u0430" });
    }
  });
  app2.post("/api/prompts", requireAuth, async (req, res) => {
    try {
      const result = insertPromptSchema.safeParse(req.body);
      if (!result.success) {
        const validationError = fromZodError(result.error);
        return res.status(400).json({ message: validationError.message });
      }
      const prompt = await storage.createPrompt(result.data);
      res.status(201).json(prompt);
    } catch (error) {
      console.error("Error creating prompt:", error);
      res.status(500).json({ message: "\u041E\u0448\u0438\u0431\u043A\u0430 \u0441\u043E\u0437\u0434\u0430\u043D\u0438\u044F \u043F\u0440\u043E\u043C\u043F\u0442\u0430" });
    }
  });
  app2.put("/api/prompts/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "\u041D\u0435\u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u044B\u0439 ID \u043F\u0440\u043E\u043C\u043F\u0442\u0430" });
      }
      const result = insertPromptSchema.safeParse(req.body);
      if (!result.success) {
        const validationError = fromZodError(result.error);
        return res.status(400).json({ message: validationError.message });
      }
      const updatedPrompt = await storage.updatePrompt(id, result.data);
      if (!updatedPrompt) {
        return res.status(404).json({ message: "\u041F\u0440\u043E\u043C\u043F\u0442 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D" });
      }
      res.json(updatedPrompt);
    } catch (error) {
      console.error("Error updating prompt:", error);
      res.status(500).json({ message: "\u041E\u0448\u0438\u0431\u043A\u0430 \u043E\u0431\u043D\u043E\u0432\u043B\u0435\u043D\u0438\u044F \u043F\u0440\u043E\u043C\u043F\u0442\u0430" });
    }
  });
  app2.delete("/api/prompts/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "\u041D\u0435\u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u044B\u0439 ID \u043F\u0440\u043E\u043C\u043F\u0442\u0430" });
      }
      const success = await storage.moveToTrash(id);
      if (!success) {
        return res.status(404).json({ message: "\u041F\u0440\u043E\u043C\u043F\u0442 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D" });
      }
      res.status(200).json({ message: "\u041F\u0440\u043E\u043C\u043F\u0442 \u043F\u0435\u0440\u0435\u043C\u0435\u0449\u0435\u043D \u0432 \u043A\u043E\u0440\u0437\u0438\u043D\u0443" });
    } catch (error) {
      console.error("Error moving prompt to trash:", error);
      res.status(500).json({ message: "\u041E\u0448\u0438\u0431\u043A\u0430 \u043F\u0435\u0440\u0435\u043C\u0435\u0449\u0435\u043D\u0438\u044F \u043F\u0440\u043E\u043C\u043F\u0442\u0430 \u0432 \u043A\u043E\u0440\u0437\u0438\u043D\u0443" });
    }
  });
  app2.get("/api/trash", requireAuth, async (req, res) => {
    try {
      const deletedPrompts2 = await storage.getDeletedPrompts();
      res.status(200).json(deletedPrompts2);
    } catch (error) {
      console.error("Error fetching prompts from trash:", error);
      res.status(500).json({ message: "\u041E\u0448\u0438\u0431\u043A\u0430 \u043F\u043E\u043B\u0443\u0447\u0435\u043D\u0438\u044F \u043F\u0440\u043E\u043C\u043F\u0442\u043E\u0432 \u0438\u0437 \u043A\u043E\u0440\u0437\u0438\u043D\u044B" });
    }
  });
  app2.post("/api/trash/:id/restore", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "\u041D\u0435\u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u044B\u0439 ID \u0443\u0434\u0430\u043B\u0435\u043D\u043D\u043E\u0433\u043E \u043F\u0440\u043E\u043C\u043F\u0442\u0430" });
      }
      const restored = await storage.restoreFromTrash(id);
      if (!restored) {
        return res.status(404).json({ message: "\u0423\u0434\u0430\u043B\u0435\u043D\u043D\u044B\u0439 \u043F\u0440\u043E\u043C\u043F\u0442 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D" });
      }
      res.status(200).json({ message: "\u041F\u0440\u043E\u043C\u043F\u0442 \u0443\u0441\u043F\u0435\u0448\u043D\u043E \u0432\u043E\u0441\u0441\u0442\u0430\u043D\u043E\u0432\u043B\u0435\u043D \u0438\u0437 \u043A\u043E\u0440\u0437\u0438\u043D\u044B" });
    } catch (error) {
      console.error("Error restoring prompt from trash:", error);
      res.status(500).json({ message: "\u041E\u0448\u0438\u0431\u043A\u0430 \u0432\u043E\u0441\u0441\u0442\u0430\u043D\u043E\u0432\u043B\u0435\u043D\u0438\u044F \u043F\u0440\u043E\u043C\u043F\u0442\u0430 \u0438\u0437 \u043A\u043E\u0440\u0437\u0438\u043D\u044B" });
    }
  });
  app2.delete("/api/trash/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "\u041D\u0435\u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u044B\u0439 ID \u0443\u0434\u0430\u043B\u0435\u043D\u043D\u043E\u0433\u043E \u043F\u0440\u043E\u043C\u043F\u0442\u0430" });
      }
      const deleted = await storage.deleteFromTrash(id);
      if (!deleted) {
        return res.status(404).json({ message: "\u0423\u0434\u0430\u043B\u0435\u043D\u043D\u044B\u0439 \u043F\u0440\u043E\u043C\u043F\u0442 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D" });
      }
      res.status(200).json({ message: "\u041F\u0440\u043E\u043C\u043F\u0442 \u043E\u043A\u043E\u043D\u0447\u0430\u0442\u0435\u043B\u044C\u043D\u043E \u0443\u0434\u0430\u043B\u0435\u043D \u0438\u0437 \u043A\u043E\u0440\u0437\u0438\u043D\u044B" });
    } catch (error) {
      console.error("Error deleting prompt from trash:", error);
      res.status(500).json({ message: "\u041E\u0448\u0438\u0431\u043A\u0430 \u0443\u0434\u0430\u043B\u0435\u043D\u0438\u044F \u043F\u0440\u043E\u043C\u043F\u0442\u0430 \u0438\u0437 \u043A\u043E\u0440\u0437\u0438\u043D\u044B" });
    }
  });
  app2.delete("/api/trash", requireAuth, async (req, res) => {
    try {
      const emptied = await storage.emptyTrash();
      if (!emptied) {
        return res.status(500).json({ message: "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043E\u0447\u0438\u0441\u0442\u0438\u0442\u044C \u043A\u043E\u0440\u0437\u0438\u043D\u0443" });
      }
      res.status(200).json({ message: "\u041A\u043E\u0440\u0437\u0438\u043D\u0430 \u0443\u0441\u043F\u0435\u0448\u043D\u043E \u043E\u0447\u0438\u0449\u0435\u043D\u0430" });
    } catch (error) {
      console.error("Error emptying trash:", error);
      res.status(500).json({ message: "\u041E\u0448\u0438\u0431\u043A\u0430 \u0441\u0435\u0440\u0432\u0435\u0440\u0430 \u043F\u0440\u0438 \u043E\u0447\u0438\u0441\u0442\u043A\u0435 \u043A\u043E\u0440\u0437\u0438\u043D\u044B" });
    }
  });
  const httpServer = createServer(app2);
  return httpServer;
}

// server/index.ts
import session4 from "express-session";
import memorystore from "memorystore";
import dotenv from "dotenv";
dotenv.config();
var MemoryStore = memorystore(session4);
var app = express2();
app.use(express2.json());
app.use(express2.urlencoded({ extended: false }));
app.use(session4({
  secret: process.env.SESSION_SECRET || "your-secret-key",
  saveUninitialized: false,
  resave: false,
  cookie: {
    maxAge: 24 * 60 * 60 * 1e3,
    // 24 часа
    secure: process.env.NODE_ENV === "production",
    httpOnly: true
  },
  store: new MemoryStore({
    checkPeriod: 864e5
    // очищает просроченные сессии каждые 24 часа
  })
}));
app.use((req, res, next) => {
  const start = Date.now();
  const path4 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path4.startsWith("/api")) {
      let logLine = `${req.method} ${path4} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = 5e3;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true
  }, () => {
    log(`serving on port ${port}`);
  });
})();
