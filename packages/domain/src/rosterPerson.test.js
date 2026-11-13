import { describe, it, expect } from 'vitest';
import { pickReusablePerson } from './rosterPerson.js';

const ORG = 'org-a';
const m = (person_id, organization_id) => ({ person_id, organization_id });

describe('pickReusablePerson', () => {
  it('sin coincidencias: null', () => expect(pickReusablePerson([], [], [], ORG)).toBeNull());
  it('persona sin membresías ni cuenta: se reutiliza', () => expect(pickReusablePerson(['p1'], [], [], ORG)).toBe('p1'));
  it('persona solo de esta organización: se reutiliza', () => expect(pickReusablePerson(['p1'], [m('p1', ORG)], [], ORG)).toBe('p1'));
  it('con cuenta que ya estuvo aquí: se reutiliza', () => expect(pickReusablePerson(['p1'], [m('p1', ORG)], ['p1'], ORG)).toBe('p1'));
  it('con membresía en otra empresa: no se vincula', () => expect(pickReusablePerson(['p1'], [m('p1', 'org-b')], [], ORG)).toBeNull());
  it('con membresía aquí y en otra empresa: no se vincula', () => expect(pickReusablePerson(['p1'], [m('p1', ORG), m('p1', 'org-b')], [], ORG)).toBeNull());
  it('con cuenta que nunca estuvo aquí: no se vincula', () => expect(pickReusablePerson(['p1'], [], ['p1'], ORG)).toBeNull());
  it('salta los candidatos inseguros y toma el primero seguro', () => expect(pickReusablePerson(['p1', 'p2'], [m('p1', 'org-b'), m('p2', ORG)], [], ORG)).toBe('p2'));
});
