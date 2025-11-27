import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';

/**
 * Check for API key from parent window (localStorage) and write to .env
 * This runs on terminal startup before your code executes
 * 
 * In StackBlitz WebContainers, we can access browser APIs from Node.js
 */
async function checkAndSetApiKey() {
  console.log('\n[check-api-key] ========================================');
  console.log('[check-api-key] 🚀 CHECKING FOR API KEY');
  console.log('[check-api-key] ========================================');
  console.log('[check-api-key] ⏰ Timestamp:', new Date().toISOString());
  console.log('\n🔍 [check-api-key] Checking for API key in localStorage...');
  try {
    // In StackBlitz WebContainers, we can access globalThis which has browser APIs
    const global = globalThis as any;
    console.log('[check-api-key] 🔍 typeof globalThis:', typeof globalThis);
    console.log('[check-api-key] 🔍 typeof window:', typeof window);
    
    // Try to get API key from localStorage (if accessible)
    let apiKey: string | null = null;
    
    console.log('[check-api-key] 🔍 Checking if window.localStorage is available...');
    
    // Try different ways to access window object in StackBlitz WebContainers
    let windowObj = null;
    console.log('[check-api-key] 🔍 Attempting to access window object...');
    if (typeof window !== 'undefined') {
      windowObj = window;
      console.log('[check-api-key] ✅ Found window via typeof window');
    } else if (global.window) {
      windowObj = global.window;
      console.log('[check-api-key] ✅ Found window via global.window');
    } else if (global.self && global.self.window) {
      windowObj = global.self.window;
      console.log('[check-api-key] ✅ Found window via global.self.window');
    } else {
      console.log('[check-api-key] ⚠️  Could not find window object');
    }
    
    console.log('[check-api-key] 🔍 windowObj:', windowObj ? 'Available' : 'Not available');
    
    if (windowObj?.localStorage) {
      console.log('   ✅ localStorage is accessible');
      try {
        apiKey = windowObj.localStorage.getItem('openai_api_key');
        if (apiKey) {
          console.log(`   ✅ Found API key in localStorage (length: ${apiKey.length} chars)`);
          console.log(`   ✅ Key preview: ${apiKey.substring(0, 7)}...${apiKey.substring(apiKey.length - 4)}`);
        } else {
          console.log('   ℹ️  No API key found in localStorage');
          console.log('   ℹ️  Will wait for parent window to send it via postMessage');
        }
      } catch (e: any) {
        console.log(`   ❌ Error reading from localStorage: ${e.message}`);
        console.log('   ℹ️  Cross-origin restrictions may prevent access');
        console.log('   ℹ️  Will rely on postMessage from parent window');
      }
    } else {
      console.log('   ⚠️  localStorage not accessible (window.localStorage is undefined)');
      console.log('   ℹ️  This is normal in StackBlitz WebContainers');
      console.log('   ℹ️  Will rely on postMessage from parent window (Mintlify)');
      console.log('   ℹ️  The parent window will send the key when the iframe loads');
    }

    // Also check if .env file already exists and has a valid key
    const envPath = join(process.cwd(), 'env', '.env');
    if (existsSync(envPath)) {
      try {
        const envContent = readFileSync(envPath, 'utf-8');
        const match = envContent.match(/OPENAI_API_KEY=(.+)/);
        if (match && match[1] && match[1].trim()) {
          const existingKey = match[1].trim();
          // If we have a key from localStorage and it's different, update it
          if (apiKey && apiKey !== existingKey) {
            console.log('🔄 Updating API key from localStorage...');
          } else if (existingKey) {
            console.log('✅ API key already configured in env/.env');
            return; // Already have a key, no need to update
          }
        }
      } catch (e) {
        // Can't read file, continue
      }
    }

    // If we have an API key from localStorage, write it to .env
    if (apiKey && apiKey.trim()) {
      console.log('   📝 Writing API key from localStorage to env/.env file...');
      const envDir = join(process.cwd(), 'env');
      if (!existsSync(envDir)) {
        mkdirSync(envDir, { recursive: true });
        console.log('   ✅ Created env directory');
      }

      const envContent = `OPENAI_API_KEY=${apiKey.trim()}\n`;
      writeFileSync(envPath, envContent, { flag: 'w' });
      console.log('   ✅ API key from localStorage saved to env/.env');
    } else {
      // No key found, check if .env exists
      if (!existsSync(envPath)) {
        console.log('   ℹ️  No API key found in localStorage or .env file');
        console.log('   ℹ️  Run "npm run setup:env" to configure.');
      } else {
        console.log('   ℹ️  Using existing API key from env/.env file');
      }
    }
    console.log('✅ [check-api-key] Finished checking for API key\n');
  } catch (error: any) {
    console.log('   ❌ [check-api-key] Error:', error.message);
    console.log('   ℹ️  This is just a convenience feature - you can still use setup-env.ts manually');
  }
}

// Run on import
checkAndSetApiKey();

