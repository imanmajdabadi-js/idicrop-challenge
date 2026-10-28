import LoginForm from "./auth/LoginForm";

export default function AppLayout() {
  return (
    <main className="app-shell">
      <h1>IDICorp Service Console</h1>
      <LoginForm />
    </main>
  );
}
