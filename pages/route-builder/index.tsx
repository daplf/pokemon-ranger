import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import styled from 'styled-components';
import { NextPage } from 'next';
import { useDropzone } from 'react-dropzone';
import { Card, Header, HelpText, InputRow, InputSection, InputSubheader } from '../../components/Layout';
import { Button } from '../../components/Button';
import {
  applyRouteBuilderEntry,
  buildInitialRoute,
  buildRouteBuilderPartySnapshots,
  buildRouteExportData,
  buildRouteBuilderState,
  getRouteBuilderRuntimeState,
  getActiveTrainerBattle,
  getAvailableTrainersForStep,
  getAvailableTrainerBattleActions,
  getAvailableRouteBuilderBattleActions,
  getAvailableOptionsForStep,
  getTrainerData,
  getCurrentRouteBuilderStep,
  getRouteBuilderBattleAction,
  getRouteBuilderGame,
  getRouteBuilderGames,
  getRouteBuilderStep,
  hydrateRouteBuilderPartySnapshots,
  parseRouteBuilderImport,
  RouteBuilderBattleAction,
  RouteBuilderGameConfig,
  RouteBuilderPokemonInParty,
  RouteBuilderRouteEntry,
  RouteBuilderRuntimeState,
  RouteBuilderStep,
  RouteBuilderTrainer,
  RouteBuilderTrainerBattleAction,
} from '../../utils/routeBuilder';

interface RouteBuilderSession {
  route: RouteBuilderRouteEntry[];
  partySnapshots: RouteBuilderPokemonInParty[][];
}

const RouteBuilderPage: NextPage = () => {
  const availableGames = useMemo(() => getRouteBuilderGames(), []);
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

  const activeGame = useMemo(() => (
    selectedGameId ? getRouteBuilderGame(selectedGameId) ?? null : null
  ), [selectedGameId]);

  const currentStep = useMemo(() => (
    activeGame ? getCurrentRouteBuilderStep(activeGame, route) ?? null : null
  ), [activeGame, route]);

  const routeState = useMemo(() => (
    activeGame
      ? buildRouteBuilderState(activeGame, route)
      : { party: [], bag: {} }
  ), [activeGame, route]);

  const availableBattleActions = useMemo(() => (
    activeGame ? getAvailableRouteBuilderBattleActions(activeGame, route, routeState.party) : []
  ), [activeGame, route, routeState.party]);

  const trainersInCurrentArea = useMemo(() => (
    activeGame && currentStep ? getAvailableTrainersForStep(activeGame.id, currentStep.id, route) : []
  ), [activeGame, currentStep, route]);
  const availableStepOptions = useMemo(() => (
    activeGame && currentStep ? getAvailableOptionsForStep(activeGame, currentStep, route) : []
  ), [activeGame, currentStep, route]);

  const activeTrainerBattle = useMemo(() => (
    activeGame ? getActiveTrainerBattle(activeGame.id, route) : null
  ), [activeGame, route]);

  const availableTrainerBattleActions = useMemo(() => (
    activeGame ? getAvailableTrainerBattleActions(activeGame, route, routeState.party) : []
  ), [activeGame, route, routeState.party]);

  const isInWildBattle = Boolean(currentStep?.battle);
  const isInTrainerBattle = Boolean(activeTrainerBattle);
  const isInBattle = isInWildBattle || isInTrainerBattle;
  const activeWildBattleTargetHp = useMemo(() => {
    const actionWithTargetHp = availableBattleActions.find(action => action.targetHpSummary);

    return actionWithTargetHp?.targetHpSummary ?? null;
  }, [availableBattleActions]);
  const activeTrainerBattleTargetHp = useMemo(() => {
    const actionWithTargetHp = availableTrainerBattleActions.find(action => action.targetHpSummary);

    return actionWithTargetHp?.targetHpSummary ?? null;
  }, [availableTrainerBattleActions]);

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
        const trainer = entry.trainerId ? getTrainerData(activeGame.id, entry.trainerId) : undefined;

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

  const handleSelectGame = useCallback(event => {
    const nextGameId = event.target.value;

    setSelectedGameId(nextGameId);
    setImportError(null);

    if (!nextGameId) {
      setRouteSession({
        route: [],
        partySnapshots: [],
      });

      return;
    }

    const nextGame = getRouteBuilderGame(nextGameId);

    if (!nextGame) {
      setRouteSession({
        route: [],
        partySnapshots: [],
      });

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
      const runtimeState: RouteBuilderRuntimeState = previousSession.partySnapshots.length > 0
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
    accept: '.json',
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
      setRouteSession({
        route: [],
        partySnapshots: [],
      });

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

  useEffect(() => {
    if (!routeListRef.current) return;

    routeListRef.current.scrollTop = routeListRef.current.scrollHeight;
  }, [routeHistory.length]);

  return (
    <Container>
      <LeftColumn>
        <Header>
          Route Builder
          <div>
            <Button onClick={handleExport} disabled={!activeGame || route.length === 0}>Export Route</Button>
            <Button onClick={handleReset} disabled={!activeGame}>Reset Route</Button>
          </div>
        </Header>

        <InputSection>
          <InputSubheader>Game</InputSubheader>
          <InputRow>
            <label htmlFor="routeBuilderGame">Select Game</label>
            <select id="routeBuilderGame" value={selectedGameId} onChange={handleSelectGame}>
              <option value="">Choose a game...</option>
              {availableGames.map(game => (
                <option key={game.id} value={game.id}>{game.id.toUpperCase()}</option>
              ))}
            </select>
            <HelpText>The prototype currently supports BDSP only, but the page is wired to read game data from config files.</HelpText>
          </InputRow>
        </InputSection>

        {!activeGame && (
          <ImportCard variant="neutral" {...getImportRootProps()}>
            <input {...getImportInputProps()} />
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
            <InputSubheader>Current Position</InputSubheader>
            <CurrentStepCard variant="info">
              <h3>{currentStep.name}</h3>
              <p>{currentStep.description}</p>
              {activeTrainerBattle && (
                <BattleStatusText>
                  Battling {activeTrainerBattle.trainer.name}
                  {activeTrainerBattle.selectedPokemonIndex !== null && (
                    <>
                      {' '}against {activeTrainerBattle.trainer.pokemon[activeTrainerBattle.selectedPokemonIndex].species} Lv. {activeTrainerBattle.trainer.pokemon[activeTrainerBattle.selectedPokemonIndex].level}
                      {activeTrainerBattleTargetHp && (
                        <> ({activeTrainerBattleTargetHp})</>
                      )}
                    </>
                  )}
                </BattleStatusText>
              )}
              {!activeTrainerBattle && currentStep.battle?.opponent && (
                <BattleStatusText>
                  Wild {currentStep.battle.opponent.species} Lv. {currentStep.battle.opponent.level}
                  {activeWildBattleTargetHp && (
                    <> ({activeWildBattleTargetHp})</>
                  )}
                </BattleStatusText>
              )}
            </CurrentStepCard>

            <SectionHeaderRow>
              <InputSubheader>{isInBattle ? 'Battle Actions' : 'Available Actions'}</InputSubheader>
              <Button onClick={handleUndo} disabled={route.length <= 1}>Undo</Button>
            </SectionHeaderRow>

            {!isInBattle && availableStepOptions.length === 0 && trainersInCurrentArea.length === 0 && (
              <Card variant="warning">
                <h3>No further actions are defined here yet.</h3>
                <p>This is the end of the current prototype branch.</p>
              </Card>
            )}

            <OptionsList>
              {!isInBattle && availableStepOptions.map(option => (
                <OptionCard key={option.id} variant="borderless">
                  <div>
                    <OptionTitle>{option.label}</OptionTitle>
                    {option.description && <OptionDescription>{option.description}</OptionDescription>}
                  </div>
                  <Button onClick={() => handleTakeOption(option.targetStepId, option)}>Take Step</Button>
                </OptionCard>
              ))}
              {isInBattle && availableBattleActions.map(action => (
                <OptionCard key={action.id} variant="borderless">
                  <div>
                    <OptionTitle>{action.label}</OptionTitle>
                    {action.description && <OptionDescription>{action.description}</OptionDescription>}
                    {'damageDetails' in action && action.damageDetails && action.damageDetails.length > 0 && (
                      <DamageDetailList>
                        {action.damageDetails.map((detail, index) => (
                          <DamageDetail key={`${action.id}-${index}`}>{detail}</DamageDetail>
                        ))}
                      </DamageDetailList>
                    )}
                    {'damageSummary' in action && action.damageSummary && (!('damageDetails' in action) || !action.damageDetails || action.damageDetails.length === 0) && (
                      <OptionDescription>{action.damageSummary}</OptionDescription>
                    )}
                  </div>
                  <Button onClick={() => handleTakeBattleAction(action)}>{action.type === 'ko' ? 'End Battle' : 'Use Move'}</Button>
                </OptionCard>
              ))}
              {isInTrainerBattle && availableTrainerBattleActions.map(action => (
                <OptionCard key={action.id} variant="borderless">
                  <div>
                    <OptionTitle>{action.label}</OptionTitle>
                    {action.description && <OptionDescription>{action.description}</OptionDescription>}
                    {action.damageDetails && action.damageDetails.length > 0 && (
                      <DamageDetailList>
                        {action.damageDetails.map((detail, index) => (
                          <DamageDetail key={`${action.id}-${index}`}>{detail}</DamageDetail>
                        ))}
                      </DamageDetailList>
                    )}
                    {action.damageSummary && (!action.damageDetails || action.damageDetails.length === 0) && (
                      <OptionDescription>{action.damageSummary}</OptionDescription>
                    )}
                  </div>
                  <Button onClick={() => handleTakeTrainerBattleAction(action)}>
                    {getTrainerBattleButtonLabel(action)}
                  </Button>
                </OptionCard>
              ))}
              {!isInBattle && trainersInCurrentArea.map(trainer => (
                <OptionCard key={trainer.id} variant="borderless">
                  <div>
                    <OptionTitle>Battle {trainer.name}</OptionTitle>
                    <OptionDescription>{trainer.pokemon.map(pokemon => `${pokemon.species} Lv. ${pokemon.level}`).join(', ')}</OptionDescription>
                  </div>
                  <Button onClick={() => handleStartTrainerBattle(trainer)}>Start Battle</Button>
                </OptionCard>
              ))}
            </OptionsList>
          </PaneSection>
        )}
      </LeftColumn>

      <RightColumn>
        <Header>Current Route</Header>
        {!activeGame && (
          <RoutePlaceholder>Select a game to start building a route.</RoutePlaceholder>
        )}
        {activeGame && (
          <>
            <PartySection>
              <InputSubheader>Party</InputSubheader>
              <PartyList>
                {routeState.party.map((pokemon, index) => {
                  const pokemonKey = `${index}-${pokemon.species}`;
                  const isExperienceRouteExpanded = Boolean(expandedExperienceRoutes[pokemonKey]);

                  return (
                    <PartySlotCard key={index} variant="success">
                      <PartySlotIndex>{index + 1}</PartySlotIndex>
                      <PartySlotBody>
                        <RouteEntryName>{pokemon.species}</RouteEntryName>
                        <RouteEntryMeta>Lv. {pokemon.level}</RouteEntryMeta>
                        <PokemonMoveList>
                          {pokemon.moves.map(move => (
                            <PokemonMove key={move}>{move}</PokemonMove>
                          ))}
                        </PokemonMoveList>
                        {pokemon.experienceRoute.length > 0 && (
                          <PokemonExperienceSection>
                            <PokemonExperienceToggle
                              type="button"
                              onClick={() => handleToggleExperienceRoute(pokemonKey)}
                            >
                              Experience Route ({pokemon.experienceRoute.length}) {isExperienceRouteExpanded ? 'Hide' : 'Show'}
                            </PokemonExperienceToggle>
                            {isExperienceRouteExpanded && (
                              <PokemonExperienceList>
                                {pokemon.experienceRoute.map(event => (
                                  <PokemonExperienceEvent key={event.id}>
                                    {getExperienceEventLabel(event)} (+{event.experienceGained} Exp)
                                    {event.isLevelUp && ` -> Lv. ${event.levelAfterExperience}`}
                                  </PokemonExperienceEvent>
                                ))}
                              </PokemonExperienceList>
                            )}
                          </PokemonExperienceSection>
                        )}
                      </PartySlotBody>
                    </PartySlotCard>
                  );
                })}
              </PartyList>
            </PartySection>
            <BagSection>
              <BagHeaderRow>
                <InputSubheader>Bag</InputSubheader>
                <Button onClick={() => setIsBagExpanded(prev => !prev)}>
                  {isBagExpanded ? 'Hide' : 'Show'}
                </Button>
              </BagHeaderRow>
              {isBagExpanded && (
                Object.keys(routeState.bag).length > 0 ? (
                  <BagList>
                    {Object.entries(routeState.bag).map(([itemName, quantity]) => (
                      <BagItem key={itemName}>
                        <BagItemName>{itemName}</BagItemName>
                        <BagItemQty>x{quantity}</BagItemQty>
                      </BagItem>
                    ))}
                  </BagList>
                ) : (
                  <BagEmpty>No items in bag</BagEmpty>
                )
              )}
            </BagSection>
            <InputSubheader>Route History</InputSubheader>
            <RouteList ref={routeListRef}>
              {routeHistory.map(({ entry, step, trainer, substeps }, index) => (
                <RouteEntryCard key={`${entry.stepId}-${index}`} variant={index === routeHistory.length - 1 ? 'success' : 'neutral'}>
                  <RouteEntryIndex>{index + 1}</RouteEntryIndex>
                  <RouteEntryBody>
                    <RouteEntryName>{trainer ? `Battle ${trainer.name}` : step?.name ?? entry.stepId}</RouteEntryName>
                    <RouteEntryMeta>
                      {index === 0 ? `Start: ${activeGame.name}` : getRouteEntryLabel(activeGame, routeHistory[index - 1].entry, entry)}
                    </RouteEntryMeta>
                    {substeps.length > 0 && (
                      <BattleSubstepList>
                        {substeps.map((substep, substepIndex) => (
                          <BattleSubstep key={`${substep}-${substepIndex}`}>{substep}</BattleSubstep>
                        ))}
                      </BattleSubstepList>
                    )}
                  </RouteEntryBody>
                </RouteEntryCard>
              ))}
            </RouteList>
          </>
        )}
      </RightColumn>
    </Container>
  );
};

interface RouteHistoryItem {
  entry: RouteBuilderRouteEntry;
  step: RouteBuilderStep | undefined;
  trainer?: RouteBuilderTrainer;
  substeps: string[];
}

function getTrainerBattleButtonLabel(action: RouteBuilderTrainerBattleAction): string {
  if (action.type === 'selectPokemon') return 'Choose Pokemon';
  if (action.type === 'ko') return 'KO Pokemon';

  return 'Use Move';
}

function getRouteEntryLabel(
  game: RouteBuilderGameConfig,
  previousEntry: RouteBuilderRouteEntry,
  currentEntry: RouteBuilderRouteEntry,
): string {
  if (currentEntry.arrivedViaOptionId && currentEntry.type === 'step') {
    const previousStep = getRouteBuilderStep(game, previousEntry.stepId);
    const battleAction = getRouteBuilderBattleAction(previousStep, currentEntry.arrivedViaOptionId);

    if (battleAction) return battleAction.label;
  }

  const previousStep = getRouteBuilderStep(game, previousEntry.stepId);
  const option = previousStep?.options.find(item => item.id === currentEntry.arrivedViaOptionId);

  return option?.label ?? 'Step taken';
}

function getExperienceEventLabel(event: { type: string; name?: string; value?: number; }): string {
  if (event.type === 'species' || event.type === 'manual') {
    return event.name ?? 'Experience event';
  }

  if (event.type === 'rareCandy') {
    return 'Rare Candy';
  }

  return 'Experience event';
}

export default RouteBuilderPage;

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

const CurrentStepCard = styled(Card)`
  margin-top: 0;
`;

const ImportCard = styled(Card)`
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

const BattleStatusText = styled.div`
  color: ${({ theme }) => theme.label};
  margin-bottom: 1rem;
`;

const SectionHeaderRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
`;

const OptionsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const OptionCard = styled(Card)`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  padding: 1rem 0;
  border-bottom: 1px solid ${({ theme }) => theme.input.border};
`;

const OptionTitle = styled.div`
  font-weight: 700;
  color: ${({ theme }) => theme.foreground};
`;

const OptionDescription = styled.div`
  color: ${({ theme }) => theme.label};
  margin-top: 0.25rem;
`;

const RoutePlaceholder = styled.div`
  color: ${({ theme }) => theme.label};
  font-style: italic;
  margin-top: 1rem;
`;

const RouteList = styled.div`
  display: flex;
  min-height: 0;
  flex-direction: column;
  overflow-y: auto;
  gap: 0.75rem;
  padding-top: 0.5rem;
`;

const PartySection = styled.div`
  margin-bottom: 0.75rem;
`;

const BagSection = styled.div`
  margin-bottom: 0.75rem;
`;

const BagHeaderRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
`;

const BagList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  margin-top: 0.5rem;
`;

const BagItem = styled.div`
  display: flex;
  justify-content: space-between;
  padding: 0.35rem 0.5rem;
  border: 1px solid ${({ theme }) => theme.input.border};
  border-radius: 0.35rem;
`;

const BagItemName = styled.div`
  font-weight: 700;
`;

const BagItemQty = styled.div`
  color: ${({ theme }) => theme.label};
`;

const BagEmpty = styled.div`
  color: ${({ theme }) => theme.label};
  margin-top: 0.5rem;
  font-style: italic;
`;

const PartyList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
`;

const RouteEntryCard = styled(Card)`
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  margin: 0;
  padding: 0.75rem 1rem;
`;

const RouteEntryIndex = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 2rem;
  height: 2rem;
  border-radius: 999px;
  background-color: rgba(0, 0, 0, 0.15);
  font-weight: 700;
`;

const RouteEntryBody = styled.div`
  min-width: 0;
  flex-grow: 1;
`;

const RouteEntryName = styled.div`
  font-weight: 700;
`;

const RouteEntryMeta = styled.div`
  color: ${({ theme }) => theme.label};
  margin-top: 0.25rem;
`;

const PartySlotCard = styled(Card)`
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  margin: 0;
  padding: 0.5rem 1rem;
`;

const PartySlotIndex = styled(RouteEntryIndex)``;

const PartySlotBody = styled.div`
  min-width: 0;
  flex-grow: 1;
`;

const PokemonMoveList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  margin-top: 0.5rem;
`;

const PokemonMove = styled.div`
  padding: 0.2rem 0.45rem;
  border: 1px solid ${({ theme }) => theme.input.border};
  border-radius: 999px;
  color: ${({ theme }) => theme.label};
  font-size: 0.85rem;
`;

const PokemonExperienceSection = styled.div`
  margin-top: 0.75rem;
`;

const PokemonExperienceToggle = styled.button`
  padding: 0;
  border: none;
  background: none;
  cursor: pointer;
  font-size: 0.8rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: ${({ theme }) => theme.label};
  text-align: left;
`;

const PokemonExperienceList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  margin-top: 0.4rem;
`;

const PokemonExperienceEvent = styled.div`
  color: ${({ theme }) => theme.label};
  font-size: 0.85rem;
`;

const BattleSubstepList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  margin-top: 0.75rem;
  padding-left: 1rem;
  border-left: 2px solid ${({ theme }) => theme.input.border};
`;

const BattleSubstep = styled.div`
  color: ${({ theme }) => theme.label};
  font-size: 0.95rem;
`;

const DamageDetailList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  margin-top: 0.5rem;
`;

const DamageDetail = styled.div`
  color: ${({ theme }) => theme.label};
  font-size: 0.85rem;
  font-family: monospace;
`;
