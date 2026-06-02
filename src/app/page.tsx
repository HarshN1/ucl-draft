'use client';

import { GameState } from '@/types';
import { useDraft } from '@/hooks/useDraft';
import { useSound } from '@/hooks/useSound';
import { findUserMatch } from '@/engine/bracketEngine';

import { LandingScreen } from '@/screens/LandingScreen';
import { FormationScreen } from '@/screens/FormationScreen';
import { DraftScreen } from '@/screens/DraftScreen';
import { SubDraftScreen } from '@/screens/SubDraftScreen';
import { DraftScoreScreen } from '@/screens/DraftScoreScreen';
import { BracketScreen } from '@/screens/BracketScreen';
import { MatchScreen } from '@/screens/MatchScreen';
import { TrophyScreen } from '@/screens/TrophyScreen';

export default function Home() {
  const draft = useDraft();
  const { initAudio, playGoal } = useSound();

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
          onSelect={draft.selectFormation}
        />
      );

    case GameState.DRAFT:
      if (!draft.formation) return null;
      return (
        <DraftScreen
          key={draft.currentPickIndex}
          formation={draft.formation}
          currentPickIndex={draft.currentPickIndex}
          pendingSlotIndices={draft.pendingSlotIndices ?? []}
          currentCards={draft.currentCards}
          draftedStarters={draft.draftedStarters}
          currentChemistry={draft.chemPreview}
          onPick={draft.pickStarter}
        />
      );

    case GameState.SUB_DRAFT:
      return (
        <SubDraftScreen
          key={draft.currentPickIndex}
          currentPickIndex={draft.currentPickIndex}
          currentCards={draft.currentCards}
          onPick={draft.pickSub}
        />
      );

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
          onPlayAgain={draft.reset}
        />
      );

    default:
      return null;
  }
}
