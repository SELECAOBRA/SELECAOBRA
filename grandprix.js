'use strict';

const teamSelect = document.querySelector('#teamSelect');
const teamScore = document.querySelector('#teamScore');
const teamsUpdated = document.querySelector('#teamsUpdated');
const status = document.querySelector('#status');
const calculator = document.querySelector('#calculator');
const positions = [...document.querySelectorAll('.position')];
const grandTotal = document.querySelector('#grandTotal');
const clearButton = document.querySelector('#clearButton');
const grandprixImage = document.querySelector('#grandprixImage');

let teams = [];

function parsePosition(text) {
  const value = text.trim();

  if (!/^\d+$/.test(value)) {
    return null;
  }

  const number = Number(value);

  return Number.isSafeInteger(number) && number >= 1 && number <= 40
    ? number
    : null;
}

function currentTeamScore() {
  const selectedValue = teamSelect.value;

  // A opção "Selecione a equipe" possui value vazio.
  // Nesse caso, a pontuação inicial deve ser zero.
  if (selectedValue === '') {
    return 0;
  }

  const index = Number(selectedValue);

  if (
    Number.isInteger(index) &&
    index >= 0 &&
    index < teams.length
  ) {
    return teams[index].score;
  }

  return 0;
}

function update() {
  let total = currentTeamScore();

  teamScore.textContent = String(total);

  const usedPositions = new Set();

  positions.forEach((input) => {
    const raw = input.value.trim();
    const position = parsePosition(raw);

    let points = 0;

    // Uma posição válida só pontua na primeira ocorrência.
    // Campo vazio, inválido ou posição repetida vale 0 pontos.
    if (position !== null && !usedPositions.has(position)) {
      points = 51 - position;
      usedPositions.add(position);
    }

    input.classList.remove('invalid');

    input
      .closest('tr')
      .querySelector('.points')
      .textContent = String(points);

    total += points;
  });

  grandTotal.textContent = String(total);
}

function validateConfig(config) {
  if (
    !config ||
    !Array.isArray(config.teams) ||
    config.teams.length === 0
  ) {
    throw new Error('Lista de equipes inválida.');
  }

  config.teams.forEach((team) => {
    if (
      typeof team.name !== 'string' ||
      !team.name.trim() ||
      !Number.isSafeInteger(team.score) ||
      team.score < 0
    ) {
      throw new Error(
        'Equipe ou pontuação inválida no teams.json.'
      );
    }
  });

  return config;
}

async function loadTeams() {
  try {
    const response = await fetch(
      `config/teams.json?v=${Date.now()}`,
      { cache: 'no-store' }
    );

    if (!response.ok) {
      throw new Error(
        `Não foi possível carregar as equipes (${response.status}).`
      );
    }

    const config = validateConfig(
      await response.json()
    );

    teams = config.teams;

    teams.forEach((team, index) => {
      const option = document.createElement('option');

      option.value = String(index);
      option.textContent = `${team.name} · ${team.score} pts`;

      teamSelect.appendChild(option);
    });

    teamsUpdated.textContent = config.updatedAt
      ? `Equipes atualizadas em: ${config.updatedAt
          .split('-')
          .reverse()
          .join('/')}`
      : '';

    // Evita carregar imagem antiga do Grand Prix.
    grandprixImage.src =
      `images/grandprix.png?v=${Date.now()}`;

    status.classList.add('hidden');
    calculator.classList.remove('hidden');

    update();
  } catch (error) {
    status.textContent = `Erro: ${error.message}`;
    status.classList.add('notice--error');
  }
}

teamSelect.addEventListener('change', update);

document.addEventListener('input', (event) => {
  if (event.target.matches('.position')) {
    update();
  }
});

clearButton.addEventListener('click', () => {
  teamSelect.value = '';

  positions.forEach((input) => {
    input.value = '';
  });

  update();
  teamSelect.focus();
});

loadTeams();
