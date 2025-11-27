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
    // In StackBlitz WebContainers, we need to use postMessage to communicate with parent window
    console.log('\n🔍 Attempting to save API key to parent window\'s localStorage...');
    try {
      const global = globalThis as any;
      
      // In StackBlitz WebContainers, we're in a worker-like environment
      // We need to access the browser's window object differently
      let windowObj = null;
      
      // Try different ways to access the window object
      if (typeof window !== 'undefined') {
        windowObj = window;
      } else if (global.window) {
        windowObj = global.window;
      } else if (global.self && global.self.window) {
        windowObj = global.self.window;
      }
      
      if (windowObj) {
        // Try direct localStorage access first
        if (windowObj.localStorage) {
          try {
            windowObj.localStorage.setItem('openai_api_key', trimmedKey);
            const verify = windowObj.localStorage.getItem('openai_api_key');
            if (verify === trimmedKey) {
              console.log('   ✅ API key successfully saved to localStorage');
              console.log('   ✅ Verified: Key can be read back from localStorage');
            } else {
              console.log('   ⚠️  Warning: Key saved but verification failed, trying postMessage...');
              // Fall through to postMessage
            }
          } catch (setError: any) {
            console.log(`   ⚠️  Direct localStorage access failed: ${setError.message}`);
            console.log('   📤 Falling back to postMessage...');
            // Fall through to postMessage
          }
        }
        
        // Try postMessage to parent window (for embedded StackBlitz)
        if (windowObj.parent && windowObj.parent !== windowObj) {
          try {
            console.log('   📤 Sending API key to parent window via postMessage...');
            windowObj.parent.postMessage({
              type: 'SAVE_API_KEY',
              key: 'openai_api_key',
              value: trimmedKey
            }, '*');
            console.log('   ✅ API key sent to parent window for localStorage storage');
            console.log('   ℹ️  Parent window (Mintlify) should save it to localStorage');
            console.log('   ℹ️  This will persist across page reloads');
          } catch (postError: any) {
            console.log(`   ⚠️  postMessage failed: ${postError.message}`);
          }
        } else {
          console.log('   ℹ️  No parent window available (running standalone, not embedded)');
          console.log('   ℹ️  API key is saved to env/.env file and will work for this session');
        }
      } else {
        console.log('   ⚠️  Cannot access window object in this environment');
        console.log('   ℹ️  This is normal in StackBlitz WebContainers');
        console.log('   ℹ️  The API key is saved to env/.env file and will work for this session');
        console.log('   ℹ️  For persistence across reloads, the parent window will send the key back via postMessage');
      }
    } catch (localStorageError: any) {
      // localStorage might not be accessible (cross-origin), that's okay
      console.log(`   ⚠️  Error: ${localStorageError.message}`);
      console.log('   ℹ️  Note: Could not save to localStorage (this is normal in StackBlitz)');
      console.log('   ℹ️  The API key is still saved to env/.env file and will work for this session.');
      console.log('   ℹ️  On page reload, the parent window will send the key back via postMessage.\n');
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

