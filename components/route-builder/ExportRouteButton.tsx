import React, { useCallback } from 'react';
import { buildRouteExportData, RouteBuilderGameConfig, RouteBuilderPokemonInParty, RouteBuilderRouteEntry } from '../../utils/route-builder';
import { Button } from '../Button';

interface ExportRouteButtonProps {
  activeGame: RouteBuilderGameConfig | null;
  route: RouteBuilderRouteEntry[];
  partySnapshots: RouteBuilderPokemonInParty[][];
}

export const ExportRouteButton: React.FC<ExportRouteButtonProps> = ({
  activeGame,
  route,
  partySnapshots,
}) => {
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

  return (
    <Button onClick={handleExport} disabled={!activeGame || route.length === 0}>Export Route</Button>
  );
};
