const fs = require('fs');
const path = require('path');
const https = require('https');

const REPO_ROOT = path.resolve(__dirname, '..');
const TRAINERS_DIR = path.join(REPO_ROOT, 'resources', 'route-builder', 'trainers', 'bdsp');
const POKEMON_DIR = path.join(REPO_ROOT, 'resources', 'route-builder', 'pokemon', 'bdsp');
const MOVES_DIR = path.join(REPO_ROOT, 'resources', 'route-builder', 'moves', 'bdsp');
const INDEX_DIR = path.join(REPO_ROOT, 'resources', 'route-builder');
const POKEMON_INDEX_PATH = path.join(INDEX_DIR, 'bdsp-pokemon-index.json');
const MOVE_INDEX_PATH = path.join(INDEX_DIR, 'bdsp-move-index.json');

const API_BASE_URL = 'https://pokeapi.co/api/v2';
const VERSION_GROUP = 'brilliant-diamond-and-shining-pearl';
const POKEMON_DB_BASE_URL = 'https://pokemondb.net/pokedex';

const SPECIES_API_NAME_BY_DISPLAY_NAME = {
  "Farfetch'd": 'farfetchd',
  'Gastrodon (East Sea)': 'gastrodon',
  'Heat Rotom': 'rotom-heat',
  'Mime Jr.': 'mime-jr',
  'Mow Rotom': 'rotom-mow',
  'Mr. Mime': 'mr-mime',
  'Porygon-Z': 'porygon-z',
  'Shellos (East Sea)': 'shellos',
  'Wash Rotom': 'rotom-wash',
  Wormadam: 'wormadam-plant',
  'Wormadam (Sandy Cloak)': 'wormadam-sandy',
  'Wormadam (Trash Cloak)': 'wormadam-trash',
};
const SPECIES_DB_PATH_BY_DISPLAY_NAME = {
  'Farfetch\'d': 'farfetchd',
  'Gastrodon (East Sea)': 'gastrodon',
  'Heat Rotom': 'rotom/moves/8',
  'Mow Rotom': 'rotom/moves/8',
  'Wash Rotom': 'rotom/moves/8',
  'Shellos (East Sea)': 'shellos',
  Wormadam: 'wormadam',
  'Wormadam (Sandy Cloak)': 'wormadam',
  'Wormadam (Trash Cloak)': 'wormadam',
};
const SPECIES_DB_FORM_LABEL_BY_DISPLAY_NAME = {
};
const MOVE_API_NAME_BY_DISPLAY_NAME = {
  'Vise Grip': 'vice-grip',
};

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, response => {
      if (response.statusCode && response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        resolve(fetchJson(response.headers.location));
        response.resume();
        return;
      }

      if (response.statusCode !== 200) {
        reject(new Error(`Unexpected HTTP ${response.statusCode} when fetching ${url}`));
        response.resume();
        return;
      }

      const chunks = [];
      response.setEncoding('utf8');
      response.on('data', chunk => chunks.push(chunk));
      response.on('end', () => {
        try {
          resolve(JSON.parse(chunks.join('')));
        } catch (error) {
          reject(error);
        }
      });
    }).on('error', reject);
  });
}

function fetchText(url) {
  return new Promise((resolve, reject) => {
    https.get(url, response => {
      if (response.statusCode && response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        resolve(fetchText(response.headers.location));
        response.resume();
        return;
      }

      if (response.statusCode !== 200) {
        reject(new Error(`Unexpected HTTP ${response.statusCode} when fetching ${url}`));
        response.resume();
        return;
      }

      const chunks = [];
      response.setEncoding('utf8');
      response.on('data', chunk => chunks.push(chunk));
      response.on('end', () => resolve(chunks.join('')));
    }).on('error', reject);
  });
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function titleCaseSegment(segment) {
  return segment
    .split('-')
    .map(part => part ? `${part[0].toUpperCase()}${part.slice(1)}` : part)
    .join('-');
}

function formatMoveName(apiName) {
  return apiName
    .split('-')
    .map(titleCaseSegment)
    .join(' ');
}

function decodeHtmlEntities(value) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&#039;/g, '\'')
    .replace(/&quot;/g, '"')
    .replace(/&rsquo;/g, '\'')
    .replace(/&ndash;/g, '-')
    .replace(/&mdash;/g, '-')
    .replace(/&eacute;/g, 'e')
    .replace(/&nbsp;/g, ' ')
    .replace(/&minus;/g, '-')
    .replace(/&#8217;/g, '\'')
    .replace(/&#8211;/g, '-')
    .replace(/&#8212;/g, '-');
}

function stripTags(value) {
  return decodeHtmlEntities(value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
}

function getSpeciesApiName(displayName) {
  if (SPECIES_API_NAME_BY_DISPLAY_NAME[displayName]) return SPECIES_API_NAME_BY_DISPLAY_NAME[displayName];

  return displayName
    .toLowerCase()
    .replace(/[.'’]/g, '')
    .replace(/[()]/g, '')
    .replace(/\s+/g, '-');
}

function normalizeGrowthRate(apiGrowthRate) {
  switch (apiGrowthRate) {
    case 'medium':
      return 'medium-fast';
    case 'slow-then-very-fast':
      return 'erratic';
    case 'fast-then-very-slow':
      return 'fluctuating';
    default:
      return apiGrowthRate;
  }
}

function mapEvYield(stats) {
  const values = {
    hp: 0,
    attack: 0,
    defense: 0,
    specialAttack: 0,
    specialDefense: 0,
    speed: 0,
  };

  stats.forEach(({ stat, effort }) => {
    switch (stat.name) {
      case 'hp':
        values.hp = effort;
        break;
      case 'attack':
        values.attack = effort;
        break;
      case 'defense':
        values.defense = effort;
        break;
      case 'special-attack':
        values.specialAttack = effort;
        break;
      case 'special-defense':
        values.specialDefense = effort;
        break;
      case 'speed':
        values.speed = effort;
        break;
      default:
        break;
    }
  });

  return values;
}

function mapBaseStats(stats) {
  const values = {
    hp: 0,
    attack: 0,
    defense: 0,
    specialAttack: 0,
    specialDefense: 0,
    speed: 0,
  };

  stats.forEach(({ stat, base_stat: baseStat }) => {
    switch (stat.name) {
      case 'hp':
        values.hp = baseStat;
        break;
      case 'attack':
        values.attack = baseStat;
        break;
      case 'defense':
        values.defense = baseStat;
        break;
      case 'special-attack':
        values.specialAttack = baseStat;
        break;
      case 'special-defense':
        values.specialDefense = baseStat;
        break;
      case 'speed':
        values.speed = baseStat;
        break;
      default:
        break;
    }
  });

  return values;
}

function getBdspLearnset(pokemonResponse) {
  const learnsetEntries = pokemonResponse.moves
    .flatMap(moveEntry => moveEntry.version_group_details
      .filter(details => details.version_group.name === VERSION_GROUP && details.move_learn_method.name === 'level-up')
      .map(details => ({
        level: details.level_learned_at,
        move: formatMoveName(moveEntry.move.name),
      })))
    .filter(entry => entry.level > 0 || entry.level === 1);

  const dedupedEntries = new Map();

  learnsetEntries.forEach(entry => {
    const key = `${entry.level}:${entry.move}`;
    if (!dedupedEntries.has(key)) dedupedEntries.set(key, entry);
  });

  return [...dedupedEntries.values()].sort((left, right) => {
    if (left.level !== right.level) return left.level - right.level;
    return left.move.localeCompare(right.move);
  });
}

function getPokemonDbPath(displayName) {
  if (SPECIES_DB_PATH_BY_DISPLAY_NAME[displayName]) return SPECIES_DB_PATH_BY_DISPLAY_NAME[displayName];

  return `${getSpeciesApiName(displayName)}/moves/8`;
}

function getTabPanelHtml(pageHtml, label, tabSetClass) {
  const escapedLabel = label
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\s+/g, '\\s*');
  const escapedTabSetClass = tabSetClass.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');

  if (!new RegExp(`<div class="${escapedTabSetClass}"`, 'i').test(pageHtml)) {
    throw new Error(`Could not locate the ${tabSetClass} tab set.`);
  }
  const tabMatch = pageHtml.match(new RegExp(`<a class="sv-tabs-tab[^"]*" href="#([^"]+)">\\s*${escapedLabel}\\s*<\\/a>`, 'i'));

  if (!tabMatch) {
    throw new Error(`Could not locate the "${label}" tab.`);
  }

  const [, panelId] = tabMatch;
  const panelMatch = pageHtml.match(new RegExp(`<div class="sv-tabs-panel[^"]*" id="${panelId}">([\\s\\S]*?)(?=<div class="sv-tabs-panel|<\\/div>\\s*<\\/div>\\s*<\\/div>)`, 'i'));

  if (!panelMatch) {
    throw new Error(`Could not locate the panel for "${label}".`);
  }

  return panelMatch[1];
}

function parseLearnsetTableRows(tableBodyHtml) {
  return [...tableBodyHtml.matchAll(/<tr>([\s\S]*?)<\/tr>/g)].map(match => {
    const rowHtml = match[1];
    const cells = [...rowHtml.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map(cellMatch => stripTags(cellMatch[1]));

    return {
      level: Number(cells[0]),
      move: cells[1],
    };
  }).filter(entry => Number.isFinite(entry.level) && entry.move);
}

function extractBdspLevelUpLearnset(sourceHtml, displayName) {
  const levelUpSectionMatch = sourceHtml.match(/learns the following moves in Pokémon Brilliant Diamond &amp; Shining Pearl at the levels specified\.<\/p>\s*<div class="resp-scroll"><table class="data-table[^"]*">[\s\S]*?<tbody>([\s\S]*?)<\/tbody>/i);

  if (!levelUpSectionMatch) {
    if (/does not learn any level up moves/i.test(sourceHtml)) return [];

    throw new Error(`Could not parse the BDSP level-up learnset table for ${displayName}.`);
  }

  return parseLearnsetTableRows(levelUpSectionMatch[1]);
}

function getBdspLearnsetFromPokemonDbPage(pageHtml, displayName) {
  const formLabel = SPECIES_DB_FORM_LABEL_BY_DISPLAY_NAME[displayName];

  if (!formLabel) {
    return extractBdspLevelUpLearnset(pageHtml, displayName);
  }

  const formPanelHtml = getTabPanelHtml(pageHtml, formLabel, 'tabset-moves-game-form sv-tabs-wrapper');

  return extractBdspLevelUpLearnset(formPanelHtml, displayName);
}

function readTrainerFiles() {
  return fs.readdirSync(TRAINERS_DIR).map(fileName => JSON.parse(
    fs.readFileSync(path.join(TRAINERS_DIR, fileName), 'utf8'),
  ));
}

async function runWithConcurrency(items, limit, worker) {
  const results = [];
  let cursor = 0;

  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const currentIndex = cursor;
      cursor += 1;
      results[currentIndex] = await worker(items[currentIndex], currentIndex);
    }
  });

  await Promise.all(workers);
  return results;
}

async function main() {
  ensureDir(POKEMON_DIR);
  ensureDir(MOVES_DIR);

  const trainers = readTrainerFiles();
  const speciesNames = new Set(['Turtwig', 'Chimchar', 'Piplup', 'Starly']);
  const moveNames = new Set(['Tackle', 'Scratch', 'Pound', 'Growl', 'Leer', 'Withdraw', 'Ember']);

  trainers.forEach(trainer => {
    trainer.pokemon.forEach(pokemon => {
      speciesNames.add(pokemon.species);
      pokemon.moves
        .filter(move => move && move !== '--')
        .forEach(move => moveNames.add(move));
    });
  });

  const sortedSpeciesNames = [...speciesNames].sort((left, right) => left.localeCompare(right));
  const pokemonData = await runWithConcurrency(sortedSpeciesNames, 8, async speciesName => {
    try {
      const apiName = getSpeciesApiName(speciesName);
      const pokemonResponse = await fetchJson(`${API_BASE_URL}/pokemon/${apiName}`);
      const speciesResponse = await fetchJson(`${API_BASE_URL}/pokemon-species/${pokemonResponse.species.name}`);
      const pokemonDbPath = getPokemonDbPath(speciesName);
      const pokemonDbPage = await fetchText(`${POKEMON_DB_BASE_URL}/${pokemonDbPath}`);
      const learnset = getBdspLearnsetFromPokemonDbPage(pokemonDbPage, speciesName);

      learnset.forEach(entry => moveNames.add(entry.move));

      return {
        species: speciesName,
        game: 'bdsp',
        types: pokemonResponse.types
          .sort((left, right) => left.slot - right.slot)
          .map(entry => entry.type.name),
        growthRate: normalizeGrowthRate(speciesResponse.growth_rate.name),
        baseExperience: pokemonResponse.base_experience,
        evYield: mapEvYield(pokemonResponse.stats),
        baseStats: mapBaseStats(pokemonResponse.stats),
        learnset,
      };
    } catch (error) {
      throw new Error(`${speciesName}: ${error.message}`);
    }
  });

  const sortedMoveNames = [...moveNames].sort((left, right) => left.localeCompare(right));
  const moveData = await runWithConcurrency(sortedMoveNames, 8, async moveName => {
    const apiName = MOVE_API_NAME_BY_DISPLAY_NAME[moveName] ?? moveName
      .toLowerCase()
      .replace(/[.'’]/g, '')
      .replace(/\s+/g, '-');
    const moveResponse = await fetchJson(`${API_BASE_URL}/move/${apiName}`);

    return {
      name: moveName,
      game: 'bdsp',
      type: moveResponse.type.name,
      category: moveResponse.damage_class.name,
      power: moveResponse.power ?? 0,
    };
  });

  const pokemonIndex = pokemonData
    .sort((left, right) => left.species.localeCompare(right.species))
    .map(pokemon => {
      const fileName = `${slugify(pokemon.species)}.json`;
      fs.writeFileSync(path.join(POKEMON_DIR, fileName), `${JSON.stringify(pokemon, null, 2)}\n`);

      return {
        species: pokemon.species,
        file: `pokemon/bdsp/${fileName}`,
      };
    });

  const moveIndex = moveData
    .sort((left, right) => left.name.localeCompare(right.name))
    .map(move => {
      const fileName = `${slugify(move.name)}.json`;
      fs.writeFileSync(path.join(MOVES_DIR, fileName), `${JSON.stringify(move, null, 2)}\n`);

      return {
        name: move.name,
        file: `moves/bdsp/${fileName}`,
      };
    });

  fs.writeFileSync(POKEMON_INDEX_PATH, `${JSON.stringify(pokemonIndex, null, 2)}\n`);
  fs.writeFileSync(MOVE_INDEX_PATH, `${JSON.stringify(moveIndex, null, 2)}\n`);

  console.log(`Generated ${pokemonIndex.length} Pokemon files.`);
  console.log(`Generated ${moveIndex.length} move files.`);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
