import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertPromptSchema } from "@shared/schema";
import { z } from "zod";
import { fromZodError } from "zod-validation-error";

export async function registerRoutes(app: Express): Promise<Server> {
  // API Routes
  const apiRouter = app.route('/api');
  
  // Get all prompts
  app.get('/api/prompts', async (req, res) => {
    try {
      const prompts = await storage.getPrompts();
      res.json(prompts);
    } catch (error) {
      console.error('Error fetching prompts:', error);
      res.status(500).json({ message: 'Failed to fetch prompts' });
    }
  });
  
  // Get a specific prompt
  app.get('/api/prompts/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid prompt ID' });
      }
      
      const prompt = await storage.getPrompt(id);
      
      if (!prompt) {
        return res.status(404).json({ message: 'Prompt not found' });
      }
      
      res.json(prompt);
    } catch (error) {
      console.error('Error fetching prompt:', error);
      res.status(500).json({ message: 'Failed to fetch prompt' });
    }
  });
  
  // Create a new prompt
  app.post('/api/prompts', async (req, res) => {
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
      res.status(500).json({ message: 'Failed to create prompt' });
    }
  });
  
  // Update a prompt
  app.put('/api/prompts/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid prompt ID' });
      }
      
      const result = insertPromptSchema.safeParse(req.body);
      
      if (!result.success) {
        const validationError = fromZodError(result.error);
        return res.status(400).json({ message: validationError.message });
      }
      
      const updatedPrompt = await storage.updatePrompt(id, result.data);
      
      if (!updatedPrompt) {
        return res.status(404).json({ message: 'Prompt not found' });
      }
      
      res.json(updatedPrompt);
    } catch (error) {
      console.error('Error updating prompt:', error);
      res.status(500).json({ message: 'Failed to update prompt' });
    }
  });
  
  // Delete a prompt
  app.delete('/api/prompts/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid prompt ID' });
      }
      
      const success = await storage.deletePrompt(id);
      
      if (!success) {
        return res.status(404).json({ message: 'Prompt not found' });
      }
      
      res.status(204).end();
    } catch (error) {
      console.error('Error deleting prompt:', error);
      res.status(500).json({ message: 'Failed to delete prompt' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
