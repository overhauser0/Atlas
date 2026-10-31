import {
  PersonIdSchema,
  PersonInputSchema,
  PersonPieceTargetInputSchema,
  UpdatePersonSchema,
} from '../models/person.model';
import * as personRepository from '../repositories/person.repository';
import * as immichService from './immich.service';
import { broadcast } from '../utils/websocket';

export class PersonServiceError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: 400 | 404 | 502,
    message: string,
  ) {
    super(message);
    this.name = 'PersonServiceError';
  }
}

const parsePersonId = (id: string) => PersonIdSchema.parse(id);

const syncPersonToImmich = async (person: {
  id: string;
  immich_person_id: string | null;
  name: string;
  birthday: string | null;
}) => {
  if (!person.immich_person_id) return;

  try {
    await immichService.updateImmichPerson(person.immich_person_id, {
      name: person.name,
      birthday: person.birthday,
    });
  } catch (error) {
    console.error(
      `[Person Service] Atlas person ${person.id} was saved, but Immich sync failed:`,
      error,
    );
    throw new PersonServiceError(
      'IMMICH_SYNC_FAILED',
      502,
      'Person was saved in Atlas, but syncing to Immich failed.',
    );
  }
};

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
  await syncPersonToImmich(person);
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

  const currentPerson = await getPersonById(personId);
  const person = await personRepository.updatePerson(personId, data);
  if (!person) {
    throw new PersonServiceError('PERSON_NOT_FOUND', 404, 'Person not found.');
  }
  broadcast(JSON.stringify({ type: 'REFRESH_PEOPLE' }));
  const shouldSyncImmich =
    person.immich_person_id !== currentPerson.immich_person_id ||
    person.name !== currentPerson.name ||
    person.birthday !== currentPerson.birthday;
  if (shouldSyncImmich) await syncPersonToImmich(person);
  return person;
};

export const updateImmichPerson = async (id: string) => {
  const person = await getPersonById(id);
  if (!person.immich_person_id) {
    throw new PersonServiceError(
      'IMMICH_PERSON_ID_REQUIRED',
      400,
      'This person is not linked to an Immich person.',
    );
  }

  await syncPersonToImmich(person);
  return {
    personId: person.immich_person_id,
    name: person.name,
    birthday: person.birthday,
  };
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
