# IDICorp Service Console

React + TypeScript + Vite frontend for the IDICorp service console (tasks, calculator, text echo, streaming echo).

## Tech
- React 19, TypeScript 5.8, Vite 6
- MUI, Redux Toolkit

## Setup
```bash
npm install
cp .env.example .env
```


## Run
```bash
npm run dev
```


## Considerations
- The server Same origin policy applies, so the frontend has to be served from the same origin as the backend or use a proxy to handle cross-origin requests. That is why the Vite configuration includes a proxy setup for API and WebSocket requests.
- Get Captcha image always respond with a fixed image. The backend does not generate dynamic Captcha images.