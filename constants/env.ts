// Environment variables
export const DEFENDER_WEBHOOK_URL: string = process.env.EXPO_PUBLIC_DEFENDER_WEBHOOK_URL || '';

if (!DEFENDER_WEBHOOK_URL) {
  console.error('EXPO_PUBLIC_DEFENDER_WEBHOOK_URL is not set in environment variables');
}

export const BUILDER_ADDRESS: string = process.env.EXPO_PUBLIC_BUILDER_ADDRESS || '';