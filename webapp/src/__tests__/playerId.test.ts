// src/__tests__/playerId.test.ts

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { getPlayerId, displayNameFor, guestDisplayName } from '../components/online/playerId';

// ── guestDisplayName ───────────────────────────────────────────────────────

describe('guestDisplayName', () => {
    test('returns Capibara name for seat 0', () => {
        expect(guestDisplayName(0)).toBe('UnregisteredCapibara');
    });

    test('returns Giraffe name for seat 1', () => {
        expect(guestDisplayName(1)).toBe('UnregisteredGiraffe');
    });
});

// ── getPlayerId ────────────────────────────────────────────────────────────

describe('getPlayerId', () => {
    beforeEach(() => {
        // Reset localStorage between tests.
        localStorage.clear();
    });

    test('returns the logged-in username when provided', () => {
        expect(getPlayerId('Alice')).toBe('Alice');
    });

    test('returns a stored guest alias when no username is given', () => {
        // First call creates and stores the alias.
        const id1 = getPlayerId();
        expect(id1).toMatch(/^UnregisteredGuest#\d{4}$/);

        // Second call returns the same alias (stable across calls).
        const id2 = getPlayerId();
        expect(id2).toBe(id1);
    });

    test('returns a new guest alias when localStorage has no existing one', () => {
        localStorage.clear();
        const id = getPlayerId(null);
        expect(id).toMatch(/^UnregisteredGuest#\d{4}$/);
    });

    test('ignores whitespace-only username and falls back to guest alias', () => {
        const id = getPlayerId('   ');
        expect(id).toMatch(/^UnregisteredGuest#\d{4}$/);
    });

    test('creates a new alias when localStorage throws (quota exceeded)', () => {
        // Simulate a broken localStorage.
        vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
            throw new Error('QuotaExceededError');
        });
        vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
            throw new Error('QuotaExceededError');
        });

        const id = getPlayerId(undefined);
        // Should still return a valid-looking alias, not throw.
        expect(id).toMatch(/^UnregisteredGuest#\d{4}$/);
    });
});

// ── displayNameFor ─────────────────────────────────────────────────────────

describe('displayNameFor', () => {
    test('returns the raw id for registered users', () => {
        expect(displayNameFor('Alice', 0)).toBe('Alice');
        expect(displayNameFor('bob@example.com', 1)).toBe('bob@example.com');
    });

    test('collapses UnregisteredGuest#NNNN to the seat-based nickname', () => {
        expect(displayNameFor('UnregisteredGuest#1234', 0)).toBe('UnregisteredCapibara');
        expect(displayNameFor('UnregisteredGuest#9999', 1)).toBe('UnregisteredGiraffe');
    });

    test('returns seat-based nickname when id is null', () => {
        expect(displayNameFor(null, 0)).toBe('UnregisteredCapibara');
        expect(displayNameFor(null, 1)).toBe('UnregisteredGiraffe');
    });

    test('returns seat-based nickname when id is undefined', () => {
        expect(displayNameFor(undefined, 0)).toBe('UnregisteredCapibara');
        expect(displayNameFor(undefined, 1)).toBe('UnregisteredGiraffe');
    });

    test('returns seat-based nickname when id is an empty string', () => {
        expect(displayNameFor('', 0)).toBe('UnregisteredCapibara');
    });
});
