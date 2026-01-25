import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDatabase } from './db/schema.js';
import { authMiddleware } from './middleware/auth.js';
import authRoutes from './routes/auth.js';
import portfolioRoutes from './routes/portfolio.js';
import holdingsRoutes from './routes/holdings.js';
import transactionsRoutes from './routes/transactions.js';
import quotesRoutes from './routes/quotes.js';
import dividendsRoutes from './routes/dividends.js';
import accountsRoutes from './routes/accounts.js';
import categoriesRoutes from './routes/categories.js';
import payeesRoutes from './routes/payees.js';
import accountTransactionsRoutes from './routes/accountTransactions.js';
import recurringRoutes from './routes/recurring.js';
import transfersRoutes from './routes/transfers.js';
import dashboardRoutes from './routes/dashboard.js';
import projectionRoutes from './routes/projection.js';
import pnlRoutes from './routes/pnl.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// CORS configuration
const allowedOrigins: string[] = [
  'http://localhost:5173',
  'https://per-finance.pages.dev',
  process.env.FRONTEND_URL,
].filter((url): url is string => Boolean(url));

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));
app.use(express.json());

// Initialize database and start server
async function start() {
  try {
    await initDatabase();
    console.log('Database initialized');

    // Apply auth middleware to all /api routes
    app.use('/api', authMiddleware);

    // Auth routes
    app.use('/api/auth', authRoutes);

    // API routes - New finance manager routes
    app.use('/api/accounts', accountsRoutes);
    app.use('/api/accounts', accountTransactionsRoutes); // Nested under accounts
    app.use('/api/categories', categoriesRoutes);
    app.use('/api/payees', payeesRoutes);
    app.use('/api/recurring', recurringRoutes);
    app.use('/api/transfers', transfersRoutes);
    app.use('/api/dashboard', dashboardRoutes);
    app.use('/api/projection', projectionRoutes);
    app.use('/api/pnl', pnlRoutes);

    // API routes - Legacy portfolio routes (still supported)
    app.use('/api/portfolio', portfolioRoutes);
    app.use('/api/holdings', holdingsRoutes);
    app.use('/api/transactions', transactionsRoutes);
    app.use('/api/quotes', quotesRoutes);
    app.use('/api/dividends', dividendsRoutes);

    // Serve static files in production
    if (process.env.NODE_ENV === 'production') {
      app.use(express.static(path.join(__dirname, '../../dist/client')));
      app.get('*', (_req, res) => {
        res.sendFile(path.join(__dirname, '../../dist/client/index.html'));
      });
    }

    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();
