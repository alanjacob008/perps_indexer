#!/usr/bin/env node

const { Command } = require('commander');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config();

// Import services
const IndexerService = require('./services/indexerService.js');

// Import configurations
const localConfig = require(path.join(__dirname, '..', 'config', 'local.config.js'));
const githubConfig = require(path.join(__dirname, '..', 'config', 'github.config.js'));

const program = new Command();

program
  .name('perps-indexer')
  .description('Cryptocurrency futures data indexer using CoinGlass API')
  .version('1.0.0');

program
  .option('-l, --local', 'Run in local mode (default)')
  .option('-g, --github', 'Run in GitHub Actions mode')
  .option('--api-key <key>', 'Override API key from environment')
  .option('--rate-limit <limit>', 'Override rate limit (requests per minute)', '30')
  .option('--delay <ms>', 'Override delay between requests (milliseconds)', '2000');

program.parse();

const options = program.opts();

async function main() {
  try {
    // Debug: Log current working directory and file paths
    console.log('🔍 Current working directory:', process.cwd());
    console.log('🔍 __dirname:', __dirname);
    console.log('🔍 File paths:');
    console.log('  - Local config:', path.join(__dirname, '..', 'config', 'local.config.js'));
    console.log('  - GitHub config:', path.join(__dirname, '..', 'config', 'github.config.js'));
    
    // Determine configuration
    let config;
    if (options.github) {
      config = { ...githubConfig };
      console.log('🔧 Running in GitHub Actions mode');
      console.log('🔍 Config loaded from:', path.join(__dirname, '..', 'config', 'github.config.js'));
    } else {
      config = { ...localConfig };
      console.log('🔧 Running in local mode');
      console.log('🔍 Config loaded from:', path.join(__dirname, '..', 'config', 'local.config.js'));
    }
    
    console.log('🔍 Config data paths:');
    console.log('  - Base dir:', config.data.baseDir);
    console.log('  - Utils dir:', config.data.utilsDir);
    console.log('  - Supported coins file:', config.data.supportedCoinsFile);
    console.log('  - Supported pairs file:', config.data.supportedPairsFile);

    // Override API key if provided
    if (options.apiKey) {
      config.api.key = options.apiKey;
    }

    // Override rate limit settings if provided
    if (options.rateLimit) {
      config.api.rateLimit.requestsPerMinute = parseInt(options.rateLimit);
      config.api.rateLimit.delayBetweenRequests = (60 * 1000) / parseInt(options.rateLimit);
    }

    if (options.delay) {
      config.api.rateLimit.delayBetweenRequests = parseInt(options.delay);
    }

    // Validate configuration
    if (!config.api.key) {
      throw new Error('API key is required. Set COINGLASS_API_KEY environment variable or use --api-key option.');
    }

    console.log(`📊 Rate limit: ${config.api.rateLimit.requestsPerMinute} requests/minute`);
    console.log(`⏱️  Delay between requests: ${config.api.rateLimit.delayBetweenRequests}ms`);

    // Create and run indexer service
    const indexer = new IndexerService(config);
    await indexer.run();

  } catch (error) {
    console.error('\n💥 Fatal error:', error.message);
    process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

if (require.main === module) {
  main();
}

module.exports = { main };
