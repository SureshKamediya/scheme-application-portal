import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Check database connection
    // You can add database health check here if needed
    return NextResponse.json({ status: 'ok', timestamp: new Date().toISOString() }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ status: 'error', message: 'Health check failed' }, { status: 503 });
  }
}
