import { buildInitialRoute, getRouteBuilderRuntimeState } from '../stateManagement';
import { RouteBuilderGameConfig } from '../types';

const mockGameConfig: RouteBuilderGameConfig = {
  id: 'test',
  name: 'Test Game',
  startStepId: 'start-step',
  steps: [
    {
      id: 'start-step',
      name: 'Start',
      description: 'Starting point',
      options: [],
    },
  ],
};

describe('Route Initialization', () => {
  describe('buildInitialRoute', () => {
    it('creates a route starting at the configured start step', () => {
      const route = buildInitialRoute(mockGameConfig);
      expect(route).toHaveLength(1);
      expect(route[0]).toEqual({
        type: 'step',
        stepId: 'start-step',
      });
    });
  });

  describe('getRouteBuilderRuntimeState', () => {
    it('initializes runtime state with the start step', () => {
      const route = buildInitialRoute(mockGameConfig);
      const state = getRouteBuilderRuntimeState(mockGameConfig, route);
      expect(state.currentStep?.id).toBe('start-step');
    });
  });
});
