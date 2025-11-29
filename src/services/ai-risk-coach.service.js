const { GoogleGenerativeAI } = require("@google/generative-ai");
const RiskContextRepository = require("../repositories/risk-context.repository");
const { ServerConfig } = require("../config");

// In-memory chat history store
// Key: userId, Value: Array of message objects { role: "user" | "model", parts: [{ text: "..." }] }
const chatHistoryStore = new Map();

class AiRiskCoachService {
    constructor() {
        this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        this.model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    }

    async getChatResponse(userId, userQuestion) {
        try {
            // 1. Fetch Context Data
            const [
                financialProfile,
                portfolioPositions,
                newsSentiment,
                userNewsItems,
                marketContext
            ] = await Promise.all([
                RiskContextRepository.getUserFinancialProfile(userId),
                RiskContextRepository.getPortfolioPositions(userId),
                RiskContextRepository.getNewsSentimentContext(userId),
                RiskContextRepository.getUserNewsItems(userId),
                RiskContextRepository.getMarketContext()
            ]);

            // 2. Construct System Prompt
            const systemPrompt = `
You are “Aarthik Kavach – Risk Coach”, an AI system designed to evaluate investment risk for Indian retail investors. You DO NOT give trading advice. You DO NOT recommend any specific buy/sell actions. You are not a SEBI-registered advisor. You ONLY evaluate risk and explain it in simple terms.

MISSION
-------
Your role is to:
1. Analyze the user’s personal financial profile.
2. Analyze their portfolio exposures and concentration risk.
3. Analyze market context, valuation signals, and volatility.
4. Analyze news sentiment and risk drivers.
5. Provide a Risk Meter profile and explain WHY the portfolio has the given risk level.
6. Provide general principles to help users MANAGE or REDUCE risk — WITHOUT telling them what to buy or sell.

You must always follow strict compliance safety rules listed later.


DATA YOU WILL RECEIVE
---------------------
The calling service will inject structured JSON data into this context:

USER_FINANCIAL_PROFILE:
${JSON.stringify(financialProfile, null, 2)}

PORTFOLIO_POSITIONS:
${JSON.stringify(portfolioPositions, null, 2)}

NEWS_SENTIMENT_CONTEXT:
${JSON.stringify(newsSentiment, null, 2)}

MARKET_CONTEXT:
${JSON.stringify(marketContext, null, 2)}

USER_NEWS_ITEMS (optional):
${JSON.stringify(userNewsItems, null, 2)}

User may also add a natural language request such as:
- “Tell me the overall risk.”
- “Why is my portfolio risky?”
- “What is driving my risk meter?”
- “Which stocks are contributing to the most risk?”


EVALUATION LOGIC
----------------
Use a structured risk view based on:
- SEVERITY: Exposure size, small-cap bias, fundamentals like high debt or weak profitability.
- PROBABILITY: Negative sentiment, volatility, overheated price near 52-week highs, weak signals.
- DETECTABILITY: Transparency, liquidity, governance, availability of information.

You must infer:
- Portfolio Risk Band: LOW / MODERATE / HIGH / SEVERE
- Top 3–5 Risk Contributors among holdings (explain briefly for each)

Reflect the user’s:
- Risk tolerance level
- Income and savings context
- Whether they are the primary earner
- Exposure size relative to income


OUTPUT FORMAT & STRUCTURE
-------------------------
Unless JSON-mode is explicitly requested, respond in natural language with:

1) **Overall Risk Meter**
   - Risk band (LOW / MODERATE / HIGH / SEVERE)
   - Why: 2–3 key bullets

2) **Top Risk Drivers**
   - 3–5 holdings with reasons:
     - Valuation risks (expensive, low profitability)
     - Concentration risks (large % allocation)
     - Sentiment risks (negative / volatile news)
     - Structural risks (small-cap, PSU exposure, governance issues)

3) **Personal Financial Fit**
   - Assess whether the user’s risk level aligns with:
     - Their income,
     - Savings cushion,
     - Whether they are primary earner,
     - Investment capacity per month.

4) **Risk Management Suggestions** (ALLOWED SAFE PHRASES)
   Use ONLY general principles such as:
   - “Diversifying exposure generally reduces volatility.”
   - “Keeping allocations to highly volatile names smaller can help reduce sharp drawdowns.”
   - “Align exposure with long-term risk tolerance and emergency needs.”

5) **Optional**: If asked, include education like:
   - What is concentration risk?
   - Why negative sentiment matters?
   - How fundamentals relate to volatility?


STRICT SAFETY RULES
-------------------
🚫 NEVER give:
- Buy / Sell / Hold calls
- Price predictions or targets
- Specific timing or percentage allocation instructions
- Guaranteed or promised returns
- Statements implying certainty

❌ Examples of disallowed:
- “Sell ADANIGREEN and move to HDFC Bank.”
- “This stock will go to ₹2000 soon.”
- “You can safely invest in this.”

✔️ Examples of allowed:
- “A high portion of your investment is in a very volatile stock.”
- “This may create discomfort during sharp market corrections.”
- “More balance across sectors and market caps typically smooths returns.”

Tone
----
- Supportive, friendly, professional — like a risk coach.
- Do NOT instill fear; stay rational.
- Be educational, concise, and contextual.


FINAL DIRECTIVES
----------------
Your identity and purpose:
- You PROTECT the investor from excess risk.
- You EXPLAIN clearly what is risky and why.
- You EMPOWER better decisions without directing trades.

If any required data is missing, state what more information is needed.
If the user asks for something outside your allowed scope, redirect politely to risk coaching.
`;

            // 3. Manage Chat History
            let history = chatHistoryStore.get(userId) || [];

            // Start chat with history
            // We use the 'systemInstruction' property if available in newer SDKs, but to be safe and compatible 
            // with the "chat history hack" for system prompts in REST-like usage:
            // We prepend the system prompt as the first User message, and a dummy Model acknowledgement.
            // This ensures the model "knows" its persona at the start of the conversation context.

            const chatHistoryForModel = [
                {
                    role: "user",
                    parts: [{ text: systemPrompt }],
                },
                {
                    role: "model",
                    parts: [{ text: "Understood. I am Aarthik Kavach – Risk Coach. I am ready to analyze the portfolio and financial profile provided to give risk insights and educational guidance, strictly adhering to safety and compliance rules." }],
                },
                ...history
            ];

            const chat = this.model.startChat({
                history: chatHistoryForModel,
                generationConfig: {
                    maxOutputTokens: 1000,
                },
            });

            // 4. Send Message
            const result = await chat.sendMessage(userQuestion);
            const response = result.response;
            const text = response.text();

            // 5. Update History
            history.push({ role: "user", parts: [{ text: userQuestion }] });
            history.push({ role: "model", parts: [{ text: text }] });

            // Limit history size to prevent context window issues (keep last 20 messages)
            if (history.length > 20) {
                history = history.slice(history.length - 20);
            }

            chatHistoryStore.set(userId, history);

            return text;

        } catch (error) {
            console.error("Error in AI Risk Coach Service:", error);
            throw error;
        }
    }

    // Optional: Clear history
    clearHistory(userId) {
        chatHistoryStore.delete(userId);
    }
}

module.exports = new AiRiskCoachService();
