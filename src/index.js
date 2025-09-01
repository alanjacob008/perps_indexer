#!/usr/bin/env node

const { Command } = require('commander');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config();

// Import configurations
const localConfig = require(path.join(process.cwd(), 'config', 'local.config.js'));
const githubConfig = require(path.join(process.cwd(), 'config', 'github.config.js'));

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
    // Comprehensive debugging for GitHub Actions environment
    console.log('🔍 === ENVIRONMENT DEBUG INFO ===');
    console.log('🔍 Current working directory:', process.cwd());
    console.log('🔍 __dirname:', __dirname);
    console.log('🔍 Process argv:', process.argv);
    console.log('🔍 Node version:', process.version);
    console.log('🔍 Platform:', process.platform);
    
    // Check if key directories exist
    const fs = require('fs');
    const dirsToCheck = ['src', 'src/utils', 'src/services', 'config', 'utils'];
    console.log('🔍 === DIRECTORY CHECK ===');
    dirsToCheck.forEach(dir => {
      const exists = fs.existsSync(dir);
      console.log(`  - ${dir}/: ${exists ? '✅ EXISTS' : '❌ MISSING'}`);
      if (exists) {
        try {
          const files = fs.readdirSync(dir);
          console.log(`    Contents: ${files.slice(0, 5).join(', ')}${files.length > 5 ? '...' : ''}`);
        } catch (e) {
          console.log(`    Error reading: ${e.message}`);
        }
      }
    });
    
    // Check specific files
    const filesToCheck = [
      'src/utils/fileUtils.js',
      'src/utils/gitUtils.js', 
      'src/services/coinglassApi.js',
      'config/local.config.js',
      'config/github.config.js'
    ];
    console.log('🔍 === FILE CHECK ===');
    filesToCheck.forEach(file => {
      const exists = fs.existsSync(file);
      console.log(`  - ${file}: ${exists ? '✅ EXISTS' : '❌ MISSING'}`);
      if (exists) {
        try {
          const stats = fs.statSync(file);
          console.log(`    Size: ${stats.size} bytes, Modified: ${stats.mtime}`);
        } catch (e) {
          console.log(`    Error reading stats: ${e.message}`);
        }
      }
    });
    
    console.log('🔍 === PATH RESOLUTION ===');
    console.log('  - Local config path:', path.join(process.cwd(), 'config', 'local.config.js'));
    console.log('  - GitHub config path:', path.join(process.cwd(), 'config', 'github.config.js'));
    console.log('  - FileUtils path:', path.join(process.cwd(), 'src', 'utils', 'fileUtils.js'));
    console.log('  - GitUtils path:', path.join(process.cwd(), 'src', 'utils', 'gitUtils.js'));
    
    // Test file reading before module loading
    console.log('🔍 === TESTING FILE ACCESS ===');
    try {
      const testContent = fs.readFileSync('src/utils/fileUtils.js', 'utf8');
      console.log(`✅ FileUtils.js content length: ${testContent.length} characters`);
      console.log(`✅ First 100 chars: ${testContent.substring(0, 100)}...`);
    } catch (e) {
      console.log(`❌ Error reading FileUtils.js: ${e.message}`);
    }
    
    // Test alternative path strategies
    console.log('🔍 === TESTING ALTERNATIVE PATHS ===');
    const alternativePaths = [
      'src/utils/fileUtils.js',
      './src/utils/fileUtils.js',
      '../src/utils/fileUtils.js',
      path.join(process.cwd(), 'src', 'utils', 'fileUtils.js'),
      path.resolve('src/utils/fileUtils.js')
    ];
    
    alternativePaths.forEach(testPath => {
      try {
        const exists = fs.existsSync(testPath);
        console.log(`  - ${testPath}: ${exists ? '✅ EXISTS' : '❌ MISSING'}`);
        if (exists) {
          const stats = fs.statSync(testPath);
          console.log(`    Size: ${stats.size} bytes`);
        }
      } catch (e) {
        console.log(`  - ${testPath}: ❌ ERROR - ${e.message}`);
      }
    });
    
    // List working directory contents to understand structure
    console.log('🔍 === WORKING DIRECTORY CONTENTS ===');
    try {
      const cwdContents = fs.readdirSync('.');
      console.log(`  - Current directory (${process.cwd()}): ${cwdContents.join(', ')}`);
      
      if (fs.existsSync('src')) {
        const srcContents = fs.readdirSync('src');
        console.log(`  - src/ directory: ${srcContents.join(', ')}`);
        
        if (fs.existsSync('src/utils')) {
          const utilsContents = fs.readdirSync('src/utils');
          console.log(`  - src/utils/ directory: ${utilsContents.join(', ')}`);
        }
      }
    } catch (e) {
      console.log(`  - Error listing directories: ${e.message}`);
    }
    
    // Determine configuration
    let config;
    if (options.github) {
      config = { ...githubConfig };
      console.log('🔧 Running in GitHub Actions mode');
      console.log('🔍 Config loaded from:', path.join(process.cwd(), 'config', 'github.config.js'));
    } else {
      config = { ...localConfig };
      console.log('🔧 Running in local mode');
      console.log('🔍 Config loaded from:', path.join(process.cwd(), 'config', 'local.config.js'));
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

    // Test loading utility modules manually before IndexerService
    console.log('🔍 === TESTING MODULE LOADS ===');
    let FileUtils, GitUtils, CoinGlassAPI;
    
    try {
      console.log('  - Testing FileUtils load...');
      FileUtils = require('./utils/fileUtils.js');
      console.log('    ✅ FileUtils loaded successfully');
    } catch (e) {
      console.error('    ❌ FileUtils load failed:', e.message);
    }
    
    try {
      console.log('  - Testing GitUtils load...');
      GitUtils = require('./utils/gitUtils.js');
      console.log('    ✅ GitUtils loaded successfully');
    } catch (e) {
      console.error('    ❌ GitUtils load failed:', e.message);
    }
    
    try {
      console.log('  - Testing CoinGlassAPI load...');
      CoinGlassAPI = require('./services/coinglassApi.js');
      console.log('    ✅ CoinGlassAPI loaded successfully');
    } catch (e) {
      console.error('    ❌ CoinGlassAPI load failed:', e.message);
    }

    // Import IndexerService after debugging (to avoid early module loading errors)
    console.log('🔍 === LOADING INDEXER SERVICE ===');
    let IndexerService;
    try {
      IndexerService = require('./services/indexerService.js');
      console.log('✅ IndexerService loaded successfully');
    } catch (e) {
      console.error('❌ Failed to load IndexerService:', e.message);
      throw e;
    }

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
