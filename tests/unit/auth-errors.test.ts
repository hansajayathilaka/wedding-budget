import { describe, expect, it } from 'vitest';
import { authErrorMessage, MIN_PASSWORD_LENGTH, validatePassword } from '@/lib/auth-errors';

describe('validatePassword', () => {
  it('rejects short passwords', () => {
    expect(validatePassword('1234567')).toContain(String(MIN_PASSWORD_LENGTH));
    expect(validatePassword('')).not.toBeNull();
  });
  it('accepts passwords of the minimum length', () => {
    expect(validatePassword('12345678')).toBeNull();
    expect(validatePassword('correct horse battery staple')).toBeNull();
  });
});

describe('authErrorMessage', () => {
  it('does not reveal whether an email has an account', () => {
    const wrong = authErrorMessage('auth/wrong-password');
    expect(authErrorMessage('auth/invalid-credential')).toBe(wrong);
    expect(authErrorMessage('auth/user-not-found')).toBe(wrong);
    expect(authErrorMessage('auth/invalid-login-credentials')).toBe(wrong);
  });
  it('explains the common sign-up problems', () => {
    expect(authErrorMessage('auth/email-already-in-use')).toContain('already exists');
    expect(authErrorMessage('auth/invalid-email')).toContain('valid email');
    expect(authErrorMessage('auth/weak-password')).toContain(String(MIN_PASSWORD_LENGTH));
  });
  it('covers throttling, disabled accounts, network and a disabled provider', () => {
    expect(authErrorMessage('auth/too-many-requests')).toContain('Too many');
    expect(authErrorMessage('auth/user-disabled')).toContain('disabled');
    expect(authErrorMessage('auth/network-request-failed')).toContain('Network');
    expect(authErrorMessage('auth/operation-not-allowed')).toContain('not enabled');
  });
  it('falls back to a generic message', () => {
    expect(authErrorMessage('auth/whatever')).toContain('Something went wrong');
    expect(authErrorMessage(undefined)).toContain('Something went wrong');
  });
});
