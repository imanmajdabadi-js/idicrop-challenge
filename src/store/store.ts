import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../auth/slice";
import calculatorReducer from "../calculator/slice";
import tasksReducer from "../tasks/slice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    calculator: calculatorReducer,
    tasks: tasksReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
