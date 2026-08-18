import { useEffect, useRef, useState } from "react";
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
import { ResetPassword } from "./components/ResetPassword";
import { AceIntro } from "./components/AceIntro";
import { PartyIntro } from "./components/PartyIntro";
import { LoadingScreen } from "./components/LoadingScreen";

function AppShell() {
  const { status: authStatus } = useAuth();
  const { state, connecting } = useRoom();
  const [showSplash, setShowSplash] = useState(true);
  const [showStandings, setShowStandings] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showAceIntro, setShowAceIntro] = useState(false);
  const [showPartyIntro, setShowPartyIntro] = useState(false);
  const aceShownRef = useRef(false);
  const partyShownRef = useRef(false);

  const holeInOnePlayer = state?.finishedRound?.holeInOnePlayer ?? null;

  useEffect(() => {
    if (state?.phase !== "celebration") {
      aceShownRef.current = false;
      partyShownRef.current = false;
      return;
    }
    if (holeInOnePlayer) {
      if (!aceShownRef.current) {
        aceShownRef.current = true;
        setShowAceIntro(true);
      }
    } else if (!partyShownRef.current) {
      partyShownRef.current = true;
      setShowPartyIntro(true);
    }
  }, [state?.phase, holeInOnePlayer]);

  if (window.location.pathname === "/reset-password") return <ResetPassword />;

  if (showSplash) return <Splash onDone={() => setShowSplash(false)} />;

  if (authStatus === "loading") return <LoadingScreen message="Loading…" />;

  if (authStatus === "anon") return <Auth />;

  if (connecting) return <LoadingScreen message="Reconnecting…" />;

  if (showProfile) return <Profile onBack={() => setShowProfile(false)} />;

  if (showStandings) return <Standings onBack={() => setShowStandings(false)} />;

  if (!state) {
    return <Home onViewStandings={() => setShowStandings(true)} onViewProfile={() => setShowProfile(true)} />;
  }

  if (showAceIntro && holeInOnePlayer) {
    return <AceIntro player={holeInOnePlayer} onDone={() => setShowAceIntro(false)} />;
  }

  if (showPartyIntro && state.finishedRound) {
    return (
      <PartyIntro
        players={state.players.map((p) => ({ name: p.name, avatar: p.avatar }))}
        winner={state.finishedRound.winner}
        onDone={() => setShowPartyIntro(false)}
      />
    );
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
