/**
 * Sync API key from env/.env file to parent window's localStorage
 * This script runs in the browser context and can access window object
 * 
 * Usage: Import this file in any browser-context script, or run manually
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

export function syncApiKeyToParent() {
  console.log('\n🔄 [sync-api-key] Syncing API key from .env to parent window\'s localStorage...');
  
  try {
    // Read API key from .env file
    const envPath = join(process.cwd(), 'env', '.env');
    
    if (!existsSync(envPath)) {
      console.log('   ℹ️  No .env file found. Run "npm run setup:env" first.');
      return;
    }

    const envContent = readFileSync(envPath, 'utf-8');
    const match = envContent.match(/OPENAI_API_KEY=(.+)/);
    
    if (!match || !match[1]) {
      console.log('   ℹ️  No API key found in .env file');
      return;
    }

    const apiKey = match[1].trim();
    console.log(`   ✅ Found API key in .env file (length: ${apiKey.length} chars)`);
    console.log(`   ✅ Key preview: ${apiKey.substring(0, 7)}...${apiKey.substring(apiKey.length - 4)}`);

    // Try to access window object (browser context)
    const global = globalThis as any;
    let windowObj = null;
    
    if (typeof window !== 'undefined') {
      windowObj = window;
    } else if (global.window) {
      windowObj = global.window;
    } else if (global.self && global.self.window) {
      windowObj = global.self.window;
    }

    if (windowObj) {
      // Try to send to parent window
      if (windowObj.parent && windowObj.parent !== windowObj) {
        try {
          console.log('   📤 Sending API key to parent window via postMessage...');
          windowObj.parent.postMessage({
            type: 'SAVE_API_KEY',
            key: 'openai_api_key',
            value: apiKey
          }, '*');
          console.log('   ✅ API key sent to parent window');
          console.log('   ℹ️  Parent window (Mintlify) should save it to localStorage');
          console.log('   ✅ This will persist across page reloads');
        } catch (error: any) {
          console.log(`   ❌ Failed to send to parent: ${error.message}`);
        }
      } else {
        console.log('   ℹ️  No parent window available (running standalone)');
        console.log('   ℹ️  This is normal when not embedded in Mintlify');
      }

      // Also try to save to local localStorage if accessible
      if (windowObj.localStorage) {
        try {
          windowObj.localStorage.setItem('openai_api_key', apiKey);
          const verify = windowObj.localStorage.getItem('openai_api_key');
          if (verify === apiKey) {
            console.log('   ✅ Also saved to local localStorage');
          }
        } catch (error: any) {
          console.log(`   ⚠️  Could not save to local localStorage: ${error.message}`);
        }
      }
    } else {
      console.log('   ⚠️  Cannot access window object');
      console.log('   ℹ️  This script needs to run in browser context');
      console.log('   ℹ️  Try importing it in a file that runs in the browser');
    }
  } catch (error: any) {
    console.log(`   ❌ Error: ${error.message}`);
  }
  
  console.log('✅ [sync-api-key] Sync complete\n');
}

// Auto-run when imported (if in browser context)
if (typeof window !== 'undefined' || (globalThis as any).window) {
  syncApiKeyToParent();
}

