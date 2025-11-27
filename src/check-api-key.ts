import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';

/**
 * Check for API key from parent window (localStorage) and write to .env
 * This runs on terminal startup before your code executes
 * 
 * In StackBlitz WebContainers, we can access browser APIs from Node.js
 */
async function checkAndSetApiKey() {
  try {
    // In StackBlitz WebContainers, we can access globalThis which has browser APIs
    const global = globalThis as any;
    
    // Try to get API key from localStorage (if accessible)
    let apiKey: string | null = null;
    
    if (global.window?.localStorage) {
      try {
        apiKey = global.window.localStorage.getItem('openai_api_key');
        if (apiKey) {
          console.log('📥 Found API key in localStorage');
        }
      } catch (e) {
        // Cross-origin restrictions
      }
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
      const envDir = join(process.cwd(), 'env');
      if (!existsSync(envDir)) {
        mkdirSync(envDir, { recursive: true });
      }

      const envContent = `OPENAI_API_KEY=${apiKey.trim()}\n`;
      writeFileSync(envPath, envContent, { flag: 'w' });
      console.log('✅ API key from localStorage saved to env/.env');
    } else {
      // No key found, check if .env exists
      if (!existsSync(envPath)) {
        console.log('ℹ️  No API key found. Run "npm run setup:env" to configure.');
      }
    }
  } catch (error) {
    // Silently fail - this is just a convenience feature
    // User can still use setup-env.ts manually
  }
}

// Run on import
checkAndSetApiKey();

