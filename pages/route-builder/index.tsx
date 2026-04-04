import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import styled from 'styled-components';
import { NextPage } from 'next';
import { useDropzone } from 'react-dropzone';
import { Card, Header } from '../../components/Layout';
import { Button } from '../../components/Button';
import {
  GameSelector,
  CurrentPositionCard,
  AvailableActionsSection,
  RouteHistorySection,
  PartySection,
  BagSection,
} from '../../components/route-builder';
import {
  // Types
  RouteBuilderGameConfig,
  RouteBuilderPokemonInParty,
  RouteBuilderRouteEntry,
  RouteBuilderStep,
  RouteBuilderTrainer,
  RouteBuilderOption,
  RouteBuilderBattleAction,
  RouteBuilderTrainerBattleAction,
  // Game Config
  getRouteBuilderGames,
  getRouteBuilderGame,
  getRouteBuilderStep,
  // State Management
  getCurrentRouteBuilderStep,
  buildInitialRoute,
  buildRouteBuilderState,
  buildRouteBuilderPartySnapshots,
  hydrateRouteBuilderPartySnapshots,
  getAvailableOptionsForStep,
  getRouteBuilderBattleAction,
  // Battle Calculations
  getActiveTrainerBattle,
  getAvailableTrainersForStep,
  getAvailableRouteBuilderBattleActions,
  getAvailableTrainerBattleActions,
  // Validation & Import/Export
  parseRouteBuilderImport,
  buildRouteExportData,
} from '../../utils/route-builder';

interface RouteBuilderSession {
  route: RouteBuilderRouteEntry[];
  partySnapshots: RouteBuilderPokemonInParty[][];
}

interface RouteHistoryItem {
  entry: RouteBuilderRouteEntry;
  step: RouteBuilderStep | undefined;
  trainer?: RouteBuilderTrainer;
  substeps: string[];
}

/**
 * RouteBuilderPage
 * 
 * Main page component for the route builder feature. Orchestrates all sub-components
 * and manages the application state for route building.
 * 
 * Key responsibilities:
 * - Game selection and initialization
 * - Route state management (route entries and party snapshots)
 * - Event handling for all route actions
 * - Import/Export functionality
 * - Undo/Reset functionality
 */
const RouteBuilderPage: NextPage = () => {
  // Static data
  const availableGames = useMemo(() => getRouteBuilderGames(), []);

  // UI State
  const [selectedGameId, setSelectedGameId] = useState('');
  const [routeSession, setRouteSession] = useState<RouteBuilderSession>({
    route: [],
    partySnapshots: [],
  });
  const [expandedExperienceRoutes, setExpandedExperienceRoutes] = useState<Record<string, boolean>>({});
  const [isBagExpanded, setIsBagExpanded] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const routeListRef = useRef<HTMLDivElement | null>(null);

  const { route, partySnapshots } = routeSession;

  // Derived state - Game and current position
  const activeGame = useMemo(() => (
    selectedGameId ? getRouteBuilderGame(selectedGameId) ?? null : null
  ), [selectedGameId]);

  const currentStep = useMemo(() => (
    activeGame ? getCurrentRouteBuilderStep(activeGame, route) ?? null : null
  ), [activeGame, route]);

  // Derived state - Route state (party and bag)
  const routeState = useMemo(() => (
    activeGame
      ? buildRouteBuilderState(activeGame, route)
      : { party: [], bag: {} }
  ), [activeGame, route]);

  // Derived state - Available actions
  const availableBattleActions = useMemo(() => (
    activeGame ? getAvailableRouteBuilderBattleActions(activeGame, route, routeState.party) : []
  ), [activeGame, route, routeState.party]);

  const trainersInCurrentArea = useMemo(() => (
    activeGame && currentStep ? getAvailableTrainersForStep(activeGame.id, currentStep.id, route) : []
  ), [activeGame, currentStep, route]);

  const availableStepOptions = useMemo(() => (
    activeGame && currentStep ? getAvailableOptionsForStep(activeGame, currentStep, route) : []
  ), [activeGame, currentStep, route]);

  // Derived state - Battle status
  const activeTrainerBattle = useMemo(() => (
    activeGame ? getActiveTrainerBattle(activeGame.id, route) : null
  ), [activeGame, route]);

  const availableTrainerBattleActions = useMemo(() => (
    activeGame ? getAvailableTrainerBattleActions(activeGame, route, routeState.party) : []
  ), [activeGame, route, routeState.party]);

  const isInWildBattle = Boolean(currentStep?.battle);
  const isInTrainerBattle = Boolean(activeTrainerBattle);
  const isInBattle = isInWildBattle || isInTrainerBattle;

  // Derived state - Target HP displays
  const activeWildBattleTargetHp = useMemo(() => {
    const actionWithTargetHp = availableBattleActions.find(action => action.targetHpSummary);
    return actionWithTargetHp?.targetHpSummary ?? null;
  }, [availableBattleActions]);

  const activeTrainerBattleTargetHp = useMemo(() => {
    const actionWithTargetHp = availableTrainerBattleActions.find(action => action.targetHpSummary);
    return actionWithTargetHp?.targetHpSummary ?? null;
  }, [availableTrainerBattleActions]);

  // Derived state - Route history for display
  const routeHistory = useMemo(() => {
    if (!activeGame) return [];

    return route.reduce<Array<RouteHistoryItem>>((history, entry) => {
      if (entry.type === 'step') {
        return [
          ...history,
          {
            entry,
            step: getRouteBuilderStep(activeGame, entry.stepId),
            substeps: [],
          },
        ];
      }

      if (entry.type === 'trainerBattle') {
        const trainer = entry.trainerId ? require('../../utils/route-builder').getTrainerData(activeGame.id, entry.trainerId) : undefined;

        if (!trainer) return history;

        return [
          ...history,
          {
            entry,
            step: undefined,
            trainer,
            substeps: [],
          },
        ];
      }

      if (history.length === 0) return history;

      const previousItem = history[history.length - 1];
      const { substeps: previousSubsteps } = previousItem;
      const battleAction = entry.type === 'battleAction'
        ? getRouteBuilderBattleAction(previousItem.step, entry.battleActionId)
        : null;
      let substeps = previousSubsteps;

      if (battleAction) {
        substeps = [...previousSubsteps, battleAction.label];
      } else if (entry.label) {
        substeps = [...previousSubsteps, entry.label];
      }

      return [
        ...history.slice(0, -1),
        {
          ...previousItem,
          substeps,
        },
      ];
    }, []);
  }, [activeGame, route]);

  // ==================== Event Handlers ====================

  const handleSelectGame = useCallback((gameId: string) => {
    setSelectedGameId(gameId);
    setImportError(null);

    if (!gameId) {
      setRouteSession({ route: [], partySnapshots: [] });
      return;
    }

    const nextGame = getRouteBuilderGame(gameId);

    if (!nextGame) {
      setRouteSession({ route: [], partySnapshots: [] });
      return;
    }

    const nextRoute = buildInitialRoute(nextGame);
    setRouteSession({
      route: nextRoute,
      partySnapshots: buildRouteBuilderPartySnapshots(nextGame, nextRoute),
    });
  }, []);

  const handleExport = useCallback(() => {
    if (!activeGame || route.length === 0) return;

    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(
      buildRouteExportData(activeGame.id, route, partySnapshots),
      null,
      2,
    )], {
      type: 'application/json',
    }));

    a.setAttribute('download', `${activeGame.id}-route.json`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, [activeGame, partySnapshots, route]);

  const handleImport = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 1) {
      setImportError('Only one route file may be selected at a time.');
      return;
    }

    if (acceptedFiles.length === 0) {
      setImportError('An unknown issue occurred trying to load the file.');
      return;
    }

    const [acceptedFile] = acceptedFiles;

    if (!acceptedFile.name.endsWith('.json')) {
      setImportError('Route files must end in .json');
      return;
    }

    const reader = new FileReader();

    reader.onabort = () => {
      setImportError('The file read process was aborted.');
    };

    reader.onerror = () => {
      setImportError('An unknown issue occurred trying to load the file. The file may be corrupted.');
    };

    reader.onload = () => {
      try {
        const importedJSON = JSON.parse(reader.result?.toString() ?? '');
        const importedRoute = parseRouteBuilderImport(importedJSON);
        const importedGame = getRouteBuilderGame(importedRoute.gameId);

        if (!importedGame) {
          throw new Error(`Unsupported game "${importedRoute.gameId}".`);
        }

        setSelectedGameId(importedRoute.gameId);
        setRouteSession({
          route: importedRoute.route,
          partySnapshots: importedRoute.partySnapshots
            ? hydrateRouteBuilderPartySnapshots(importedGame.id, importedRoute.partySnapshots)
            : buildRouteBuilderPartySnapshots(importedGame, importedRoute.route),
        });
        setExpandedExperienceRoutes({});
        setImportError(null);
      } catch (error) {
        setImportError(`The route could not be read: ${error}.`);
      }
    };

    reader.readAsBinaryString(acceptedFile);
  }, []);

  const appendRouteEntry = useCallback((entry: RouteBuilderRouteEntry) => {
    if (!activeGame) return;

    setRouteSession(previousSession => {
      const { getRouteBuilderRuntimeState, applyRouteBuilderEntry } = require('../../utils/route-builder');
      const runtimeState = previousSession.partySnapshots.length > 0
        ? getRouteBuilderRuntimeState(
          activeGame,
          previousSession.route,
          previousSession.partySnapshots[previousSession.partySnapshots.length - 1],
        )
        : getRouteBuilderRuntimeState(activeGame, previousSession.route);
      const nextRuntimeState = applyRouteBuilderEntry(
        activeGame,
        runtimeState,
        entry,
        previousSession.route.length,
      );

      return {
        route: [...previousSession.route, entry],
        partySnapshots: [...previousSession.partySnapshots, nextRuntimeState.party],
      };
    });
  }, [activeGame]);

  const {
    getRootProps: getImportRootProps,
    getInputProps: getImportInputProps,
    isDragActive,
  } = useDropzone({
    onDrop: handleImport,
    noClick: true,
    multiple: false,
    accept: '.json' as any,
  });

  const handleTakeOption = useCallback((targetStepId: string, option: RouteBuilderOption) => {
    appendRouteEntry({
      type: 'step',
      stepId: targetStepId,
      arrivedViaOptionId: option.id,
      optionEffects: option.effects,
    });
  }, [appendRouteEntry]);

  const handleTakeBattleAction = useCallback((action: RouteBuilderBattleAction) => {
    if (!currentStep?.battle) return;

    const { battle } = currentStep;

    appendRouteEntry({
      type: 'battleAction',
      stepId: currentStep.id,
      battleActionId: action.id,
    });

    if (action.type === 'ko') {
      appendRouteEntry({
        type: 'step',
        stepId: battle.onKoTargetStepId,
        arrivedViaOptionId: action.id,
      });
    }
  }, [appendRouteEntry, currentStep]);

  const handleStartTrainerBattle = useCallback((trainer: RouteBuilderTrainer) => {
    if (!currentStep) return;

    appendRouteEntry({
      type: 'trainerBattle',
      stepId: currentStep.id,
      trainerId: trainer.id,
      label: `Battle ${trainer.name}`,
    });
  }, [appendRouteEntry, currentStep]);

  const handleTakeTrainerBattleAction = useCallback((action: RouteBuilderTrainerBattleAction) => {
    if (!currentStep) return;

    appendRouteEntry({
      type: 'trainerBattleAction',
      stepId: currentStep.id,
      trainerId: action.trainerId,
      trainerPokemonIndex: action.trainerPokemonIndex,
      trainerBattleActionType: action.type,
      label: action.label,
    });
  }, [appendRouteEntry, currentStep]);

  const handleUndo = useCallback(() => {
    setRouteSession(previousSession => (
      previousSession.route.length > 1
        ? {
          route: previousSession.route.slice(0, -1),
          partySnapshots: previousSession.partySnapshots.slice(0, -1),
        }
        : previousSession
    ));
  }, []);

  const handleReset = useCallback(() => {
    if (!activeGame) {
      setRouteSession({ route: [], partySnapshots: [] });
      return;
    }

    const nextRoute = buildInitialRoute(activeGame);
    setRouteSession({
      route: nextRoute,
      partySnapshots: buildRouteBuilderPartySnapshots(activeGame, nextRoute),
    });
  }, [activeGame]);

  const handleToggleExperienceRoute = useCallback((pokemonKey: string) => {
    setExpandedExperienceRoutes(previousState => ({
      ...previousState,
      [pokemonKey]: !previousState[pokemonKey],
    }));
  }, []);

  // Auto-scroll route history to bottom
  useEffect(() => {
    if (!routeListRef.current) return;
    routeListRef.current.scrollTop = routeListRef.current.scrollHeight;
  }, [routeHistory.length]);

  // ==================== Render ====================

  return (
    <Container {...getImportRootProps()}>
      <input {...getImportInputProps()} />
      
      <LeftColumn>
        <Header>
          Route Builder
          <div>
            <Button onClick={handleExport} disabled={!activeGame || route.length === 0}>Export Route</Button>
            <Button onClick={handleReset} disabled={!activeGame}>Reset Route</Button>
          </div>
        </Header>

        <GameSelector
          availableGames={availableGames}
          selectedGameId={selectedGameId}
          onSelectGame={handleSelectGame}
        />

        {!activeGame && (
          <ImportCard variant="neutral" isDragActive={isDragActive}>
            <h3>Select a game to begin.</h3>
            <p>This will initialize the route at that game&apos;s configured starting step.</p>
            <ImportHint isDragActive={isDragActive}>
              {isDragActive ? 'Drop route JSON here to import it.' : 'Drag a previously exported route JSON here to import it.'}
            </ImportHint>
            {importError && <ImportErrorText>{importError}</ImportErrorText>}
          </ImportCard>
        )}

        {activeGame && currentStep && (
          <PaneSection>
            {importError && (
              <ImportFeedbackCard variant="warning">
                <p>{importError}</p>
              </ImportFeedbackCard>
            )}

            <CurrentPositionCard
              currentStep={currentStep}
              activeTrainerBattle={activeTrainerBattle}
              activeWildBattleTargetHp={activeWildBattleTargetHp}
              activeTrainerBattleTargetHp={activeTrainerBattleTargetHp}
            />

            <AvailableActionsSection
              isInBattle={isInBattle}
              isInTrainerBattle={isInTrainerBattle}
              isInWildBattle={isInWildBattle}
              availableStepOptions={availableStepOptions}
              trainersInCurrentArea={trainersInCurrentArea}
              availableBattleActions={availableBattleActions}
              availableTrainerBattleActions={availableTrainerBattleActions}
              route={route}
              onTakeOption={handleTakeOption}
              onTakeBattleAction={handleTakeBattleAction}
              onStartTrainerBattle={handleStartTrainerBattle}
              onTakeTrainerBattleAction={handleTakeTrainerBattleAction}
              onUndo={handleUndo}
            />
          </PaneSection>
        )}
      </LeftColumn>

      <RightColumn>
        <Header>Current Route</Header>
        {activeGame ? (
          <>
            <PartySection
              party={routeState.party}
              expandedExperienceRoutes={expandedExperienceRoutes}
              onToggleExperienceRoute={handleToggleExperienceRoute}
            />

            <BagSection
              bag={routeState.bag}
              isBagExpanded={isBagExpanded}
              onToggleBag={() => setIsBagExpanded(!isBagExpanded)}
            />

            <RouteHistorySection
              activeGame={activeGame}
              routeHistory={routeHistory}
              routeListRef={routeListRef}
            />
          </>
        ) : (
          <RoutePlaceholder>Select a game to start building a route.</RoutePlaceholder>
        )}
      </RightColumn>
    </Container>
  );
};

export default RouteBuilderPage;

// ==================== Styled Components ====================

const Container = styled.div`
  display: grid;
  height: 100%;
  grid-template-columns: minmax(0, 1.4fr) minmax(320px, 0.8fr);

  & > div {
    padding: 1rem;
  }
`;

const LeftColumn = styled.div`
  display: flex;
  min-height: 0;
  flex-direction: column;
  overflow-y: auto;
`;

const RightColumn = styled.div`
  display: flex;
  min-height: 0;
  flex-direction: column;
  overflow-y: hidden;
  border-left: 1px solid ${({ theme }) => theme.input.border};
`;

const PaneSection = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 0;
`;

const ImportCard = styled(Card)<{ isDragActive: boolean; }>`
  margin-top: 0;
  border: 2px dashed ${({ theme }) => theme.input.border};
`;

const ImportHint = styled.p<{ isDragActive: boolean; }>`
  margin-top: 1rem;
  margin-bottom: 0;
  font-weight: 700;
  color: ${({ theme, isDragActive }) => (isDragActive ? theme.primary : theme.label)};
`;

const ImportErrorText = styled.p`
  margin-top: 0.75rem;
  margin-bottom: 0;
  color: ${({ theme }) => theme.danger ?? '#c0392b'};
`;

const ImportFeedbackCard = styled(Card)`
  margin-top: 0;
  margin-bottom: 1rem;
`;

const RoutePlaceholder = styled.div`
  color: ${({ theme }) => theme.label};
  font-style: italic;
  margin-top: 1rem;
`;
