/**
 * Create Test User Script
 *
 * This script creates a test user in Supabase for development/testing purposes.
 * Run with: npx tsx scripts/create-test-user.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as readline from 'readline';

// Load environment variables
const SUPABASE_URL = process.env['SUPABASE_URL'] || 'https://eryhwfkqbbuftepjvgwq.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env['SUPABASE_SERVICE_ROLE_KEY'];

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Error: SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  console.error('Get the service role key from: https://supabase.com/dashboard/project/eryhwfkqbbuftepjvgwq/settings/api');
  process.exit(1);
}

// Create Supabase client with service role key (bypasses RLS)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

interface UserInput {
  email: string;
  password: string;
  fullName: string;
  role: 'driver' | 'manager' | 'superuser';
}

async function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

async function createUser(input: UserInput) {
  console.log('\nCreating user...');

  // Create auth user
  const { data, error } = await supabase.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true, // Auto-confirm email for test users
    user_metadata: {
      full_name: input.fullName,
      role: input.role,
    }
  });

  if (error) {
    throw error;
  }

  if (!data.user) {
    throw new Error('User creation failed - no user data returned');
  }

  console.log('✓ User created successfully!');
  console.log('  User ID:', data.user.id);
  console.log('  Email:', data.user.email);
  console.log('  Role:', input.role);

  return data.user;
}

async function main() {
  console.log('=== RGR Fleet Manager - Create Test User ===\n');

  // Get user input
  const email = await prompt('Email: ');
  const password = await prompt('Password: ');
  const fullName = await prompt('Full Name: ');
  const roleInput = await prompt('Role (driver/manager/superuser) [driver]: ');

  const role = (roleInput.trim() || 'driver') as UserInput['role'];

  if (!['driver', 'manager', 'superuser'].includes(role)) {
    console.error('Invalid role. Must be: driver, manager, or superuser');
    process.exit(1);
  }

  // Validate inputs
  if (!email || !password || !fullName) {
    console.error('Error: Email, password, and full name are required');
    process.exit(1);
  }

  if (password.length < 8) {
    console.error('Error: Password must be at least 8 characters');
    process.exit(1);
  }

  try {
    await createUser({ email, password, fullName, role });

    console.log('\n✓ Test user created successfully!');
    console.log('\nYou can now login with:');
    console.log(`  Email: ${email}`);
    console.log(`  Password: ${password}`);
    console.log(`  Role: ${role}`);
  } catch (error) {
    console.error('\n✗ Failed to create user:');
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
