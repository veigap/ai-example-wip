import { readFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import { createInterface } from 'readline';

const CONFIG_FILE = '.ai-tutorial.conf';
const MAX_WAIT_TIME = 60000; // 60 seconds
const CHECK_INTERVAL = 500; // Check every 500ms

// Wait for config file to be created
const waitForConfigFile = () => {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    
    const checkFile = () => {
      if (existsSync(CONFIG_FILE)) {
        resolve();
      } else if (Date.now() - startTime > MAX_WAIT_TIME) {
        reject(new Error(`Timeout waiting for ${CONFIG_FILE} to be created`));
      } else {
        setTimeout(checkFile, CHECK_INTERVAL);
      }
    };
    
    checkFile();
  });
};

// Read config file and extract file path
const readConfigFile = () => {
  try {
    const content = readFileSync(CONFIG_FILE, 'utf-8');
    const lines = content.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('file=')) {
        return trimmed.substring(5).trim();
      }
    }
    
    throw new Error('No file parameter found in config');
  } catch (error) {
    throw new Error(`Failed to read config file: ${error.message}`);
  }
};

// Ask user to press enter
const waitForEnter = () => {
  return new Promise((resolve) => {
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    rl.question('\nPress Enter to execute the file...\n', () => {
      rl.close();
      resolve();
    });
  });
};

// Execute the file
const executeFile = (filePath) => {
  try {
    console.log(`\nExecuting: ${filePath}\n`);
    execSync(`npx tsx ${filePath}`, { stdio: 'inherit' });
  } catch (error) {
    console.error(`\nError executing file: ${error.message}`);
    process.exit(1);
  }
};

// Main function
const main = async () => {
  try {
    console.log('Installing dependencies...');
    execSync('npm install', { stdio: 'inherit' });
    console.log('\n✅ Dependencies installed\n');
    
    console.log(`Waiting for ${CONFIG_FILE} to be created...`);
    await waitForConfigFile();
    console.log(`✅ ${CONFIG_FILE} found\n`);
    
    const filePath = readConfigFile();
    console.log(`File to execute: ${filePath}`);
    
    await waitForEnter();
    
    executeFile(filePath);
  } catch (error) {
    console.error(`\nError: ${error.message}`);
    process.exit(1);
  }
};

main();

