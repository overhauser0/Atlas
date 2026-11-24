import type { Person, PersonTimelinePiece } from '@/types';

export interface PersonForm {
  family_name: string;
  given_name: string;
  ruby_family_name: string;
  ruby_given_name: string;
  birthday: string;
  tags: string;
  bloodType: string;
  notes: string;
}

export interface PieceDraft {
  date: string;
  title: string;
  note: string;
}

export interface LinkedTimelinePiece extends PersonTimelinePiece {
  personPieceId: string;
}

export type ExternalLinkType = 'immich_person_id' | 'google_contact_id';

export const EMPTY_FORM: PersonForm = {
  family_name: '',
  given_name: '',
  ruby_family_name: '',
  ruby_given_name: '',
  birthday: '',
  tags: '',
  bloodType: '',
  notes: '',
};

export const toPersonForm = (person: Person | null): PersonForm =>
  person
    ? {
        family_name: person.family_name,
        given_name: person.given_name ?? '',
        ruby_family_name: person.ruby_family_name ?? '',
        ruby_given_name: person.ruby_given_name ?? '',
        birthday: person.birthday?.slice(0, 10) ?? '',
        tags: person.tags?.join(', ') ?? '',
        bloodType: person.blood_type?.join(', ') ?? '',
        notes: person.notes ?? '',
      }
    : EMPTY_FORM;
