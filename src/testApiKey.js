const dotenv = require('dotenv');
const config = require('../config/local.config');

console.log('🧪 Testing API Key Loading...\n');

// Test 1: Check config without .env
console.log('1️⃣ Config without .env:');
console.log(`   API Key: ${config.api.key ? 'Present' : 'Missing'}`);
console.log(`   Base URL: ${config.api.baseUrl}\n`);

// Test 2: Load .env and check config
console.log('2️⃣ Loading .env file...');
dotenv.config();

console.log('3️⃣ Config after loading .env:');
console.log(`   API Key: ${config.api.key ? 'Present' : 'Missing'}`);
if (config.api.key) {
  console.log(`   Key preview: ${config.api.key.substring(0, 8)}...${config.api.key.substring(config.api.key.length - 4)}`);
}
console.log(`   Base URL: ${config.api.baseUrl}\n`);

// Test 3: Check environment variable directly
console.log('4️⃣ Environment variable check:');
const envKey = process.env.COINGLASS_API_KEY;
console.log(`   COINGLASS_API_KEY: ${envKey ? 'Set' : 'Not set'}`);
if (envKey) {
  console.log(`   Value: ${envKey.substring(0, 8)}...${envKey.substring(envKey.length - 4)}`);
}

console.log('\n✅ Test complete!');
console.log('\n💡 If the API key is still missing:');
console.log('   1. Make sure you have a .env file in the project root');
console.log('   2. Add: COINGLASS_API_KEY=your_actual_api_key_here');
console.log('   3. Run: npm run depth:env');
