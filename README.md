# Perps Indexer

A cryptocurrency futures data indexer that aggregates data from leading futures and spot exchanges using the CoinGlass API. This tool automatically fetches and stores daily market data for all supported cryptocurrencies.

## Features

- 🔄 **Automated Daily Updates**: Runs automatically at 12:00 AM UTC daily
- 📊 **Comprehensive Data Collection**: Fetches data for all supported coins and exchange pairs
- 🚀 **Dual Mode Support**: Works both locally and in GitHub Actions
- ⏱️ **Rate Limit Management**: Respects API rate limits with configurable delays
- 📈 **Progress Tracking**: Real-time progress bars with ETA estimates
- 🔐 **Secure API Integration**: Uses environment variables for API keys
- 📝 **Detailed Logging**: Comprehensive manifest files and error tracking
- 🤖 **Git Integration**: Automatic commits and pushes in GitHub Actions mode

## Data Structure

The indexer creates the following directory structure:

```
data/
├── futures/
│   └── YYYY-MM-DD/
│       ├── ticker/
│       │   ├── BTC.json
│       │   ├── ETH.json
│       │   └── ...
│       ├── _manifest.json
│       └── combined_YYYY-MM-DD.json
└── utils/
    ├── supported_coins.json
    └── supported_pairs.json
```

## Prerequisites

- Node.js 16+ 
- npm or yarn
- CoinGlass API key
- Git repository (for GitHub Actions mode)

## Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd perps-indexer
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp env.example .env
# Edit .env and add your CoinGlass API key
```

## Configuration

### Local Development

The tool automatically runs in local mode by default. Create a `.env` file with:

```env
COINGLASS_API_KEY=your_api_key_here
```

### GitHub Actions

1. Add the following secret to your repository:
   - `COINGLASS_API_KEY`: Your CoinGlass API key

2. The workflow will run automatically at 12:00 AM UTC daily
3. No additional tokens needed - the workflow uses `contents: write` permission

## Usage

### Local Development

```bash
# Run with default settings
npm start

# Run with custom API key
npm start -- --api-key your_key_here

# Run with custom rate limits
npm start -- --rate-limit 60 --delay 1000

# Run in GitHub mode locally
npm start -- --github
```

### Command Line Options

- `-l, --local`: Run in local mode (default)
- `-g, --github`: Run in GitHub Actions mode

## dYdX Depth Indexer

The dYdX Depth Indexer is a specialized script that finds cryptocurrency pairs not listed on dYdX and fetches their orderbook depth data from other exchanges.

### Features

- 🔍 **Smart Pair Discovery**: Automatically identifies pairs available on other exchanges but not on dYdX
- 🎯 **Multi-Exchange Filtering**: Only processes pairs available on 4+ exchanges for better data quality
- 📊 **Orderbook Depth Data**: Fetches 2% orderbook depth data for non-dYdX pairs
- 🔄 **Incremental Updates**: Updates existing data and adds new pairs without overwriting
- 📈 **Progress Tracking**: Real-time progress bars with ETA estimates
- 🎯 **Targeted Exchanges**: Focuses on major exchanges: Binance, Bybit, Coinbase, Kraken, MEXC, Gate, Hyperliquid, KuCoin, OKX
- 📝 **Error Handling**: Comprehensive error logging and manifest tracking
- 🔑 **Flexible API Key Management**: Support for both config files and .env files

### Data Structure

```
data/futures/depth/
├── _manifest.json
├── BTCUSD_PERP_Binance.json
├── SOLUSD_PERP_Binance.json
├── ETHUSD_PERP_Bybit.json
└── ...
```

### Usage

```bash
# Run full depth indexing (uses config file)
npm run depth

# Run full depth indexing with .env file
npm run depth:env

# Run test mode (limited data for testing)
npm run test-depth
```

### Weekly Automation

The depth indexer runs automatically every Sunday at 3:00 AM UTC via GitHub Actions, ensuring regular updates of orderbook depth data.

### Manifest File

The `_manifest.json` file tracks:
- Last update timestamp
- Total pairs processed
- Success/failure counts per exchange
- Detailed error logs for failed pairs
- `--api-key <key>`: Override API key from environment
- `--rate-limit <limit>`: Override rate limit (requests per minute)
- `--delay <ms>`: Override delay between requests (milliseconds)

### Programmatic Usage

```javascript
const { IndexerService } = require('./src/services/indexerService');
const config = require('./config/local.config');

const indexer = new IndexerService(config);
await indexer.run();
```

## Rate Limiting

The tool respects CoinGlass API rate limits:
- Default: 30 requests per minute
- Configurable via command line or environment variables
- Automatic delays between requests to prevent rate limit violations

## Data Files

### Manifest File (`_manifest.json`)

Contains metadata about each indexing run:
```json
{
  "run_started_at_utc": "2024-01-01T12:00:00.000Z",
  "run_finished_at_utc": "2024-01-01T12:15:30.000Z",
  "coins_total": 150,
  "coins_succeeded": 148,
  "coins_failed": 2,
  "failures": [
    {
      "coin": "UNKNOWN",
      "error": "API error message",
      "timestamp": "2024-01-01T12:01:00.000Z"
    }
  ]
}
```

### Combined Data File (`combined_YYYY-MM-DD.json`)

Contains all ticker data for a specific date:
```json
{
  "date": "2024-01-01",
  "total_pairs": 1500,
  "data": [...],
  "manifest": {...}
}
```

## GitHub Actions

The included workflow (`.github/workflows/daily-index.yml`) will:

1. Run automatically at 12:00 AM UTC daily
2. Install dependencies
3. Execute the indexer
4. Commit and push all changes
5. Handle failures gracefully

### Workflow Features

- **Concurrency Control**: Uses `data-writes` group to prevent race conditions with other data-updating workflows
- **Timeout Protection**: 60-minute timeout prevents long-running jobs
- **Smart Commits**: Only commits when there are actual changes
- **Explicit Permissions**: Uses `contents: write` permission for secure access

### Manual Trigger

You can also trigger the workflow manually from the GitHub Actions tab.

## Error Handling

The tool includes comprehensive error handling:
- Individual coin failures don't stop the entire process
- Failed requests are logged in the manifest
- Detailed error messages for debugging
- Graceful degradation when possible

## Monitoring

- Progress bars with real-time updates
- ETA calculations based on rate limits
- Detailed success/failure statistics
- Comprehensive logging throughout the process

## Troubleshooting

### Common Issues

1. **API Key Invalid**: Ensure your CoinGlass API key is correct and has proper permissions
2. **Rate Limit Exceeded**: The tool automatically handles rate limits, but you can adjust delays if needed
3. **Git Authentication**: Ensure proper GitHub token permissions for automated commits

### Debug Mode

For detailed debugging, you can modify the configuration files to enable more verbose logging.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review the logs and manifest files
3. Open an issue on GitHub

## Changelog

### v1.0.0
- Initial release
- Support for local and GitHub Actions modes
- Automated daily indexing
- Comprehensive data collection and storage
