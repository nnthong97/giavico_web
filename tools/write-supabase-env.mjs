import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const outputFile = resolve('apps/dashboard/src/app/core/supabase/supabase.generated.ts');

const readDotEnv = (filePath) => {
  if (!existsSync(filePath)) {
    return {};
  }

  return Object.fromEntries(
    readFileSync(filePath, 'utf8')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#') && line.includes('='))
      .map((line) => {
        const separator = line.indexOf('=');
        const key = line.slice(0, separator).trim();
        const value = line.slice(separator + 1).trim().replace(/^['"]|['"]$/g, '');
        return [key, value];
      })
  );
};

const localEnv = {
  ...readDotEnv(resolve('.env')),
  ...readDotEnv(resolve('.env.local')),
};

const readEnv = (name) => process.env[name] ?? localEnv[name] ?? '';

const supabaseUrl = readEnv('SUPABASE_URL') || readEnv('NEXT_PUBLIC_SUPABASE_URL');
const supabaseAnonKey = readEnv('SUPABASE_ANON_KEY') || readEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');

const serialize = (value) => JSON.stringify(value);

mkdirSync(dirname(outputFile), { recursive: true });
writeFileSync(
  outputFile,
  `export const SUPABASE_URL = ${serialize(supabaseUrl)};\n` +
    `export const SUPABASE_ANON_KEY = ${serialize(supabaseAnonKey)};\n`
);
