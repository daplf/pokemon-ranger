import React from 'react';
import styled from 'styled-components';
import { Card, InputSubheader } from '../../components/Layout';
import { RouteBuilderPokemonInParty } from '../../utils/route-builder';

interface PartySectionProps {
  party: RouteBuilderPokemonInParty[];
  expandedExperienceRoutes: Record<string, boolean>;
  onToggleExperienceRoute: (pokemonKey: string) => void;
}

/**
 * PartySection Component
 * 
 * Displays the current party Pokémon with:
 * - Species and level
 * - Current moves
 * - Experience gain history (expandable)
 * - EV yields
 */
export const PartySection: React.FC<PartySectionProps> = ({
  party,
  expandedExperienceRoutes,
  onToggleExperienceRoute,
}) => {
  return (
    <Container>
      <InputSubheader>Party</InputSubheader>
      <PartyList>
        {party.map((pokemon, index) => {
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
                      onClick={() => onToggleExperienceRoute(pokemonKey)}
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
    </Container>
  );
};

function getExperienceEventLabel(event: { type: string; name?: string; value?: number; }): string {
  if (event.type === 'species' || event.type === 'manual') {
    return event.name ?? 'Experience event';
  }

  if (event.type === 'rareCandy') {
    return 'Rare Candy';
  }

  return 'Experience event';
}

const Container = styled.div`
  margin-bottom: 0.75rem;
`;

const PartyList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
`;

const PartySlotCard = styled(Card)`
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  margin: 0;
  padding: 0.5rem 1rem;
`;

const PartySlotIndex = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 2rem;
  height: 2rem;
  border-radius: 999px;
  background-color: rgba(0, 0, 0, 0.15);
  font-weight: 700;
`;

const PartySlotBody = styled.div`
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
