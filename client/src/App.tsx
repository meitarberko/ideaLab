import { Navigate, Route, Routes } from "react-router-dom";
import HomeFeed from "./pages/HomeFeed";
import CreateIdea from "./pages/CreateIdea";
import EditIdea from "./pages/EditIdea";
import type { JSX } from "react";

function isAuthed() {
  return Boolean(localStorage.getItem("accessToken"));
}

function Protected({ children }: { children: JSX.Element }) {
  if (!isAuthed()) return <Navigate to="/login" replace />;
  return children;
}

// זמני (אם אין לכם עדיין מסכי auth בפרונט)
function LoginStub() {
  return (
    <div style={{ padding: 16 }}>
      <h2>Login</h2>
      <p>שמרי accessToken ב-localStorage ואז חזרי ל-feed.</p>
      <code>localStorage.setItem("accessToken", "YOUR_TOKEN")</code>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginStub />} />

      <Route
        path="/"
        element={
          <Protected>
            <HomeFeed />
          </Protected>
        }
      />

      <Route
        path="/ideas/new"
        element={
          <Protected>
            <CreateIdea />
          </Protected>
        }
      />

      <Route
        path="/ideas/:id/edit"
        element={
          <Protected>
            <EditIdea />
          </Protected>
        }
      />

      {/* אם אין לכם עדיין דף Details, אפשר להשאיר redirect ל-feed */}
      <Route path="/ideas/:id" element={<Navigate to="/" replace />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
