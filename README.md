# Evoke event operations

Evoke is a mobile-friendly organiser console with one unified participant roster. It contains confirmed Evoke RSVP participants and the completed Venture Hackathon cohort. Existing Venture QR codes (`VEN001`, for example) continue to work in the Evoke scanner.

## Local setup

1. Install packages with `npm install`.
2. Copy `.env.example` to `.env.local` and add the Firebase web configuration values.
3. In Firebase Authentication, enable Email/Password and create organiser accounts.
4. Add `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` to your ignored `.env.local` file, then seed the Evoke RSVP roster:

   ```powershell
   npm run seed:evoke -- "C:/Users/devad/Downloads/EVOKE’26 – Shortlisted Team RSVP (Responses) (1).xlsx"
   ```

   The Evoke importer only includes attendees whose RSVP is `Yes`, assigns IDs in workbook order from `EVK001`, and merges name/team changes without resetting attendance.

5. Run the one-time Venture migration to add its participants to the same Evoke roster. It copies each original check-in timestamp and does not alter the historical Venture collection:

   ```powershell
   npm run migrate:venture-to-evoke
   ```

6. Start the app with `npm run dev`.

## Firestore model

The active roster is stored at `events/evoke-expo/participants/{participantId}`. It includes `EVK` and migrated `VEN` participant IDs. The migration preserves all original Venture check-in timestamps; re-running it does not change the historical `events/venture` collection.

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

Generate the Evoke QR PNGs and ZIP with:

```powershell
npm run qr:evoke -- "C:/Users/devad/Downloads/EVOKE’26 – Shortlisted Team RSVP (Responses) (1).xlsx"
```

This creates name-based PNGs in `outputs/evoke-participant-qr-codes` and `outputs/evoke-participant-qr-codes.zip`; every QR encodes only its `EVK` participant ID. Migrated Venture participants retain their existing `VEN` QR codes.

## Cloudflare Pages deployment

1. Put this repository in GitHub or GitLab and create a Cloudflare Pages project from that repository.
2. Set the build command to `npm run build` and the build output directory to `dist`.
3. Add the six `VITE_FIREBASE_*` values from `.env.example` under **Settings → Environment variables** for both Preview and Production. These are Firebase web-app values and must be available at build time.
4. Deploy. The included `public/_redirects` file keeps direct links such as `/events/evoke-expo` working as a single-page app.
5. In Firebase Authentication, add the final `your-project.pages.dev` address and any custom domain under **Authorized domains**. Add the same variables to Cloudflare after changing Firebase configuration, then trigger a fresh deployment.
6. Seed the roster from a trusted local machine. Do not store `SEED_ADMIN_PASSWORD` in Cloudflare Pages; it is used only by the one-time roster import script.

Cloudflare Pages serves the React front end. Firebase Authentication and Firestore remain the secure data and sign-in services.
