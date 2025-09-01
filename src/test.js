#!/usr/bin/env node

const dotenv = require('dotenv');
const path = require('path');
const CoinGlassAPI = require(path.join(__dirname, 'services', 'coinglassApi.js'));
const localConfig = require(path.join(__dirname, '..', 'config', 'local.config.js'));

// Load environment variables
dotenv.config();

async function testAPI() {
  console.log('🧪 Testing CoinGlass API connection...\n');
  console.log('🔍 Current working directory:', process.cwd());
  console.log('🔍 __dirname:', __dirname);
  console.log('🔍 Config path:', path.join(__dirname, '..', 'config', 'local.config.js'));
  
  try {
    // Override config with environment variable if present
    const config = { ...localConfig };
    if (process.env.COINGLASS_API_KEY) {
      config.api.key = process.env.COINGLASS_API_KEY;
    }
    
    if (!config.api.key) {
      console.error('❌ No API key found. Please set COINGLASS_API_KEY environment variable.');
      console.log('💡 You can also create a .env file with: COINGLASS_API_KEY=your_key_here');
      process.exit(1);
    }
    
    const api = new CoinGlassAPI(config);
    
    console.log('📡 Testing supported coins endpoint...');
    const coinsResponse = await api.getSupportedCoins();
    console.log(`✅ Supported coins: ${coinsResponse.data.length} coins`);
    console.log(`   Sample: ${coinsResponse.data.slice(0, 5).join(', ')}...\n`);
    
    console.log('📡 Testing supported pairs endpoint...');
    const pairsResponse = await api.getSupportedExchangePairs();
    console.log(`✅ Supported pairs: ${pairsResponse.data.length} pairs\n`);
    
    console.log('📡 Testing pairs markets endpoint (BTC)...');
    const marketsResponse = await api.getPairsMarkets('BTC');
    console.log(`✅ BTC markets: ${marketsResponse.data.length} pairs`);
    
    if (marketsResponse.data.length > 0) {
      const sample = marketsResponse.data[0];
      console.log(`   Sample data: ${sample.exchange_name} - ${sample.symbol} - $${sample.current_price}`);
    }
    
    console.log('\n🎉 All API tests passed successfully!');
    console.log('📊 Rate limit info:', api.getRateLimitInfo());
    
  } catch (error) {
    console.error('\n❌ API test failed:', error.message);
    
    if (error.message.includes('401')) {
      console.log('\n💡 This looks like an authentication error. Please check your API key.');
    } else if (error.message.includes('429')) {
      console.log('\n💡 Rate limit exceeded. The tool will handle this automatically during normal operation.');
    }
    
    process.exit(1);
  }
}

if (require.main === module) {
  testAPI();
}

module.exports = { testAPI };
