import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', message: 'FinSight AI Backend is running' });
});

// Root endpoint
app.get('/api', (req: Request, res: Response) => {
  res.json({ message: 'Welcome to FinSight AI API' });
});

// Root path - serve simple HTML page
app.get('/', (req: Request, res: Response) => {
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>FinSight AI API</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            max-width: 800px;
            margin: 50px auto;
            padding: 20px;
            line-height: 1.6;
          }
          h1 { color: #2563eb; }
          code { background: #f3f4f6; padding: 2px 6px; border-radius: 3px; }
          .endpoint { background: #f9fafb; padding: 15px; margin: 10px 0; border-radius: 5px; border-left: 3px solid #2563eb; }
        </style>
      </head>
      <body>
        <h1>🚀 FinSight AI Backend API</h1>
        <p>This is the backend API server. The frontend application should be running on <code>http://localhost:3000</code>.</p>
        
        <h2>Available Endpoints:</h2>
        <div class="endpoint">
          <strong>GET</strong> <code>/api/health</code> - Health check endpoint
        </div>
        <div class="endpoint">
          <strong>GET</strong> <code>/api</code> - API welcome message
        </div>
        
        <h2>Quick Start:</h2>
        <p>To run the full application:</p>
        <pre style="background: #1f2937; color: #f9fafb; padding: 15px; border-radius: 5px; overflow-x: auto;">
npm run dev
</pre>
        <p>This will start both the frontend (port 3000) and backend (port 3002) servers.</p>
      </body>
    </html>
  `);
});

app.listen(PORT, () => {
  console.log(`🚀 FinSight AI Backend running on http://localhost:${PORT}`);
});

