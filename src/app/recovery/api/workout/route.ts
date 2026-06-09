import { prisma } from '@/lib/prisma';
import { NextRequest } from 'next/server';
import { startOfDay, subDays } from 'date-fns';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const daysStr = searchParams.get('days');
    
    let whereClause = {};
    if (daysStr) {
      const days = parseInt(daysStr, 10);
      if (!isNaN(days)) {
        whereClause = {
          date: { gte: startOfDay(subDays(new Date(), days)) },
        };
      }
    }

    const sessions = await prisma.workoutSession.findMany({
      where: whereClause,
      include: {
        entries: {
          include: {
            exercise: true,
          },
          orderBy: {
            setNumber: 'asc',
          },
        },
      },
      orderBy: {
        date: 'desc',
      },
    });

    return Response.json(sessions);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { date, type, notes, exercises } = body;

    if (!date || !type || !exercises || !Array.isArray(exercises)) {
      return Response.json(
        { error: 'Date, type, and exercises array are required' },
        { status: 400 }
      );
    }

    if (type !== 'LOWER' && type !== 'UPPER') {
      return Response.json(
        { error: 'Type must be LOWER or UPPER' },
        { status: 400 }
      );
    }

    const sessionDate = new Date(date);
    if (isNaN(sessionDate.getTime())) {
      return Response.json({ error: 'Invalid date format' }, { status: 400 });
    }

    // Execute session and entries creation within a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create session
      const session = await tx.workoutSession.create({
        data: {
          date: sessionDate,
          type,
          notes: notes || null,
        },
      });

      // Prepare exercise entries
      const entriesToCreate = [];
      for (const ex of exercises) {
        const exerciseId = parseInt(ex.exerciseId, 10);
        if (isNaN(exerciseId)) {
          throw new Error('Invalid exerciseId found in request');
        }

        // Verify the exercise exists and is active
        const exerciseExists = await tx.exercise.findFirst({
          where: { id: exerciseId, active: true },
        });

        if (!exerciseExists) {
          throw new Error(`Exercise with ID ${exerciseId} not found or is inactive`);
        }

        if (!Array.isArray(ex.sets) || ex.sets.length === 0) {
          continue;
        }

        for (let idx = 0; idx < ex.sets.length; idx++) {
          const set = ex.sets[idx];
          
          if (set.reps === undefined || set.reps === null || set.reps === '') {
            throw new Error(`Reps must be specified for exercise ID ${exerciseId} set ${idx + 1}`);
          }
          
          const reps = parseInt(set.reps, 10);
          if (isNaN(reps) || reps < 0) {
            throw new Error(`Invalid reps value for exercise ID ${exerciseId} set ${idx + 1}`);
          }

          const weight = (set.weight !== undefined && set.weight !== null && set.weight !== '') 
            ? parseFloat(set.weight) 
            : null;
          if (weight !== null && (isNaN(weight) || weight < 0)) {
            throw new Error(`Invalid weight value for exercise ID ${exerciseId} set ${idx + 1}`);
          }

          const rpe = (set.rpe !== undefined && set.rpe !== null && set.rpe !== '') 
            ? parseInt(set.rpe, 10) 
            : null;
          if (rpe !== null && (isNaN(rpe) || rpe < 1 || rpe > 10)) {
            throw new Error(`RPE must be between 1 and 10 for exercise ID ${exerciseId} set ${idx + 1}`);
          }

          entriesToCreate.push({
            sessionId: session.id,
            exerciseId,
            setNumber: idx + 1,
            weight,
            reps,
            rpe,
          });
        }
      }

      if (entriesToCreate.length > 0) {
        await tx.exerciseEntry.createMany({
          data: entriesToCreate,
        });
      }

      // Return the complete session with entries
      return await tx.workoutSession.findUnique({
        where: { id: session.id },
        include: {
          entries: {
            include: {
              exercise: true,
            },
            orderBy: {
              setNumber: 'asc',
            },
          },
        },
      });
    });

    return Response.json(result, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return Response.json({ error: message }, { status: 400 }); // Bad request since schema/transaction constraints failed
  }
}
