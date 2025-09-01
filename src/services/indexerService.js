const path = require('path');
const FileUtils = require(path.join(process.cwd(), 'src', 'utils', 'fileUtils.js'));
const GitUtils = require(path.join(process.cwd(), 'src', 'utils', 'gitUtils.js'));
const CoinGlassAPI = require('./coinglassApi.js');
const cliProgress = require('cli-progress');

class IndexerService {
  constructor(config) {
    this.config = config;
    this.api = new CoinGlassAPI(config);
    this.progressBar = null;
    this.manifest = {
      run_started_at_utc: null,
      run_finished_at_utc: null,
      coins_total: 0,
      coins_succeeded: 0,
      coins_failed: 0,
      failures: []
    };
  }

  async initialize() {
    console.log('🚀 Initializing Perps Indexer...');
    
    // Ensure directories exist
    await FileUtils.ensureDirectoryExists(this.config.data.utilsDir);
    await FileUtils.ensureDirectoryExists(this.config.data.baseDir);
    
    // Configure git if enabled
    await GitUtils.configureGit(this.config);
    
    console.log('✅ Initialization complete');
  }

  async updateSupportedCoins() {
    console.log('\n📊 Updating supported coins...');
    
    try {
      const response = await this.api.getSupportedCoins();
      const coins = response.data;
      
      // Check if data has changed
      const existingData = await FileUtils.readJsonFile(this.config.data.supportedCoinsFile);
      if (existingData && JSON.stringify(existingData) === JSON.stringify(coins)) {
        console.log('ℹ️  No changes in supported coins, skipping update');
        return coins;
      }
      
      // Save new data
      await FileUtils.writeJsonFile(this.config.data.supportedCoinsFile, coins);
      console.log(`✅ Updated supported coins: ${coins.length} coins`);
      
      // Commit changes if git is enabled
      if (this.config.git.enabled) {
        await GitUtils.commitChanges(this.config, 'Update supported coins list');
      }
      
      return coins;
    } catch (error) {
      console.error('❌ Failed to update supported coins:', error.message);
      throw error;
    }
  }

  async updateSupportedPairs() {
    console.log('\n🔗 Updating supported exchange pairs...');
    
    try {
      const response = await this.api.getSupportedExchangePairs();
      const pairs = response.data;
      
      // Check if data has changed
      const existingData = await FileUtils.readJsonFile(this.config.data.supportedPairsFile);
      if (existingData && JSON.stringify(existingData) === JSON.stringify(pairs)) {
        console.log('ℹ️  No changes in supported pairs, skipping update');
        return pairs;
      }
      
      // Save new data
      await FileUtils.writeJsonFile(this.config.data.supportedPairsFile, pairs);
      console.log(`✅ Updated supported pairs: ${pairs.length} pairs`);
      
      // Commit changes if git is enabled
      await GitUtils.commitChanges(this.config, 'Update supported exchange pairs');
      
      return pairs;
    } catch (error) {
      console.error('❌ Failed to update supported pairs:', error.message);
      throw error;
    }
  }

  async fetchTickerData(coins, date) {
    console.log(`\n📈 Fetching ticker data for ${date}...`);
    
    this.manifest.run_started_at_utc = new Date().toISOString();
    this.manifest.coins_total = coins.length;
    this.manifest.coins_succeeded = 0;
    this.manifest.coins_failed = 0;
    this.manifest.failures = [];
    
    // Initialize progress bar
    this.progressBar = new cliProgress.SingleBar({
      format: 'Progress |{bar}| {percentage}% | {value}/{total} coins | ETA: {eta}s | {coin}',
      barCompleteChar: '\u2588',
      barIncompleteChar: '\u2591',
      hideCursor: true
    });
    
    this.progressBar.start(coins.length, 0, { coin: 'Starting...' });
    
    const allTickerData = [];
    const rateLimitInfo = this.api.getRateLimitInfo();
    const estimatedTotalTime = (coins.length * rateLimitInfo.estimatedTimePerCoin) / 60; // in minutes
    
    console.log(`⏱️  Estimated time: ${estimatedTotalTime.toFixed(1)} minutes`);
    
    for (let i = 0; i < coins.length; i++) {
      const coin = coins[i];
      this.progressBar.update(i, { coin });
      
      try {
        const response = await this.api.getPairsMarkets(coin);
        const tickerData = response.data;
        
        // Save individual ticker file
        const tickerPath = FileUtils.getDataPath(this.config.data.baseDir, date, 'ticker', coin);
        await FileUtils.writeJsonFile(tickerPath, response);
        
        allTickerData.push(...tickerData);
        this.manifest.coins_succeeded++;
        
        // Small delay to respect rate limits
        if (i < coins.length - 1) {
          await new Promise(resolve => setTimeout(resolve, this.config.api.rateLimit.delayBetweenRequests));
        }
        
      } catch (error) {
        console.error(`\n❌ Failed to fetch data for ${coin}:`, error.message);
        this.manifest.coins_failed++;
        this.manifest.failures.push({
          coin,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    }
    
    this.progressBar.stop();
    this.manifest.run_finished_at_utc = new Date().toISOString();
    
    console.log(`\n✅ Ticker data fetch complete:`);
    console.log(`   - Success: ${this.manifest.coins_succeeded}`);
    console.log(`   - Failed: ${this.manifest.coins_failed}`);
    console.log(`   - Total: ${this.manifest.coins_total}`);
    
    return allTickerData;
  }

  async saveManifest(date) {
    const manifestPath = FileUtils.getDataPath(this.config.data.baseDir, date, 'manifest');
    await FileUtils.writeJsonFile(manifestPath, this.manifest);
    console.log(`📋 Manifest saved: ${manifestPath}`);
  }

  async saveCombinedData(date, allTickerData) {
    const combinedPath = FileUtils.getDataPath(this.config.data.baseDir, date, 'combined');
    const combinedData = {
      date,
      total_pairs: allTickerData.length,
      data: allTickerData,
      manifest: this.manifest
    };
    
    await FileUtils.writeJsonFile(combinedPath, combinedData);
    console.log(`📦 Combined data saved: ${combinedPath}`);
  }

  async runDailyIndexing() {
    const date = FileUtils.formatDate(new Date());
    console.log(`\n🌅 Starting daily indexing for ${date}`);
    
    try {
      // Step 1: Update supported coins
      const coins = await this.updateSupportedCoins();
      
      // Step 2: Update supported pairs
      await this.updateSupportedPairs();
      
      // Step 3: Fetch ticker data for all coins
      const allTickerData = await this.fetchTickerData(coins, date);
      
      // Step 4: Save manifest
      await this.saveManifest(date);
      
      // Step 5: Save combined data
      await this.saveCombinedData(date, allTickerData);
      
      // Step 6: Commit all changes if git is enabled
      if (this.config.git.enabled) {
        const commitMessage = `Daily index update ${date} - ${this.manifest.coins_succeeded}/${this.manifest.coins_total} coins`;
        await GitUtils.commitChanges(this.config, commitMessage);
        await GitUtils.pushChanges(this.config);
      }
      
      console.log(`\n🎉 Daily indexing completed successfully for ${date}!`);
      
    } catch (error) {
      console.error(`\n💥 Daily indexing failed for ${date}:`, error.message);
      throw error;
    }
  }

  async run() {
    await this.initialize();
    await this.runDailyIndexing();
  }
}

module.exports = IndexerService;
