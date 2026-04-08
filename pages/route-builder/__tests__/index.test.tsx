import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { ThemeProvider } from 'styled-components';
import RouteBuilderPage from '..';
import * as validation from '../../../utils/route-builder/validation';
import expectedBdspRoute from './__fixtures__/expected-bdsp-route.json';
import { THEMES } from '../../../components/Layout';

describe('Route Builder Page', () => {
  global.URL.createObjectURL = jest.fn();
  HTMLAnchorElement.prototype.click = jest.fn();

  it('export works', async () => {
    const spy = jest.spyOn(validation, 'buildRouteExportData');

    render(
      <ThemeProvider theme={THEMES.light}>
        <RouteBuilderPage />
      </ThemeProvider>,
    );

    await userEvent.selectOptions(screen.getByLabelText('Select Game'), 'BDSP');

    await chooseOption('Move to Route 201');
    await chooseOption('Move to Lake Verity');
    await chooseOption('Pick Starter');
    await chooseOption('Choose Chimchar');
    await chooseOption('Fight wild Starly Lv. 2');
    await chooseOption('Use Scratch');
    await chooseOption('Use Scratch');
    await chooseOption('Use Scratch');
    await chooseOption('KO the opponent');
    await chooseOption('Move to Twinleaf Town');
    await chooseOption('Move to Route 201');
    await chooseOption('Talk to NPC for Potions');
    await chooseOption('Move to Sandgem Town');
    await chooseOption('Move to Sandgem Lab');
    await chooseOption('Move to Sandgem Town');
    await chooseOption('Move to Route 201');
    await chooseOption('Move to Twinleaf Town');
    await chooseOption('Talk to Mom');
    await chooseOption('Move to Route 201');
    await chooseOption('Move to Sandgem Town');
    await chooseOption('Move to Route 202');
    await chooseOption('Catch Tutorial');
    await chooseOption('Battle Youngster Tristan');
    await chooseOption('Fight Starly Lv. 5');
    await chooseOption('Use Scratch');
    await chooseOption('Use Scratch');
    await chooseOption('Use Scratch');
    await chooseOption('Use Scratch');
    await chooseOption('KO Starly Lv. 5');

    await userEvent.click(screen.getByText('Export Route'));

    expect(spy).toHaveReturnedWith(expect.objectContaining({
      route: expectedBdspRoute,
    }));
  });

  it('undo works', async () => {
    render(
      <ThemeProvider theme={THEMES.light}>
        <RouteBuilderPage />
      </ThemeProvider>,
    );

    await userEvent.selectOptions(screen.getByLabelText('Select Game'), 'BDSP');

    await chooseOption('Move to Route 201');
    await chooseOption('Move to Lake Verity');
    await chooseOption('Pick Starter');
    await chooseOption('Choose Chimchar');
    await chooseOption('Fight wild Starly Lv. 2');
    await chooseOption('Use Scratch');
    await chooseOption('Use Scratch');

    let entries = await screen.getAllByTestId('route-entry-name');

    expect(entries.length).toBe(6);
    expect(entries[0]).toHaveTextContent('Twinleaf Town');
    expect(entries[1]).toHaveTextContent('Route 201');
    expect(entries[2]).toHaveTextContent('Lake Verity');
    expect(entries[3]).toHaveTextContent('Pick Starter');
    expect(entries[4]).toHaveTextContent('Starter: Chimchar');
    expect(entries[5]).toHaveTextContent('Wild Starly Lv. 2');

    const battle = entries[5].parentElement;

    if (battle) {
      const battleSteps = within(battle).getAllByTestId('battle-substep');

      expect(battleSteps.length).toBe(2);
      expect(battleSteps[0]).toHaveTextContent('Use Scratch');
      expect(battleSteps[1]).toHaveTextContent('Use Scratch');
    } else {
      fail('Battle element should exist');
    }

    await userEvent.click(screen.getByText('Undo'));
    await userEvent.click(screen.getByText('Undo'));
    await userEvent.click(screen.getByText('Undo'));

    entries = await screen.getAllByTestId('route-entry-name');

    expect(entries.length).toBe(5);
    expect(entries[0]).toHaveTextContent('Twinleaf Town');
    expect(entries[1]).toHaveTextContent('Route 201');
    expect(entries[2]).toHaveTextContent('Lake Verity');
    expect(entries[3]).toHaveTextContent('Pick Starter');
    expect(entries[4]).toHaveTextContent('Starter: Chimchar');
  });

  it('gaps work', async () => {
    render(
      <ThemeProvider theme={THEMES.light}>
        <RouteBuilderPage />
      </ThemeProvider>,
    );

    await userEvent.selectOptions(screen.getByLabelText('Select Game'), 'BDSP');

    await chooseOption('Move to Route 201');
    await chooseOption('Move to Lake Verity');
    await chooseOption('Pick Starter');
    await chooseOption('Choose Chimchar');
    await chooseOption('Fight wild Starly Lv. 2');
    await chooseOption('Use Scratch');
    await chooseOption('Use Scratch');

    let entries = await screen.getAllByTestId('route-entry-name');

    expect(entries.length).toBe(6);
    expect(entries[0]).toHaveTextContent('Twinleaf Town');
    expect(entries[1]).toHaveTextContent('Route 201');
    expect(entries[2]).toHaveTextContent('Lake Verity');
    expect(entries[3]).toHaveTextContent('Pick Starter');
    expect(entries[4]).toHaveTextContent('Starter: Chimchar');
    expect(entries[5]).toHaveTextContent('Wild Starly Lv. 2');

    let battle = entries[5].parentElement;

    if (battle) {
      const battleSteps = within(battle).getAllByTestId('battle-substep');

      expect(battleSteps.length).toBe(2);
      expect(battleSteps[0]).toHaveTextContent('Use Scratch');
      expect(battleSteps[1]).toHaveTextContent('Use Scratch');
    } else {
      fail('Battle element should exist');
    }

    // Select the Route 201 step.
    await userEvent.click(entries[1]);
    await userEvent.click(screen.getByText('Undo'));

    entries = await screen.getAllByTestId('route-entry-name');

    expect(entries.length).toBe(5);
    expect(entries[0]).toHaveTextContent('Twinleaf Town');

    expect(entries[1].parentElement?.parentElement?.previousElementSibling)
      .toHaveTextContent('Gap detected here — the remainder of the route is no longer connected.');

    expect(entries[1]).toHaveTextContent('Lake Verity');
    expect(entries[2]).toHaveTextContent('Pick Starter');
    expect(entries[3]).toHaveTextContent('Starter: Chimchar');
    expect(entries[4]).toHaveTextContent('Wild Starly Lv. 2');

    battle = entries[4].parentElement;

    if (battle) {
      const battleSteps = within(battle).getAllByTestId('battle-substep');

      expect(battleSteps.length).toBe(2);
      expect(battleSteps[0]).toHaveTextContent('Use Scratch');
      expect(battleSteps[1]).toHaveTextContent('Use Scratch');
    } else {
      fail('Battle element should exist');
    }
  });

  it('insert step works', async () => {
    render(
      <ThemeProvider theme={THEMES.light}>
        <RouteBuilderPage />
      </ThemeProvider>,
    );

    await userEvent.selectOptions(screen.getByLabelText('Select Game'), 'BDSP');

    await chooseOption('Move to Route 201');
    await chooseOption('Move to Lake Verity');
    await chooseOption('Pick Starter');
    await chooseOption('Choose Chimchar');
    await chooseOption('Fight wild Starly Lv. 2');
    await chooseOption('Use Scratch');
    await chooseOption('Use Scratch');

    let entries = await screen.getAllByTestId('route-entry-name');

    expect(entries.length).toBe(6);
    expect(entries[0]).toHaveTextContent('Twinleaf Town');
    expect(entries[1]).toHaveTextContent('Route 201');
    expect(entries[2]).toHaveTextContent('Lake Verity');
    expect(entries[3]).toHaveTextContent('Pick Starter');
    expect(entries[4]).toHaveTextContent('Starter: Chimchar');
    expect(entries[5]).toHaveTextContent('Wild Starly Lv. 2');

    let battle = entries[5].parentElement;

    if (battle) {
      const battleSteps = within(battle).getAllByTestId('battle-substep');

      expect(battleSteps.length).toBe(2);
      expect(battleSteps[0]).toHaveTextContent('Use Scratch');
      expect(battleSteps[1]).toHaveTextContent('Use Scratch');
    } else {
      fail('Battle element should exist');
    }

    // Select the Route 201 step.
    await userEvent.click(entries[1]);
    await chooseOption('Move to Twinleaf Town');

    entries = await screen.getAllByTestId('route-entry-name');

    expect(entries.length).toBe(7);
    expect(entries[0]).toHaveTextContent('Twinleaf Town');
    expect(entries[1]).toHaveTextContent('Route 201');
    expect(entries[2]).toHaveTextContent('Twinleaf Town');

    expect(entries[3].parentElement?.parentElement?.previousElementSibling)
      .toHaveTextContent('Gap detected here — the remainder of the route is no longer connected.');

    expect(entries[3]).toHaveTextContent('Lake Verity');
    expect(entries[4]).toHaveTextContent('Pick Starter');
    expect(entries[5]).toHaveTextContent('Starter: Chimchar');
    expect(entries[6]).toHaveTextContent('Wild Starly Lv. 2');

    battle = entries[6].parentElement;

    if (battle) {
      const battleSteps = within(battle).getAllByTestId('battle-substep');

      expect(battleSteps.length).toBe(2);
      expect(battleSteps[0]).toHaveTextContent('Use Scratch');
      expect(battleSteps[1]).toHaveTextContent('Use Scratch');
    } else {
      fail('Battle element should exist');
    }
  });

  it('insert move works', async () => {
    render(
      <ThemeProvider theme={THEMES.light}>
        <RouteBuilderPage />
      </ThemeProvider>,
    );

    await userEvent.selectOptions(screen.getByLabelText('Select Game'), 'BDSP');

    await chooseOption('Move to Route 201');
    await chooseOption('Move to Lake Verity');
    await chooseOption('Pick Starter');
    await chooseOption('Choose Chimchar');
    await chooseOption('Fight wild Starly Lv. 2');
    await chooseOption('Use Scratch');
    await chooseOption('Use Scratch');

    let entries = await screen.getAllByTestId('route-entry-name');

    expect(entries.length).toBe(6);
    expect(entries[0]).toHaveTextContent('Twinleaf Town');
    expect(entries[1]).toHaveTextContent('Route 201');
    expect(entries[2]).toHaveTextContent('Lake Verity');
    expect(entries[3]).toHaveTextContent('Pick Starter');
    expect(entries[4]).toHaveTextContent('Starter: Chimchar');
    expect(entries[5]).toHaveTextContent('Wild Starly Lv. 2');

    let battle = entries[5].parentElement;

    if (battle) {
      let battleSteps = within(battle).getAllByTestId('battle-substep');

      expect(battleSteps.length).toBe(2);
      expect(battleSteps[0]).toHaveTextContent('Use Scratch');
      expect(battleSteps[1]).toHaveTextContent('Use Scratch');

      // Select the first Use Scratch battle action.
      await userEvent.click(battleSteps[0]);
      await chooseOption('Use Leer');

      entries = await screen.getAllByTestId('route-entry-name');

      expect(entries.length).toBe(6);
      expect(entries[0]).toHaveTextContent('Twinleaf Town');
      expect(entries[1]).toHaveTextContent('Route 201');
      expect(entries[2]).toHaveTextContent('Lake Verity');
      expect(entries[3]).toHaveTextContent('Pick Starter');
      expect(entries[4]).toHaveTextContent('Starter: Chimchar');
      expect(entries[5]).toHaveTextContent('Wild Starly Lv. 2');

      battle = entries[5].parentElement;

      if (battle) {
        battleSteps = within(battle).getAllByTestId('battle-substep');

        expect(battleSteps.length).toBe(3);
        expect(battleSteps[0]).toHaveTextContent('Use Scratch');
        expect(battleSteps[1]).toHaveTextContent('Use Leer');
        expect(battleSteps[2]).toHaveTextContent('Use Scratch');
      } else {
        fail('Battle element should exist');
      }
    } else {
      fail('Battle element should exist');
    }
  });

  async function chooseOption(option: string) {
    const section = (await screen.queryByText(/(Available Actions)|(Battle Actions)/))?.parentElement?.parentElement;

    if (section) {
      const button = (await within(section).getByText(option)).parentElement?.nextElementSibling;
      if (button) {
        await userEvent.click(button);
      } else {
        fail(`Could not find button for option: ${option}`);
      }
    } else {
      fail(`Could not find options section for option: ${option}`);
    }
  }
});
