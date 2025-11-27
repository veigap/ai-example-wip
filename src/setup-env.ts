import { writeFileSync, mkdirSync } from 'fs';
import { createInterface } from 'readline';
import { join } from 'path';

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

async function main() {
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

  // Create env directory if it doesn't exist
  const envDir = join(process.cwd(), 'env');
  try {
    mkdirSync(envDir, { recursive: true });
  } catch (error) {
    // Directory might already exist, that's fine
  }

  // Write to .env file in env directory
  const envPath = join(envDir, '.env');
  const envContent = `OPENAI_API_KEY=${apiKey.trim()}\n`;

  try {
    writeFileSync(envPath, envContent, { flag: 'w' });
    console.log(`\n✅ API key saved to ${envPath}`);
    console.log('⚠️  Make sure to add "env/" to your .gitignore file!\n');
  } catch (error) {
    console.error('❌ Error writing to file:', error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('❌ Error:', error);
  process.exit(1);
});

