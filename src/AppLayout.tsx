import Calculator from "./calculator/Calculator";
import Echo from "./echo/Echo";
import LoginForm from "./auth/LoginForm";
import TaskManager from "./tasks/TaskManager";
import { useAppSelector } from "./store/hooks";

export default function AppLayout() {
  const accessToken = useAppSelector((state) => state.auth.accessToken);

  return (
    <main className="app-shell">
      <h1>IDICorp Service Console</h1>
      {accessToken ? (
        <>
          <TaskManager />
          <Calculator />
          <Echo />
        </>
      ) : (
        <LoginForm />
      )}
    </main>
  );
}
