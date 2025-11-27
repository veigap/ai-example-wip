import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'fs';
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
        
        // Handle ping requests from parent (parent checking if we need the key)
        if (event.data?.type === 'PING' && event.data.requestKey) {
          console.log('[listen-api-key] 📥 Received PING from parent');
          
          // Check if we have a key in .env file that parent might not know about
          const envPath = join(process.cwd(), 'env', '.env');
          if (existsSync(envPath)) {
            try {
              const envContent = readFileSync(envPath, 'utf-8');
              const match = envContent.match(/OPENAI_API_KEY=(.+)/);
              if (match && match[1]) {
                const apiKey = match[1].trim();
                console.log('[listen-api-key] 📤 Sending API key from .env to parent...');
                if (win.window.parent && win.window.parent !== win.window) {
                  win.window.parent.postMessage({
                    type: 'SAVE_API_KEY',
                    key: 'openai_api_key',
                    value: apiKey
                  }, '*');
                  console.log('[listen-api-key] ✅ Sent API key to parent for localStorage storage');
                }
                return; // Don't request, we're sending it
              }
            } catch (error) {
              // Continue to request
            }
          }
          
          // Request the API key from parent if we don't have one
          console.log('[listen-api-key] 📤 Requesting API key from parent...');
          if (win.window.parent && win.window.parent !== win.window) {
            try {
              win.window.parent.postMessage({
                type: 'REQUEST_API_KEY'
              }, '*');
              console.log('[listen-api-key] 📤 Sent REQUEST_API_KEY to parent');
            } catch (error: any) {
              console.log(`[listen-api-key] ⚠️  Failed to request key: ${error.message}`);
            }
          }
          return;
        }
        
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
            
            // Also send confirmation back to parent so it knows we received it
            // This helps ensure parent has it in localStorage
            if (win.window.parent && win.window.parent !== win.window) {
              try {
                win.window.parent.postMessage({
                  type: 'SAVE_API_KEY',
                  key: 'openai_api_key',
                  value: apiKey
                }, '*');
                console.log('[listen-api-key] 📤 Confirmed API key receipt to parent window');
              } catch (error) {
                // Silently fail
              }
            }
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

// Also sync API key from .env to parent when listener is set up
// This ensures the parent window has the key even if it wasn't sent via postMessage
// Delay sync to ensure window is ready and avoid circular imports
setTimeout(async () => {
  try {
    const { syncApiKeyToParent } = await import('./sync-api-key-to-parent');
    syncApiKeyToParent();
  } catch (error) {
    // Silently fail - sync is optional
  }
}, 2000);

