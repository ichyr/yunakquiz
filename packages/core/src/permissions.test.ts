import { describe, expect, it } from 'vitest';
import {
  canChangeRole,
  canChangeOwnAccount,
  canDeleteUser,
  canListUsers,
  type Actor,
  type Role,
} from './permissions.ts';

const admin: Actor = { id: 1, role: 'admin', verified: true };
const otherAdmin: Actor = { id: 2, role: 'admin', verified: true };
const user: Actor = { id: 3, role: 'user', verified: true };
const unverifiedAdmin: Actor = { id: 4, role: 'admin', verified: false };
const roles: Role[] = ['user', 'admin'];

describe('canListUsers', () => {
  it('allows only a verified Admin', () => {
    expect(canListUsers(admin)).toBe(true);
    expect(canListUsers(user)).toBe(false);
    expect(canListUsers(unverifiedAdmin)).toBe(false);
    expect(canListUsers(null)).toBe(false);
  });
});

describe('canChangeRole', () => {
  it('denies a Guest, a User and an unverified Admin, whatever the change', () => {
    for (const actor of [null, user, unverifiedAdmin]) {
      for (const targetRole of roles) {
        for (const to of roles) {
          expect(canChangeRole(actor, { id: 9, role: targetRole }, to, 5)).toBe(false);
        }
      }
    }
  });

  it('lets an Admin promote a User and demote another Admin', () => {
    expect(canChangeRole(admin, { id: 3, role: 'user' }, 'admin', 1)).toBe(true);
    expect(canChangeRole(admin, { id: 2, role: 'admin' }, 'user', 2)).toBe(true);
  });

  it('lets an Admin demote themselves while another Admin remains', () => {
    expect(canChangeRole(admin, { id: 1, role: 'admin' }, 'user', 2)).toBe(true);
  });

  it('never demotes the last Admin', () => {
    expect(canChangeRole(admin, { id: 1, role: 'admin' }, 'user', 1)).toBe(false);
    expect(canChangeRole(admin, { id: 2, role: 'admin' }, 'user', 1)).toBe(false);
    expect(canChangeRole(admin, { id: 2, role: 'admin' }, 'user', 0)).toBe(false);
  });

  it('denies a change to the role the target already has', () => {
    expect(canChangeRole(admin, { id: 3, role: 'user' }, 'user', 2)).toBe(false);
    expect(canChangeRole(admin, { id: 2, role: 'admin' }, 'admin', 2)).toBe(false);
  });
});

describe('canDeleteUser', () => {
  it('denies a Guest, a User and an unverified Admin, whatever the target', () => {
    for (const actor of [null, user, unverifiedAdmin]) {
      expect(canDeleteUser(actor, { id: 9, role: 'user' }, 5)).toBe(false);
      expect(canDeleteUser(actor, { id: 9, role: 'admin' }, 5)).toBe(false);
    }
  });

  it('lets an Admin delete a User or another Admin', () => {
    expect(canDeleteUser(admin, { id: 3, role: 'user' }, 1)).toBe(true);
    expect(canDeleteUser(admin, { id: 2, role: 'admin' }, 2)).toBe(true);
  });

  it('lets an Admin delete themselves while another Admin remains', () => {
    expect(canDeleteUser(admin, { id: 1, role: 'admin' }, 2)).toBe(true);
  });

  it('never deletes the last Admin', () => {
    expect(canDeleteUser(admin, { id: 1, role: 'admin' }, 1)).toBe(false);
    expect(canDeleteUser(otherAdmin, { id: 1, role: 'admin' }, 1)).toBe(false);
    expect(canDeleteUser(admin, { id: 1, role: 'admin' }, 0)).toBe(false);
  });
});

describe('canChangeOwnAccount', () => {
  it('allows a signed-in Account on itself only', () => {
    expect(canChangeOwnAccount(user, { id: 3 })).toBe(true);
    expect(canChangeOwnAccount(user, { id: 1 })).toBe(false);
    expect(canChangeOwnAccount(admin, { id: 3 })).toBe(false);
    expect(canChangeOwnAccount(null, { id: 3 })).toBe(false);
  });
});
