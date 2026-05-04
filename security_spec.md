# Security Specification - Sonik.OS

## Data Invariants
- A Project MUST be owned by a registered user.
- A Project MUST have a unique ID.
- BPM must be between 40 and 300.
- Volume must be between -60 and 10 dB.
- The `grid` must be a map of instrument sequences.
- `userId` must match the creator's UID and is immutable.
- `createdAt` is immutable.
- `updatedAt` must always be the server timestamp.

## The "Dirty Dozen" Payloads (Deny List)

1. **Identity Spoofing**: Attempt to create a project with another user's `userId`.
2. **Missing Field**: Create project without `name`.
3. **Invalid Type**: Set `bpm` as a string instead of an integer.
4. **Out of Bounds (High)**: Set `bpm` to 1000.
5. **Out of Bounds (Low)**: Set `volume` to -100.
6. **Shadow Update**: Attempt to update a non-existent field `isVerified: true`.
7. **Identity Takeover**: Attempt to update another user's project `userId`.
8. **Immutability Breach**: Attempt to change `createdAt` on update.
9. **Timestamp Spoofing**: Provide a manual `updatedAt` string instead of server timestamp.
10. **Resource Poisoning**: Enormous string (>10KB) as document ID.
11. **Guest Write**: Unauthenticated user attempting to save a project.
12. **Blanket Read Request**: Authenticated user trying to `list` all projects without a `userId` filter.

## Test Runner (Logic Check)
The `firestore.rules` will be evaluated against these attack vectors using the standard security rules logic.
