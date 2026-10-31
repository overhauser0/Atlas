import { Context } from 'hono';
import { ZodError } from 'zod';
import * as personService from '../services/person.service';

const handleError = (error: unknown, c: Context) => {
  if (error instanceof personService.PersonServiceError) {
    return c.json(
      {
        success: false,
        code: error.code,
        message: error.message,
      },
      error.status,
    );
  }
  if (error instanceof ZodError || error instanceof SyntaxError) {
    return c.json(
      {
        success: false,
        code: 'INVALID_REQUEST',
        message: 'Invalid request.',
        ...(error instanceof ZodError ? { errors: error.flatten() } : {}),
      },
      400,
    );
  }

  console.error('[Person Controller] Request failed:', error);
  return c.json(
    {
      success: false,
      code: 'INTERNAL_ERROR',
      message: 'Unable to process person request.',
    },
    500,
  );
};

export const getPeople = async (c: Context) => {
  try {
    return c.json({ people: await personService.getPeople() }, 200);
  } catch (error) {
    return handleError(error, c);
  }
};

export const getPerson = async (c: Context) => {
  try {
    const person = await personService.getPersonById(c.req.param('id') || '');
    return c.json({ person }, 200);
  } catch (error) {
    return handleError(error, c);
  }
};

export const createPerson = async (c: Context) => {
  try {
    const person = await personService.createPerson(await c.req.json());
    return c.json({ person }, 201);
  } catch (error) {
    return handleError(error, c);
  }
};

export const updatePerson = async (c: Context) => {
  try {
    const person = await personService.updatePerson(
      c.req.param('id') || '',
      await c.req.json(),
    );
    return c.json({ person }, 200);
  } catch (error) {
    return handleError(error, c);
  }
};

export const updateImmichPerson = async (c: Context) => {
  try {
    const result = await personService.updateImmichPerson(
      c.req.param('id') || '',
    );
    return c.json({ success: true, data: result }, 200);
  } catch (error) {
    return handleError(error, c);
  }
};

export const deletePerson = async (c: Context) => {
  try {
    await personService.deletePerson(c.req.param('id') || '');
    return c.json({ success: true }, 200);
  } catch (error) {
    return handleError(error, c);
  }
};

export const getPersonPieces = async (c: Context) => {
  try {
    const person_pieces = await personService.getPersonPieces(
      c.req.param('id') || '',
    );
    return c.json({ person_pieces }, 200);
  } catch (error) {
    return handleError(error, c);
  }
};

export const createPersonPiece = async (c: Context) => {
  try {
    const person_piece = await personService.createPersonPiece(
      c.req.param('id') || '',
      await c.req.json(),
    );
    return c.json({ person_piece }, 201);
  } catch (error) {
    return handleError(error, c);
  }
};

export const getPersonPiece = async (c: Context) => {
  try {
    const person_piece = await personService.getPersonPiece(
      c.req.param('id') || '',
      c.req.param('personPieceId') || '',
    );
    return c.json({ person_piece }, 200);
  } catch (error) {
    return handleError(error, c);
  }
};

export const updatePersonPiece = async (c: Context) => {
  try {
    const person_piece = await personService.updatePersonPiece(
      c.req.param('id') || '',
      c.req.param('personPieceId') || '',
      await c.req.json(),
    );
    return c.json({ person_piece }, 200);
  } catch (error) {
    return handleError(error, c);
  }
};

export const deletePersonPiece = async (c: Context) => {
  try {
    await personService.deletePersonPiece(
      c.req.param('id') || '',
      c.req.param('personPieceId') || '',
    );
    return c.json({ success: true }, 200);
  } catch (error) {
    return handleError(error, c);
  }
};
