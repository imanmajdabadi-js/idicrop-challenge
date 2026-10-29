# IDICorp Service Console

React + TypeScript + Vite frontend for the IDICorp service console (tasks, calculator, text echo, streaming echo).

## Tech
- React 19, TypeScript 5.8, Vite 6
- MUI, Redux Toolkit

## Setup
`ash
npm install
`

Create a local .env from .env.example if needed:
`env
VITE_API_BASE_URL=https://ts.idicorp.ir
VITE_CALCULATOR_WS_URL=/ws/calculator
VITE_ECHO_WS_URL=/ws/echo
`

Defaults use https://ts.idicorp.ir when env vars are omitted.

## Run
`ash
npm run dev
`

## Build
`ash
npm run build
npm run preview
`

uild runs TypeScript checking and Vite build.
