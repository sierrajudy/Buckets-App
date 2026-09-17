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
import { Friends } from "./components/Friends";
import { FriendProfile } from "./components/FriendProfile";
import type { FriendUser } from "./lib/friendsApi";
import { ResetPassword } from "./components/ResetPassword";
import { AceIntro } from "./components/AceIntro";
import { PartyIntro } from "./components/PartyIntro";
import { LoadingScreen } from "./components/LoadingScreen";
import { ReactionOverlay } from "./components/ReactionOverlay";
import { AddedToRoundToast } from "./components/AddedToRoundToast";
import { WolfTransitionLab } from "./dev/WolfTransitionLab";

function AppShell() {
  const { status: authStatus } = useAuth();
  const { state, connecting } = useRoom();
  const [showSplash, setShowSplash] = useState(true);
  const [showStandings, setShowStandings] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showFriends, setShowFriends] = useState(false);
  const [viewingFriend, setViewingFriend] = useState<FriendUser | null>(null);
  const [autoOpenEmailPrefs, setAutoOpenEmailPrefs] = useState(false);
  const [autoOpenAvatarTab, setAutoOpenAvatarTab] = useState(false);
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

  /** Everything below is gated behind auth/connection already being settled
   * (see the early returns in the outer component). Pulled into its own
   * function so a friend add-to-round notice (see AddedToRoundToast) can be
   * rendered as a sibling of whichever of these screens is showing, instead
   * of having to be threaded into every branch individually — presence is
   * account-wide, not tied to any one of them. */
  function renderMain() {
    if (viewingFriend)
      return (
        <FriendProfile
          friendUserId={viewingFriend.id}
          friendName={viewingFriend.name}
          friendAvatar={viewingFriend.profileAvatar}
          friendCostume={viewingFriend.equippedCostume}
          onBack={() => setViewingFriend(null)}
        />
      );

    if (showProfile)
      return (
        <Profile
          onBack={() => {
            setShowProfile(false);
            setAutoOpenEmailPrefs(false);
            setAutoOpenAvatarTab(false);
          }}
          onViewFriend={setViewingFriend}
          autoOpenEmailPrefs={autoOpenEmailPrefs}
          autoOpenAvatarTab={autoOpenAvatarTab}
        />
      );

    if (showStandings) return <Standings onBack={() => setShowStandings(false)} />;

    if (showFriends) return <Friends onBack={() => setShowFriends(false)} />;

    if (!state) {
      return (
        <Home
          onViewStandings={() => setShowStandings(true)}
          onViewProfile={() => setShowProfile(true)}
          onViewFriends={() => setShowFriends(true)}
        />
      );
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
          <>
            <ReactionOverlay />
            <Lobby onViewStandings={() => setShowStandings(true)} onViewProfile={() => setShowProfile(true)} />
          </>
        );
      case "playing":
        return (
          <>
            <ReactionOverlay />
            <Scorecard />
          </>
        );
      case "puttoff":
        return (
          <>
            <ReactionOverlay />
            <PuttOff />
          </>
        );
      case "celebration":
        return (
          <>
            <ReactionOverlay />
            <Celebration
              onViewStandings={() => setShowStandings(true)}
              onViewProfile={() => {
                setAutoOpenEmailPrefs(true);
                setShowProfile(true);
              }}
              onViewAchievements={() => {
                setAutoOpenAvatarTab(true);
                setShowProfile(true);
              }}
            />
          </>
        );
      default:
        return null;
    }
  }

  if (window.location.pathname === "/reset-password") return <ResetPassword />;

  if (showSplash) return <Splash onDone={() => setShowSplash(false)} />;

  if (authStatus === "loading") return <LoadingScreen message="Loading…" />;

  if (authStatus === "anon") return <Auth />;

  if (connecting) return <LoadingScreen message="Reconnecting…" />;

  return (
    <>
      {renderMain()}
      <AddedToRoundToast />
    </>
  );
}

export default function App() {
  // Isolated animation lab — bypasses auth/room entirely (no socket
  // connect, no server, no DB) so it's a plain local component preview.
  // See WolfTransitionLab.tsx for why this exists and when to remove it.
  if (window.location.pathname === "/dev/wolf-transitions") return <WolfTransitionLab />;

  return (
    <AuthProvider>
      <RoomProvider>
        <AppShell />
      </RoomProvider>
    </AuthProvider>
  );
}
