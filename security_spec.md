# Security Specification - SH Calculator

## Data Invariants
1. A user profile must correctly map to their Firebase Auth UID.
2. Only the owner of a vault item can read, update, or delete it.
3. Vault items must have encrypted content and titles.
4. Passcodes must be stored as SHA-256 hashes (client-side hashed).

## The Dirty Dozen Payloads (Rejection Targets)
1. Creating a user profile for a different UID.
2. Reading another user's vault items.
3. Creating a vault item with another user's UID as `ownerId`.
4. Updating a vault item's `ownerId` to hijack it.
5. Deleting another user's vault item.
6. Creating a vault item with extremely large titles or content (exceeding 1MB).
7. Injecting non-string types into item fields.
8. Modifying `createdAt` time of an existing item.
9. Attempting to list all vault items without a filter on `ownerId`.
10. Creating a user doc with a "isVerified" or "isAdmin" field that isn't in the schema.
11. Updating `isSetup: false` after it was already true (if we want to prevent reset without auth).
12. Providing a `passcode` that is too short or too long.

## Test Runner (Draft)
A comprehensive `firestore.rules.test.ts` would be implemented to verify these.
