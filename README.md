# FormPulse

**Real-time squat and push-up repetition tracking with browser-based pose estimation and form feedback.**

FormPulse uses TensorFlow.js and MoveNet to estimate body keypoints from a webcam feed, then analyzes movement through exercise-specific state machines. It tracks repetitions, surfaces technique cues, and keeps workout history in the browser.

> **Important:** FormPulse is a personal fitness aid, not a medical device or a substitute for a qualified coach. Webcam-based 2D pose estimates can be affected by camera angle, lighting, occlusion, clothing, body position, and device performance. Form feedback is an estimate—not a guarantee that an exercise is safe or technically correct.

## Features

- **Two exercise modes:** squat and push-up analysis.
- **Live pose estimation:** browser-based TensorFlow.js MoveNet single-person pose detection.
- **Rep-state tracking:** separate state machines for squat and push-up movement phases.
- **Technique feedback:** estimates selected movement metrics and flags configured form issues.
- **Configurable analysis:** exercise-specific thresholds, camera-view preferences, active body side, and landmark confidence settings.
- **Workout summaries and history:** session and repetition records stored in browser `localStorage`.
- **Audio coaching options:** sound effects and voice feedback controls.
- **Privacy-minded architecture:** webcam frames are processed in the browser; the application code does not send workout video to an application backend.
- **Deployment headers:** `vercel.json` defines security-related response headers for Vercel deployments.

## How it works

1. The browser requests camera access after the user starts the camera.
2. TensorFlow.js initializes MoveNet and estimates body keypoints from each usable video frame.
3. The selected exercise state machine smooths keypoints and derives angles or other 2D geometry-based measurements.
4. Movement phases are tracked over time to classify repetitions and generate feedback.
5. Workout history is saved locally in the browser.

Because analysis uses a single webcam view and 2D keypoints, it cannot reliably measure every three-dimensional movement detail. Results should be treated as approximate.

## Tech stack

- **React 19** and **TypeScript**
- **Vite 8**
- **TensorFlow.js**
- **TensorFlow.js pose-detection / MoveNet**
- **Tailwind CSS 4** with the Vite integration
- **Lucide React** for icons
- **Motion** for UI animation

## Requirements

- Node.js compatible with the installed Vite version
- npm
- A modern browser with webcam support
- Camera permission
- A reasonably well-lit space where the relevant body landmarks remain visible

For camera access, use `localhost` during local development or deploy over HTTPS. Browsers generally restrict webcam access on insecure origins.

## Run locally

```bash
git clone https://github.com/YOUR-USERNAME/FormPulse.git
cd FormPulse
npm install
npm run dev
```

Open the local URL printed by Vite in your terminal, grant camera permission, and select an exercise.

Replace `YOUR-USERNAME` and `FormPulse` in the clone command with the repository URL and name you actually choose.

### Available scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Vite development server on port `3000`. |
| `npm run build` | Build the production bundle into `dist/`. |
| `npm run preview` | Preview the production build locally. |
| `npm run lint` | Run TypeScript type-checking with `tsc --noEmit`. |
| `npx tsx scripts/verify_state_machines.ts` | Run the repository's state-machine verification script. |

The verification script exercises simulated squat and push-up sequences. It is not a substitute for testing with real users, real camera angles, and varied devices.

## Deployment

FormPulse is a Vite single-page application and can be deployed to a static hosting provider such as Vercel.

1. Push the repository to GitHub.
2. Import the repository into your hosting provider.
3. Use `npm run build` as the build command.
4. Use `dist` as the output directory.
5. Test camera permission and model initialization on the deployed HTTPS URL.

The included `vercel.json` configures response headers. Review the Content Security Policy if you change dependencies, add remote assets, or modify model-loading behavior; browser security policies must match the final deployment.

## Privacy and security

- Camera access is controlled by the browser and requires user permission.
- Pose estimation runs client-side; the application does not require an application server or API key for its core analysis.
- Workout history is stored in the current browser profile using `localStorage`. It is not automatically synced between browsers or devices.
- Clearing site data can remove saved workout history.
- Anyone with access to the same browser profile may be able to access its local workout history.
- No secret values should be placed in `VITE_*` environment variables: Vite exposes these values to client-side code.
- The included `.env.example` documents that no secrets are required for the current client-side setup.

## Repository structure

```text
.
├── src/
│   ├── components/       # Workout UI, dashboards, dialogs, and guides
│   ├── config/           # Squat and push-up thresholds
│   ├── services/         # Pose detection, state machines, history, and audio
│   ├── types/            # TypeScript domain types
│   ├── utils/            # Geometry and canvas rendering helpers
│   ├── App.tsx            # Main application and exercise-mode coordination
│   ├── index.css          # Application styles
│   └── main.tsx           # React entry point
├── scripts/
│   └── verify_state_machines.ts
├── .env.example
├── index.html
├── package.json
├── tsconfig.json
├── vercel.json
└── vite.config.ts
```

## Known limitations

- Pose estimation and form checks depend on visible landmarks and camera placement.
- A single 2D camera view cannot fully assess three-dimensional joint motion or diagnose injury risk.
- Threshold-based feedback may not fit every person's anatomy, mobility, training style, or exercise variation.
- Performance varies by browser, hardware, and TensorFlow.js backend availability.
- Workout history is browser-local and may be lost if browser storage is cleared.
- The included simulated checks cover selected state-machine scenarios; broader automated, accessibility, cross-browser, and real-world accuracy testing may still be needed.

## Contributing

Issues and pull requests are welcome. For useful bug reports, include:

- Browser and operating system
- Device type and approximate performance
- Exercise mode and selected camera view
- Steps to reproduce the issue
- Relevant console errors, with personal information removed

Do not include private webcam footage or other sensitive personal data in public issues.

## License

No license file is currently included. Unless a license is added to this repository, default copyright restrictions apply and reuse, redistribution, and modification are not automatically granted. Add a `LICENSE` file before presenting the project as open source.
