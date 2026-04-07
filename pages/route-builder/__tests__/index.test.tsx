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

  it('works', async () => {
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
