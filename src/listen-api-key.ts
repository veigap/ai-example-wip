import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

/**
 * Listen for API key from parent window (when embedded in Mintlify)
 * This allows the API key to persist across page reloads using localStorage
 * 
 * In StackBlitz WebContainers, we can access window and use file system operations
 */
export function setupApiKeyListener() {
  console.log('[listen-api-key] 🔑 Setting up API key listener from parent window...');
  // Check if we're in a browser-like environment (StackBlitz WebContainer)
  if (typeof globalThis !== 'undefined' && 'window' in globalThis) {
    const win = globalThis as any;
    console.log('[listen-api-key] ✅ globalThis.window is available');
    
    if (win.window && win.window.addEventListener) {
      console.log('[listen-api-key] ✅ window.addEventListener is available');

      win.window.addEventListener('message', async (event: MessageEvent) => {
        console.log(`[listen-api-key] 📨 Received message from origin: ${event.origin}`);
        // Accept messages from any origin when embedded (you can restrict this in production)
        if (event.data?.type === 'SET_ENV_VAR' && event.data.key === 'OPENAI_API_KEY') {
          const apiKey = event.data.value;
          
          if (!apiKey || apiKey.trim().length === 0) {
            console.warn('[listen-api-key] ⚠️  Received empty API key');
            return;
          }

          console.log(`[listen-api-key] 📥 Received API key from parent window (length: ${apiKey.length} chars)`);
          console.log(`[listen-api-key] 📥 Key preview: ${apiKey.substring(0, 7)}...${apiKey.substring(apiKey.length - 4)}`);

          try {
            // Write to env/.env file (same location as setup-env.ts)
            const envDir = join(process.cwd(), 'env');
            const envPath = join(envDir, '.env');

            // Create env directory if it doesn't exist
            if (!existsSync(envDir)) {
              mkdirSync(envDir, { recursive: true });
            }

            // Write the API key to .env file
            const envContent = `OPENAI_API_KEY=${apiKey.trim()}\n`;
            writeFileSync(envPath, envContent, { flag: 'w' });

            console.log('[listen-api-key] ✅ API key saved to env/.env file');
            console.log('[listen-api-key] 💡 Reload your code (Ctrl+C and run again) to use the new API key');
          } catch (error) {
            console.error('❌ Failed to save API key:', error);
          }
        }
      });

      // Also try to read from localStorage if available
      console.log('[listen-api-key] 🔍 Checking localStorage for existing API key...');
      try {
        if (win.window.localStorage) {
          console.log('[listen-api-key] ✅ localStorage is accessible');
          const storedKey = win.window.localStorage.getItem('openai_api_key');
          if (storedKey) {
            console.log(`[listen-api-key] 📥 Found API key in localStorage (length: ${storedKey.length} chars)`);
            console.log(`[listen-api-key] 📥 Key preview: ${storedKey.substring(0, 7)}...${storedKey.substring(storedKey.length - 4)}`);
            
            const envDir = join(process.cwd(), 'env');
            const envPath = join(envDir, '.env');

            if (!existsSync(envDir)) {
              mkdirSync(envDir, { recursive: true });
              console.log('[listen-api-key] ✅ Created env directory');
            }

            const envContent = `OPENAI_API_KEY=${storedKey.trim()}\n`;
            writeFileSync(envPath, envContent, { flag: 'w' });
            console.log('[listen-api-key] ✅ API key from localStorage saved to env/.env file');
          } else {
            console.log('[listen-api-key] ℹ️  No API key found in localStorage');
          }
        } else {
          console.log('[listen-api-key] ⚠️  localStorage is not accessible');
        }
      } catch (error: any) {
        // Cross-origin restrictions may prevent localStorage access
        console.log(`[listen-api-key] ❌ Cannot access localStorage: ${error.message}`);
        console.log('[listen-api-key] ℹ️  Will rely on postMessage from parent window');
      }
    } else {
      console.log('[listen-api-key] ⚠️  window.addEventListener is not available');
    }
  } else {
    console.log('[listen-api-key] ⚠️  Not in browser environment, API key listener not available');
  }
  console.log('[listen-api-key] ✅ Listener setup complete');
}

// Auto-run when imported
setupApiKeyListener();

