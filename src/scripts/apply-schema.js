const { Client } = require('pg');
const { ServerConfig } = require('../config');

const schemaSql = `
-- 1. Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

---------------------------------------------------------------------
-- 2. Core Tables
---------------------------------------------------------------------

-- users: auth identity
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- user_profile: demographics & job data
CREATE TABLE IF NOT EXISTS user_profile (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  age INTEGER CHECK (age >= 0),
  gender TEXT CHECK (gender IN ('male','female','other','prefer_not_to_say')) DEFAULT 'prefer_not_to_say',
  profession TEXT,
  designation TEXT,
  job_level TEXT CHECK (job_level IN ('intern','junior','mid','senior','manager','director','executive')),
  is_primary_earner BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- user_financial_profile: core financial inputs
CREATE TABLE IF NOT EXISTS user_financial_profile (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,

  -- Primary financial inputs
  income_per_month NUMERIC(14,2) NOT NULL DEFAULT 0,
  expenditure NUMERIC(14,2) NOT NULL DEFAULT 0,
  additional_expenses NUMERIC(14,2) NOT NULL DEFAULT 0,
  living_cost NUMERIC(14,2) NOT NULL DEFAULT 0,

  -- Investment Planning Fields
  invest_per_month NUMERIC(14,2) NOT NULL DEFAULT 0,
  invest_cycle_date DATE NOT NULL,

  -- Derived / helper fields
  -- FIX: Using GENERATED ALWAYS to calculate automatically from base columns
  savings_per_month NUMERIC(14,2) GENERATED ALWAYS AS (income_per_month - expenditure - additional_expenses - living_cost) STORED,

  savings_rate NUMERIC(6,4),
  risk_tolerance INTEGER NOT NULL DEFAULT 3 CHECK (risk_tolerance BETWEEN 0 AND 5),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- broker_accounts: maps user -> external broker profile
CREATE TABLE IF NOT EXISTS broker_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  broker TEXT NOT NULL,
  broker_user_id TEXT NOT NULL,
  email_on_broker TEXT,
  avatar_url TEXT,
  exchanges TEXT[] NOT NULL DEFAULT '{}',
  products TEXT[] DEFAULT '{}',
  order_types TEXT[] DEFAULT '{}',
  raw_profile JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT ux_broker_account UNIQUE (user_id, broker, broker_user_id)
);

-- portfolio_positions: normalized holdings (stocks/equity)
CREATE TABLE IF NOT EXISTS portfolio_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  broker_account_id UUID REFERENCES broker_accounts(id) ON DELETE SET NULL,
  broker TEXT NOT NULL,

  instrument_type TEXT NOT NULL CHECK (instrument_type IN ('EQUITY','BOND','OTHER')) DEFAULT 'EQUITY',

  symbol TEXT NOT NULL,
  name TEXT NOT NULL,
  isin TEXT,
  exchange TEXT,

  instrument_token BIGINT,
  product TEXT,
  price NUMERIC(18,6) DEFAULT 0,

  quantity NUMERIC(20,6) NOT NULL DEFAULT 0,
  used_quantity NUMERIC(20,6) NOT NULL DEFAULT 0,
  t1_quantity NUMERIC(20,6) NOT NULL DEFAULT 0,
  realised_quantity NUMERIC(20,6) NOT NULL DEFAULT 0,
  authorised_quantity NUMERIC(20,6) NOT NULL DEFAULT 0,
  authorised_date TIMESTAMPTZ,

  opening_quantity NUMERIC(20,6) NOT NULL DEFAULT 0,
  short_quantity NUMERIC(20,6) NOT NULL DEFAULT 0,
  collateral_quantity NUMERIC(20,6) NOT NULL DEFAULT 0,
  collateral_type TEXT,

  discrepancy BOOLEAN DEFAULT false,

  avg_price NUMERIC(18,6) NOT NULL DEFAULT 0,
  last_price NUMERIC(18,6) NOT NULL DEFAULT 0,
  close_price NUMERIC(18,6),

  invested_value NUMERIC(24,6) NOT NULL DEFAULT 0,
  current_value NUMERIC(24,6) NOT NULL DEFAULT 0,
  pnl NUMERIC(24,6) NOT NULL DEFAULT 0,

  day_change NUMERIC(18,6),
  day_change_pct NUMERIC(10,6),

  mtf JSONB,

  as_of TIMESTAMPTZ NOT NULL DEFAULT now(),
  raw_payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- mutual_fund_holdings: normalized holdings (mutual funds)
CREATE TABLE IF NOT EXISTS mutual_fund_holdings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  broker_account_id UUID REFERENCES broker_accounts(id) ON DELETE SET NULL,
  broker TEXT NOT NULL DEFAULT 'ZERODHA',

  tradingsymbol TEXT NOT NULL,
  fund_name TEXT NOT NULL,
  folio TEXT,
  scheme_code TEXT,
  amc TEXT,
  instrument_subtype TEXT,

  quantity NUMERIC(24,6) NOT NULL DEFAULT 0,
  average_price NUMERIC(18,6) NOT NULL DEFAULT 0,
  last_price NUMERIC(18,6) NOT NULL DEFAULT 0,
  last_price_date DATE,

  pnl NUMERIC(24,6) DEFAULT 0,
  xirr NUMERIC(10,4) DEFAULT 0,
  discrepancy BOOLEAN DEFAULT false,
  pledged_quantity NUMERIC(24,6) DEFAULT 0,
  las_quantity NUMERIC(24,6) DEFAULT 0,

  -- FIX: Expanded calculations to avoid referencing other generated columns
  invested_value NUMERIC(24,6) GENERATED ALWAYS AS (quantity * average_price) STORED,
  current_value NUMERIC(24,6) GENERATED ALWAYS AS (quantity * last_price) STORED,
  holding_pnl NUMERIC(24,6) GENERATED ALWAYS AS ( (quantity * last_price) - (quantity * average_price) ) STORED,

  as_of TIMESTAMPTZ NOT NULL DEFAULT now(),
  raw_payload JSONB,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- portfolio_sync_events: audit table
CREATE TABLE IF NOT EXISTS portfolio_sync_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  broker TEXT,
  broker_user_id TEXT,
  raw_payload JSONB,
  event_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


---------------------------------------------------------------------
-- 3. Indexes and Constraints
---------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_user_financial_invest_nonzero ON user_financial_profile (user_id) WHERE invest_per_month > 0;

CREATE UNIQUE INDEX IF NOT EXISTS ux_positions_snapshot
  ON portfolio_positions (user_id, broker, instrument_type, symbol, as_of);
CREATE INDEX IF NOT EXISTS idx_portfolio_user ON portfolio_positions (user_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_symbol ON portfolio_positions (symbol);

CREATE UNIQUE INDEX IF NOT EXISTS ux_mf_user_folio_symbol_asof
  ON mutual_fund_holdings (user_id, folio, tradingsymbol, as_of);
CREATE INDEX IF NOT EXISTS idx_mf_user ON mutual_fund_holdings (user_id);
CREATE INDEX IF NOT EXISTS idx_mf_tradingsymbol ON mutual_fund_holdings (tradingsymbol);

CREATE INDEX IF NOT EXISTS idx_sync_events_user ON portfolio_sync_events (user_id);


---------------------------------------------------------------------
-- 4. Triggers (Auto-update updated_at)
---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION trg_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

DROP TRIGGER IF EXISTS trg_user_profile_updated_at ON user_profile;
CREATE TRIGGER trg_user_profile_updated_at BEFORE UPDATE ON user_profile FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

DROP TRIGGER IF EXISTS trg_broker_accounts_updated_at ON broker_accounts;
CREATE TRIGGER trg_broker_accounts_updated_at BEFORE UPDATE ON broker_accounts FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

DROP TRIGGER IF EXISTS trg_mutual_fund_holdings_updated_at ON mutual_fund_holdings;
CREATE TRIGGER trg_mutual_fund_holdings_updated_at BEFORE UPDATE ON mutual_fund_holdings FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

DROP TRIGGER IF EXISTS trg_user_financial_profile_updated_at ON user_financial_profile;
CREATE TRIGGER trg_user_financial_profile_updated_at BEFORE UPDATE ON user_financial_profile FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();


---------------------------------------------------------------------
-- 5. Materialized View
---------------------------------------------------------------------
CREATE MATERIALIZED VIEW IF NOT EXISTS vw_portfolio_latest AS
SELECT DISTINCT ON (user_id, broker, instrument_type, symbol)
  id, user_id, broker_account_id, broker, instrument_type, symbol, name,
  isin, exchange, quantity, avg_price, last_price, invested_value,
  current_value, pnl, day_change, day_change_pct, as_of, raw_payload, created_at
FROM portfolio_positions
ORDER BY user_id, broker, instrument_type, symbol, as_of DESC;

CREATE INDEX IF NOT EXISTS idx_vw_portfolio_latest_user ON vw_portfolio_latest (user_id);

-- 🚀 0003_news_schema.sql (FIXED)
-- Module: News, Sentiment Engine & Personalization
-- Dependency: Requires 'users' table from 0001 schema.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Global article store
CREATE TABLE IF NOT EXISTS news_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  source TEXT,                       -- 'google-news','rss','custom'
  title TEXT NOT NULL,
  url TEXT,
  image_url TEXT,                    -- <--- FIXED: Added this column
  published_at TIMESTAMPTZ,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- optional categorization
  language TEXT,
  topic_tags TEXT[],                 -- ['equity','macro','it_sector']

  raw_payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for de-duplication and timeline fetching
CREATE INDEX IF NOT EXISTS idx_news_articles_url ON news_articles (url);
CREATE INDEX IF NOT EXISTS idx_news_articles_published_at ON news_articles (published_at DESC);


-- 2. Symbol-level sentiment per article
CREATE TABLE IF NOT EXISTS news_sentiment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  article_id UUID NOT NULL REFERENCES news_articles(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,                   -- 'INFY','TCS'

  sentiment_score NUMERIC(5,4),          -- -1.0000 .. +1.0000
  sentiment_label TEXT,                  -- 'positive','neutral','negative'
  confidence NUMERIC(5,4),

  extracted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_news_sentiment_symbol ON news_sentiment (symbol);
CREATE INDEX IF NOT EXISTS idx_news_sentiment_article ON news_sentiment (article_id);


-- 3. Aggregated sentiment (for Risk Analysis)
CREATE TABLE IF NOT EXISTS news_aggregate (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  symbol TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  window_end TIMESTAMPTZ NOT NULL,
  window_label TEXT NOT NULL,            -- '1h','24h','7d'

  avg_sentiment NUMERIC(6,4),
  article_count INTEGER,
  weighted_confidence NUMERIC(6,4),

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_news_aggregate_symbol_window
  ON news_aggregate (symbol, window_label, window_start, window_end);


-- 4. User Personalization Layer (The Magic Table)
CREATE TABLE IF NOT EXISTS user_news_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  article_id UUID NOT NULL REFERENCES news_articles(id) ON DELETE CASCADE,

  -- Context: Which holding does this impact?
  symbol TEXT NOT NULL,

  -- Snapshot of Sentiment
  sentiment_score NUMERIC(5,4),
  sentiment_label TEXT,
  confidence NUMERIC(5,4),

  -- Snapshot of Portfolio State (Contextual Relevance)
  allocation_pct NUMERIC(6,4),               -- 0.25 = 25% of portfolio
  current_value NUMERIC(24,6),
  snapshot_as_of TIMESTAMPTZ,

  -- Feed Ordering
  relevance_score NUMERIC(8,4),              -- Algorithm output
  reason_tags TEXT[],                        -- ['high_allocation','negative_shock']

  -- User Interaction
  is_read BOOLEAN NOT NULL DEFAULT false,
  is_hidden BOOLEAN NOT NULL DEFAULT false,
  pinned BOOLEAN NOT NULL DEFAULT false,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Prevent spam: 1 article per user per symbol
CREATE UNIQUE INDEX IF NOT EXISTS ux_user_news_unique
  ON user_news_items (user_id, article_id, symbol);

-- Indexes for fast Feed generation
CREATE INDEX IF NOT EXISTS idx_user_news_user_created
  ON user_news_items (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_news_user_symbol
  ON user_news_items (user_id, symbol);


-- ------------------------------------------------------------------
-- ⚡ API ACCELERATOR VIEW
-- Run 'SELECT * FROM vw_user_news_feed_api WHERE user_id = ...'
-- ------------------------------------------------------------------
CREATE OR REPLACE VIEW vw_user_news_feed_api AS
SELECT
  uni.id AS news_item_id,
  uni.user_id,
  uni.symbol,
  uni.relevance_score,
  uni.reason_tags,
  uni.is_read,
  uni.created_at AS delivered_at,

  -- Sentiment Context
  uni.sentiment_score,
  uni.sentiment_label,

  -- Article Details (Joined)
  na.title,
  na.url,
  na.image_url,  -- This now exists!
  na.source,
  na.published_at

FROM user_news_items uni
JOIN news_articles na ON uni.article_id = na.id
ORDER BY uni.pinned DESC, uni.relevance_score DESC, na.published_at DESC;

-- 🚀 Upgrade: Add missing LLM analysis fields
-- Run this to align DB with your AI JSON output

-- 1. Add Summary to news_articles
ALTER TABLE news_articles
ADD COLUMN IF NOT EXISTS summary TEXT;

-- 2. Add Analysis fields to news_sentiment
-- We use separate statements to be absolutely safe against parser errors
ALTER TABLE news_sentiment ADD COLUMN IF NOT EXISTS impact_horizon TEXT;
ALTER TABLE news_sentiment ADD COLUMN IF NOT EXISTS impact_direction TEXT;
ALTER TABLE news_sentiment ADD COLUMN IF NOT EXISTS volatility_impact TEXT;
ALTER TABLE news_sentiment ADD COLUMN IF NOT EXISTS key_drivers TEXT[];


-- 🚀 002_market_data_schema.sql
-- Adds Market Data Caching & Analytics Views
-- Run this AFTER the core schema.

---------------------------------------------------------------------
-- fundamentals_cache: Store company stats (PE, ROE, etc.)
---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS fundamentals_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  symbol TEXT NOT NULL,               -- Link key to portfolio_positions
  as_of TIMESTAMPTZ NOT NULL,         -- Validity timestamp
  source TEXT NOT NULL,               -- 'static','alpha_vantage','yfinance'

  pe NUMERIC(12,6),
  pb NUMERIC(12,6),
  debt_to_equity NUMERIC(12,6),
  roe NUMERIC(8,4),
  market_cap NUMERIC(24,2),
  revenue_cagr_3y NUMERIC(8,4),
  eps_cagr_3y NUMERIC(8,4),
  dividend_yield NUMERIC(8,4),

  quality_tags TEXT[],                -- e.g. ['largecap','high_growth']

  raw_payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index to fetch the latest fundamental data for a symbol fast
CREATE INDEX IF NOT EXISTS idx_fundamentals_symbol_asof
  ON fundamentals_cache (symbol, as_of DESC);


---------------------------------------------------------------------
-- technicals_cache: Store indicators (RSI, MACD, SMA)
---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS technicals_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  symbol TEXT NOT NULL,
  timeframe TEXT NOT NULL DEFAULT '1D', -- '1D','1W'
  as_of TIMESTAMPTZ NOT NULL,

  last_close NUMERIC(18,6),
  change_pct_1d NUMERIC(8,4),
  high_52w NUMERIC(18,6),
  low_52w NUMERIC(18,6),

  sma_20 NUMERIC(18,6),
  sma_50 NUMERIC(18,6),
  sma_200 NUMERIC(18,6),

  rsi_14 NUMERIC(8,4),
  macd_value NUMERIC(18,6),
  macd_signal NUMERIC(18,6),
  macd_hist NUMERIC(18,6),

  atr_14 NUMERIC(18,6),
  beta NUMERIC(8,4),

  pattern_signals TEXT[],             -- e.g. ['golden_cross','oversold']

  raw_payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_technicals_symbol_timeframe
  ON technicals_cache (symbol, timeframe, as_of DESC);


---------------------------------------------------------------------
-- 🔗 THE BINDING VIEW: vw_portfolio_insights
-- This joins User Holdings + Fundamentals + Technicals
-- Returns ONE row per user position with all market data attached.
---------------------------------------------------------------------
CREATE MATERIALIZED VIEW IF NOT EXISTS vw_portfolio_insights AS
SELECT
  p.user_id,
  p.broker,
  p.symbol,
  p.quantity,
  p.avg_price,
  p.invested_value,
  p.current_value,
  p.pnl,

  -- Fundamental Data (Latest available)
  f.pe,
  f.pb,
  f.roe,
  f.market_cap,
  f.quality_tags,

  -- Technical Data (Latest 1D candle)
  t.last_close as mkt_price,
  t.rsi_14,
  t.sma_200,
  t.beta,
  t.pattern_signals

FROM vw_portfolio_latest p
-- Join latest Fundamentals
LEFT JOIN LATERAL (
  SELECT pe, pb, roe, market_cap, quality_tags
  FROM fundamentals_cache fc
  WHERE fc.symbol = p.symbol
  ORDER BY fc.as_of DESC
  LIMIT 1
) f ON true
-- Join latest Technicals (1D timeframe)
LEFT JOIN LATERAL (
  SELECT last_close, rsi_14, sma_200, beta, pattern_signals
  FROM technicals_cache tc
  WHERE tc.symbol = p.symbol
  AND tc.timeframe = '1D'
  ORDER BY tc.as_of DESC
  LIMIT 1
) t ON true;

-- Index for fast user dashboards
CREATE INDEX IF NOT EXISTS idx_vw_portfolio_insights_user ON vw_portfolio_insights (user_id);
`;

async function applySchema() {
    const client = new Client({
        user: ServerConfig.DB_USERNAME,
        host: ServerConfig.DB_HOST,
        database: ServerConfig.DB_DATABASE,
        password: ServerConfig.DB_PASSWORD,
        port: ServerConfig.DB_PORT,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log('Applying schema...');
        await client.query(schemaSql);
        console.log('Schema applied successfully.');
    } catch (err) {
        console.error('Error applying schema:', err);
    } finally {
        await client.end();
    }
}

applySchema();
