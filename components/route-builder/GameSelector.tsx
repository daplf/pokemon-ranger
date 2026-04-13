import React from 'react';
import styled from 'styled-components';
import { HelpText, InputRow, InputSubheader } from '../Layout';
import { RouteBuilderGameConfig } from '../../utils/route-builder';

interface GameSelectorProps {
  availableGames: RouteBuilderGameConfig[];
  selectedGameId: string;
  onSelectGame: (gameId: string) => void;
}

/**
 * GameSelector Component
 *
 * Allows users to select which game they want to build a route for.
 * Currently only BDSP is available, but the infrastructure supports multiple games.
 */
export const GameSelector: React.FC<GameSelectorProps> = ({
  availableGames,
  selectedGameId,
  onSelectGame,
}) => {
  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    onSelectGame(event.target.value);
  };

  return (
    <InputSection>
      <InputSubheader>Game</InputSubheader>
      <InputRow>
        <label htmlFor="routeBuilderGame">Select Game</label>
        <select id="routeBuilderGame" value={selectedGameId} onChange={handleChange}>
          <option value="">Choose a game...</option>
          {availableGames.map(game => (
            <option key={game.id} value={game.id}>{game.id.toUpperCase()}</option>
          ))}
        </select>
        <HelpText>This will initialize the route at that game&apos;s configured starting step.</HelpText>
      </InputRow>
    </InputSection>
  );
};

const InputSection = styled.div`
  display: flex;
  flex-direction: column;
`;
