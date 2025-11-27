import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'fs';
import { createInterface } from 'readline';
import { join } from 'path';
import OpenAI from 'openai';

const API_KEY_URL = 'https://platform.openai.com/api-keys';

async function prompt(question: string): Promise<string> {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

async function testApiKey(apiKey: string): Promise<boolean> {
  try {
    const client = new OpenAI({
      apiKey: apiKey.trim(),
    });
    await client.models.list();
    return true;
  } catch (error) {
    return false;
  }
}

async function main() {
  // Check if API key already exists and is valid
  const envPath = join(process.cwd(), 'env', '.env');
  if (existsSync(envPath)) {
    try {
      const envContent = readFileSync(envPath, 'utf-8');
      const match = envContent.match(/OPENAI_API_KEY=(.+)/);
      if (match && match[1]) {
        const existingKey = match[1].trim();
        console.log('\n🔍 Checking existing API key...');
        const isValid = await testApiKey(existingKey);
        if (isValid) {
          console.log('✅ API key is already configured and valid!\n');
          return;
        } else {
          console.log('⚠️  Existing API key is invalid. Please provide a new one.\n');
        }
      }
    } catch (error) {
      // If we can't read the file, proceed with setup
    }
  }

  console.log('\n🔑 OpenAI API Key Setup\n');
  console.log(`To get your API key, visit: ${API_KEY_URL}`);
  console.log('1. Sign in to your OpenAI account');
  console.log('2. Navigate to API Keys section');
  console.log('3. Click "Create new secret key"');
  console.log('4. Copy the key (you won\'t be able to see it again)\n');

  const apiKey = await prompt('');

  if (!apiKey || apiKey.trim().length === 0) {
    console.error('❌ Error: API key cannot be empty');
    process.exit(1);
  }

  const trimmedKey = apiKey.trim();

  // Test the API key by making a connection to OpenAI
  console.log('\n🔍 Testing connection to OpenAI...');
  try {
    const client = new OpenAI({
      apiKey: trimmedKey,
    });

    // Make a simple API call to verify the key works
    await client.models.list();
    console.log('✅ Connection successful! API key is valid.\n');
  } catch (error: any) {
    console.error('❌ Connection failed!');
    if (error?.status === 401) {
      console.error('   The API key is invalid or unauthorized.');
    } else if (error?.status === 429) {
      console.error('   Rate limit exceeded. Please try again later.');
    } else if (error?.message) {
      console.error(`   Error: ${error.message}`);
    } else {
      console.error('   Unable to connect to OpenAI. Please check your internet connection and try again.');
    }
    process.exit(1);
  }

  // Check again if another process has already written a valid key
  if (existsSync(envPath)) {
    try {
      const envContent = readFileSync(envPath, 'utf-8');
      const match = envContent.match(/OPENAI_API_KEY=(.+)/);
      if (match && match[1]) {
        const existingKey = match[1].trim();
        // If the key in the file is the same or different but valid, we're good
        if (existingKey === trimmedKey) {
          console.log(`✅ API key already saved to ${envPath}\n`);
          return;
        }
        // If another process wrote a different key, test it
        const isValid = await testApiKey(existingKey);
        if (isValid) {
          console.log('✅ Another process has already configured a valid API key.\n');
          return;
        }
      }
    } catch (error) {
      // If we can't read, continue to write
    }
  }

  // Create env directory if it doesn't exist
  const envDir = join(process.cwd(), 'env');
  try {
    mkdirSync(envDir, { recursive: true });
  } catch (error) {
    // Directory might already exist, that's fine
  }

  // Write to .env file in env directory
  const envContent = `OPENAI_API_KEY=${trimmedKey}\n`;

  try {
    writeFileSync(envPath, envContent, { flag: 'w' });
    console.log(`✅ API key saved to ${envPath}`);
    console.log('⚠️  Make sure to add "env/" to your .gitignore file!\n');
    
    // Also save to localStorage for persistence across page reloads
    console.log('\n🔍 Attempting to save API key to localStorage...');
    try {
      const global = globalThis as any;
      console.log('   Checking for window.localStorage...');
      
      if (global.window?.localStorage) {
        console.log('   ✅ localStorage is accessible');
        try {
          global.window.localStorage.setItem('openai_api_key', trimmedKey);
          const verify = global.window.localStorage.getItem('openai_api_key');
          if (verify === trimmedKey) {
            console.log('   ✅ API key successfully saved to localStorage');
            console.log('   ✅ Verified: Key can be read back from localStorage');
          } else {
            console.log('   ⚠️  Warning: Key saved but verification failed');
          }
        } catch (setError: any) {
          console.log('   ❌ Failed to set localStorage:', setError.message);
        }
      } else {
        console.log('   ℹ️  localStorage not directly accessible, trying parent window...');
        // Try to access localStorage via postMessage to parent window
        if (global.window?.parent && global.window !== global.window.parent) {
          console.log('   📤 Sending API key to parent window via postMessage...');
          global.window.parent.postMessage({
            type: 'SAVE_API_KEY',
            key: 'openai_api_key',
            value: trimmedKey
          }, '*');
          console.log('   ✅ API key sent to parent window for localStorage storage');
          console.log('   ℹ️  Parent window should save it to localStorage');
        } else {
          console.log('   ⚠️  No parent window available for postMessage');
        }
      }
    } catch (localStorageError: any) {
      // localStorage might not be accessible (cross-origin), that's okay
      console.log('   ❌ Error accessing localStorage:', localStorageError.message);
      console.log('   ℹ️  Note: Could not save to localStorage (cross-origin restriction)');
      console.log('   ℹ️  The API key is still saved to env/.env file and will work for this session.\n');
    }
  } catch (error) {
    // If write fails (e.g., another process is writing), check if a valid key exists
    if (existsSync(envPath)) {
      try {
        const envContent = readFileSync(envPath, 'utf-8');
        const match = envContent.match(/OPENAI_API_KEY=(.+)/);
        if (match && match[1]) {
          const existingKey = match[1].trim();
          const isValid = await testApiKey(existingKey);
          if (isValid) {
            console.log('✅ Another process has already configured a valid API key.\n');
            return;
          }
        }
      } catch (readError) {
        // If we can't read, log the write error
        console.error('⚠️  Warning: Could not write to file, but continuing...');
        console.error('   Another process may have updated the file.\n');
      }
    } else {
      console.error('⚠️  Warning: Could not write to file, but continuing...\n');
    }
  }
}

main().catch((error) => {
  console.error('❌ Error:', error);
  process.exit(1);
});

