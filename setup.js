#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');

async function setup() {
  console.log('🚀 Setting up Perps Indexer...\n');
  
  try {
    // Check if .env exists
    const envPath = path.join(process.cwd(), '.env');
    try {
      await fs.access(envPath);
      console.log('✅ .env file already exists');
    } catch {
      console.log('📝 Creating .env file...');
      const envContent = `# CoinGlass API Configuration
# Get your API key from: https://coinglass.com/api
COINGLASS_API_KEY=your_api_key_here

# Optional: Override default rate limits
# RATE_LIMIT_REQUESTS_PER_MINUTE=30
# RATE_LIMIT_DELAY_MS=2000
`;
      await fs.writeFile(envPath, envContent);
      console.log('✅ .env file created');
      console.log('⚠️  Please edit .env and add your CoinGlass API key');
    }
    
    // Create directories
    const dirs = ['data', 'utils', 'data/futures'];
    for (const dir of dirs) {
      try {
        await fs.access(dir);
        console.log(`✅ ${dir}/ directory already exists`);
      } catch {
        await fs.mkdir(dir, { recursive: true });
        console.log(`✅ Created ${dir}/ directory`);
      }
    }
    
    // Check if dependencies are installed
    try {
      await fs.access('node_modules');
      console.log('✅ Dependencies already installed');
    } catch {
      console.log('📦 Installing dependencies...');
      const { execSync } = require('child_process');
      execSync('npm install', { stdio: 'inherit' });
      console.log('✅ Dependencies installed');
    }
    
    console.log('\n🎉 Setup complete!');
    console.log('\n📋 Next steps:');
    console.log('1. Edit .env file and add your CoinGlass API key');
    console.log('2. Test the API connection: npm run test');
    console.log('3. Run the indexer: npm start');
    console.log('\n📚 For more information, see README.md');
    
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  setup();
}

module.exports = { setup };
