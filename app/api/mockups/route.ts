import { NextRequest, NextResponse } from 'next/server';
import { getAllMockups, getMockupById, deleteMockup } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (id) {
      const mockup = getMockupById(id);
      if (!mockup) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      return NextResponse.json(mockup);
    }

    const mockups = getAllMockups();
    return NextResponse.json(mockups);
  } catch (error) {
    console.error('GET /api/mockups error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    deleteMockup(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/mockups error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
