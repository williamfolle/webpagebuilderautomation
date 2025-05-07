import type { Express } from "express";
import { createServer, type Server } from "http";
import apiRouter from '../api/index';

export async function registerRoutes(app: Express): Promise<Server> {
  // Usar a API definida em api/index.ts
  app.use('/api/process-files', apiRouter);

  // Criar e retornar o servidor HTTP
  const httpServer = createServer(app);
  return httpServer;
}
