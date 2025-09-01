module.exports = {
  api: {
    baseUrl: 'https://open-api-v4.coinglass.com',
    key: process.env.COINGLASS_API_KEY || '',
    rateLimit: {
      requestsPerMinute: 30,
      delayBetweenRequests: 2000 // 2 seconds between requests
    }
  },
  data: {
    baseDir: './data',
    utilsDir: './utils',
    supportedCoinsFile: './utils/supported_coins.json',
    supportedPairsFile: './utils/supported_pairs.json'
  },
  schedule: {
    dailyRunTime: '12:00', // UTC time
    updateInterval: 24 * 60 * 60 * 1000 // 24 hours in milliseconds
  },
  git: {
    enabled: true, // GitHub Actions should commit to git
    botName: 'gh-actions',
    botEmail: 'actions@users.noreply.github.com',
    token: '' // Not needed with contents: write permission
  }
};
