'use strict';

const state = {
  config: null,
  eventIndex: 0
};

const $ = (q) => document.querySelector(q);

const els = {
  status: $('#status'),
  calculator: $('#calculator'),
  eventSelect: $('#eventSelect'),
  eventLabel: $('#eventLabel'),
  eventName: $('#eventName'),
  updatedAt: $('#updatedAt'),
  tracks: $('#tracks'),
  template: $('#trackTemplate'),
  total: $('#totalScore'),
  completed: $('#completedText'),
  limits: $('#limitsText'),
  weeklyImage: $('#weeklyImage'),
  clear: $('#clearButton')
};

const formatPoints = new Intl.NumberFormat('pt-BR', {
  maximumFractionDigits: 0
});


/* =========================================================
   LEITURA DO VALOR DIGITADO
   Aceita ponto ou vírgula como separador decimal.
   Somente valores maiores que zero são válidos.
   ========================================================= */

function parsePositive(text) {
  const valueText = text.trim();

  if (!/^\d+(?:[.,]\d+)?$/.test(valueText)) {
    return null;
  }

  const value = Number(
    valueText.replace(',', '.')
  );

  if (!Number.isFinite(value) || value <= 0) {
    return null;
  }

  return value;
}


/* =========================================================
   CÁLCULO DA PONTUAÇÃO

   Fórmula:
       a*x² + b*x + c

   Regras:
       mínimo = 1.000
       máximo = 15.000

   IMPORTANTE PARA PISTAS DE TEMPO:

   O ponto mínimo da parábola é:

       x = -b / (2*a)

   Se o tempo informado for maior que esse ponto,
   a parábola começaria a subir novamente.

   Nessa situação retornamos diretamente a pontuação mínima.
   ========================================================= */

function calculateScore(value, track, min, max) {

  /*
   * Proteção específica para pistas de TEMPO.
   */
  if (track.type === 'time' && track.a !== 0) {

    const minimumPoint =
      -track.b / (2 * track.a);

    if (
      Number.isFinite(minimumPoint) &&
      value > minimumPoint
    ) {
      return min;
    }
  }


  /*
   * Cálculo normal da equação.
   */
  const raw =
    track.a * value * value +
    track.b * value +
    track.c;


  if (!Number.isFinite(raw)) {
    throw new Error(
      'Resultado matemático inválido.'
    );
  }


  /*
   * Limites da pontuação.
   */
  return Math.max(
    min,
    Math.min(max, raw)
  );
}


/* =========================================================
   VALIDAÇÃO DO ARQUIVO events.json
   ========================================================= */

function validateConfig(config) {

  if (
    !config ||
    !Array.isArray(config.events) ||
    config.events.length < 1 ||
    config.events.length > 2
  ) {
    throw new Error(
      'A configuração deve ter um ou dois eventos.'
    );
  }


  if (
    !(config.scoreMin >= 0) ||
    !(config.scoreMax > config.scoreMin)
  ) {
    throw new Error(
      'Limites de pontuação inválidos.'
    );
  }


  for (const event of config.events) {

    if (
      !event.name ||
      !Array.isArray(event.tracks) ||
      event.tracks.length < 4 ||
      event.tracks.length > 5
    ) {
      throw new Error(
        `Evento inválido: ${event.name || 'sem nome'}.`
      );
    }


    for (const track of event.tracks) {

      if (
        !['time', 'distance'].includes(track.type) ||
        ![track.a, track.b, track.c].every(Number.isFinite)
      ) {
        throw new Error(
          `Configuração inválida em ${
            track.name || 'uma pista'
          }.`
        );
      }
    }
  }


  return config;
}


/* =========================================================
   CARREGAMENTO DO ARQUIVO events.json
   ========================================================= */

async function loadConfig() {

  try {

    /*
     * Evita utilizar uma versão antiga do JSON.
     */
    const configUrl =
      `config/events.json?v=${Date.now()}`;

    const response = await fetch(
      configUrl,
      {
        cache: 'no-store'
      }
    );


    if (!response.ok) {
      throw new Error(
        `Não foi possível carregar a configuração (${response.status}).`
      );
    }


    state.config = validateConfig(
      await response.json()
    );


    renderEventOptions();
    render();


    els.status.classList.add('hidden');

    els.calculator.classList.remove('hidden');


    /*
     * Registra Service Worker.
     */
    if ('serviceWorker' in navigator) {

      navigator.serviceWorker
        .register('./sw.js')
        .catch(() => {});
    }

  } catch (error) {

    els.status.textContent =
      `Erro: ${error.message}`;

    els.status.classList.add(
      'notice--error'
    );
  }
}


/* =========================================================
   LISTA DE EVENTOS
   ========================================================= */

function renderEventOptions() {

  els.eventSelect.replaceChildren(

    ...state.config.events.map(
      (event, index) => {

        const option =
          document.createElement('option');

        option.value =
          String(index);

        option.textContent =
          `${event.label} · ${event.name}`;

        return option;
      }
    )
  );
}


/* =========================================================
   DESENHA O EVENTO SELECIONADO
   ========================================================= */

function render() {

  const config =
    state.config;

  const event =
    config.events[state.eventIndex];


  els.eventLabel.textContent =
    event.label;


  els.eventName.textContent =
    event.name;


  els.updatedAt.textContent =
    config.updatedAt
      ? `Configuração: ${
          config.updatedAt
            .split('-')
            .reverse()
            .join('/')
        }`
      : '';


  els.limits.textContent =
    `Cada pista vale de ${
      formatPoints.format(config.scoreMin)
    } a ${
      formatPoints.format(config.scoreMax)
    } pontos. Campos vazios não entram no total.`;



  /* =======================================================
     IMAGEM CORRESPONDENTE AO EVENTO

     Evento 0 = evento atual
     Evento 1 = evento anterior
     ======================================================= */

  const weeklyFile =
    state.eventIndex === 0
      ? 'evento-semanal.png'
      : 'evento-semana-anterior.png';


  /*
   * Date.now() impede o navegador de reutilizar
   * uma imagem antiga do cache.
   */
  els.weeklyImage.src =
    `images/${weeklyFile}?v=${Date.now()}`;


  els.weeklyImage.alt =
    state.eventIndex === 0
      ? 'Referência do evento atual'
      : 'Referência do evento anterior';



  /* =======================================================
     CRIA AS LINHAS DAS PISTAS
     ======================================================= */

  els.tracks.innerHTML = '';


  event.tracks.forEach(
    (track, index) => {

      const node =
        els.template.content.cloneNode(true);


      /*
       * Mostra somente:
       *
       * 1
       * 2
       * 3
       * ...
       *
       * em vez de "Pista 1".
       */
      node
        .querySelector('.track-name')
        .textContent =
          String(index + 1);



      /*
       * Tempo ou Distância.
       */
      node
        .querySelector('.track-type')
        .textContent =
          track.type === 'time'
            ? 'Tempo'
            : 'Distância';



      /*
       * Unidade:
       *
       * s
       * m
       * etc.
       */
      node
        .querySelector('.unit')
        .textContent =
          track.unit;



      /*
       * Campo de resultado.
       */
      const input =
        node.querySelector(
          '.track-input'
        );


      input.dataset.index =
        String(index);


      input.setAttribute(
        'aria-label',
        `${track.name}: ${
          track.type === 'time'
            ? 'tempo'
            : 'distância'
        }`
      );


      els.tracks.appendChild(node);
    }
  );


  updateScores();
}


/* =========================================================
   ATUALIZA PONTUAÇÃO
   ========================================================= */

function updateScores() {

  const config =
    state.config;

  const event =
    config.events[state.eventIndex];


  const inputs = [
    ...document.querySelectorAll(
      '.track-input'
    )
  ];


  let total = 0;
  let completed = 0;


  inputs.forEach(
    (input, index) => {

      const raw =
        input.value;


      const value =
        parsePositive(raw);


      const row =
        input.closest(
          '.track-row'
        );


      const error =
        row.querySelector(
          '.error'
        );


      const output =
        row.querySelector(
          '.track-score'
        );


      output.classList.remove(
        'is-max'
      );



      /*
       * Campo vazio.
       */
      if (!raw.trim()) {

        error.textContent = '';

        output.textContent = '—';

        return;
      }



      /*
       * Número inválido.
       */
      if (value === null) {

        error.textContent =
          'Informe um número maior que zero.';

        output.textContent =
          '—';

        return;
      }



      error.textContent = '';



      /*
       * Calcula pontuação.
       */
      const points =
        calculateScore(
          value,
          event.tracks[index],
          config.scoreMin,
          config.scoreMax
        );



      total += points;

      completed++;



      /*
       * Exibição arredondada.
       */
      output.textContent =
        `${formatPoints.format(
          Math.round(points)
        )} pts`;



      /*
       * Destaque quando atingir
       * os 15.000 pontos.
       */
      if (
        points ===
        config.scoreMax
      ) {
        output.classList.add(
          'is-max'
        );
      }
    }
  );



  /*
   * Atualiza TOTAL.
   */
  els.total.textContent =
    formatPoints.format(
      Math.round(total)
    );



  els.completed.textContent =
    `${completed} ${
      completed === 1
        ? 'pista preenchida'
        : 'pistas preenchidas'
    }`;
}


/* =========================================================
   TROCA DE EVENTO
   ========================================================= */

els.eventSelect.addEventListener(
  'change',
  () => {

    state.eventIndex =
      Number(
        els.eventSelect.value
      );

    /*
     * Renderizar novamente também
     * recria os campos de veículo,
     * tempo/distância etc.
     */
    render();
  }
);


/* =========================================================
   ALTERAÇÃO DOS VALORES
   ========================================================= */

els.tracks.addEventListener(
  'input',
  (event) => {

    if (
      event.target.matches(
        '.track-input'
      )
    ) {
      updateScores();
    }
  }
);


/* =========================================================
   BOTÃO LIMPAR

   Limpa:
   - veículos
   - tempos
   - distâncias
   ========================================================= */

els.clear.addEventListener(
  'click',
  () => {

    document
      .querySelectorAll(
        '.track-input, .vehicle-input'
      )
      .forEach(
        input => {
          input.value = '';
        }
      );


    updateScores();


    document
      .querySelector(
        '.vehicle-input'
      )
      ?.focus();
  }
);


/* =========================================================
   INICIALIZAÇÃO
   ========================================================= */

loadConfig();
