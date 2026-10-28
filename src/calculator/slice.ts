import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { CalculatorOperation, CalculatorStatus } from "./types";

type CalculatorState = {
  status: CalculatorStatus;
  operation: CalculatorOperation;
  result: number | null;
  error: string | null;
};

const initialState: CalculatorState = {
  status: "disconnected",
  operation: "add",
  result: null,
  error: null,
};

const calculatorSlice = createSlice({
  name: "calculator",
  initialState,
  reducers: {
    connectionStarted: (state) => {
      state.status = "connecting";
      state.error = null;
    },
    connectionReady: (state) => {
      state.status = "ready";
      state.error = null;
    },
    connectionError: (state, action: PayloadAction<string>) => {
      state.status = "connection-error";
      state.error = action.payload;
    },
    connectionClosed: (state) => {
      state.status = "disconnected";
    },
    operationChanged: (
      state,
      action: PayloadAction<CalculatorOperation>,
    ) => {
      state.operation = action.payload;
      state.error = null;
    },
    resultReceived: (state, action: PayloadAction<number>) => {
      state.result = action.payload;
      state.error = null;
    },
    protocolError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
    },
  },
});

export const {
  connectionStarted,
  connectionReady,
  connectionError,
  connectionClosed,
  operationChanged,
  resultReceived,
  protocolError,
} = calculatorSlice.actions;

export default calculatorSlice.reducer;
