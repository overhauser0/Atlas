import { Person } from '@/types';

type PersonNameLike = Pick<Person, 'family_name' | 'given_name'>;
type PersonRubyLike = Pick<Person, 'ruby_family_name' | 'ruby_given_name'>;

export const formatPersonName = (person: PersonNameLike): string =>
  [person.family_name, person.given_name].filter(Boolean).join(' ');

export const formatPersonRuby = (person: PersonRubyLike): string =>
  [person.ruby_family_name, person.ruby_given_name].filter(Boolean).join(' ');
