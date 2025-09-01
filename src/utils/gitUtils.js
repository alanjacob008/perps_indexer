const { execSync } = require('child_process');
const path = require('path');

class GitUtils {
  static async configureGit(config) {
    if (!config.git.enabled) {
      return;
    }

    try {
      // Configure git user for bot commits
      execSync(`git config user.name "${config.git.botName}"`, { stdio: 'pipe' });
      execSync(`git config user.email "${config.git.botEmail}"`, { stdio: 'pipe' });
      
      console.log('Git configured for bot commits');
    } catch (error) {
      console.warn('Warning: Could not configure git:', error.message);
    }
  }

  static async commitChanges(config, message) {
    if (!config.git.enabled) {
      return false;
    }

    try {
      // Check if there are any changes
      const status = execSync('git status --porcelain', { encoding: 'utf8' });
      
      if (!status.trim()) {
        console.log('No changes to commit');
        return false;
      }

      // Add all changes
      execSync('git add .', { stdio: 'pipe' });
      
      // Commit changes
      execSync(`git commit -m "${message}"`, { stdio: 'pipe' });
      
      console.log(`Changes committed: ${message}`);
      return true;
    } catch (error) {
      console.error('Error committing changes:', error.message);
      return false;
    }
  }

  static async pushChanges(config) {
    if (!config.git.enabled) {
      return false;
    }

    try {
      execSync('git push', { stdio: 'pipe' });
      console.log('Changes pushed to remote repository');
      return true;
    } catch (error) {
      console.error('Error pushing changes:', error.message);
      return false;
    }
  }

  static async checkForChanges(filePath) {
    try {
      const status = execSync(`git status --porcelain "${filePath}"`, { encoding: 'utf8' });
      return status.trim().length > 0;
    } catch (error) {
      return false;
    }
  }
}

module.exports = GitUtils;
