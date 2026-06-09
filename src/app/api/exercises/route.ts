import { prisma } from '@/lib/prisma';
import { NextRequest } from 'next/server';
import { isProtocolLocked } from '@/lib/lock';

export async function GET() {
  try {
    const exercises = await prisma.exercise.findMany({
      where: { active: true },
      orderBy: [
        { category: 'asc' },
        { sortOrder: 'asc' },
      ],
    });
    return Response.json(exercises);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    if (await isProtocolLocked()) {
      return Response.json({ error: 'Protocol is locked. Cannot modify exercises.' }, { status: 403 });
    }

    const body = await request.json();
    const { name, category, active } = body;

    if (!name || !category) {
      return Response.json({ error: 'Name and category are required' }, { status: 400 });
    }

    if (category !== 'LOWER' && category !== 'UPPER') {
      return Response.json({ error: 'Category must be LOWER or UPPER' }, { status: 400 });
    }

    let sortOrder = body.sortOrder;
    if (sortOrder === undefined) {
      const lastExercise = await prisma.exercise.findFirst({
        where: { category },
        orderBy: { sortOrder: 'desc' },
      });
      sortOrder = lastExercise ? lastExercise.sortOrder + 1 : 1;
    }

    const exercise = await prisma.exercise.create({
      data: {
        name,
        category,
        sortOrder: parseInt(sortOrder, 10) || 1,
        active: active !== undefined ? !!active : true,
      },
    });

    return Response.json(exercise, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return Response.json({ error: message }, { status: 500 });
  }
}
