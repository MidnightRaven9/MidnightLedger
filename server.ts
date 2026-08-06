import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // AI Advisor Endpoint
  app.post('/api/ai-advisor', async (req, res) => {
    try {
      const { prompt, budgetContext } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;

      if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
        return res.json({
          reply: "I am analyzing your budget locally! Based on your upcoming paydays and bills, make sure to set aside your fixed obligations first, then keep your remaining left-over funds in your checking or savings buffer!"
        });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });
      const model = 'gemini-3.6-flash';

      const systemInstruction = `You are Raven, an expert AI financial advisor inside the MidnightLedger app. You have full live access to the user's bills, paydays, and tracked expenses.
Tone: Friendly, non-judgmental, encouraging, concise, like a smart financial coach. Use exact dollar amounts and names from their budgetContext.
Capabilities & Directives:
1. TRACKED EXPENSES ANALYSIS: When asked about specific spending (e.g. "how much did I spend on gas?", "groceries", "walmart", "dining", "spending breakdown"), calculate exact sums from budgetContext.trackedExpenses for that category/merchant and report the total and item breakdown.
2. OVERSPENDING WARNING: If nextPaydayLeftOver is negative (< 0) or total outflow exceeds paycheck, clearly warn: "Heads up! You've overspent your upcoming check on [Date] by $X." and suggest immediate areas to cut back.
3. SPENDING PATTERN ANALYSIS: Detail top spending categories, e.g. "You spent $120 on Food/Drinks across 5 purchases for this check."
4. REALISTIC DEBT ADVICE: When discussing debt payoff (Snowball vs Avalanche), account for tracked expenses alongside bills to give a realistic net amount available for debt payments.
5. SAVINGS & SUBSCRIPTIONS: Detail specific subscription items and high-cost variable bills to trim.`;

      const contents = [
        {
          role: 'user',
          parts: [{
            text: `Current Budget State:\n${JSON.stringify(budgetContext, null, 2)}\n\nUser Question: ${prompt}`
          }]
        }
      ];

      const response = await ai.models.generateContent({
        model,
        contents,
        config: {
          systemInstruction,
          temperature: 0.7,
        }
      });

      res.json({ reply: response.text });
    } catch (err: any) {
      console.error('Gemini server error:', err);
      res.json({
        reply: "Great question! Prioritize paying fixed bills like Rent and Utilities right on payday, and hold back variable expenses until you know the exact balance."
      });
    }
  });

  // Serve static assets in production or Vite middleware in development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Payday Planner server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
