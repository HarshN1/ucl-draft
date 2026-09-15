'use client';

import { useEffect, useState } from 'react';
import { GameState, type SquadSnapshot } from '@/types';
import { useDraft } from '@/hooks/useDraft';
import { useSound } from '@/hooks/useSound';
import { findUserMatch } from '@/engine/bracketEngine';
import { decodeSquadParam, snapshotToSquad } from '@/lib/squadShare';
import { SquadViewer } from '@/components/draft/SquadViewer';
import { SoundToggle } from '@/components/ui/SoundToggle';

import { LandingScreen } from '@/screens/LandingScreen';
import { FormationScreen } from '@/screens/FormationScreen';
import { DraftScreen } from '@/screens/DraftScreen';
import { ManagerScreen } from '@/screens/ManagerScreen';
import { DraftScoreScreen } from '@/screens/DraftScoreScreen';
import { BracketScreen } from '@/screens/BracketScreen';
import { MatchScreen } from '@/screens/MatchScreen';
import { TrophyScreen } from '@/screens/TrophyScreen';

export default function Home() {
  const draft = useDraft();
  const { initAudio, playGoal, playClick, playPick } = useSound();
  const [sharedDismissed, setSharedDismissed] = useState(false);
  const [sharedSnapshot, setSharedSnapshot] = useState<SquadSnapshot | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const param = params.get('s') ?? params.get('draft');
    if (param) {
      setSharedSnapshot(decodeSquadParam(param));
      setSharedDismissed(false);
    }
  }, []);

  const sharedSquad =
    !sharedDismissed && sharedSnapshot ? snapshotToSquad(sharedSnapshot) : null;

  function handleStart() {
    initAudio();
    draft.startGame();
  }

  // Derive current opponent from the bracket
  const userMatchInfo =
    draft.bracket &&
    (draft.gameState === GameState.MATCH_SIM || draft.gameState === GameState.POST_MATCH)
      ? findUserMatch(draft.bracket, draft.currentRound)
      : null;

  const opponent = userMatchInfo?.match
    ? userMatchInfo.match.teamA.isUser
      ? userMatchInfo.match.teamB
      : userMatchInfo.match.teamA
    : null;

  const roundName = draft.bracket?.[draft.currentRound]?.name ?? '';
  const isFinalRound = draft.currentRound === 3;

  if (sharedSquad && sharedSnapshot) {
    return (
      <div className="game-shell stadium-mesh fixed inset-0 overflow-hidden select-none flex items-center justify-center">
        <SoundToggle className="fixed top-3 right-3" />
        <div className="game-stage relative">
          <SquadViewer
            squad={sharedSquad}
            shareUrl={typeof window !== 'undefined' ? window.location.href : undefined}
            onClose={() => {
              setSharedDismissed(true);
              window.history.replaceState({}, '', '/');
            }}
          />
        </div>
      </div>
    );
  }

  const screen = renderScreen();

  return (
    <div className="game-shell stadium-mesh fixed inset-0 overflow-hidden select-none flex items-center justify-center">
      <SoundToggle className="fixed top-3 right-3" />
      <div className="game-stage relative">{screen}</div>
    </div>
  );

  function renderScreen() {
    switch (draft.gameState) {
    case GameState.LANDING:
      return (
        <LandingScreen
          onStart={handleStart}
          isLoading={draft.isLoadingPool}
          error={draft.poolError}
        />
      );

    case GameState.FORMATION_PICK:
      return (
        <FormationScreen
          formations={draft.formationOptions}
          onSelect={(f) => {
            playClick();
            draft.selectFormation(f);
          }}
        />
      );

    case GameState.DRAFT: {
      if (!draft.formation) return null;
      const filledCount =
        draft.starterPlayers.filter(Boolean).length +
        draft.benchPlayers.filter(Boolean).length;
      return (
        <DraftScreen
          formation={draft.formation}
          awaitingCaptain={draft.awaitingCaptain}
          starterPlayers={draft.starterPlayers}
          benchPlayers={draft.benchPlayers}
          benchGroups={draft.benchGroups}
          subsCount={draft.subsCount}
          activeSlot={draft.activeSlot}
          currentCards={draft.currentCards}
          chemPreview={draft.chemPreview}
          squadRating={draft.squadRating}
          filledCount={filledCount}
          getChemPreviewForCandidate={draft.getChemPreviewForCandidate}
          onPickCaptain={draft.pickCaptain}
          onSelectSlot={draft.selectSlot}
          onPickPlayer={draft.pickPlayer}
          onSwapSlots={draft.swapSlots}
          onConfirmSquad={draft.confirmSquad}
          allFilled={draft.allFilled}
          onQuickSimToReview={draft.quickSimToReview}
          onPlayClick={playClick}
          onPlayPick={playPick}
        />
      );
    }

    case GameState.MANAGER_PICK:
      return (
        <ManagerScreen
          managers={draft.managerOptions}
          starters={draft.starterPlayers.filter((p): p is NonNullable<typeof p> => !!p)}
          onPick={(m) => {
            playPick();
            draft.pickManager(m);
          }}
          onQuickSimToReview={() => {
            playClick();
            draft.quickSimToReview();
          }}
        />
      );

    case GameState.SQUAD_REVIEW: {
      if (!draft.formation) return null;
      return (
        <DraftScreen
          formation={draft.formation}
          awaitingCaptain={false}
          starterPlayers={draft.starterPlayers}
          benchPlayers={draft.benchPlayers}
          benchGroups={draft.benchGroups}
          subsCount={draft.subsCount}
          activeSlot={null}
          currentCards={[]}
          chemPreview={draft.chemPreview}
          squadRating={draft.squadRating}
          filledCount={23}
          getChemPreviewForCandidate={draft.getChemPreviewForCandidate}
          onPickCaptain={draft.pickCaptain}
          onSelectSlot={draft.selectSlot}
          onPickPlayer={draft.pickPlayer}
          onSwapSlots={draft.swapSlots}
          reviewMode
          managerName={draft.manager?.name}
          shareSquad={draft.previewSquad}
          onFinishReview={draft.finishSquadReview}
          onQuickSimToReview={() => {
            playClick();
            draft.quickSimToReview();
          }}
          onPlayClick={playClick}
        />
      );
    }

    case GameState.DRAFT_SCORE:
      if (!draft.squad) return null;
      return (
        <DraftScoreScreen
          squad={draft.squad}
          onContinue={draft.confirmDraftScore}
        />
      );

    case GameState.BRACKET_VIEW:
      if (!draft.bracket) return null;
      return (
        <BracketScreen
          rounds={draft.bracket}
          currentRound={draft.currentRound}
          currentMatchIndex={draft.currentMatchIndex}
          onPlayMatch={draft.startMatch}
          teamName={draft.teamName}
          draftScore={draft.squad?.draftScore}
        />
      );

    case GameState.MATCH_SIM:
    case GameState.POST_MATCH:
      if (!draft.squad || !draft.bracket || !opponent) return null;
      return (
        <MatchScreen
          squad={draft.squad}
          opponent={opponent}
          roundIndex={draft.currentRound}
          roundName={roundName}
          isFinalRound={isFinalRound}
          onMatchComplete={draft.setMatchResult}
          onContinue={draft.confirmPostMatch}
          playGoalSound={playGoal}
        />
      );

    case GameState.TROPHY_SCREEN:
      if (!draft.squad) return null;
      return (
        <TrophyScreen
          squad={draft.squad}
          isChampion={draft.isChampion}
          roundReached={draft.currentRound}
          champion={draft.tournamentChampion}
          onPlayAgain={draft.reset}
        />
      );

    default:
      return null;
    }
  }
}
