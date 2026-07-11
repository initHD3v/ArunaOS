import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json([
    'tools',
    'games',
    'utilities',
    'productivity',
    'media',
    'development',
  ]);
}
