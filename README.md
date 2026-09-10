# Evoke event operations

Evoke is a mobile-friendly organiser console for two events:

- Venture Hackathon: QR check-in, a searchable roster, and four food service check-offs.
- Evoke Project Expo: a separate organiser workspace ready for its own roster and schedule.

Venture food windows are set to Dinner on 10 September, then Breakfast, Lunch, and Evening tea on 11 September. QR payloads use participant IDs such as `VEN001`.

## Local setup

1. Install packages with `npm install`.
2. Copy `.env.example` to `.env.local` and add the Firebase web configuration values.
3. In Firebase Authentication, enable Email/Password and create organiser accounts.
4. Add `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` to your ignored `.env.local` file, then seed the Venture roster from the supplied workbook:

   ```powershell
   npm run seed:venture -- "C:/Users/devad/Downloads/VENTURE_26_Participant_Attendance-1 (1).xlsx"
   ```

   To replace a previously imported roster before attendance begins, append `--replace`. This resets attendance for the roster and removes IDs that are no longer in the workbook.

5. Start the app with `npm run dev`.

## Firestore model

Venture participants are stored at `events/venture/participants/{participantId}`. Each record contains the participant name and team, then receives `checkInAt` and the four food attendance flags as organisers mark them. This lets each event own an independent roster. Re-running the importer updates roster details without erasing attendance already recorded.

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

## Cloudflare Pages deployment

1. Put this repository in GitHub or GitLab and create a Cloudflare Pages project from that repository.
2. Set the build command to `npm run build` and the build output directory to `dist`.
3. Add the six `VITE_FIREBASE_*` values from `.env.example` under **Settings → Environment variables** for both Preview and Production. These are Firebase web-app values and must be available at build time.
4. Deploy. The included `public/_redirects` file keeps direct links such as `/events/venture` working as a single-page app.
5. In Firebase Authentication, add the final `your-project.pages.dev` address and any custom domain under **Authorized domains**. Add the same variables to Cloudflare after changing Firebase configuration, then trigger a fresh deployment.
6. Seed the roster from a trusted local machine. Do not store `SEED_ADMIN_PASSWORD` in Cloudflare Pages; it is used only by the one-time roster import script.

Cloudflare Pages serves the React front end. Firebase Authentication and Firestore remain the secure data and sign-in services.
