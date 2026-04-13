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
  RouteBuilderPokemonInParty,
  RouteBuilderRouteEntry,
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
  getRouteBuilderRuntimeState,
  applyRouteBuilderEntry,
  clonePartyState,
  buildRouteBuilderPartySnapshots,
  hydrateRouteBuilderPartySnapshots,
  getAvailableOptionsForStep,
  getAvailableBagItems,
  getRouteBuilderBattleAction,
  // Battle Calculations
  getActiveTrainerBattle,
  getAvailableTrainersForStep,
  getAvailableRouteBuilderBattleActions,
  getAvailableTrainerBattleActions,
  getRouteEntriesToUndo,
  getBattleActionInsertionIndex,
  getBattleActionRouteIndex,
  getTrainerData,
  removeSelectedBattleEntry,
  // Validation & Import/Export
  parseRouteBuilderImport,
  RouteHistoryItem,
  RouteHistoryItemBattleActionEntry,
} from '../../utils/route-builder';
import { ExportRouteButton } from '../../components/route-builder/ExportRouteButton';

interface RouteBuilderSession {
  route: RouteBuilderRouteEntry[];
  partySnapshots: RouteBuilderPokemonInParty[][];
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
  const [isSelectingItem, setIsSelectingItem] = useState(false);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState<number | null>(null);
  const [routeGapIndex, setRouteGapIndex] = useState<number | null>(null);
  const [selectedBattleActionIndex, setSelectedBattleActionIndex] = useState<number | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const routeListRef = useRef<HTMLDivElement | null>(null);

  const { route, partySnapshots } = routeSession;

  const routePrefix = useMemo(() => {
    if (selectedRouteIndex === null) return route;

    let prefixLength = selectedRouteIndex + 1;

    // If a battle action is selected, include battle actions up to that point
    if (selectedBattleActionIndex !== null) {
      // Count battle actions up to the selected point
      let battleActionCount = 0;
      let currentStepIndex = 0;
      let currentBattleActionIndex = 0;

      for (let i = 0; i < route.length && currentStepIndex <= selectedRouteIndex; i += 1) {
        const entry = route[i];
        if (entry.type === 'step' || entry.type === 'trainerBattle') {
          if (currentStepIndex < selectedRouteIndex) {
            // Count all battle actions for previous steps
            let j = i + 1;
            while (j < route.length && (route[j].type === 'battleAction' || route[j].type === 'itemUsage')) {
              battleActionCount += 1;
              j += 1;
            }
            i = j - 1; // Skip the battle actions we just counted
          } else if (currentStepIndex === selectedRouteIndex) {
            // Count battle actions up to but not including the selected one for the current step
            let j = i + 1;
            while (j < route.length && (route[j].type === 'battleAction' || route[j].type === 'itemUsage') && currentBattleActionIndex < selectedBattleActionIndex) {
              battleActionCount += 1;
              currentBattleActionIndex += 1;
              j += 1;
            }
            break;
          }
          currentStepIndex += 1;
        }
      }
      prefixLength += battleActionCount;
    }

    return route.slice(0, prefixLength);
  }, [route, selectedRouteIndex, selectedBattleActionIndex]);

  // Derived state - Game and current position
  const activeGame = useMemo(() => (
    selectedGameId ? getRouteBuilderGame(selectedGameId) ?? null : null
  ), [selectedGameId]);

  const currentStep = useMemo(() => (
    activeGame ? getCurrentRouteBuilderStep(activeGame, routePrefix) ?? null : null
  ), [activeGame, routePrefix]);

  // Derived state - Route history for display
  const routeHistory = useMemo(() => {
    if (!activeGame) return [];

    const historyItems: Array<RouteHistoryItem> = [];
    let currentBattleActions: Array<RouteHistoryItemBattleActionEntry> = [];

    for (let entryIndex = 0; entryIndex < route.length; entryIndex += 1) {
      const entry = route[entryIndex];
      const gapBefore = routeGapIndex !== null && routeGapIndex === entryIndex;

      if (entry.type === 'step' || entry.type === 'trainerBattle') {
        // If we have accumulated battle actions, add them to the previous step
        if (historyItems.length > 0 && currentBattleActions.length > 0) {
          historyItems[historyItems.length - 1].battleActionEntries = currentBattleActions;
          currentBattleActions = [];
        }

        if (entry.type === 'step') {
          historyItems.push({
            entry,
            step: getRouteBuilderStep(activeGame, entry.stepId),
            routeIndex: entryIndex,
            gapBefore,
          });
        } else if (entry.type === 'trainerBattle') {
          const trainer = entry.trainerId ? getTrainerData(activeGame.id, entry.trainerId) : undefined;

          if (trainer) {
            historyItems.push({
              entry,
              step: undefined,
              trainer,
              routeIndex: entryIndex,
              gapBefore,
            });
          }
        }
      } else if (entry.type === 'battleAction' || entry.type === 'itemUsage') {
        const battleAction = entry.type === 'battleAction'
          ? getRouteBuilderBattleAction(historyItems[historyItems.length - 1]?.step, entry.battleActionId)
          : null;
        const label = battleAction?.label || entry.label || 'Unknown action';
        const isKo = entry.type === 'battleAction' && entry.battleActionId === 'ko';

        currentBattleActions.push({
          entry,
          label,
          isKo,
        });
      }
    }

    if (historyItems.length > 0 && currentBattleActions.length > 0) {
      historyItems[historyItems.length - 1].battleActionEntries = currentBattleActions;
    }

    return historyItems;
  }, [activeGame, route, routeGapIndex]);

  const selectedBattleHasKo = useMemo(() => {
    if (selectedRouteIndex === null || selectedBattleActionIndex !== null) return false;
    const historyItem = routeHistory.find(item => item.routeIndex === selectedRouteIndex);
    return Boolean(historyItem?.battleActionEntries?.some(entry => entry.isKo));
  }, [routeHistory, selectedRouteIndex, selectedBattleActionIndex]);

  const routeState = useMemo(() => {
    if (!activeGame) return null;
    return getRouteBuilderRuntimeState(activeGame, route);
  }, [activeGame, route]);

  // Derived state - Available actions
  const availableBattleActions = useMemo(() => {
    if (!activeGame || !routeState) return [];
    if (selectedBattleHasKo) return [];
    return getAvailableRouteBuilderBattleActions(activeGame, routePrefix, routeState.party);
  }, [activeGame, routePrefix, routeState, selectedBattleHasKo]);

  const trainersInCurrentArea = useMemo(() => (
    activeGame && currentStep ? getAvailableTrainersForStep(activeGame.id, currentStep.id, route) : []
  ), [activeGame, currentStep, route]);

  const availableStepOptions = useMemo(() => (
    activeGame && currentStep ? getAvailableOptionsForStep(activeGame, currentStep, route) : []
  ), [activeGame, currentStep, route]);

  // Derived state - Battle status
  const activeTrainerBattle = useMemo(() => (
    activeGame ? getActiveTrainerBattle(activeGame.id, routePrefix) : null
  ), [activeGame, routePrefix]);

  const availableTrainerBattleActions = useMemo(() => {
    if (!activeGame || !routeState) return [];
    if (selectedBattleHasKo) return [];
    return getAvailableTrainerBattleActions(activeGame, routePrefix, routeState.party);
  }, [activeGame, routePrefix, routeState, selectedBattleHasKo]);

  const isInWildBattle = Boolean(currentStep?.battle);
  const isInTrainerBattle = Boolean(activeTrainerBattle);
  const isInBattle = isInWildBattle || isInTrainerBattle;

  const availableItems = useMemo(() => {
    if (!activeGame || !currentStep) return [];
    if (currentStep.disableItemUsage) return [];

    return getAvailableBagItems(activeGame, route, isInBattle ? 'battle' : 'outside');
  }, [activeGame, currentStep, route, isInBattle]);

  // Derived state - Target HP displays
  const activeWildBattleTargetHp = useMemo(() => {
    const actionWithTargetHp = availableBattleActions.find(action => action.targetHpSummary);
    return actionWithTargetHp?.targetHpSummary ?? null;
  }, [availableBattleActions]);

  const activeTrainerBattleTargetHp = useMemo(() => {
    const actionWithTargetHp = availableTrainerBattleActions.find(action => action.targetHpSummary);
    return actionWithTargetHp?.targetHpSummary ?? null;
  }, [availableTrainerBattleActions]);

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

      const newRoute = [...previousSession.route, entry];
      const newPartySnapshots = [...previousSession.partySnapshots, nextRuntimeState.party];

      // Move selection to the newly appended step
      setSelectedRouteIndex(newRoute.length - 1);

      return {
        route: newRoute,
        partySnapshots: newPartySnapshots,
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
    accept: '.json',
  });

  const recomputeSnapshotsFromIndex = useCallback((newRoute: RouteBuilderRouteEntry[], startIndex: number) => {
    if (!activeGame) return [];

    const prefixRoute = newRoute.slice(0, startIndex);
    const runtimeState = getRouteBuilderRuntimeState(activeGame, prefixRoute);
    let state = runtimeState;
    const recomputedSnapshots: RouteBuilderPokemonInParty[][] = [];

    for (let index = startIndex; index < newRoute.length; index += 1) {
      state = applyRouteBuilderEntry(activeGame, state, newRoute[index], index);
      recomputedSnapshots.push(clonePartyState(state.party));
    }

    return recomputedSnapshots;
  }, [activeGame]);

  const insertRouteEntryAtIndex = useCallback((entry: RouteBuilderRouteEntry, insertionIndex: number) => {
    if (!activeGame) return;

    setRouteSession(previousSession => {
      const newRoute = [
        ...previousSession.route.slice(0, insertionIndex),
        entry,
        ...previousSession.route.slice(insertionIndex),
      ];
      const recomputedSnapshots = recomputeSnapshotsFromIndex(newRoute, insertionIndex);

      return {
        route: newRoute,
        partySnapshots: [
          ...previousSession.partySnapshots.slice(0, insertionIndex),
          ...recomputedSnapshots,
        ],
      };
    });
  }, [activeGame, recomputeSnapshotsFromIndex]);

  const handleTakeBattleAction = useCallback((action: RouteBuilderBattleAction) => {
    if (action.type === 'item') {
      setSelectedItem(null);
      setIsSelectingItem(true);
      return;
    }

    if (!currentStep?.battle) return;

    const historyItem = selectedRouteIndex !== null
      ? routeHistory.find(item => item.routeIndex === selectedRouteIndex)
      : undefined;

    const insertionIndex = selectedRouteIndex !== null
      ? getBattleActionInsertionIndex(route, routeHistory, selectedRouteIndex, selectedBattleActionIndex)
      : null;

    const newEntry: RouteBuilderRouteEntry = {
      type: 'battleAction',
      stepId: currentStep.id,
      battleActionId: action.id,
      label: action.label,
    };

    if (insertionIndex !== null && action.type !== 'ko') {
      insertRouteEntryAtIndex(newEntry, insertionIndex);

      if (selectedBattleActionIndex !== null) {
        setSelectedBattleActionIndex(selectedBattleActionIndex + 1);
      } else if (historyItem?.battleActionEntries) {
        const firstKoIndex = historyItem.battleActionEntries.findIndex(entry => entry.isKo);
        setSelectedBattleActionIndex(firstKoIndex === -1 ? historyItem.battleActionEntries.length : firstKoIndex);
      }
      return;
    }

    appendRouteEntry(newEntry);

    if (action.type === 'ko') {
      appendRouteEntry({
        type: 'step',
        stepId: currentStep.battle.onKoTargetStepId,
        arrivedViaOptionId: action.id,
      });
    }
  }, [appendRouteEntry, currentStep, insertRouteEntryAtIndex, route, routeHistory, selectedBattleActionIndex, selectedRouteIndex]);

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
    if (action.type === 'item') {
      setSelectedItem(null);
      setIsSelectingItem(true);
      return;
    }

    if (!currentStep) return;

    appendRouteEntry({
      type: 'trainerBattleAction',
      stepId: currentStep.id,
      trainerId: action.trainerId,
      trainerPokemonIndex: action.trainerPokemonIndex,
      trainerBattleActionType: action.type,
      label: action.label,
    });

    if (
      action.type === 'ko'
      && activeTrainerBattle
      && typeof activeTrainerBattle.selectedPokemonIndex === 'number'
    ) {
      const defeatedPokemonIndexes = [
        ...activeTrainerBattle.defeatedPokemonIndexes,
        activeTrainerBattle.selectedPokemonIndex,
      ];
      const defeatedUniqueIndexes = [...new Set(defeatedPokemonIndexes)];

      if (defeatedUniqueIndexes.length >= activeTrainerBattle.trainer.pokemon.length) {
        appendRouteEntry({
          type: 'step',
          stepId: currentStep.id,
          arrivedViaOptionId: action.id,
        });
      }
    }
  }, [appendRouteEntry, activeTrainerBattle, currentStep]);

  const handleSelectItem = useCallback((itemName: string) => {
    setSelectedItem(itemName);
    setIsSelectingItem(true);
  }, []);

  const handleCancelItemSelection = useCallback(() => {
    setIsSelectingItem(false);
    setSelectedItem(null);
  }, []);

  const handleSelectTarget = useCallback((targetIndex: number) => {
    if (!currentStep || !selectedItem || !routeState) return;

    // Apply item effect and create route entry
    appendRouteEntry({
      type: 'itemUsage',
      stepId: currentStep.id,
      itemName: selectedItem,
      targetPokemonIndex: targetIndex,
      label: `Used ${selectedItem} on ${routeState.party[targetIndex].species}`,
    });

    setSelectedItem(null);
    setIsSelectingItem(false);
  }, [appendRouteEntry, currentStep, selectedItem, routeState]);

  const handleCancelTargetSelection = useCallback(() => {
    setSelectedItem(null);
  }, []);

  const handleReset = useCallback(() => {
    if (!activeGame) {
      setRouteSession({ route: [], partySnapshots: [] });
      setSelectedRouteIndex(null);
      setSelectedBattleActionIndex(null);
      setRouteGapIndex(null);
      return;
    }

    const nextRoute = buildInitialRoute(activeGame);
    setRouteSession({
      route: nextRoute,
      partySnapshots: buildRouteBuilderPartySnapshots(activeGame, nextRoute),
    });
    setSelectedRouteIndex(null);
    setSelectedBattleActionIndex(null);
    setRouteGapIndex(null);
  }, [activeGame]);

  const handleSelectRouteEntry = useCallback((routeIndex: number, battleActionIndex?: number) => {
    setSelectedRouteIndex(routeIndex);
    setSelectedBattleActionIndex(battleActionIndex ?? null);
  }, []);

  const handleControlRouteInsertion = useCallback((entry: RouteBuilderRouteEntry, insertionIndex: number) => {
    if (!activeGame) return;

    const prefixRoute = route.slice(0, insertionIndex);
    const suffixRoute = route.slice(insertionIndex);
    const runtimeState = getRouteBuilderRuntimeState(activeGame, prefixRoute);
    const nextState = applyRouteBuilderEntry(activeGame, runtimeState, entry, insertionIndex);

    const oldNextEntry = suffixRoute[0];
    let nextRoute = [...prefixRoute, entry, ...suffixRoute];
    let nextPartySnapshots = [
      ...partySnapshots.slice(0, insertionIndex),
      clonePartyState(nextState.party),
    ];
    let nextGapIndex: number | null = null;

    const stepCanBridge = (newEntry: RouteBuilderRouteEntry, targetEntry: RouteBuilderRouteEntry) => {
      if (targetEntry.type === 'step') {
        if (newEntry.stepId === targetEntry.stepId) {
          return {
            connected: true,
            updatedNextEntry: {
              ...targetEntry,
              arrivedViaOptionId: newEntry.arrivedViaOptionId,
              optionEffects: newEntry.optionEffects,
            },
            reuseNextEntry: true,
          };
        }

        const nextStep = getRouteBuilderStep(activeGame, newEntry.stepId);
        const connectorOption = nextStep?.options.find(option => option.targetStepId === targetEntry.stepId);

        if (connectorOption) {
          return {
            connected: true,
            updatedNextEntry: {
              ...targetEntry,
              arrivedViaOptionId: connectorOption.id,
            },
            reuseNextEntry: false,
          };
        }
      }

      if (targetEntry.type === 'trainerBattle' && newEntry.type === 'step') {
        return {
          connected: newEntry.stepId === targetEntry.stepId,
          updatedNextEntry: targetEntry,
          reuseNextEntry: true,
        };
      }

      return { connected: false };
    };

    if (oldNextEntry) {
      const { connected, updatedNextEntry, reuseNextEntry } = stepCanBridge(entry, oldNextEntry);

      if (connected) {
        if (reuseNextEntry) {
          nextRoute = [
            ...prefixRoute,
            updatedNextEntry,
            ...suffixRoute.slice(1),
          ];
        } else if (updatedNextEntry) {
          nextRoute = [
            ...prefixRoute,
            entry,
            updatedNextEntry,
            ...suffixRoute.slice(1),
          ];
        }

        const shouldRecomputeSuffix = !reuseNextEntry || updatedNextEntry !== oldNextEntry;

        if (shouldRecomputeSuffix) {
          const suffixStart = reuseNextEntry ? insertionIndex : insertionIndex + 1;
          const recomputedSuffix = recomputeSnapshotsFromIndex(nextRoute, suffixStart);
          nextPartySnapshots = [...nextPartySnapshots, ...recomputedSuffix];
        } else {
          nextPartySnapshots = [...partySnapshots.slice(0, insertionIndex + 1)];
        }

        setSelectedRouteIndex(insertionIndex);
      } else {
        nextGapIndex = insertionIndex + 1;
        nextPartySnapshots = [...nextPartySnapshots, ...partySnapshots.slice(insertionIndex)];
        setSelectedRouteIndex(insertionIndex);
      }
    } else {
      setSelectedRouteIndex(insertionIndex);
    }

    setRouteSession({ route: nextRoute, partySnapshots: nextPartySnapshots });
    setRouteGapIndex(nextGapIndex);
  }, [activeGame, route, partySnapshots, recomputeSnapshotsFromIndex]);

  const handleTakeOption = useCallback((targetStepId: string, option: RouteBuilderOption) => {
    if (option.id === 'use-item') {
      setSelectedItem(null);
      setIsSelectingItem(true);
      return;
    }

    const newEntry: RouteBuilderRouteEntry = {
      type: 'step',
      stepId: targetStepId,
      arrivedViaOptionId: option.id,
      optionEffects: option.effects,
    };

    if (selectedRouteIndex !== null) {
      if (selectedBattleActionIndex !== null) {
        // Insert after the selected battle action
        const historyItem = routeHistory.find(item => item.routeIndex === selectedRouteIndex);
        if (historyItem?.battleActionEntries) {
          const battleActionEntry = historyItem.battleActionEntries[selectedBattleActionIndex];
          const insertionIndex = route.findIndex(entry => entry === battleActionEntry.entry) + 1;
          handleControlRouteInsertion(newEntry, insertionIndex);
          return;
        }
      } else if (selectedRouteIndex < route.length - 1) {
        // Insert after the selected step
        handleControlRouteInsertion(newEntry, selectedRouteIndex + 1);
        return;
      }
    }

    appendRouteEntry(newEntry);
  }, [appendRouteEntry, selectedRouteIndex, selectedBattleActionIndex, handleControlRouteInsertion, routeHistory, route]);

  const handleUndo = useCallback(() => {
    setRouteSession(previousSession => {
      if (!activeGame) return previousSession;

      if (selectedRouteIndex !== null) {
        if (selectedBattleActionIndex !== null) {
          // Remove the currently selected battle action, and also remove a follow-up KO step if present.
          const historyItem = routeHistory.find(item => item.routeIndex === selectedRouteIndex);
          if (historyItem?.battleActionEntries) {
            const routeIndexToRemove = getBattleActionRouteIndex(route, routeHistory, selectedRouteIndex, selectedBattleActionIndex);
            const selectedBattleAction = historyItem.battleActionEntries[selectedBattleActionIndex];

            if (routeIndexToRemove !== null && routeIndexToRemove !== -1) {
              const nextEntry = previousSession.route[routeIndexToRemove + 1];
              const shouldRemoveNextStep = selectedBattleAction?.isKo
                && nextEntry?.type === 'step'
                && typeof nextEntry.arrivedViaOptionId === 'string'
                && nextEntry.arrivedViaOptionId.includes('ko');
              const removeCount = shouldRemoveNextStep ? 2 : 1;

              const newRoute = [
                ...previousSession.route.slice(0, routeIndexToRemove),
                ...previousSession.route.slice(routeIndexToRemove + removeCount),
              ];
              const newPartySnapshots = [
                ...previousSession.partySnapshots.slice(0, routeIndexToRemove),
                ...previousSession.partySnapshots.slice(routeIndexToRemove + removeCount),
              ];

              // Move selection to the next battle action after the removed one,
              // or the previous one if the removed action was the last in the battle.
              const remainingBattleActions = historyItem.battleActionEntries.length - 1;
              if (remainingBattleActions > 0) {
                const nextSelectionIndex = Math.min(selectedBattleActionIndex, remainingBattleActions - 1);
                setSelectedBattleActionIndex(nextSelectionIndex);
              } else {
                setSelectedBattleActionIndex(null);
              }

              return {
                route: newRoute,
                partySnapshots: newPartySnapshots,
              };
            }
          }
        } else {
          // If a whole battle entry is selected, remove the entire battle sequence.
          let newRoute = removeSelectedBattleEntry(previousSession.route, selectedRouteIndex);
          if (newRoute.length !== previousSession.route.length) {
            const removeCount = previousSession.route.length - newRoute.length;
            const newPartySnapshots = [
              ...previousSession.partySnapshots.slice(0, selectedRouteIndex),
              ...previousSession.partySnapshots.slice(selectedRouteIndex + removeCount),
            ];

            let newGapIndex: number | null = null;
            if (selectedRouteIndex > 0 && selectedRouteIndex < newRoute.length) {
              const prevEntry = newRoute[selectedRouteIndex - 1];
              const nextEntry = newRoute[selectedRouteIndex];

              const canConnect = (() => {
                if (prevEntry.type === 'step' && nextEntry.type === 'step') {
                  const prevStep = getRouteBuilderStep(activeGame, prevEntry.stepId);
                  const connectorOption = prevStep?.options.find(option => option.targetStepId === nextEntry.stepId);
                  return !!connectorOption;
                }
                if (prevEntry.type === 'trainerBattle' && nextEntry.type === 'step') {
                  return prevEntry.stepId === nextEntry.stepId;
                }
                return false;
              })();

              if (!canConnect) {
                newGapIndex = selectedRouteIndex;
              }
            }

            setSelectedRouteIndex(selectedRouteIndex > 0 ? selectedRouteIndex - 1 : null);
            setSelectedBattleActionIndex(null);
            setRouteGapIndex(newGapIndex);

            return {
              route: newRoute,
              partySnapshots: newPartySnapshots,
            };
          }

          if (selectedRouteIndex < previousSession.route.length - 1) {
            // Remove the currently selected step and check if it creates a gap
            const removalIndex = selectedRouteIndex;
            newRoute = [
              ...previousSession.route.slice(0, removalIndex),
              ...previousSession.route.slice(removalIndex + 1),
            ];
            const newPartySnapshots = [
              ...previousSession.partySnapshots.slice(0, removalIndex),
              ...previousSession.partySnapshots.slice(removalIndex + 1),
            ];

            // Check if removing this step creates a gap
            let newGapIndex: number | null = null;
            if (removalIndex > 0 && removalIndex < newRoute.length) {
              const prevEntry = newRoute[removalIndex - 1];
              const nextEntry = newRoute[removalIndex];

              // Check if these two entries can be connected
              const canConnect = (() => {
                if (prevEntry.type === 'step' && nextEntry.type === 'step') {
                  const prevStep = getRouteBuilderStep(activeGame, prevEntry.stepId);
                  const connectorOption = prevStep?.options.find(option => option.targetStepId === nextEntry.stepId);
                  return !!connectorOption;
                }
                if (prevEntry.type === 'trainerBattle' && nextEntry.type === 'step') {
                  return prevEntry.stepId === nextEntry.stepId;
                }
                return false;
              })();

              if (!canConnect) {
                newGapIndex = removalIndex;
              }
            }

            // Move selection to the previous step, or null if we removed the first step
            setSelectedRouteIndex(removalIndex > 0 ? removalIndex - 1 : null);
            setSelectedBattleActionIndex(null);
            setRouteGapIndex(newGapIndex);

            return {
              route: newRoute,
              partySnapshots: newPartySnapshots,
            };
          }
        }
      }

      if (previousSession.route.length <= 1) {
        return previousSession;
      }

      const entriesToRemove = getRouteEntriesToUndo(previousSession.route);

      return {
        route: previousSession.route.slice(0, -entriesToRemove),
        partySnapshots: previousSession.partySnapshots.slice(0, -entriesToRemove),
      };
    });
  }, [activeGame, route, selectedRouteIndex, selectedBattleActionIndex, routeHistory]);

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
            <ExportRouteButton activeGame={activeGame} route={route} partySnapshots={partySnapshots} />
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
            <ImportHint isDragActive={isDragActive}>
              {isDragActive ? 'Drop route JSON here to import it.' : 'Drag a previously exported route JSON here to import it.'}
            </ImportHint>
            {importError && <ImportErrorText>{importError}</ImportErrorText>}
          </ImportCard>
        )}

        {activeGame && currentStep && (
          <PaneSection>
            <CurrentPositionCard
              currentStep={currentStep}
              activeTrainerBattle={activeTrainerBattle}
              activeWildBattleTargetHp={activeWildBattleTargetHp}
              activeTrainerBattleTargetHp={activeTrainerBattleTargetHp}
            />

            {isSelectingItem && (
              <ItemSelectionCard>
                {!selectedItem ? (
                  <>
                    <h3>Select an item to use</h3>
                    {availableItems.length === 0 ? (
                      <p>No usable items are available right now.</p>
                    ) : (
                      availableItems.map(itemName => (
                        <Button key={itemName} onClick={() => handleSelectItem(itemName)}>
                          {itemName} ({(routeState?.bag as Record<string, number>)[itemName]})
                        </Button>
                      ))
                    )}
                    <Button onClick={handleCancelItemSelection}>Cancel</Button>
                  </>
                ) : (
                  <>
                    <h3>Use {selectedItem}</h3>
                    <p>Select a target Pokémon.</p>
                    {routeState?.party.map((pokemon, index) => (
                      <Button key={`${pokemon.species}-${index}`} onClick={() => handleSelectTarget(index)}>
                        {pokemon.species} Lv. {pokemon.level}
                      </Button>
                    ))}
                    <Button onClick={handleCancelTargetSelection}>Cancel</Button>
                  </>
                )}
              </ItemSelectionCard>
            )}

            {!isSelectingItem && (
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
            )}
          </PaneSection>
        )}
      </LeftColumn>

      <RightColumn>
        <Header>Current Route</Header>
        {activeGame ? (
          <>
            <PartySection
              party={routeState?.party ?? []}
              expandedExperienceRoutes={expandedExperienceRoutes}
              onToggleExperienceRoute={handleToggleExperienceRoute}
            />

            <BagSection
              bag={routeState?.bag ?? {}}
              isBagExpanded={isBagExpanded}
              onToggleBag={() => setIsBagExpanded(!isBagExpanded)}
            />

            <RouteHistorySection
              activeGame={activeGame}
              routeHistory={routeHistory}
              selectedRouteIndex={selectedRouteIndex}
              selectedBattleActionIndex={selectedBattleActionIndex}
              onSelectRouteEntry={handleSelectRouteEntry}
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

const RoutePlaceholder = styled.div`
  color: ${({ theme }) => theme.label};
  font-style: italic;
  margin-top: 1rem;
`;

const ItemSelectionCard = styled(Card)`
  margin-bottom: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1rem;
`;
