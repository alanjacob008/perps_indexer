const fs = require('fs').promises;
const path = require('path');

class FileUtils {
  static async ensureDirectoryExists(dirPath) {
    try {
      await fs.access(dirPath);
    } catch {
      await fs.mkdir(dirPath, { recursive: true });
    }
  }

  static async readJsonFile(filePath) {
    try {
      const data = await fs.readFile(filePath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      if (error.code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }

  static async writeJsonFile(filePath, data) {
    await this.ensureDirectoryExists(path.dirname(filePath));
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
  }

  static async fileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  static async getFileStats(filePath) {
    try {
      const stats = await fs.stat(filePath);
      return stats;
    } catch {
      return null;
    }
  }

  static formatDate(date) {
    return date.toISOString().split('T')[0];
  }

  static getDataPath(baseDir, date, type, symbol = null) {
    const datePath = path.join(baseDir, 'futures', date);
    
    if (type === 'ticker' && symbol) {
      return path.join(datePath, 'ticker', `${symbol}.json`);
    } else if (type === 'manifest') {
      return path.join(datePath, '_manifest.json');
    } else if (type === 'combined') {
      return path.join(datePath, `combined_${date}.json`);
    }
    
    return datePath;
  }
}

module.exports = FileUtils;
