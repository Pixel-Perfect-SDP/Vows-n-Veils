# Vows n Veils
Wedding event management app (Under development) 
https://mango-mushroom-00c4ce01e.2.azurestaticapps.net/

[![Coverage](https://codecov.io/gh/Pixel-Perfect-SDP/Vows-n-Veils/branch/main/graph/badge.svg?flag=frontend)](https://app.codecov.io/gh/Pixel-Perfect-SDP/Vows-n-Veils?flags=frontend)

Testing Coverage: https://app.codecov.io/gh/Pixel-Perfect-SDP/Vows-n-Veils/tree/main

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 20.1.3.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Karma](https://karma-runner.github.io) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

# Environment Variables (for Vows & Veils Project)

These are the environment variables required to run the backend locally or deploy it to Azure.  

| Variable Name | Example Value / Placeholder | Description |
|----------------|-----------------------------|--------------|
| FIREBASE_PROJECT_ID | `ppep-2651c` | Firebase project ID used by the app |
| FIREBASE_CLIENT_EMAIL | `firebase-adminsdk-fbsvc@ppep-2651c.iam.gserviceaccount.com` | Firebase service account email |
| FIREBASE_PRIVATE_KEY | `-----BEGIN PRIVATE KEY----- ... -----END PRIVATE KEY-----` *(store securely)* | Firebase Admin SDK private key used for server-side authentication |
| FIREBASE_STORAGE_BUCKET | `ppep-2651c.firebasestorage.app` | Firebase storage bucket for venue and event images |
| VISUAL_CROSSING_API_KEY | `YOUR_VISUAL_CROSSING_API_KEY` | API key for weather integration (used in dashboard) |
| PORT | `3000` | Port number for local backend server |

---