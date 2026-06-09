import { NextResponse } from 'next/server';
import { cloneProtocol } from '@/lib/protocol';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const protocolId = parseInt(id, 10);
    // Call cloneProtocol which respects the protocol lock and ensures correct versioning semantics.
    const result = await cloneProtocol(protocolId, `Cloned from previous version`, 'Rollback action triggered from UI.');

    return NextResponse.json({ success: true, newProtocol: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
