import React, { useCallback, useState } from 'react';
import styled from 'styled-components';
import { RouteBuilderRouteEntry, RouteBuilderRuntimeState, RouteBuilderStep } from '../../utils/route-builder';
import { Card } from '../Layout';
import { Button } from '../Button';

interface ImportSelectionCardProps {
  currentStep: RouteBuilderStep;
  availableItems: string[];
  routeState: RouteBuilderRuntimeState | null;
  onCancel: () => void;
  onItemUsed: (itemUsageRouteEntry: RouteBuilderRouteEntry) => void;
}

export const ItemSelectionCard: React.FC<ImportSelectionCardProps> = ({
  currentStep,
  availableItems,
  routeState,
  onCancel,
  onItemUsed,
}) => {
  const [selectedItem, setSelectedItem] = useState<string | null>(null);

  const handleSelectItem = useCallback((itemName: string) => {
    setSelectedItem(itemName);
  }, []);

  const handleCancelItemSelection = useCallback(() => {
    onCancel();
    setSelectedItem(null);
  }, [onCancel]);

  const handleSelectTarget = useCallback((targetIndex: number) => {
    if (!currentStep || !selectedItem || !routeState) return;

    const entry: RouteBuilderRouteEntry = {
      type: 'itemUsage',
      stepId: currentStep.id,
      itemName: selectedItem,
      targetPokemonIndex: targetIndex,
      label: `Used ${selectedItem} on ${routeState.party[targetIndex].species}`,
    };

    onItemUsed(entry);
    setSelectedItem(null);
  }, [currentStep, selectedItem, routeState, onItemUsed]);

  const handleCancelTargetSelection = useCallback(() => {
    setSelectedItem(null);
  }, []);
  
  return (
    <ItemSelectionCardElement>
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
    </ItemSelectionCardElement>
  );
};

const ItemSelectionCardElement = styled(Card)`
  margin-bottom: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1rem;
`;
