const { Pool } = require('pg');
const db = require('../config/database-config');

class RiskContextRepository {
    async getUserFinancialProfile(userId) {
        const query = `
            SELECT * FROM user_financial_profile WHERE user_id = $1;
        `;
        const result = await db.client.query(query, [userId]);
        return result.rows[0] || {};
    }

    async getPortfolioPositions(userId) {
        // Using the materialised view for richer insights
        const query = `
            SELECT * FROM vw_portfolio_insights WHERE user_id = $1;
        `;
        const result = await db.client.query(query, [userId]);
        return result.rows;
    }

    async getNewsSentimentContext(userId) {
        // Fetching recent sentiment for symbols in user's portfolio
        // This is a bit complex, simplifying to fetch recent sentiment for user's holdings
        const query = `
            SELECT ns.*, na.title, na.published_at 
            FROM news_sentiment ns
            JOIN news_articles na ON ns.article_id = na.id
            JOIN portfolio_positions pp ON ns.symbol = pp.symbol
            WHERE pp.user_id = $1
            ORDER BY na.published_at DESC
            LIMIT 10;
        `;
        const result = await db.client.query(query, [userId]);
        return result.rows;
    }

    async getUserNewsItems(userId) {
        const query = `
            SELECT * FROM vw_user_news_feed_api WHERE user_id = $1 LIMIT 5;
        `;
        const result = await db.client.query(query, [userId]);
        return result.rows;
    }

    async getMarketContext() {
        // Fetching general market context if available, or just return empty for now
        // Assuming we might have some indices in technicals_cache with specific symbols like 'NIFTY50'
        // For now, returning empty object as we don't have explicit market indices in the prompt's schema
        return {};
    }
}

module.exports = new RiskContextRepository();
