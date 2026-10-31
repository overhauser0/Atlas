import {
  PersonIdSchema,
  PersonInputSchema,
  PersonPieceTargetInputSchema,
  UpdatePersonSchema,
} from '../models/person.model';
import * as personRepository from '../repositories/person.repository';
import { broadcast } from '../utils/websocket';

export class PersonServiceError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: 400 | 404,
    message: string,
  ) {
    super(message);
    this.name = 'PersonServiceError';
  }
}

const parsePersonId = (id: string) => PersonIdSchema.parse(id);

export const getPeople = async () => await personRepository.getPeople();

export const getPersonById = async (id: string) => {
  const person = await personRepository.getPersonById(parsePersonId(id));
  if (!person) {
    throw new PersonServiceError('PERSON_NOT_FOUND', 404, 'Person not found.');
  }
  return person;
};

export const createPerson = async (input: unknown) => {
  const data = PersonInputSchema.parse(input);
  const person = await personRepository.createPerson(data);
  broadcast(JSON.stringify({ type: 'REFRESH_PEOPLE' }));
  return person;
};

export const updatePerson = async (id: string, input: unknown) => {
  const personId = parsePersonId(id);
  const data = UpdatePersonSchema.parse(input);
  if (Object.keys(data).length === 0) {
    throw new PersonServiceError(
      'EMPTY_UPDATE',
      400,
      'At least one field is required.',
    );
  }

  const person = await personRepository.updatePerson(personId, data);
  if (!person) {
    throw new PersonServiceError('PERSON_NOT_FOUND', 404, 'Person not found.');
  }
  broadcast(JSON.stringify({ type: 'REFRESH_PEOPLE' }));
  return person;
};

export const deletePerson = async (id: string) => {
  const personId = parsePersonId(id);
  const deleted = await personRepository.deletePerson(personId);
  if (!deleted) {
    throw new PersonServiceError('PERSON_NOT_FOUND', 404, 'Person not found.');
  }
  broadcast(JSON.stringify({ type: 'REFRESH_PEOPLE' }));
};

export const getPersonPieces = async (personId: string) => {
  const id = parsePersonId(personId);
  await getPersonById(id);
  return await personRepository.getPersonPieces(id);
};

export const createPersonPiece = async (personId: string, input: unknown) => {
  const id = parsePersonId(personId);
  await getPersonById(id);
  const target = PersonPieceTargetInputSchema.parse(input);
  const data = {
    ...target,
    person_id: id,
  };
  const personPiece = await personRepository.createPersonPiece(data);
  broadcast(JSON.stringify({ type: 'REFRESH_PEOPLE' }));
  return personPiece;
};

export const getPersonPiece = async (
  personId: string,
  personPieceId: string,
) => {
  const id = parsePersonId(personId);
  const linkId = parsePersonId(personPieceId);
  await getPersonById(id);
  const personPiece = await personRepository.getPersonPieceById(id, linkId);
  if (!personPiece) {
    throw new PersonServiceError(
      'PERSON_PIECE_NOT_FOUND',
      404,
      'Person-piece relation not found.',
    );
  }
  return personPiece;
};

export const updatePersonPiece = async (
  personId: string,
  personPieceId: string,
  input: unknown,
) => {
  const id = parsePersonId(personId);
  const linkId = parsePersonId(personPieceId);
  await getPersonById(id);
  const target = PersonPieceTargetInputSchema.parse(input);
  const personPiece = await personRepository.updatePersonPiece(
    id,
    linkId,
    target,
  );
  if (!personPiece) {
    throw new PersonServiceError(
      'PERSON_PIECE_NOT_FOUND',
      404,
      'Person-piece relation not found.',
    );
  }
  broadcast(JSON.stringify({ type: 'REFRESH_PEOPLE' }));
  return personPiece;
};

export const deletePersonPiece = async (
  personId: string,
  personPieceId: string,
) => {
  const id = parsePersonId(personId);
  const linkId = parsePersonId(personPieceId);
  await getPersonById(id);

  const deleted = await personRepository.deletePersonPiece(id, linkId);
  if (!deleted) {
    throw new PersonServiceError(
      'PERSON_PIECE_NOT_FOUND',
      404,
      'Person-piece relation not found.',
    );
  }
  broadcast(JSON.stringify({ type: 'REFRESH_PEOPLE' }));
};
