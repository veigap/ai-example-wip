/**
 * Sync API key from env/.env file to parent window's localStorage
 * This script runs in the browser context and can access window object
 * 
 * Usage: Import this file in any browser-context script, or run manually
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

export function syncApiKeyToParent() {
  console.log('[sync-api-key] ========================================');
  console.log('[sync-api-key] 🚀 SYNC API KEY TO PARENT');
  console.log('[sync-api-key] ========================================');
  console.log('[sync-api-key] ⏰ Timestamp:', new Date().toISOString());
  console.log('\n🔄 [sync-api-key] Syncing API key from .env to parent window\'s localStorage...');
  
  try {
    // Read API key from .env file
    const envPath = join(process.cwd(), 'env', '.env');
    console.log('[sync-api-key] 📁 Env file path:', envPath);
    console.log('[sync-api-key] 📁 Current working directory:', process.cwd());
    console.log('[sync-api-key] 🔍 Checking if .env file exists...');
    
    if (!existsSync(envPath)) {
      console.log('[sync-api-key] ⚠️  No .env file found. Run "npm run setup:env" first.');
      return;
    }

    console.log('[sync-api-key] ✅ .env file exists, reading...');
    const envContent = readFileSync(envPath, 'utf-8');
    console.log('[sync-api-key] 📖 File content length:', envContent.length);
    console.log('[sync-api-key] 📖 File content preview:', envContent.substring(0, 50) + '...');
    
    const match = envContent.match(/OPENAI_API_KEY=(.+)/);
    console.log('[sync-api-key] 🔍 Regex match result:', match ? 'Found' : 'Not found');
    
    if (!match || !match[1]) {
      console.log('[sync-api-key] ⚠️  No API key found in .env file');
      console.log('[sync-api-key] ⚠️  Match result:', match);
      return;
    }

    const apiKey = match[1].trim();
    console.log(`[sync-api-key] ✅ Found API key in .env file (length: ${apiKey.length} chars)`);
    console.log(`[sync-api-key] ✅ Key preview: ${apiKey.substring(0, 7)}...${apiKey.substring(apiKey.length - 4)}`);
    console.log(`[sync-api-key] ✅ Key starts with: ${apiKey.substring(0, 3)}`);

    // Try to access window object (browser context)
    console.log('[sync-api-key] 🔍 Attempting to access window object...');
    const global = globalThis as any;
    console.log('[sync-api-key] 🔍 typeof globalThis:', typeof globalThis);
    console.log('[sync-api-key] 🔍 typeof window:', typeof window);
    console.log('[sync-api-key] 🔍 global.window:', global.window ? 'Available' : 'Not available');
    
    let windowObj = null;
    
    if (typeof window !== 'undefined') {
      windowObj = window;
      console.log('[sync-api-key] ✅ Found window via typeof window');
    } else if (global.window) {
      windowObj = global.window;
      console.log('[sync-api-key] ✅ Found window via global.window');
    } else if (global.self && global.self.window) {
      windowObj = global.self.window;
      console.log('[sync-api-key] ✅ Found window via global.self.window');
    } else {
      console.log('[sync-api-key] ⚠️  Could not find window object');
    }

    if (windowObj) {
      console.log('[sync-api-key] ✅ Window object found');
      console.log('[sync-api-key] 🔍 windowObj.parent:', windowObj.parent ? 'Available' : 'Not available');
      console.log('[sync-api-key] 🔍 windowObj.parent !== windowObj:', windowObj.parent !== windowObj);
      
      // Try to send to parent window
      if (windowObj.parent && windowObj.parent !== windowObj) {
        try {
          console.log('[sync-api-key] 📤 Sending API key to parent window via postMessage...');
          const message = {
            type: 'SAVE_API_KEY',
            key: 'openai_api_key',
            value: apiKey
          };
          console.log('[sync-api-key] 📨 Message payload:', {
            type: message.type,
            key: message.key,
            valueLength: message.value.length,
            valuePreview: `${message.value.substring(0, 7)}...${message.value.substring(message.value.length - 4)}`
          });
          
          windowObj.parent.postMessage(message, '*');
          console.log('[sync-api-key] ✅ API key sent to parent window');
          console.log('[sync-api-key] ✅ postMessage sent to origin: * (any origin)');
          console.log('[sync-api-key] ℹ️  Parent window (Mintlify) should save it to localStorage');
          console.log('[sync-api-key] ✅ This will persist across page reloads');
        } catch (error: any) {
          console.error('[sync-api-key] ❌ ERROR sending postMessage to parent');
          console.error('[sync-api-key] ❌ Error name:', error?.name);
          console.error('[sync-api-key] ❌ Error message:', error?.message);
          console.error('[sync-api-key] ❌ Error stack:', error?.stack);
        }
      } else {
        console.log('[sync-api-key] ⚠️  No parent window available (running standalone)');
        console.log('[sync-api-key] ⚠️  windowObj.parent:', windowObj.parent);
        console.log('[sync-api-key] ⚠️  windowObj:', windowObj);
        console.log('[sync-api-key] ℹ️  This is normal when not embedded in Mintlify');
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

