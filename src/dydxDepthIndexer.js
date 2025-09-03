const fs = require('fs').promises;
const path = require('path');
const cliProgress = require('cli-progress');
const config = require('../config/local.config');
const CoinGlassAPI = require('./services/coinglassApi');
const dotenv = require('dotenv');

class DydxDepthIndexer {
  constructor(useEnv = false) {
    // Load .env file if requested
    if (useEnv) {
      dotenv.config();
      console.log('🔑 Using API key from .env file');
      
      // Update config with environment variables after loading .env
      if (process.env.COINGLASS_API_KEY) {
        config.api.key = process.env.COINGLASS_API_KEY;
      }
    }
    
    // Initialize other properties first
    this.supportedExchanges = ['Binance', 'Bybit', 'Coinbase', 'Kraken', 'MEXC', 'Gate', 'Hyperliquid', 'KuCoin', 'OKX'];
    this.depthDir = path.join(config.data.baseDir, 'futures', 'depth');
    this.manifestFile = path.join(config.data.baseDir, 'futures', 'depth', '_manifest.json');
    this.pairsNotOnDydxFile = path.join(config.data.utilsDir, 'pairs_not_on_dydx.json');
    
    // Initialize API after environment is loaded
    this.api = new CoinGlassAPI(config);
    
    // Debug: Check if API key is loaded
    if (useEnv) {
      const apiKey = process.env.COINGLASS_API_KEY;
      if (apiKey) {
        console.log(`🔑 API key loaded: ${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 4)}`);
        console.log(`🔑 Config updated: ${config.api.key ? 'Yes' : 'No'}`);
      } else {
        console.warn('⚠️  Warning: No API key found in .env file');
      }
    }
  }

  async initialize() {
    try {
      // Check if API key is available
      if (!config.api.key) {
        throw new Error('No CoinGlass API key found. Please set COINGLASS_API_KEY in your .env file or config.');
      }
      
      // Ensure depth directory exists
      await fs.mkdir(this.depthDir, { recursive: true });
      
      // Load or create manifest
      await this.loadManifest();
      
      console.log('🚀 dYdX Depth Indexer initialized');
      console.log(`📁 Depth data directory: ${this.depthDir}`);
      console.log(`🎯 Target exchanges: ${this.supportedExchanges.join(', ')}`);
      console.log(`🔑 API key status: ${config.api.key ? 'Loaded' : 'Missing'}`);
    } catch (error) {
      console.error('❌ Failed to initialize:', error.message);
      throw error;
    }
  }

  async loadManifest() {
    try {
      const manifestData = await fs.readFile(this.manifestFile, 'utf8');
      this.manifest = JSON.parse(manifestData);
    } catch (error) {
      // Create new manifest if file doesn't exist
      this.manifest = {
        lastUpdated: new Date().toISOString(),
        totalPairs: 0,
        processedPairs: 0,
        failedPairs: [],
        exchanges: {}
      };
      await this.saveManifest();
    }
  }

  async saveManifest() {
    try {
      await fs.writeFile(this.manifestFile, JSON.stringify(this.manifest, null, 2));
    } catch (error) {
      console.error('❌ Failed to save manifest:', error.message);
    }
  }

  filterPairsByExchangeCount(pairsNotOnDydx) {
    // Count how many exchanges each base asset appears on
    const baseAssetCounts = new Map();
    
    // Count occurrences of each base asset across exchanges
    for (const [exchange, pairs] of Object.entries(pairsNotOnDydx)) {
      for (const pair of pairs) {
        const baseAsset = pair.base_asset;
        if (!baseAssetCounts.has(baseAsset)) {
          baseAssetCounts.set(baseAsset, {
            count: 0,
            pairs: []
          });
        }
        baseAssetCounts.get(baseAsset).count++;
        baseAssetCounts.get(baseAsset).pairs.push({
          ...pair,
          exchange: exchange
        });
      }
    }
    
    // Filter to only include base assets available on 4+ exchanges
    const filteredPairs = {};
    const minExchangeCount = 4;
    
    for (const [baseAsset, data] of baseAssetCounts.entries()) {
      if (data.count >= minExchangeCount) {
        // Group pairs by exchange for the filtered result
        for (const pair of data.pairs) {
          const exchange = pair.exchange;
          if (!filteredPairs[exchange]) {
            filteredPairs[exchange] = [];
          }
          // Remove the exchange field we added for counting
          const { exchange: _, ...pairWithoutExchange } = pair;
          filteredPairs[exchange].push(pairWithoutExchange);
        }
      }
    }
    
    console.log(`📊 Filtered to ${Object.keys(filteredPairs).length} exchanges with pairs available on ${minExchangeCount}+ exchanges`);
    
    return filteredPairs;
  }

  async findPairsNotOnDydx() {
    console.log('🔍 Finding pairs not listed on dYdX...');
    
    try {
      const pairsData = await fs.readFile(config.data.supportedPairsFile, 'utf8');
      const allPairs = JSON.parse(pairsData);
      
      // Get dYdX base assets
      const dydxBaseAssets = new Set();
      if (allPairs.dYdX) {
        allPairs.dYdX.forEach(pair => {
          dydxBaseAssets.add(pair.base_asset);
        });
      }
      
      console.log(`📊 dYdX has ${dydxBaseAssets.size} base assets`);
      
      // Find pairs not on dYdX for supported exchanges
      const pairsNotOnDydx = {};
      
      for (const exchange of this.supportedExchanges) {
        if (allPairs[exchange]) {
          pairsNotOnDydx[exchange] = allPairs[exchange].filter(pair => {
            return !dydxBaseAssets.has(pair.base_asset);
          });
        }
      }
      
      // Filter to only include pairs available on 4+ exchanges
      console.log('🔍 Filtering pairs to only include those available on 4+ exchanges...');
      const filteredPairs = this.filterPairsByExchangeCount(pairsNotOnDydx);
      
      // Save to file
      await fs.writeFile(this.pairsNotOnDydxFile, JSON.stringify(filteredPairs, null, 2));
      
      let totalPairs = 0;
      Object.values(filteredPairs).forEach(pairs => {
        totalPairs += pairs.length;
      });
      
      console.log(`✅ Found ${totalPairs} pairs not on dYdX and available on 4+ exchanges across ${this.supportedExchanges.length} exchanges`);
      this.manifest.totalPairs = totalPairs;
      
      return filteredPairs;
    } catch (error) {
      console.error('❌ Failed to find pairs not on dYdX:', error.message);
      throw error;
    }
  }

  async fetchDepthData(pair, exchange) {
    try {
      const params = {
        exchange: exchange,
        symbol: pair.instrument_id,
        interval: '1d',
        range: 2
      };
      
      const response = await this.api.makeRequest('/api/futures/orderbook/ask-bids-history', params);
      
      if (response.code === '0' && response.data && response.data.length > 0) {
        return response.data;
      } else {
        throw new Error(`Invalid API response: ${response.msg || 'No data'}`);
      }
    } catch (error) {
      throw new Error(`API request failed: ${error.message}`);
    }
  }

  async saveDepthData(pair, exchange, depthData) {
    try {
      const filename = `${pair.instrument_id}_${exchange}.json`;
      const filepath = path.join(this.depthDir, filename);
      
      let existingData = [];
      
      // Try to load existing data
      try {
        const existingContent = await fs.readFile(filepath, 'utf8');
        existingData = JSON.parse(existingContent);
      } catch (error) {
        // File doesn't exist or is invalid, start with empty array
      }
      
      // Process all depth data entries, not just the first one
      console.log(`📊 Processing ${depthData.length} depth data entries for ${pair.instrument_id} on ${exchange}`);
      
      for (const dataEntry of depthData) {
        const newEntry = {
          ...dataEntry,
          pair_info: {
            instrument_id: pair.instrument_id,
            base_asset: pair.base_asset,
            quote_asset: pair.quote_asset,
            exchange: exchange
          },
          fetched_at: new Date().toISOString()
        };
        
        // Check if we already have data for this timestamp
        const existingIndex = existingData.findIndex(entry => entry.time === dataEntry.time);
        if (existingIndex >= 0) {
          // Update existing entry
          existingData[existingIndex] = newEntry;
        } else {
          // Add new entry
          existingData.push(newEntry);
        }
      }
      
      // Save updated data
      await fs.writeFile(filepath, JSON.stringify(existingData, null, 2));
      
      return true;
    } catch (error) {
      throw new Error(`Failed to save depth data: ${error.message}`);
    }
  }

  async processPairs(pairsNotOnDydx) {
    console.log('🔄 Processing pairs for depth data...');
    
    const progressBar = new cliProgress.SingleBar({
      format: 'Progress |{bar}| {percentage}% | {value}/{total} pairs | ETA: {eta}s | {pair}',
      barCompleteChar: '\u2588',
      barIncompleteChar: '\u2591',
      hideCursor: true
    });
    
    let processedCount = 0;
    let successCount = 0;
    let errorCount = 0;
    
    // Calculate total pairs to process
    let totalPairs = 0;
    Object.values(pairsNotOnDydx).forEach(pairs => {
      totalPairs += pairs.length;
    });
    
    progressBar.start(totalPairs, 0);
    
    // Process each exchange
    for (const [exchange, pairs] of Object.entries(pairsNotOnDydx)) {
      for (const pair of pairs) {
        try {
          progressBar.update(processedCount, { pair: `${pair.instrument_id} (${exchange})` });
          
          const depthData = await this.fetchDepthData(pair, exchange);
          await this.saveDepthData(pair, exchange, depthData);
          
          successCount++;
          
          // Update manifest
          if (!this.manifest.exchanges[exchange]) {
            this.manifest.exchanges[exchange] = { success: 0, failed: 0 };
          }
          this.manifest.exchanges[exchange].success++;
          
        } catch (error) {
          errorCount++;
          
          // Log failed pair
          const failedPair = {
            instrument_id: pair.instrument_id,
            exchange: exchange,
            error: error.message,
            timestamp: new Date().toISOString()
          };
          
          this.manifest.failedPairs.push(failedPair);
          
          // Update manifest
          if (!this.manifest.exchanges[exchange]) {
            this.manifest.exchanges[exchange] = { success: 0, failed: 0 };
          }
          this.manifest.exchanges[exchange].failed++;
          
          console.error(`❌ Failed to process ${pair.instrument_id} on ${exchange}: ${error.message}`);
        }
        
        processedCount++;
        progressBar.update(processedCount);
        
        // Small delay to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    progressBar.stop();
    
    // Update final manifest
    this.manifest.processedPairs = processedCount;
    this.manifest.lastUpdated = new Date().toISOString();
    await this.saveManifest();
    
    console.log(`\n✅ Processing complete!`);
    console.log(`📊 Success: ${successCount}, Errors: ${errorCount}, Total: ${processedCount}`);
    
    return { successCount, errorCount, processedCount };
  }

  async run() {
    try {
      console.log('🚀 Starting dYdX Depth Indexer...');
      console.log(`⏰ Started at: ${new Date().toISOString()}`);
      
      await this.initialize();
      
      // Step 1: Find pairs not on dYdX
      const pairsNotOnDydx = await this.findPairsNotOnDydx();
      
      // Step 2: Process pairs and fetch depth data
      const results = await this.processPairs(pairsNotOnDydx);
      
      // Step 3: Show summary
      console.log('\n📋 Summary:');
      console.log(`🎯 Total pairs to process: ${this.manifest.totalPairs}`);
      console.log(`✅ Successfully processed: ${results.successCount}`);
      console.log(`❌ Failed: ${results.errorCount}`);
      console.log(`📁 Data saved to: ${this.depthDir}`);
      
      if (results.errorCount > 0) {
        console.log(`📝 Check ${this.manifestFile} for error details`);
      }
      
      console.log(`\n⏰ Completed at: ${new Date().toISOString()}`);
      
    } catch (error) {
      console.error('❌ Fatal error:', error.message);
      process.exit(1);
    }
  }
}

// CLI interface
if (require.main === module) {
  // Parse command line arguments
  const args = process.argv.slice(2);
  const useEnv = args.includes('--env');
  
  if (useEnv) {
    console.log('🔑 CLI: Using .env file for API key');
  }
  
  const indexer = new DydxDepthIndexer(useEnv);
  indexer.run().catch(error => {
    console.error('❌ Script failed:', error.message);
    process.exit(1);
  });
}

module.exports = DydxDepthIndexer;
