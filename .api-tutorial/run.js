import { readFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import { createInterface } from 'readline';

const CONFIG_FILE = '.api-tutorial/script.conf';
const MAX_WAIT_TIME = 60000; // 60 seconds
const CHECK_INTERVAL = 500; // Check every 500ms
const SPINNER_INTERVAL = 100; // Update spinner every 100ms

// Spinner animation
const spinnerFrames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
let spinnerIndex = 0;
let spinnerInterval = null;

const startSpinner = () => {
  process.stdout.write('\r' + spinnerFrames[spinnerIndex] + ' Waiting for config file...');
  spinnerInterval = setInterval(() => {
    spinnerIndex = (spinnerIndex + 1) % spinnerFrames.length;
    process.stdout.write('\r' + spinnerFrames[spinnerIndex] + ' Waiting for config file...');
  }, SPINNER_INTERVAL);
};

const stopSpinner = () => {
  if (spinnerInterval) {
    clearInterval(spinnerInterval);
    spinnerInterval = null;
  }
  process.stdout.write('\r' + ' '.repeat(50) + '\r'); // Clear spinner line
};

// Wait for config file to be created
const waitForConfigFile = () => {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    startSpinner();
    
    const checkFile = () => {
      if (existsSync(CONFIG_FILE)) {
        stopSpinner();
        resolve();
      } else if (Date.now() - startTime > MAX_WAIT_TIME) {
        stopSpinner();
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

// Ask user to press enter or ESC
const waitForEnter = (filePath) => {
  return new Promise((resolve, reject) => {
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    // Enable raw mode to capture ESC key
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');
    
    const handleKeypress = (key) => {
      // ESC key (27) or 'q' key
      if (key === '\u001b' || key === '\u0003' || key === 'q' || key === 'Q') {
        process.stdin.setRawMode(false);
        process.stdin.pause();
        rl.close();
        console.log('\nReturning to terminal...');
        reject(new Error('User cancelled'));
        return;
      }
      
      // Enter key
      if (key === '\r' || key === '\n') {
        process.stdin.setRawMode(false);
        process.stdin.pause();
        rl.close();
        resolve();
        return;
      }
    };
    
    process.stdin.on('data', handleKeypress);
    
    process.stdout.write(`\nPress enter to execute ${filePath} (or ESC to return to terminal):\n`);
  });
};

// Execute the file
const executeFile = (filePath) => {
  try {
    execSync(`npx tsx ${filePath}`, { stdio: 'inherit' });
  } catch (error) {
    console.error(`\nError executing file: ${error.message}`);
    process.exit(1);
  }
};

// Main function
const main = async () => {
  try {
    execSync('npm install', { stdio: 'inherit' });
    
    await waitForConfigFile();
    
    const filePath = readConfigFile();
    
    try {
      await waitForEnter(filePath);
      executeFile(filePath);
    } catch (error) {
      // User pressed ESC, just exit gracefully
      if (error.message === 'User cancelled') {
        process.exit(0);
      }
      throw error;
    }
  } catch (error) {
    stopSpinner();
    console.error(`\nError: ${error.message}`);
    process.exit(1);
  }
};

main();

