import { NextResponse } from 'next/server';
import { RegistryStore } from '@arunaos/registry-api';

const store = new RegistryStore();

export async function GET() {
  return NextResponse.json(await store.getCategories());
}
