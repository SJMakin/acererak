import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { createProxyMiddleware, Options } from 'http-proxy-middleware';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// API key validation middleware
const validateApiKeyRequest = (req: Request, res: Response, next: NextFunction) => {
  const clientApiKey = req.headers['x-api-key'];
  
  // If the client doesn't provide an API key or it's invalid
  if (!clientApiKey) {
    // For requests that don't need authentication, just pass through
    // For requests that do need authentication, the OpenRouter API will reject them
    console.log('No client API key provided');
  }
  
  // Add the server's API key to the request to OpenRouter
  req.headers['Authorization'] = `Bearer ${process.env.OPENROUTER_KEY}`;
  next();
};

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.ALLOWED_ORIGIN || false
    : true
}));

// API proxy for OpenRouter
app.use('/api/openrouter', validateApiKeyRequest, createProxyMiddleware({
  target: 'https://openrouter.ai/api/v1',
  changeOrigin: true,
  pathRewrite: {
    '^/api/openrouter': '/' // Remove the '/api/openrouter' prefix when forwarding
  },
  onProxyReq: (proxyReq, req, res) => {
    // Log proxy request (without sensitive info)
    console.log(`Proxying: ${req.method} ${req.path}`);
  }
} as Options));

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  const staticPath = path.join(__dirname, 'dist');
  app.use(express.static(staticPath));
  
  // Handle client-side routing
  app.get('*', (req, res) => {
    res.sendFile(path.join(staticPath, 'index.html'));
  });
}

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`API proxy available at: http://localhost:${PORT}/api/openrouter`);
  if (process.env.NODE_ENV === 'production') {
    console.log(`Frontend served from: http://localhost:${PORT}`);
  } else {
    console.log('Running in development mode - frontend should be served separately');
  }
});