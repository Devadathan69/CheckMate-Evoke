# Evoke event operations

Evoke is a mobile-friendly organiser console for two events:

- Venture Hackathon: QR check-in, a searchable roster, and four food service check-offs.
- Evoke Project Expo: QR check-in and a separate searchable roster for confirmed RSVP participants.

Venture food windows are set to Dinner on 10 September, then Breakfast, Lunch, and Evening tea on 11 September. QR payloads use participant IDs such as `VEN001`.

## Local setup

1. Install packages with `npm install`.
2. Copy `.env.example` to `.env.local` and add the Firebase web configuration values.
3. In Firebase Authentication, enable Email/Password and create organiser accounts.
4. Add `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` to your ignored `.env.local` file, then seed a roster from its supplied workbook:

   ```powershell
   npm run seed:venture -- "C:/Users/devad/Downloads/VENTURE_26_Participant_Attendance-1 (1).xlsx"
   ```

   For Venture only, append `--replace` to replace a previously imported roster before attendance begins. This resets attendance for the roster and removes IDs that are no longer in the workbook.

   For the Evoke Project Expo RSVP workbook, use:

   ```powershell
   npm run seed:evoke -- "C:/Users/devad/Downloads/EVOKE’26 – Shortlisted Team RSVP (Responses) (1).xlsx"
   ```

   The Evoke importer only includes attendees whose RSVP is `Yes`, assigns IDs in workbook order from `EVK001`, and merges name/team changes without resetting attendance.

5. Start the app with `npm run dev`.

## Firestore model

Participants are stored at `events/{eventId}/participants/{participantId}`. Venture uses IDs such as `VEN001` and includes its four food attendance flags. Evoke Project Expo uses IDs such as `EVK001` and supports check-in. Re-running either importer updates roster details without erasing attendance already recorded.

## Firestore access rules

For an organiser-only app whose Firebase Authentication accounts are all trusted organisers, publish the following rules before seeding:

```text
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /events/{eventId}/participants/{participantId} {
      allow read, create, update: if request.auth != null;
      allow delete: if false;
    }
  }
}
```

For a larger team, replace the signed-in check with a custom `organiser` claim before production use.

## QR archive

Generate the QR PNGs and ZIP with:

```powershell
npm run qr:venture -- "C:/Users/devad/Downloads/VENTURE_26_Participant_Attendance-1 (1).xlsx"
```

The command writes name-based PNG files to `outputs/venture-participant-qr-codes` and creates `outputs/venture-participant-qr-codes.zip`. Duplicate participant names receive a numbered suffix so no QR is overwritten. Every QR encodes only its `VEN` participant ID.

For Evoke Project Expo, run:

```powershell
npm run qr:evoke -- "C:/Users/devad/Downloads/EVOKE’26 – Shortlisted Team RSVP (Responses) (1).xlsx"
```

This creates name-based PNGs in `outputs/evoke-participant-qr-codes` and `outputs/evoke-participant-qr-codes.zip`; every QR encodes only its `EVK` participant ID.

## Cloudflare Pages deployment

1. Put this repository in GitHub or GitLab and create a Cloudflare Pages project from that repository.
2. Set the build command to `npm run build` and the build output directory to `dist`.
3. Add the six `VITE_FIREBASE_*` values from `.env.example` under **Settings → Environment variables** for both Preview and Production. These are Firebase web-app values and must be available at build time.
4. Deploy. The included `public/_redirects` file keeps direct links such as `/events/venture` working as a single-page app.
5. In Firebase Authentication, add the final `your-project.pages.dev` address and any custom domain under **Authorized domains**. Add the same variables to Cloudflare after changing Firebase configuration, then trigger a fresh deployment.
6. Seed the roster from a trusted local machine. Do not store `SEED_ADMIN_PASSWORD` in Cloudflare Pages; it is used only by the one-time roster import script.

Cloudflare Pages serves the React front end. Firebase Authentication and Firestore remain the secure data and sign-in services.
