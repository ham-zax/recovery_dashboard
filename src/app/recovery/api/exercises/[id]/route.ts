import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const exerciseId = parseInt(id, 10);
    if (isNaN(exerciseId)) {
      return NextResponse.json({ error: 'Invalid exercise ID' }, { status: 400 });
    }

    const body = await request.json();
    const { name, category, sortOrder, active } = body;

    const data: {
      name?: string;
      category?: 'LOWER' | 'UPPER';
      sortOrder?: number;
      active?: boolean;
    } = {};

    if (name !== undefined) data.name = name;
    if (category !== undefined) {
      if (category !== 'LOWER' && category !== 'UPPER') {
        return NextResponse.json({ error: 'Category must be LOWER or UPPER' }, { status: 400 });
      }
      data.category = category;
    }
    if (sortOrder !== undefined) data.sortOrder = parseInt(sortOrder, 10);
    if (active !== undefined) data.active = !!active;

    const updated = await prisma.exercise.update({
      where: { id: exerciseId },
      data,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating exercise:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const exerciseId = parseInt(id, 10);
    if (isNaN(exerciseId)) {
      return NextResponse.json({ error: 'Invalid exercise ID' }, { status: 400 });
    }

    // Soft delete by setting active to false
    const deactivated = await prisma.exercise.update({
      where: { id: exerciseId },
      data: { active: false },
    });

    return NextResponse.json(deactivated);
  } catch (error) {
    console.error('Error deactivating exercise:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
