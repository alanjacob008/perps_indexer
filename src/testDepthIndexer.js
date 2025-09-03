const fs = require('fs').promises;
const config = require('../config/local.config');
const DydxDepthIndexer = require('./dydxDepthIndexer');

class TestDepthIndexer extends DydxDepthIndexer {
  constructor() {
    super();
    // Override to only test with a few exchanges and pairs
    this.supportedExchanges = ['Binance', 'Bybit']; // Test with just 2 exchanges
  }

  async findPairsNotOnDydx() {
    console.log('🧪 TEST MODE: Finding pairs not listed on dYdX...');
    
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
      
      // Find pairs not on dYdX for supported exchanges (limited for testing)
      const pairsNotOnDydx = {};
      
      for (const exchange of this.supportedExchanges) {
        if (allPairs[exchange]) {
          // Limit to first 3 pairs for testing
          const filteredPairs = allPairs[exchange].filter(pair => {
            return !dydxBaseAssets.has(pair.base_asset);
          }).slice(0, 3);
          
          pairsNotOnDydx[exchange] = filteredPairs;
        }
      }
      
      // Save to file
      await fs.writeFile(this.pairsNotOnDydxFile, JSON.stringify(pairsNotOnDydx, null, 2));
      
      let totalPairs = 0;
      Object.values(pairsNotOnDydx).forEach(pairs => {
        totalPairs += pairs.length;
      });
      
      console.log(`✅ TEST MODE: Found ${totalPairs} pairs not on dYdX across ${this.supportedExchanges.length} exchanges`);
      this.manifest.totalPairs = totalPairs;
      
      return pairsNotOnDydx;
    } catch (error) {
      console.error('❌ Failed to find pairs not on dYdX:', error.message);
      throw error;
    }
  }

  async run() {
    try {
      console.log('🧪 TEST MODE: Starting dYdX Depth Indexer...');
      console.log(`⏰ Started at: ${new Date().toISOString()}`);
      
      await this.initialize();
      
      // Step 1: Find pairs not on dYdX (limited for testing)
      const pairsNotOnDydx = await this.findPairsNotOnDydx();
      
      // Step 2: Process pairs and fetch depth data
      const results = await this.processPairs(pairsNotOnDydx);
      
      // Step 3: Show summary
      console.log('\n📋 TEST SUMMARY:');
      console.log(`🎯 Total pairs to process: ${this.manifest.totalPairs}`);
      console.log(`✅ Successfully processed: ${results.successCount}`);
      console.log(`❌ Failed: ${results.errorCount}`);
      console.log(`📁 Data saved to: ${this.depthDir}`);
      
      if (results.errorCount > 0) {
        console.log(`📝 Check ${this.manifestFile} for error details`);
      }
      
      console.log(`\n⏰ TEST Completed at: ${new Date().toISOString()}`);
      console.log('🧪 This was a test run with limited data. Use "npm run depth" for full indexing.');
      
    } catch (error) {
      console.error('❌ Test failed:', error.message);
      process.exit(1);
    }
  }
}

// CLI interface for testing
if (require.main === module) {
  const testIndexer = new TestDepthIndexer();
  testIndexer.run().catch(error => {
    console.error('❌ Test script failed:', error.message);
    process.exit(1);
  });
}

module.exports = TestDepthIndexer;
