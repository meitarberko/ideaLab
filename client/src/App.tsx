import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./lib/auth";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Feed from "./pages/Feed";
import CreateIdea from "./pages/CreateIdea";
import IdeaDetails from "./pages/IdeaDetails";
import EditIdea from "./pages/EditIdea";
import Profile from "./pages/Profile";
import EditProfile from "./pages/EditProfile";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        path="/feed"
        element={
          <RequireAuth>
            <Feed />
          </RequireAuth>
        }
      />
      <Route
        path="/ideas/new"
        element={
          <RequireAuth>
            <CreateIdea />
          </RequireAuth>
        }
      />
      <Route
        path="/ideas/:id"
        element={
          <RequireAuth>
            <IdeaDetails />
          </RequireAuth>
        }
      />
      <Route
        path="/ideas/:id/edit"
        element={
          <RequireAuth>
            <EditIdea />
          </RequireAuth>
        }
      />
      <Route
        path="/profile/me"
        element={
          <RequireAuth>
            <Profile mode="me" />
          </RequireAuth>
        }
      />
      <Route
        path="/profile/:id"
        element={
          <RequireAuth>
            <Profile mode="user" />
          </RequireAuth>
        }
      />
      <Route
        path="/profile/me/edit"
        element={
          <RequireAuth>
            <EditProfile />
          </RequireAuth>
        }
      />

      <Route path="/" element={<Navigate to="/login" replace />} />

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

function RequireAuth({ children }: { children: JSX.Element }) {
  const { accessToken } = useAuth();
  const token = accessToken || localStorage.getItem("accessToken");
  if (!token) return <Navigate to="/login" replace />;
  return children;
}
