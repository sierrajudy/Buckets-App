import { useState } from "react";
import { AuthProvider, useAuth } from "./authStore";
import { RoomProvider, useRoom } from "./store";
import { Splash } from "./components/Splash";
import { Auth } from "./components/Auth";
import { Home } from "./components/Home";
import { Lobby } from "./components/Lobby";
import { Scorecard } from "./components/Scorecard";
import { PuttOff } from "./components/PuttOff";
import { Celebration } from "./components/Celebration";
import { Standings } from "./components/Standings";
import { Profile } from "./components/Profile";

function AppShell() {
  const { status: authStatus } = useAuth();
  const { state, connecting } = useRoom();
  const [showSplash, setShowSplash] = useState(true);
  const [showStandings, setShowStandings] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  if (showSplash) return <Splash onDone={() => setShowSplash(false)} />;

  if (authStatus === "loading") {
    return (
      <div className="min-h-screen bg-green-900 flex items-center justify-center text-green-100 text-sm">
        Loading…
      </div>
    );
  }

  if (authStatus === "anon") return <Auth />;

  if (connecting) {
    return (
      <div className="min-h-screen bg-green-900 flex items-center justify-center text-green-100 text-sm">
        Reconnecting…
      </div>
    );
  }

  if (showProfile) return <Profile onBack={() => setShowProfile(false)} />;

  if (showStandings) return <Standings onBack={() => setShowStandings(false)} />;

  if (!state) {
    return <Home onViewStandings={() => setShowStandings(true)} onViewProfile={() => setShowProfile(true)} />;
  }

  switch (state.phase) {
    case "lobby":
      return (
        <Lobby onViewStandings={() => setShowStandings(true)} onViewProfile={() => setShowProfile(true)} />
      );
    case "playing":
      return <Scorecard />;
    case "puttoff":
      return <PuttOff />;
    case "celebration":
      return <Celebration onViewStandings={() => setShowStandings(true)} />;
    default:
      return null;
  }
}

export default function App() {
  return (
    <AuthProvider>
      <RoomProvider>
        <AppShell />
      </RoomProvider>
    </AuthProvider>
  );
}
