# IDICorp Service Console

IDICorp Service Console is a React and TypeScript frontend for the IDICorp service challenge. It provides an authenticated console with task management, calculator and text-echo WebSocket clients, and a streaming HTTP echo client.

## Features

- CAPTCHA-backed login using the IDICorp authentication API.
- Redux Toolkit session state with the access token kept in memory only.
- Task listing with search and completion filtering.
- Task creation, editing, and deletion with client-side title and description validation.
- Calculator WebSocket client with token authentication, readiness handling, operand validation, and stale-connection protection.
- Text Echo WebSocket client with ready handling, multiple messages per connection, reconnect/disconnect controls, and malformed-message errors.
- Streaming Echo client using incremental UTF-8 response decoding, cancellation, response content-type display, and stale-request protection.
- HTTP 401 handling that clears the client-side session and removes protected features from the layout.

## Requirements

The repository does not declare `engines` fields, an `.nvmrc` file, or another exact Node.js/npm requirement. Therefore, the exact required versions cannot be established from the project. Use a Node.js/npm installation compatible with the declared Vite 6, React 19, and TypeScript 5.8 dependencies.

## Installation

From the project directory:

```bash
npm install
```

Create a local `.env` file when an API base URL override is needed:

```env
VITE_API_BASE_URL=https://ts.idicorp.ir
```

The default API base URL is `https://ts.idicorp.ir`, so the environment variable is optional for the documented service.

## Local development

```bash
npm run dev
```

Vite prints the local development URL after startup.

## Production build and preview

```bash
npm run build
npm run preview
```

The `build` script runs TypeScript checking followed by the Vite production build. The `preview` script serves the generated production output locally.

## Authentication and sessions

The login flow first loads a CAPTCHA from `GET /api/auth/login`, then submits the username, password, CAPTCHA answer, and exact CAPTCHA salt to the login endpoint. Authentication requests include browser credentials so the service can use its session cookies.

The returned access token is stored only in Redux and is not written to local storage or session storage. Authenticated task and streaming requests send the token in the HTTP authorization header and include credentials. An HTTP 401 response clears the client-side session; this does not claim to invalidate an HTTP-only server cookie because no logout endpoint is implemented.

## Task management

The task client supports:

- Listing tasks through `GET /api/tasks`.
- Optional `completed=true|false` filtering.
- Optional `q` search forwarding to the service.
- Loading an individual task through `GET /api/tasks/{id}`.
- Creating tasks with `POST /api/tasks`.
- Replacing tasks with `PUT /api/tasks/{id}` using title, description, and completion fields.
- Deleting tasks with `DELETE /api/tasks/{id}`, including empty `204 No Content` responses.

Titles are limited to 120 characters and descriptions to 2,000 characters. Task data is kept in Redux memory only; the frontend does not add persistence or a client-side expiry timer.

## WebSocket features

The calculator uses `wss://ts.idicorp.ir/ws/calculator` by default and supports the `VITE_CALCULATOR_WS_URL` override. It sends the access token after connection, waits for a valid ready message, and then sends validated calculations.

Text Echo uses `wss://ts.idicorp.ir/ws/echo` by default and supports the `VITE_ECHO_WS_URL` override. It accepts the documented ready messages and raw text echoes, supports multiple messages on one connection, and exposes connect, disconnect, reconnect, and send controls.

Both WebSocket clients guard callbacks from obsolete connections and clean up their sockets when their components unmount.

## Streaming Echo

Streaming Echo sends the submitted text as UTF-8 text with `POST /api/echo/stream`. It includes the Redux access token and browser credentials, reads the response incrementally with a `ReadableStream`, decodes UTF-8 chunks progressively, preserves the response content type, and supports cancellation.

Whitespace-only submissions are rejected, but otherwise the submitted text is sent without trimming or transformation.

## Limitations and verification status

- The repository does not provide an exact Node.js/npm version requirement.
- The documented CAPTCHA response contains an image data URL and salt only; the OpenAPI contract does not describe an audio CAPTCHA or alternate verification method. The image challenge therefore has no documented accessible alternative and requires backend support to resolve.
- Server-side search semantics, task lifetime behavior, and exact WebSocket response behavior depend on the IDICorp service contract.
- The sign-in screen and CAPTCHA were inspected in the local browser; authenticated API workflows and WebSocket behavior have not been verified against the live service.
- `npm run build` completed successfully in the current workspace. Vite reports a minified JavaScript chunk above its 500 kB advisory threshold; the primary bundle is 572.77 kB before gzip (181.86 kB gzip).
- The sign-in screen was checked for horizontal overflow at viewport widths from 320px through 2560px. Authenticated workspaces require credentials and were not visually browser-verified here.
- There is no lint script in `package.json`. Strict TypeScript checking passes as part of the production build.
