const fetch = require('node-fetch');

class CoinGlassAPI {
  constructor(config) {
    this.config = config;
    this.baseUrl = config.api.baseUrl;
    this.apiKey = config.api.key;
    this.rateLimit = config.api.rateLimit;
    this.requestCount = 0;
    this.lastRequestTime = 0;
  }

  async makeRequest(endpoint, params = {}) {
    // Rate limiting
    await this.enforceRateLimit();

    const url = new URL(`${this.baseUrl}${endpoint}`);
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== null) {
        url.searchParams.append(key, params[key]);
      }
    });

    const options = {
      method: 'GET',
      headers: {
        'accept': 'application/json',
        'CG-API-KEY': this.apiKey
      }
    };

    try {
      const response = await fetch(url.toString(), options);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      
      // Check API response status
      if (data.code !== '0') {
        throw new Error(`API error: ${data.msg || 'Unknown error'}`);
      }

      this.requestCount++;
      this.lastRequestTime = Date.now();

      return data;
    } catch (error) {
      console.error(`API request failed for ${endpoint}:`, error.message);
      throw error;
    }
  }

  async enforceRateLimit() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.rateLimit.delayBetweenRequests) {
      const delay = this.rateLimit.delayBetweenRequests - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  async getSupportedCoins() {
    return this.makeRequest('/api/futures/supported-coins');
  }

  async getSupportedExchangePairs() {
    return this.makeRequest('/api/futures/supported-exchange-pairs');
  }

  async getPairsMarkets(symbol) {
    return this.makeRequest('/api/futures/pairs-markets', { symbol });
  }

  getRateLimitInfo() {
    return {
      requestsPerMinute: this.rateLimit.requestsPerMinute,
      delayBetweenRequests: this.rateLimit.delayBetweenRequests,
      estimatedTimePerCoin: this.rateLimit.delayBetweenRequests / 1000, // in seconds
      requestCount: this.requestCount
    };
  }
}

module.exports = CoinGlassAPI;
