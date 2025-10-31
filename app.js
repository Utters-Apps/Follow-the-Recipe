import { NPCS, ALL_RECIPES, RANKS, SAVE_KEY, THEME_KEY, CUISINE_KEY, RESTO_NAME_KEY, CUISINE_DEFS } from './data.js';
import { initializeAudio, playSound, ensureAudioStarted } from './audio.js';
import { createElementFromHTML, getIngredientHTML } from './ui.js';

const appRoot = document.getElementById('app');

/* --- GAME CONSTANTS --- */
const PENALTY_FAILURE = 10;
const BASE_PENALTY_PER_RANK = 4;
// make VIPs and Rush Hour scale more aggressively with rank so higher ranks feel frantic
const VIP_PENALTY_BONUS = 10;
const VIP_CHANCE_BASE = 0.06;
const VIP_CHANCE_PER_RANK = 0.1; // increased from 0.06 -> 0.1
const RUSH_HOUR_CHANCE_BASE = 0.12; // increased baseline
const RUSH_HOUR_CHANCE_PER_RANK = 0.12; // increased per-rank scaling
const BASE_TIMER_DURATION = 15;
const MIN_TIMER_DURATION = 3; // allow shorter minimum
const RUSH_HOUR_TIMER_MULTIPLIER = 0.6; // faster during rush
const VIP_REWARD_MULTIPLIER = 1.9; // slightly bigger VIP reward
const SUCCESS_MODAL_DURATION = 1600;
const FAILURE_MODAL_DURATION = 2000;
const BGM_KEY = 'recipeGameBGMMuted_v6';
const LANG_KEY = 'recipeGameLanguage_v1'; // added language storage key
/* ---------------------- */

function buildLayout() {
  appRoot.innerHTML = `
  <div id="game-container" class="w-full max-w-md h-full md:h-[100vh] md:max-h-[100vh] shadow-xl rounded-2xl flex flex-col overflow-hidden relative bg-white/80 backdrop-blur-sm border border-white/30">
    <!-- Setup (first run) -->
    <div id="setup-screen" class="screen active p-6 flex flex-col items-center justify-start text-center h-full">
      <h1 class="text-3xl font-black mb-1">Bem-vindo ao seu Restaurante</h1>
      <p class="text-sm text-gray-500 mb-6">Defina o nome e a culinária para começar</p>
      <div class="w-full space-y-3">
        <label class="block text-left text-sm font-semibold">Nome do Restaurante</label>
        <input id="resto-name-input" type="text" maxlength="24" placeholder="Ex: Sabor & Arte"
               class="w-full p-3 rounded-xl border border-gray-300 bg-white text-gray-800 focus-visible:outline-none" />
      </div>
      <div class="w-full mt-4">
        <label class="block text-left text-sm font-semibold mb-2">Escolha a Culinária</label>
        <div id="cuisine-choices" class="grid grid-cols-2 gap-2">
          ${[
            {n:"Brasileiro",e:"🇧🇷"},{n:"Italiano",e:"🇮🇹"},{n:"Japonês",e:"🇯🇵"},{n:"Mexicano",e:"🇲🇽"},{n:"Francês",e:"🇫🇷"}
          ].map(c=>`<button class="cuisine-btn btn-main w-full p-3 rounded-xl border" data-cuisine="${c.n}">${c.e} ${c.n}</button>`).join('')}
        </div>
      </div>
      <button id="setup-confirm" class="btn-main w-full mt-6 bg-green-500 text-white font-bold px-6 py-4 rounded-xl text-2xl shadow-lg disabled:opacity-60" disabled>
        <i class="fas fa-check mr-2"></i> Confirmar
      </button>
      <div class="mt-auto w-full flex justify-between items-center text-gray-500 text-sm pt-4">
        <button id="theme-toggle-setup" class="btn-theme w-12 h-12 rounded-full flex items-center justify-center"><i class="fas fa-moon"></i></button>
      </div>
    </div>

    <!-- Welcome -->
    <div id="welcome-screen" class="screen p-8 flex flex-col items-center justify-center text-center h-full hidden">
      <i class="fas fa-hat-chef text-7xl mb-6 animate-chef-wave"></i>
      <h1 class="text-4xl font-black mb-2">Siga a Receita</h1>
      <p id="resto-name-display" class="text-base opacity-80 mb-4"></p>
      <button id="welcome-play-button" class="btn-main w-full bg-green-500 text-white font-bold px-10 py-4 rounded-xl text-2xl shadow-lg">
        <i class="fas fa-play mr-2"></i> Jogar
      </button>
      <!-- PWA install button (hidden by default, shown when browser supports beforeinstallprompt) -->
      <button id="install-pwa-button" class="btn-main w-full mt-3 bg-indigo-600 text-white font-bold px-10 py-3 rounded-xl text-lg hidden">
        <i class="fas fa-download mr-2"></i> Instalar jogo
      </button>
      <div class="mt-2 text-xs opacity-70">Desenvolvido inteiramente por <span class="font-semibold">FerUtter (Gustavo F. P.)</span></div>
      <div class="mt-auto flex justify-between items-center w-full text-gray-500 text-sm">
        <button id="reset-button-welcome" class="hover:text-red-500 hover:underline transition-colors"><i class="fas fa-trash-alt mr-1"></i> Resetar Progresso</button>
        <button id="theme-toggle-welcome" class="btn-theme w-12 h-12 rounded-full flex items-center justify-center"><i class="fas fa-moon"></i></button>
      </div>
    </div>

    <!-- Menu -->
    <div id="menu-screen" class="screen p-6 flex flex-col items-center justify-center text-center h-full hidden">
      <div id="rank-display" class="text-center mb-4 w-full">
        <div id="rank-icon" class="text-6xl mb-1">🧼</div>
        <h2 id="rank-name" class="text-2xl font-bold">Lava-pratos</h2>
        <button id="view-upcoming-ranks" class="btn-main mt-2 bg-gray-100 text-gray-800 px-4 py-2 rounded-lg text-sm">Ver próximos ranques</button>
      </div>
      <div id="rank-goal" class="p-3 rounded-xl mb-4 text-center w-full shadow-inner border">
        <h4 class="text-base font-bold">Próximo Nível</h4>
        <p id="rank-goal-text" class="text-sm">Compre a receita no Mercado!</p>
      </div>
      <button id="play-button" class="btn-main w-full bg-green-500 text-white font-bold px-10 py-4 rounded-xl text-2xl shadow-lg mb-3"><i class="fas fa-play mr-2"></i> Próximo Pedido</button>
      <button id="market-button" class="btn-main w-full bg-blue-500 text-white font-bold px-10 py-4 rounded-xl text-2xl shadow-lg"><i class="fas fa-store mr-2"></i> Mercado</button>
      <div id="restaurants-button-container" class="mt-2 hidden">
        <button id="restaurants-button" class="btn-main w-full bg-indigo-600 text-white font-bold px-6 py-3 rounded-xl text-lg"><i class="fas fa-utensils mr-2"></i> Meus Restaurantes</button>
      </div>
      <div class="mt-auto flex justify-between items-center w-full text-gray-500 text-sm">
        <button id="reset-button-menu" class="hover:text-red-500 hover:underline transition-colors"><i class="fas fa-trash-alt mr-1"></i> Resetar Progresso</button>
        <button id="theme-toggle-menu" class="btn-theme w-12 h-12 rounded-full flex items-center justify-center"><i class="fas fa-moon"></i></button>
      </div>
    </div>

    <!-- Game -->
    <div id="game-screen" class="screen flex-col hidden h-full">
      <header class="border-b p-3 flex justify-between items-center z-10">
        <button id="pause-button" class="text-2xl w-10 h-10 flex items-center justify-center"><i class="fas fa-pause"></i></button>
        <div class="flex items-center space-x-3">
          <div id="streak-display" class="text-orange-500 font-bold text-lg"></div>
          <div id="money-display-game" class="money-pill font-bold px-5 py-2 rounded-full text-lg shadow-md">$50</div>
        </div>
      </header>
      <main class="flex-1 flex flex-col p-3 overflow-y-auto relative">
        <div id="rush-hour-banner" class="hidden absolute top-0 left-0 right-0 text-white text-center p-2 font-bold z-20">HORÁRIO DE PICO! (Recompensas 2x)</div>
        <div id="order-area" class="flex flex-col items-center mb-3 pt-4">
          <div id="npc-display" class="text-7xl transition-transform duration-300"></div>
          <div id="order-display" class="speech-bubble font-bold text-center mt-3 w-52">
            <span id="dish-emoji" class="text-5xl block"></span>
            <span id="dish-name" class="block mt-2 text-base"></span>
          </div>
        </div>

        <div id="recipe-list" class="text-center mb-2 flex flex-wrap justify-center items-center"></div>

        <div class="w-full rounded-full h-5 mb-2 overflow-hidden shadow-inner border">
          <div id="timer-bar-inner" class="h-full rounded-full"></div>
        </div>
        <div id="timer-text" class="text-center font-bold text-base mb-2">Tempo: 12s</div>

        <div id="player-plate" class="border rounded-lg p-3 min-h-[6rem] max-h-[8rem] mb-3 shadow-inner flex flex-wrap justify-center items-center gap-2 overflow-y-auto"></div>

        <div id="message-box" class="text-center text-xl font-bold"></div>
      </main>

      <footer class="p-3 shadow-inner border-t overflow-y-auto max-h-[180px]">
        <div id="ingredient-bin" class="grid grid-cols-5 gap-2 justify-items-center"></div>
      </footer>
    </div>

    <!-- Market (tabs) -->
    <div id="market-screen" class="screen flex-col hidden h-full">
      <header class="border-b p-3 z-10">
        <div class="flex items-center justify-between">
          <button id="menu-button-market" class="text-2xl w-10 h-10 flex items-center justify-center"><i class="fas fa-arrow-left"></i></button>
          <h2 class="text-xl font-bold flex-1 text-center m-0 title-wrap">Mercado</h2>
          <div class="header-right flex items-center gap-2">
            <div id="money-display-market" class="money-pill font-bold px-4 py-2 rounded-full text-base shadow-md">$50</div>
            <div id="stars-display-market" class="stars-pill font-bold text-base">0.0 ★</div>
          </div>
        </div>
      </header>
      <main class="flex-1 p-3 w-full space-y-3">
        <div class="tabbar sticky top-0 z-10">
          <button id="tab-buy" class="tab active"><i class="fas fa-coins mr-2"></i>Comprar Pratos</button>
          <button id="tab-owned" class="tab"><i class="fas fa-utensils mr-2"></i>Meus Pratos</button>
        </div>
        <div id="market-scroll" class="relative">
          <div id="market-items-grid" class="space-y-3"></div>
          <div id="market-owned-grid" class="space-y-3 hidden"></div>
        </div>
      </main>
    </div>

    <!-- Create Restaurant Screen -->
    <div id="create-restaurant-screen" class="screen p-4 flex flex-col items-stretch justify-start h-full hidden">
      <h2 class="text-2xl font-black mb-3 text-center">Novo Restaurante</h2>
      <div class="rounded-xl border p-3 mb-3">
        <label class="block text-left text-sm font-semibold mb-1">Nome</label>
        <input id="new-resto-name-full" class="w-full p-3 rounded-xl border" placeholder="Ex: Casa do Sabor" maxlength="24">
      </div>
      <div class="grid grid-cols-2 gap-3 mb-3">
        <div class="rounded-xl border p-3">
          <div class="text-sm font-semibold mb-2 text-left">Culinária</div>
          <div id="create-cuisine-choices" class="grid grid-cols-2 gap-2"></div>
        </div>
        <div class="rounded-xl border p-3">
          <div class="text-sm font-semibold mb-2 text-left">Ícone</div>
          <div id="icon-choices" class="grid grid-cols-5 gap-2 text-2xl"></div>
        </div>
      </div>
      <div class="rounded-xl border p-3 mb-3">
        <div class="text-sm font-semibold mb-2 text-left">Cor do Tema</div>
        <div id="color-choices" class="flex flex-wrap gap-2"></div>
      </div>
      <div class="rounded-xl border p-4 mb-3 flex items-center gap-3">
        <div id="preview-icon" class="text-3xl">🍽️</div>
        <div class="flex-1">
          <div id="preview-name" class="font-bold">Restaurante</div>
          <div id="preview-meta" class="text-sm opacity-70">— • 0.0 ★</div>
        </div>
        <div id="preview-badge" class="px-3 py-1 rounded-full text-white" style="background:#8b5cf6">Novo</div>
      </div>
      <div class="w-full flex gap-2 mt-auto">
        <button id="create-resto-cancel" class="btn-main w-1/2 bg-gray-300 font-bold py-3 rounded-lg">Cancelar</button>
        <button id="create-resto-confirm" class="btn-main w-1/2 bg-purple-600 text-white font-bold py-3 rounded-lg">Criar</button>
      </div>
    </div>

    <!-- Modals -->
    <div id="market-message-modal" class="hidden absolute inset-0 z-50 flex items-center justify-center p-6">
      <div id="market-message-content" class="p-5 rounded-2xl shadow-2xl text-center w-full max-w-sm">
        <i id="market-message-icon" class="fas fa-check-circle text-6xl mb-3"></i>
        <h3 id="market-message-title" class="text-xl font-bold mb-1"></h3>
        <p id="market-message-text" class="mb-4 text-sm"></p>
        <button id="market-message-close" class="btn-main w-full bg-purple-500 text-white font-bold py-3 rounded-lg text-lg">OK</button>
      </div>
    </div>

    <div id="confirm-reset-modal" class="hidden absolute inset-0 z-50 flex items-center justify-center p-6">
      <div class="p-5 rounded-2xl shadow-2xl text-center w-full max-w-sm">
        <i class="fas fa-exclamation-triangle text-6xl text-red-500 mb-3"></i>
        <h3 class="text-xl font-bold mb-1">Resetar Progresso?</h3>
        <p class="mb-4 text-sm">Todo o seu dinheiro, receitas e ranque serão perdidos.</p>
        <div class="flex gap-2">
          <button id="confirm-reset-cancel" class="btn-main w-full bg-gray-400 text-white font-bold py-3 rounded-lg text-lg">Cancelar</button>
          <button id="confirm-reset-confirm" class="btn-main w-full bg-red-600 text-white font-bold py-3 rounded-lg text-lg">Confirmar</button>
        </div>
      </div>
    </div>

    <div id="rank-up-modal" class="hidden absolute inset-0 z-50 flex items-center justify-center p-6">
      <div class="p-5 rounded-2xl shadow-2xl text-center w-full max-w-sm">
        <i id="rank-up-icon-modal" class="fas fa-star text-7xl text-yellow-400 mb-3"></i>
        <h3 id="rank-up-title" class="text-xl font-bold mb-1">Você subiu de ranque!</h3>
        <p id="rank-up-text" class="mb-4 text-sm"></p>
        <button id="rank-up-close" class="btn-main w-full bg-purple-500 text-white font-bold py-3 rounded-lg text-lg">OK</button>
      </div>
    </div>

    <div id="pause-modal" class="hidden absolute inset-0 z-50 flex items-center justify-center p-6">
      <div class="card p-5 rounded-2xl w-full max-w-sm text-center">
        <h3 class="text-2xl font-bold mb-2">Pausado</h3>
        <p class="text-sm mb-4 opacity-80">O tempo foi congelado.</p>
        <div class="flex gap-2">
          <button id="pause-resume" class="btn-main w-full bg-green-500 text-white font-bold py-3 rounded-lg">Continuar Pedido</button>
          <button id="pause-return-menu" class="btn-main w-full bg-blue-500 text-white font-bold py-3 rounded-lg">Voltar ao Menu</button>
        </div>
      </div>
    </div>

    <div id="success-modal" class="hidden absolute inset-0 bg-green-500/70 z-50 flex items-center justify-center p-6 text-center">
      <i id="success-icon" class="fas fa-check-circle text-7xl text-white mb-4"></i>
      <h2 id="success-message" class="text-3xl font-bold text-white">Perfeito! +$18</h2>
    </div>

    <div id="failure-modal" class="hidden absolute inset-0 bg-red-600/70 z-50 flex items-center justify-center p-6 text-center">
      <i id="failure-icon" class="fas fa-times-circle text-7xl text-white mb-4"></i>
      <h2 id="failure-message" class="text-3xl font-bold text-white">Errado! -$10</h2>
    </div>

    <div id="auto-offer-modal" class="hidden absolute inset-0 z-50 flex items-center justify-center p-6">
      <div class="card p-5 rounded-2xl w-full max-w-sm text-center">
        <h3 class="text-2xl font-bold mb-2" id="offer-title">Novo prato disponível!</h3>
        <p class="text-sm mb-4" id="offer-desc"></p>
        <div class="flex gap-2">
          <button id="offer-skip" class="btn-main w-full bg-gray-400 text-white font-bold py-3 rounded-lg">Depois</button>
          <button id="offer-buy" class="btn-main w-full bg-purple-600 text-white font-bold py-3 rounded-lg">Comprar</button>
        </div>
      </div>
    </div>

    <!-- Restaurants Modal -->
    <div id="restaurants-modal" class="hidden absolute inset-0 z-50 flex items-center justify-center p-6">
      <div class="card p-5 rounded-2xl w-full max-w-md text-left">
        <h3 class="text-2xl font-bold mb-2">Restaurantes</h3>
        <div id="restaurants-list" class="space-y-2 max-h-64 overflow-y-auto mb-4"></div>
        <div class="flex gap-2">
          <input id="new-resto-name" class="flex-1 p-3 rounded-lg border" placeholder="Nome do novo restaurante (máx 6)" maxlength="24">
          <button id="create-resto" class="btn-main bg-green-500 text-white px-4 py-3 rounded-lg">Criar</button>
        </div>
        <div class="mt-3 text-sm text-gray-500">Você pode ter até 6 restaurantes.</div>
        <div class="mt-4 flex justify-end">
          <button id="close-restaurants" class="btn-main bg-gray-300 px-4 py-2 rounded-lg">Fechar</button>
        </div>
      </div>
    </div>

    <!-- Upcoming Ranks Modal -->
    <div id="upcoming-ranks-modal" class="hidden absolute inset-0 z-60 flex items-center justify-center p-6">
      <div class="card modal-card modal-scrim-pane p-0 rounded-2xl w-full max-w-md">
        <div class="p-4 modal-card" role="dialog" aria-modal="true" aria-labelledby="upcoming-ranks-title">
          <div class="flex items-center justify-between mb-3">
            <h3 id="upcoming-ranks-title" class="text-2xl font-bold">Próximos Ranques</h3>
            <button id="close-upcoming-ranks" aria-label="Fechar próximos ranques" class="btn-main btn-ghost px-3 py-2 rounded-lg">Fechar</button>
          </div>
          <div id="upcoming-ranks-list" class="space-y-2 max-h-64 overflow-y-auto mb-4" tabindex="0" aria-live="polite"></div>
          <div class="modal-actions flex justify-end gap-2">
            <!-- Footer kept intentionally minimal to avoid duplicated close controls -->
            <div style="width:0;height:0;overflow:hidden" aria-hidden="true"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Language Choice Modal (new) -->
    <div id="language-modal" class="hidden absolute inset-0 z-70 flex items-center justify-center p-6">
      <div class="card p-5 rounded-2xl w-full max-w-sm text-center">
        <h3 class="text-2xl font-bold mb-3">Escolha o idioma / Choose the game language</h3>
        <p class="text-sm mb-4 opacity-80">Select a language — most options will redirect to a language page. Portuguese will keep you here.</p>
        <div class="grid grid-cols-1 gap-2 mb-3">
          <button class="lang-btn btn-main w-full bg-gray-200 text-black py-3 rounded-lg" data-lang="Russian" data-href="https://utters-apps.github.io/Follow-the-Recipe/">Русский (Russian)</button>
          <button class="lang-btn btn-main w-full bg-gray-200 text-black py-3 rounded-lg" data-lang="German" data-href="https://utters-apps.github.io/Follow-the-Recipe/">Deutsch (German)</button>
          <button class="lang-btn btn-main w-full bg-gray-200 text-black py-3 rounded-lg" data-lang="Spanish" data-href="https://utters-apps.github.io/Follow-the-Recipe/">Español (Spanish)</button>
          <button class="lang-btn btn-main w-full bg-gray-200 text-black py-3 rounded-lg" data-lang="English" data-href="https://utters-apps.github.io/Follow-the-Recipe/">English</button>
          <button class="lang-btn btn-main w-full bg-purple-600 text-white py-3 rounded-lg" data-lang="Portuguese" data-href="">Português (stay)</button>
        </div>
        <div class="text-xs opacity-70">You can change the language later in settings (not yet implemented).</div>
      </div>
    </div>
  </div>
  `;
}
buildLayout();

/* ---------- State ---------- */
function saveToStorage(key, value){ localStorage.setItem(key, JSON.stringify(value)); }
function loadFromStorage(key){ try { return JSON.parse(localStorage.getItem(key)); } catch(e){ return null; } }
function getTheme(){ return localStorage.getItem(THEME_KEY) || null; }
function setTheme(t){ localStorage.setItem(THEME_KEY, t); }

let gameState = loadFromStorage(SAVE_KEY) || {
  money: 50,
  // single-restaurant legacy fields kept for migration
  unlockedRecipeNames: ["Misto Quente","Limonada","Café"],
  unlockedIngredientIds: ["pao","manteiga","queijo","tomate","limao","mel","gelo","ervas","cafe","leite"],
  rank: 0,
  // new restaurants structure
  restaurants: [
    // default restaurant (migrated from legacy fields on init if needed)
    { id: crypto?.randomUUID?.() || 'r0', name: 'Meu Restaurante', cuisine: null, unlockedRecipeNames: ["Misto Quente","Limonada","Café"], unlockedIngredientIds: ["pao","manteiga","queijo","tomate","limao","mel","gelo","ervas","cafe","leite"], rank:0 }
  ],
  activeRestaurantIndex: 0
};

let profile = {
  restoName: localStorage.getItem(RESTO_NAME_KEY) || null,
  cuisine: localStorage.getItem(CUISINE_KEY) || null
};

let session = {
  currentOrder: null,
  playerSelection: [],
  timer: 10,
  timerId: null,
  gameActive: false,
  isPaused: false,
  currentStreak: 0,
  isRushHour: false,
  isVIP: false
};

/* ---------- Dom refs ---------- */
const query = id => document.getElementById(id);
const setupScreen = query('setup-screen');
const restoNameInput = query('resto-name-input');
const cuisineChoices = query('cuisine-choices');
const setupConfirm = query('setup-confirm');
const themeToggleSetup = query('theme-toggle-setup');

const welcomePlayButton = query('welcome-play-button');
const playButton = query('play-button');
const marketButton = query('market-button');
const pauseButton = query('pause-button');
const menuButtonMarket = query('menu-button-market');
const marketMessageClose = query('market-message-close');
const resetButtonWelcome = query('reset-button-welcome');
const resetButtonMenu = query('reset-button-menu');
const confirmResetCancel = query('confirm-reset-cancel');
const confirmResetConfirm = query('confirm-reset-confirm');
const rankUpClose = query('rank-up-close');
const themeToggleWelcome = query('theme-toggle-welcome');
const themeToggleMenu = query('theme-toggle-menu');
const musicToggleHeader = query('music-toggle');
let musicToggleSetup, musicToggleWelcomeBtn, musicToggleMenuBtn;

const moneyDisplayGame = query('money-display-game');
const moneyDisplayMarket = query('money-display-market');
const streakDisplay = query('streak-display');
const restoNameDisplay = query('resto-name-display');

const rankIcon = query('rank-icon');
const rankName = query('rank-name');
const rankGoal = query('rank-goal');
const rankGoalText = query('rank-goal-text');

const npcDisplay = query('npc-display');
const dishEmoji = query('dish-emoji');
const dishName = query('dish-name');
const recipeList = query('recipe-list');
const timerText = query('timer-text');
const timerBarInner = query('timer-bar-inner');
const playerPlate = query('player-plate');
const messageBox = query('message-box');
const ingredientBin = query('ingredient-bin');

const tabBuy = query('tab-buy');
const tabOwned = query('tab-owned');
const marketItemsGrid = query('market-items-grid');
const marketOwnedGrid = query('market-owned-grid');
const marketMessageModal = query('market-message-modal');
const marketMessageContent = query('market-message-content');
const marketMessageTitle = query('market-message-title');
const marketMessageText = query('market-message-text');
const marketMessageIcon = query('market-message-icon');

const rankUpModal = query('rank-up-modal');
const rankUpIconModal = query('rank-up-icon-modal');
const rankUpTitle = query('rank-up-title');
const rankUpText = query('rank-up-text');

const welcomeScreen = document.querySelector('#welcome-screen');
const menuScreen = document.querySelector('#menu-screen');
const gameScreen = document.querySelector('#game-screen');
const marketScreen = document.querySelector('#market-screen');
const confirmResetModal = query('confirm-reset-modal');
const successModal = query('success-modal');
const successMessage = query('success-message');
const successIcon = query('success-icon');
const failureModal = query('failure-modal');
const failureMessage = query('failure-message');
const failureIcon = query('failure-icon');
const rushHourBanner = query('rush-hour-banner');

const pauseModal = query('pause-modal');
const pauseResume = query('pause-resume');
const pauseReturnMenu = query('pause-return-menu');
const musicToggle = query('music-toggle');
const createRestaurantScreen = query('create-restaurant-screen'); // add ref for create screen

/* NEW: Loading Screen Ref */
const loadingScreen = document.getElementById('loading-screen'); 

/* ---------- Screen helpers ---------- */
function showScreen(id){
  const screens = [setupScreen, welcomeScreen, menuScreen, gameScreen, marketScreen, createRestaurantScreen];
  screens.forEach(s => {
    if (!s) return;
    if (s.id === id){
      s.classList.remove('hidden');
      s.classList.add('screen-enter');
      setTimeout(()=> s.classList.remove('screen-enter'), 280);
    } else {
      s.classList.add('hidden');
    }
  });
}

/* ---------- Theme helpers (fixed to apply consistently) ---------- */
function applyTheme(theme){
  const html = document.documentElement;
  const t = theme === 'dark' ? 'dark' : 'light';
  html.classList.toggle('dark', t==='dark');
  html.classList.toggle('light', t==='light');
  const icon = t === 'dark' ? 'fa-sun' : 'fa-moon';
  [themeToggleSetup, themeToggleWelcome, themeToggleMenu].forEach(btn => { if (btn) btn.innerHTML = `<i class="fas ${icon}"></i>`; });
  setTheme(t);
}
function loadTheme(){
  const t = getTheme();
  if (t) applyTheme(t);
  else applyTheme(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
}
function toggleTheme(){ applyTheme(document.documentElement.classList.contains('dark') ? 'light' : 'dark'); playSound('click'); }

/* ---------- Cuisine & ranks ---------- */
function getActiveRanks(){
  if (profile.cuisine && CUISINE_DEFS[profile.cuisine]) return CUISINE_DEFS[profile.cuisine];
  return RANKS;
}
function filterRecipesByCuisine(recipes, cuisine = null){
  // allow callers to pass a cuisine (e.g. active restaurant's cuisine); fallback to profile.cuisine
  const c = cuisine || profile.cuisine;
  if (!c) return recipes;
  return recipes.filter(r => Array.isArray(r.cuisine) ? r.cuisine.includes(c) : true);
}

// helper: current restaurant accessor & migration
function getActiveRestaurant(){
  if (!gameState.restaurants || !Array.isArray(gameState.restaurants) || gameState.restaurants.length===0){
    gameState.restaurants = [{ id: 'r0', name:'Meu Restaurante', cuisine: profile.cuisine || null, unlockedRecipeNames: gameState.unlockedRecipeNames || [], unlockedIngredientIds: gameState.unlockedIngredientIds || [], rank: gameState.rank || 0 }];
    gameState.activeRestaurantIndex = 0;
    saveGame();
  }
  // migrate legacy top-level lists into first restaurant if legacy fields exist
  const r = gameState.restaurants[gameState.activeRestaurantIndex || 0];
  if (!r.unlockedRecipeNames && gameState.unlockedRecipeNames) r.unlockedRecipeNames = gameState.unlockedRecipeNames;
  return gameState.restaurants[gameState.activeRestaurantIndex || 0];
}

// New: produce exactly 2 starter recipes and ensure starters do NOT include any future rank-up recipe names
function getStartingUnlocks(cuisine){
  // cuisine-specific guaranteed starters
  const cuisineStarters = {
    "Brasileiro": ["Misto Quente","Limonada","Pão de Queijo"],
    "Italiano": ["Salada Caprese","Gelato","Panna Cotta"],
    "Japonês": ["Mochi","Tamagoyaki","Yakitori"],
    "Mexicano": ["Churros","Salsa Fresca","Água Fresca"],
    "Francês": ["Croissant Recheado","Macarons","Pain Perdu"],
    "Halloween": ["Café Preto (Espresso)","Biscoitos Fantasma"]
  };
  if (cuisine && cuisineStarters[cuisine]) {
    // prefer to provide exactly the requested three (or two for Halloween)
    const available = filterRecipesByCuisine(ALL_RECIPES).map(r=>r.name);
    const starters = cuisineStarters[cuisine].filter(n => available.includes(n));
    // ensure at least two starters; if less, fallback to previous behavior
    if (starters.length >= 2) return starters.slice(0,3);
  }

  const pool = (cuisine ? filterRecipesByCuisine(ALL_RECIPES) : ALL_RECIPES)
    .filter(r => r.minRank <= 1)
    .sort((a,b)=>a.price - b.price);

  // gather all dynamic rank-up recipe names for the cuisine to exclude from starters
  const ranks = (cuisine ? CUISINE_DEFS[cuisine] : RANKS);
  const forbidden = new Set();
  for (let i=0;i<ranks.length-1;i++){
    const name = getRankUnlockRecipeName(i, cuisine) || ranks[i+1]?.recipeToUnlock;
    if (name) forbidden.add(name);
  }

  // prefer a couple of safe favorites but skip forbidden
  const prefer = ["Misto Quente","Onigiri","Torrada","Limonada","Panqueca Doce","Bagel","Suco de Laranja"];
  const starters = [];
  prefer.forEach(name=>{
    if (starters.length >= 2) return;
    const found = pool.find(p=>p.name===name && !forbidden.has(p.name));
    if (found) starters.push(found.name);
  });
  for (const r of pool){
    if (starters.length >= 2) break;
    if (!starters.includes(r.name) && !forbidden.has(r.name)) starters.push(r.name);
  }
  // final safety: if still less than 2, allow cheapest (but avoid exact match of forbidden)
  if (starters.length < 2){
    for (const r of pool){
      if (starters.length>=2) break;
      if (!starters.includes(r.name)) starters.push(r.name);
    }
  }
  return starters.slice(0,2);
}

// NEW: ensure unlocked lists never include future rank-up required recipes for the cuisine
function sanitizeUnlocks(cuisine, unlockedList){
  if (!Array.isArray(unlockedList)) return [];
  const ranks = (cuisine ? CUISINE_DEFS[cuisine] : RANKS);
  // Collect all future required recipe names (all recipeToUnlock values across ranks)
  const required = new Set();
  for (let i = 0; i < ranks.length; i++){
    const name = ranks[i]?.recipeToUnlock;
    if (name) required.add(name);
    // also include dynamic names via getRankUnlockRecipeName just in case
    const dyn = getRankUnlockRecipeName(i, cuisine);
    if (dyn) required.add(dyn);
  }
  // Keep unlocked recipes but remove any that match a future required recipe (they should be earned)
  return unlockedList.filter(name => !required.has(name));
}

// ensure rank-up selection chooses a recipe that is purchasable (not already unlocked) and exists for that cuisine
function getRankUnlockRecipeName(rankIndex, cuisine) {
  const targetMinRank = rankIndex + 1;
  // prefer all recipes whose minRank equals the target; if none, fall back to cheapest locked recipe for this cuisine
  const pool = filterRecipesByCuisine(ALL_RECIPES)
    .filter(r => r.minRank === targetMinRank && (!cuisine || (Array.isArray(r.cuisine) ? r.cuisine.includes(cuisine) : true)));
  if (pool.length > 0) {
    pool.sort((a,b)=>a.price-b.price);
    return pool[0].name;
  }
  // fallback: find cheapest recipe that is not available at lower ranks (locked for this cuisine)
  const fallback = filterRecipesByCuisine(ALL_RECIPES)
    .filter(r => r.minRank > rankIndex && (!cuisine || (Array.isArray(r.cuisine) ? r.cuisine.includes(cuisine) : true)))
    .sort((a,b)=>a.price-b.price)[0];
  return fallback ? fallback.name : null;
}

// Show upcoming ranks modal content and handlers
function showUpcomingRanks(){
  const active = getActiveRestaurant();
  const ranks = getActiveRanks();
  const idx = Number.isInteger(active?.rank) ? active.rank : 0;
  const listEl = document.getElementById('upcoming-ranks-list');
  listEl.innerHTML = '';
  for (let i = idx+1; i < ranks.length; i++){
    const r = ranks[i];
    const recipeName = getRankUnlockRecipeName(i-1, active.cuisine || profile.cuisine) || r.recipeToUnlock || '—';
    const el = document.createElement('div');
    el.className = 'rank-entry soft-transition';
    el.innerHTML = `
      <div style="display:flex;align-items:center;">
        <div class="rank-icon">${r.icon || '🏅'}</div>
        <div>
          <div class="font-bold">${r.name}</div>
          <div class="rank-meta">Meta: <span class="font-semibold">${recipeName}</span></div>
        </div>
      </div>
      <div class="meta-badge">+${r.baseReward || 0}</div>
    `;
    listEl.appendChild(el);
  }
  const modal = document.getElementById('upcoming-ranks-modal');
  modal.classList.remove('hidden');
  // subtle focus for accessibility
  setTimeout(()=>{ listEl.focus(); }, 120);
}
document.getElementById('view-upcoming-ranks')?.addEventListener('click', ()=>{ playSound('click'); showUpcomingRanks(); });
document.getElementById('close-upcoming-ranks')?.addEventListener('click', ()=>{ playSound('click'); document.getElementById('upcoming-ranks-modal').classList.add('hidden'); });
/* removed duplicate footer close listener to avoid two visible/competing close buttons */

/* ---------- Renderers ---------- */
function updateAllMoneyDisplays(){
  const txt = `$${gameState.money}`;
  if (moneyDisplayGame) moneyDisplayGame.textContent = txt;
  if (moneyDisplayMarket) moneyDisplayMarket.textContent = txt;
  [moneyDisplayGame, moneyDisplayMarket].forEach(d => { 
    if (d){ 
      d.classList.remove('scale-110'); 
      void d.offsetWidth; 
      d.classList.add('scale-110'); 
      setTimeout(()=>d.classList.remove('scale-110'),300); // Adjusted timing for enhanced animation
    } 
  });

  // NEW: show Stars (restaurant rating) next to money displays
  try {
    const active = getActiveRestaurant();
    const starsVal = Number((active && typeof active.stars !== 'undefined') ? active.stars : 0).toFixed(1);

    // helper to ensure a stars element is present adjacent to a money element
    function ensureStarsElement(moneyEl, id){
      if (!moneyEl) return null;
      let starsEl = document.getElementById(id);
      if (!starsEl){
        starsEl = document.createElement('div');
        starsEl.id = id;
        // use purple stars-pill styling so stars appear consistent and prominent
        starsEl.className = 'stars-pill';
        starsEl.style.fontSize = '1rem';
        // insert right after money element
        moneyEl.insertAdjacentElement('afterend', starsEl);
      }
      return starsEl;
    }

    const gameStars = ensureStarsElement(moneyDisplayGame, 'stars-display-game');
    const marketStars = ensureStarsElement(moneyDisplayMarket, 'stars-display-market');

    const starHTML = `${starsVal} ★`;
    if (gameStars) gameStars.textContent = starHTML;
    if (marketStars) marketStars.textContent = starHTML;
  } catch(e){
    console.warn('Failed to render stars display', e);
  }
}

function updateRankDisplay(){
  // Always derive the rank list for the active restaurant (cuisine-specific)
  const active = getActiveRestaurant();
  const ranks = getActiveRanks();
  const idx = Number.isInteger(active?.rank) ? active.rank : 0;
  const current = ranks[idx] || ranks[0];
  rankIcon.textContent = current?.icon || '🏅';
  rankName.textContent = current?.name || 'Chef';

  // Next rank (if any) - compute target dynamically
  const nextRank = ranks[idx + 1];
  if (nextRank){
    const cuisine = (active && (active.cuisine || profile.cuisine)) || null;
    const goalName = getRankUnlockRecipeName(idx, cuisine) || String(nextRank.recipeToUnlock || '—');
    if (goalName && goalName !== 'null'){
      rankGoal.style.display = 'block';
      rankGoalText.innerHTML = `Compre a receita <span class="font-bold">${goalName}</span> no Mercado para atingir <span class="text-purple-600">${nextRank.name}</span>!`;
      return;
    }
  }
  rankGoal.style.display = 'none';
}

function renderUnlockedIngredientBin(){
  const active = getActiveRestaurant();
  ingredientBin.innerHTML = '';
  // base pool is active restaurant's unlocked ingredients (shuffled)
  const ids = [...(active.unlockedIngredientIds||[])];

  // Always include and prioritize current order ingredients, but final visible order should be shuffled
  const MAX_VISIBLE = 15;
  let visible = ids.slice(0, MAX_VISIBLE);

  if (session?.currentOrder?.recipe && Array.isArray(session.currentOrder.recipe)){
    const required = session.currentOrder.recipe;
    // ensure required ingredients present
    const set = new Set(required.concat(visible));
    const final = [];
    for (const r of required) if (!final.includes(r)) final.push(r);
    for (const v of ids) {
      if (final.length >= MAX_VISIBLE) break;
      if (!final.includes(v)) final.push(v);
    }
    visible = final.slice(0, MAX_VISIBLE);
  }

  // Shuffle visible so ingredient buttons appear in random order each time
  shuffleArray(visible);

  // As a last resort, if an ingredient id isn't in ALL_INGREDIENTS it will render a readable pill (handled in ui.getIngredientHTML)
  visible.forEach(id=>{
    const btn = document.createElement('button');
    btn.className = "ingredient-btn rounded-lg p-3 shadow-md";
    btn.dataset.id = id;
    btn.innerHTML = getIngredientHTML(id);
    ingredientBin.appendChild(btn);
  });
}

/* Market render with tabs */
function renderMarket(){
  const active = getActiveRestaurant();
  marketItemsGrid.innerHTML = '';
  marketOwnedGrid.innerHTML = '';

  const ranks = getActiveRanks();
  // use active.unlockedRecipeNames and active.rank
  const currentRank = ranks[active.rank || 0];
  const rankUp = [], buyable = [], locked = [], unlocked = [];

  const cuisine = active.cuisine || profile.cuisine || null;
  // Determine next rank unlock suggestion (may be dynamic or fallback)
  const nextRankRecipeName = getRankUnlockRecipeName((active.rank||0), cuisine);

  filterRecipesByCuisine(ALL_RECIPES).forEach(recipe=>{
    const isUnlocked = (active.unlockedRecipeNames||[]).includes(recipe.name);
    let isBuyable = (active.rank || 0) >= recipe.minRank;
    // if recipe is the dynamic required recipe for next rank, allow purchase (but only if not already unlocked)
    const isRankUpCard = nextRankRecipeName && recipe.name === nextRankRecipeName && !isUnlocked;
    if (isRankUpCard) isBuyable = true;
    
    const entry = { recipe, isUnlocked, isBuyable, isRankUpCard };
    if (isRankUpCard) rankUp.push(entry);
    else if (isUnlocked) unlocked.push(entry);
    else if (isBuyable) buyable.push(entry);
    else locked.push(entry);
  });

  const sortByPrice = (a,b)=>a.recipe.price-b.recipe.price;
  buyable.sort(sortByPrice); locked.sort(sortByPrice); unlocked.sort(sortByPrice);
  const sortedBuy = [...rankUp, ...buyable, ...locked];
  const sortedOwned = [...unlocked];

  // BUY TAB
  sortedBuy.forEach(({recipe,isUnlocked,isBuyable,isRankUpCard})=>{
    const card = document.createElement('div');
    card.className = `card rounded-xl shadow-lg p-4 flex items-center space-x-4 transition-all relative border`;
    const iconHtml = recipe.emoji ? `<div class="text-5xl">${recipe.emoji}</div>` 
                      : (recipe.image ? `<div style="width:56px;height:56px"><img src="${recipe.image}" alt="${recipe.name}" class="ing-img" style="width:56px;height:56px;object-fit:contain;border-radius:8px"></div>` : `<div class="text-5xl">🍽️</div>`);
    card.innerHTML = `
      ${isRankUpCard ? `<span class="absolute top-0 right-0 bg-yellow-500 text-white text-xs font-bold px-3 py-1 rounded-bl-xl">META</span>` : ''}
      ${iconHtml}
      <div class="flex-1">
        <h4 class="text-xl font-bold">${recipe.name}</h4>
        <p class="text-sm">${[...new Set([...(recipe.baseRecipe||[]), ...(recipe.optionalIngredients||[])])].map(id=>getIngredientHTML(id,'text-sm')).join(' + ')}</p>
      </div>
      ${
        isUnlocked ? `<div class="font-bold px-4 py-2 rounded-lg" style="background:var(--muted); color:var(--text-primary)">Comprado</div>` :
        isBuyable ? `<button class="btn-buy btn-main bg-purple-500 text-white font-bold px-6 py-3 rounded-lg text-lg" data-recipe="${recipe.name}"><i class="fas fa-coins mr-1"></i> $${recipe.price}</button>` :
        `<div class="font-bold px-3 py-2 rounded-lg text-center" style="background:var(--muted); color:var(--text-primary)"><i class="fas fa-lock mr-1"></i><span class="text-xs">Ranque: ${ranks[recipe.minRank]?.name || '—'}</span></div>`
      }
    `;
    marketItemsGrid.appendChild(card);
    if (!isUnlocked && isBuyable){
      const btn = card.querySelector('.btn-buy');
      btn && btn.addEventListener('click', ()=> buyRecipe(recipe.name));
    }
  });

  // OWNED TAB
  if (sortedOwned.length === 0){
    marketOwnedGrid.innerHTML = `<div class="text-center text-sm opacity-75">Você ainda não comprou pratos.</div>`;
  } else {
    sortedOwned.forEach(({recipe})=>{
      const card = document.createElement('div');
      card.className = `card rounded-xl shadow-lg p-4 flex items-center space-x-4 transition-all relative border`;
      const iconHtmlOwned = recipe.emoji ? `<div class="text-5xl">${recipe.emoji}</div>` 
                          : (recipe.image ? `<div style="width:56px;height:56px"><img src="${recipe.image}" alt="${recipe.name}" class="ing-img" style="width:56px;height:56px;object-fit:contain;border-radius:8px"></div>` : `<div class="text-5xl">🍽️</div>`);
      card.innerHTML = `
        ${iconHtmlOwned}
        <div class="flex-1">
          <h4 class="text-xl font-bold">${recipe.name}</h4>
          <p class="text-sm">${[...new Set([...(recipe.baseRecipe||[]), ...(recipe.optionalIngredients||[])])].map(id=>getIngredientHTML(id,'text-sm')).join(' + ')}</p>
        </div>
        <div class="text-green-500 font-bold px-4 py-2 rounded-lg bg-green-100">Disponível</div>
      `;
      marketOwnedGrid.appendChild(card);
    });
  }
}

/* ---------- Game logic & difficulty ---------- */
function saveGame(){ saveToStorage(SAVE_KEY, gameState); }

function resetGame(){
  playSound('error');
  try { if (bgAudio) { bgAudio.pause(); bgAudio.currentTime = 0; } } catch(e){}
  // Ensure any open modals are closed
  document.getElementById('confirm-reset-modal')?.classList.add('hidden');
  document.getElementById('market-message-modal')?.classList.add('hidden');
  document.getElementById('rank-up-modal')?.classList.add('hidden');
  document.getElementById('pause-modal')?.classList.add('hidden');
  document.getElementById('auto-offer-modal')?.classList.add('hidden');

  localStorage.clear();
  gameState = { money:50, restaurants:[{ id:'r0', name:'Meu Restaurante', cuisine:null, unlockedRecipeNames:[], unlockedIngredientIds:[], rank:0 }], activeRestaurantIndex:0 };
  profile = { restoName:null, cuisine:null };
  saveGame();
  // UI back to first-run
  updateRankDisplay();
  document.getElementById('restaurants-modal')?.classList.add('hidden');
  showScreen('setup-screen');
  renderMarket();
  renderUnlockedIngredientBin();
  updateAllMoneyDisplays();
}

function showConfirmResetModal(){ playSound('click'); confirmResetModal.classList.remove('hidden'); }
function showMarketMessage(title,text,isSuccess=true){
  marketMessageTitle.textContent = title;
  marketMessageText.textContent = text;
  marketMessageIcon.className = `fas ${isSuccess ? 'fa-check-circle text-green-500' : 'fa-times-circle text-red-500'}`;
  marketMessageModal.classList.remove('hidden');
  // add scrim class for theme aware background and animate content
  marketMessageModal.classList.add('modal-scrim-pane');
  marketMessageContent.classList.add('modal-card', 'soft-transition');
  // focus OK button
  setTimeout(()=>{ document.getElementById('market-message-close')?.focus(); }, 180);
}
function showRankUpModal(){
  playSound('success');
  const active = getActiveRestaurant();
  const ranks = getActiveRanks() || RANKS;
  const idx = Math.max(0, Math.min((active && typeof active.rank==='number')?active.rank:0, ranks.length-1));
  const rankDef = ranks[idx] || ranks[0];
  rankUpIconModal.textContent = rankDef.icon || '🏅';
  rankUpText.textContent = `Parabéns, você agora é ${rankDef.name || 'Chef'}!`;
  rankUpModal.classList.remove('hidden');
  rankUpModal.classList.add('modal-scrim-pane');
  // animate inner card
  const inner = rankUpModal.querySelector('.p-5');
  inner && inner.classList.add('modal-card','soft-transition');
  updateRankDisplay();
}

function buyRecipe(recipeName){
  const recipe = ALL_RECIPES.find(r=>r.name===recipeName);
  if (!recipe) return;
  const active = getActiveRestaurant();
  if (gameState.money >= recipe.price){
    playSound('buy');
    gameState.money -= recipe.price;
    active.unlockedRecipeNames = Array.from(new Set([...(active.unlockedRecipeNames||[]), recipe.name]));
    const s = new Set(active.unlockedIngredientIds || []);
    [...recipe.baseRecipe, ...recipe.optionalIngredients].forEach(id=>s.add(id));
    active.unlockedIngredientIds = Array.from(s);
    // After purchase check if this purchase satisfies any rank-up(s).
    const ranks = getActiveRanks();
    let currIdx = (active && typeof active.rank === 'number') ? active.rank : 0;
    const cuisine = active.cuisine || profile.cuisine || null;
    // Only advance a single rank if the purchased recipe exactly matches the next rank goal AND stars requirement is met.
    let advanced = false;
    if (currIdx < ranks.length - 1){
      const nextIdx = currIdx + 1;
      const nextGoalName = getRankUnlockRecipeName(currIdx, cuisine) || ranks[nextIdx]?.recipeToUnlock;
      // Use the configured requiredStars from the rank definition (no additional +1.0)
      const requiredStars = Number(ranks[nextIdx]?.requiredStars || 0);
      const activeStars = Number(active.stars || 0);
      if (nextGoalName && nextGoalName === recipe.name){
        if (activeStars >= requiredStars){
          currIdx = nextIdx;
          advanced = true;
        } else {
          // Inform player they bought the recipe but lack stars to promote
          showMarketMessage("Comprado — Estrelas insuficientes", `Você aprendeu ${recipe.name}, mas precisa de ★${requiredStars.toFixed(1)} para subir de ranque.`, false);
        }
        // Do NOT auto-unlock other recipes here; players should buy them individually.
      }
    }
    if (advanced){
      active.rank = Math.min(currIdx, Math.max(0, ranks.length - 1));
      saveGame();
      showRankUpModal();
    } else {
      // only show generic message if not already shown for star-blocked promotion
      if (!advanced) showMarketMessage("Receita Comprada!", `Você aprendeu a fazer ${recipe.name}!`, true);
    }
    saveGame(); renderMarket(); updateAllMoneyDisplays();
  } else {
    playSound('error');
    showMarketMessage("Dinheiro Insuficiente!", `Você precisa de $${recipe.price}.`, false);
  }
}

function getTimerDuration(){
  const active = getActiveRestaurant();
  const ranks = getActiveRanks();
  const base = BASE_TIMER_DURATION;
  const maxDifficultyRanks = Math.max(0, ranks.length - 1);
  const activeRank = (active && typeof active.rank === 'number') ? active.rank : 0;

  // Aggressive difficulty curve: each rank reduces time progressively (log-ish scaling)
  const rankFactor = Math.min(maxDifficultyRanks, activeRank);
  // stronger decay: subtract up to ~50% of base across ranks, clamp to MIN_TIMER_DURATION
  const decay = Math.round((base * 0.5) * (rankFactor / Math.max(1, maxDifficultyRanks)));
  let dur = Math.max(MIN_TIMER_DURATION, base - decay - Math.round(rankFactor * 0.6));

  // VIPs make a single order slightly easier (add +1s), but still fast at high ranks
  if (session.isVIP) dur = Math.min(base, dur + 1);

  if (session.isRushHour) dur = Math.max(1, Math.round(dur * RUSH_HOUR_TIMER_MULTIPLIER));

  // final clamp and ensure at least 1s (very intense late-game)
  if (dur < 1) dur = 1;
  return dur;
}

function stopTimer(reset=false){
  clearInterval(session.timerId);
  const parentWidth = timerBarInner.parentElement.offsetWidth;
  const currentWidth = timerBarInner.offsetWidth;
  const percentage = (currentWidth / parentWidth) * 100;
  
  // Freeze the bar visually at its current width
  timerBarInner.style.transition = '';
  timerBarInner.style.width = `${percentage}%`;
  
  if (reset) timerBarInner.style.width = '100%';
}

function resumeTimer(){
  if (!session.gameActive || !session.isPaused) return;
  session.isPaused = false;
  
  const duration = session.timer;
  
  // Reset transition property and force reflow
  timerBarInner.style.transition = ``;
  void timerBarInner.offsetWidth; 
  
  // Restart transition from current point over remaining time
  timerBarInner.style.transition = `width ${duration}s linear`;
  timerBarInner.style.width = '0%';
  
  timerText.textContent = `Tempo: ${session.timer}s`;
  
  session.timerId = setInterval(()=>{
    session.timer--;
    timerText.textContent = `Tempo: ${session.timer}s`;
    if (session.timer <= 0) checkOrder(false,'Tempo esgotado!');
  },1000);
}

function startTimer(){
  clearInterval(session.timerId);
  session.timer = getTimerDuration();
  timerText.textContent = `Tempo: ${session.timer}s`;
  timerBarInner.style.width = '100%';
  timerBarInner.style.transition = `width ${session.timer}s linear`;
  void timerBarInner.offsetWidth;
  timerBarInner.style.width = '0%';
  session.timerId = setInterval(()=>{
    session.timer--;
    timerText.textContent = `Tempo: ${session.timer}s`;
    if (session.timer <= 0) checkOrder(false,'Tempo esgotado!');
  },1000);
}

function startNewOrder(){
  session.gameActive = true;
  session.playerSelection = [];
  session.timer = getTimerDuration();
  session.isPaused = false;
  session.isVIP = Math.random() < Math.min(VIP_CHANCE_BASE + gameState.rank*VIP_CHANCE_PER_RANK, 0.4);
  playerPlate.innerHTML = '';
  messageBox.textContent = '';

  // Rush hour occurs more often at higher rank
  session.isRushHour = Math.random() < Math.min(RUSH_HOUR_CHANCE_BASE + gameState.rank*RUSH_HOUR_CHANCE_PER_RANK, 0.45);
  if (session.isRushHour) rushHourBanner.classList.remove('hidden'); else rushHourBanner.classList.add('hidden');

  // Safe recipe pool selection (per-restaurant)
  const active = getActiveRestaurant();
  const unlockedRecipes = ALL_RECIPES.filter(r => (active.unlockedRecipeNames||[]).includes(r.name));
  const availableByCuisine = filterRecipesByCuisine(unlockedRecipes);
  const pool = (availableByCuisine.length > 0 ? availableByCuisine : unlockedRecipes);
  if (pool.length === 0){
    const fallback = ALL_RECIPES.find(r => r.name === "Misto Quente") || ALL_RECIPES[0];
    if (fallback && !(active.unlockedRecipeNames||[]).includes(fallback.name)){
      active.unlockedRecipeNames = [...(active.unlockedRecipeNames||[]), fallback.name];
      const s = new Set(active.unlockedIngredientIds||[]);
      [...fallback.baseRecipe, ...fallback.optionalIngredients].forEach(i=>s.add(i));
      active.unlockedIngredientIds = Array.from(s);
      saveGame();
    }
  }
  const finalPool = (pool.length > 0 ? pool : ALL_RECIPES.filter(r => (active.unlockedRecipeNames||[]).includes(r.name)));
  session.currentOrder = finalPool[Math.floor(Math.random()*finalPool.length)];
  if (!session.currentOrder || !Array.isArray(session.currentOrder.baseRecipe)){
    showScreen('menu-screen');
    renderMarket();
    return;
  }

  let finalRecipe = [...session.currentOrder.baseRecipe];
  const availableOptionals = (Array.isArray(session.currentOrder.optionalIngredients) ? session.currentOrder.optionalIngredients : [])
    .filter(id => (active.unlockedIngredientIds || []).includes(id)); // FIX: use active restaurant ingredients

  const optionalRate = Math.min(0.5, 0.3 + gameState.rank*0.1);
  const optionalsToAdd = availableOptionals.filter(()=>Math.random() < optionalRate);
  if (session.isVIP && availableOptionals.length > 0) optionalsToAdd.push(availableOptionals[Math.floor(Math.random()*availableOptionals.length)]);

  if (optionalsToAdd.length>0 && finalRecipe.length>1){
    const last = finalRecipe.pop();
    finalRecipe = [...finalRecipe,...optionalsToAdd,last];
  } else if (optionalsToAdd.length>0) {
    finalRecipe = [...finalRecipe,...optionalsToAdd];
  }

  session.currentOrder.recipe = finalRecipe;
  recipeList.innerHTML = session.currentOrder.recipe.map((id,i)=>`<span class="recipe-step" id="step-${i}">${getIngredientHTML(id)}</span>`).join('');
  npcDisplay.textContent = NPCS[Math.floor(Math.random()*NPCS.length)];
  dishEmoji.textContent = session.currentOrder.emoji + (session.isVIP ? ' ✨' : '');
  dishName.textContent = session.currentOrder.name + (session.isVIP ? ' (CLIENTE VIP)' : '');

  renderUnlockedIngredientBin();
  startTimer();
}

function checkOrder(isSuccess, reason=''){
  if (!session.gameActive) return;
  session.gameActive = false;
  stopTimer(true);
  const active = getActiveRestaurant();
  if (isSuccess){
    playOutcomeAudio('success');
    session.currentStreak++;
    // Every time the player completes 2 correct orders in a row, award +0.1 stars (clamped to 5.0)
    const active = getActiveRestaurant(); // ensure single active binding used
    if (session.currentStreak > 0 && session.currentStreak % 2 === 0){
      active.stars = Math.min(5.0, Number((Number(active.stars || 0) + 0.1).toFixed(1)));
    }

    const ranks = getActiveRanks();
    const activeIdx = (active && typeof active.rank === 'number') ? active.rank : 0;
    const baseReward = (ranks[activeIdx]?.baseReward) ?? 12;
    const streakBonus = Math.max(3, Math.round(baseReward*0.2));
    const streakExtra = (session.currentStreak-1)*streakBonus;
    let total = baseReward + streakExtra;
    if (session.isRushHour){ total = (baseReward*2)+(streakExtra*2); session.isRushHour = false; }
    if (session.isVIP){ total = Math.round(total * VIP_REWARD_BONUS); }

    // Scale reward by stars: stars in [0..5] map to multiplier roughly 0.8..1.4
    const starsVal = Number(active.stars || 0);
    const starMultiplier = 0.8 + (Math.max(0, Math.min(5, starsVal)) / 5) * 0.6;
    total = Math.round(total * starMultiplier);
    gameState.money += total;
    updateAllMoneyDisplays();
    successMessage.textContent = `Perfeito! +$${total}`;
    successModal.classList.remove('hidden');
    setTimeout(()=>{
      successModal.classList.add('hidden');
      const offer = findAffordableRecipe();
      if (offer){ showAutoOffer(offer); } else { startNewOrder(); }
    },SUCCESS_MODAL_DURATION);
  } else {
    playOutcomeAudio('fail');
    session.currentStreak = 0;
    session.isRushHour = false;
    // on failure lose 0.1 stars (clamped to 0.0)
    const active = getActiveRestaurant(); // use same active here
    active.stars = Math.max(0.0, Number((Number(active.stars || 0) - 0.1).toFixed(1)));
    const activeRank = (active && typeof active.rank === 'number') ? active.rank : 0;
    let penalty = PENALTY_FAILURE + Math.round(activeRank * BASE_PENALTY_PER_RANK);
    if (session.isVIP) penalty += VIP_PENALTY_BONUS;
    if (gameState.money < penalty) penalty = gameState.money;
    gameState.money -= penalty;
    updateAllMoneyDisplays();
    failureMessage.textContent = `${reason} -$${penalty}`;
    failureModal.classList.remove('hidden');
    setTimeout(()=>{ failureModal.classList.add('hidden'); startNewOrder(); },FAILURE_MODAL_DURATION);
  }
  saveToStorage(SAVE_KEY, gameState);
  updateStreakDisplay();
}

function updateStreakDisplay(){
  if (session.currentStreak>1){
    streakDisplay.textContent = `${session.currentStreak}x 🔥`;
    streakDisplay.classList.add('animate-pulse');
    setTimeout(()=>streakDisplay.classList.remove('animate-pulse'),300);
  } else streakDisplay.textContent = '';
}

/* Background music support (attempt to load BGmusic.mp3 if present) */
let bgAudio = null;
function initBackgroundMusic() {
  try {
    bgAudio = new Audio('BGmusic.mp3');
    bgAudio.loop = true;
    bgAudio.volume = 0.32;
    // Some browsers may not reliably honor loop on certain files; ensure restart on ended
    bgAudio.addEventListener('ended', () => {
      try { bgAudio.currentTime = 0; bgAudio.play().catch(()=>{}); } catch(e){}
    });
    // will attempt to play on user interaction (see setupConfirm and welcomePlay)
  } catch (e) { bgAudio = null; console.warn('BG music init failed', e); }
}
function tryPlayBgMusic() {
  if (!bgAudio) return;
  const muted = localStorage.getItem(BGM_KEY) === '1';
  if (muted) { bgAudio.pause(); return; }
  bgAudio.play().catch(()=>{ /* autoplay blocked; will play on next user gesture */ });
}

function setBgmIcon(){
  const muted = localStorage.getItem(BGM_KEY) === '1';
  const icon = `<i class="fas ${muted ? 'fa-volume-mute text-gray-400' : 'fa-volume-up text-purple-600'}"></i>`;
  [musicToggleHeader, musicToggleSetup, musicToggleWelcomeBtn, musicToggleMenuBtn].forEach(btn=>{ if(btn) btn.innerHTML = icon; });
}

function toggleBgm(){
  const muted = localStorage.getItem(BGM_KEY) === '1';
  const nowMuted = !muted;
  localStorage.setItem(BGM_KEY, nowMuted ? '1':'0');
  if (!bgAudio) initBackgroundMusic();
  if (bgAudio){
    if (nowMuted) bgAudio.pause();
    else { bgAudio.currentTime = 0; bgAudio.play().catch(()=>{}); }
  }
  setBgmIcon();
  playSound('click');
}

function playOutcomeAudio(type){
  const src = type==='success' ? 'Correct.mp3' : 'Fail.mp3';
  try{
    const a = new Audio(src);
    a.volume = 0.6; a.play().catch(()=>{ type==='success' ? playSound('success') : playSound('error'); });
  } catch(e){ type==='success' ? playSound('success') : playSound('error'); }
}

/* Ingredient click handling */
ingredientBin.addEventListener('click', (e)=>{
  const btn = e.target.closest('button');
  if (!btn || !session.gameActive || session.isPaused) return;
  ensureAudioStarted();
  playSound('click');
  const id = btn.dataset.id;
  session.playerSelection.push(id);
  const span = document.createElement('span'); span.className='text-3xl'; span.innerHTML = getIngredientHTML(id,'inline-block');
  playerPlate.appendChild(span);
  playerPlate.scrollTop = playerPlate.scrollHeight;
  const idx = session.playerSelection.length-1;
  if (session.playerSelection[idx] !== session.currentOrder.recipe[idx]) { playSound('error'); span.classList.add('text-red-500'); checkOrder(false,'Ingrediente errado!'); return; }
  const stepEl = document.getElementById(`step-${idx}`);
  stepEl && stepEl.classList.add('correct');
  if (session.playerSelection.length === session.currentOrder.recipe.length) checkOrder(true);
});

/* ---------- Market tabs interactions ---------- */
function activateTab(tab){
  if (tab === 'buy'){
    tabBuy.classList.add('active'); tabOwned.classList.remove('active');
    marketItemsGrid.classList.remove('hidden'); marketOwnedGrid.classList.add('hidden');
  } else {
    tabOwned.classList.add('active'); tabBuy.classList.remove('active');
    marketOwnedGrid.classList.remove('hidden'); marketItemsGrid.classList.add('hidden');
  }
}

/* ---------- Setup interactions ---------- */
let selectedCuisine = null;
cuisineChoices.addEventListener('click', (e)=>{
  const btn = e.target.closest('.cuisine-btn');
  if (!btn) return;
  [...cuisineChoices.querySelectorAll('.cuisine-btn')].forEach(b=>b.classList.remove('bg-green-500','text-white'));
  btn.classList.add('bg-green-500','text-white');
  selectedCuisine = btn.dataset.cuisine;
  setupConfirm.disabled = !(restoNameInput.value.trim().length >= 2 && selectedCuisine);
});
restoNameInput.addEventListener('input', ()=>{
  setupConfirm.disabled = !(restoNameInput.value.trim().length >= 2 && selectedCuisine);
});
setupConfirm.addEventListener('click', ()=>{
  const name = restoNameInput.value.trim();
  if (name.length < 2 || !selectedCuisine) return;
  localStorage.setItem(RESTO_NAME_KEY, name);
  localStorage.setItem(CUISINE_KEY, selectedCuisine);
  profile.restoName = name;
  profile.cuisine = selectedCuisine;

  // Fresh game state bound to chosen cuisine (fix rank carryover)
  const startRecipes = getStartingUnlocks(selectedCuisine);
  const ingSet = new Set();
  startRecipes.forEach(rn=>{
    const r = ALL_RECIPES.find(r=>r.name===rn);
    if (r){ [...r.baseRecipe, ...(r.optionalIngredients||[])].forEach(i=>ingSet.add(i)); }
  });

  // sanitize starting recipe list to ensure no future required-rank recipe is pre-unlocked
  const sanitizedStarters = sanitizeUnlocks(selectedCuisine, startRecipes);

  gameState = {
    money: 50,
    unlockedRecipeNames: sanitizedStarters,
    unlockedIngredientIds: Array.from(ingSet),
    rank: 0
  };
  saveToStorage(SAVE_KEY, gameState);

  playSound('success');
  restoNameDisplay.textContent = `${name} • ${selectedCuisine}`;
  updateRankDisplay();
  renderMarket();
  renderUnlockedIngredientBin();
  showScreen('welcome-screen');
  // attach music toggles near theme buttons
  musicToggleSetup = document.createElement('button');
  musicToggleSetup.className = 'btn-theme w-12 h-12 rounded-full flex items-center justify-center';
  themeToggleSetup.parentElement.appendChild(musicToggleSetup);
  musicToggleSetup.addEventListener('click', toggleBgm);
  setBgmIcon();
  initBackgroundMusic();
  tryPlayBgMusic();
});

/* ---------- Navigation & buttons ---------- */
welcomePlayButton.addEventListener('click', ()=>{
  initializeAudio().catch(()=>{});
  tryPlayBgMusic();

  // Show a short tutorial the first time the player clicks Play
  const TKEY = 'recipeGameSeenTutorial_v1';
  const seen = localStorage.getItem(TKEY) === '1';
  if (!seen){
    showMarketMessage("Bem-vindo! Como jogar","Clique em 'Próximo Pedido' para receber um pedido, selecione os ingredientes exibidos na ordem mostrada e complete a receita antes do tempo acabar. Acertar 2 pedidos seguidos aumenta sua avaliação (★) — boas avaliações aumentam seus ganhos. Visite o Mercado para comprar novas receitas.", true);
    localStorage.setItem(TKEY,'1');
    // after player closes the modal they'll enter menu; ensure modal close returns them to menu
    const originalHandler = marketMessageClose.onclick;
    marketMessageClose.onclick = function(e){
      originalHandler && originalHandler(e);
      showScreen('menu-screen');
      // restore handler
      setTimeout(()=>{ marketMessageClose.onclick = originalHandler; },200);
    };
    return;
  }

  showScreen('menu-screen');
});

playButton.addEventListener('click', ()=>{ 
  startNewOrder(); renderUnlockedIngredientBin(); showScreen('game-screen'); 
});
marketButton.addEventListener('click', ()=>{ renderMarket(); updateAllMoneyDisplays(); showScreen('market-screen'); activateTab('buy'); });

pauseButton.addEventListener('click', ()=>{ 
  if (!session.gameActive || session.isPaused) return; 
  playSound('click'); 
  session.isPaused = true; 
  stopTimer(); 
  pauseModal.classList.remove('hidden'); 
});

pauseResume.addEventListener('click', () => {
  playSound('click');
  pauseModal.classList.add('hidden');
  resumeTimer();
});

pauseReturnMenu.addEventListener('click', () => {
  playSound('click');
  // Return to menu without penalty
  session.gameActive = false;
  stopTimer(true);
  pauseModal.classList.add('hidden');
  showScreen('menu-screen');
});

if (musicToggle) musicToggle.addEventListener('click', toggleBgm);

menuButtonMarket.addEventListener('click', ()=>{ showScreen('menu-screen'); });
marketMessageClose.addEventListener('click', ()=>{ playSound('click'); marketMessageModal.classList.add('hidden'); });
resetButtonWelcome.addEventListener('click', showConfirmResetModal);
resetButtonMenu.addEventListener('click', showConfirmResetModal);
confirmResetCancel.addEventListener('click', ()=>{ playSound('click'); confirmResetModal.classList.add('hidden'); });
confirmResetConfirm.addEventListener('click', ()=>{
  // Close modal before resetting to avoid lingering overlay
  confirmResetModal.classList.add('hidden');
  resetGame();
});
rankUpClose.addEventListener('click', ()=>{ rankUpModal.classList.add('hidden'); });
themeToggleWelcome && themeToggleWelcome.addEventListener('click', toggleTheme);
themeToggleMenu && themeToggleMenu.addEventListener('click', toggleTheme);
themeToggleSetup && themeToggleSetup.addEventListener('click', toggleTheme);

tabBuy.addEventListener('click', ()=>{ activateTab('buy'); });
tabOwned.addEventListener('click', ()=>{ activateTab('owned'); });

/* ---------- Init ---------- */
function init(){
  // migrate legacy top-level fields into restaurants if needed
  if (!gameState.restaurants || !Array.isArray(gameState.restaurants)){
    const migrated = { id: 'r0', name:'Meu Restaurante', cuisine: profile.cuisine || null, unlockedRecipeNames: gameState.unlockedRecipeNames || [], unlockedIngredientIds: gameState.unlockedIngredientIds || [], rank: gameState.rank || 0 };
    // sanitize migrated unlocked recipes so required rank recipes are not pre-bought
    migrated.unlockedRecipeNames = sanitizeUnlocks(migrated.cuisine, migrated.unlockedRecipeNames || []);
    gameState.restaurants = [migrated];
    gameState.activeRestaurantIndex = 0;
    // remove legacy top-level lists (kept but not used)
    delete gameState.unlockedRecipeNames; delete gameState.unlockedIngredientIds; delete gameState.rank;
    saveGame();
  }

  loadTheme();
  initBackgroundMusic(); // prepare audio object; playback happens on user actions
  updateAllMoneyDisplays();
  renderUnlockedIngredientBin();
  renderMarket();
  renderRestaurantsButtonIfEligible();

  if (!profile.restoName || !profile.cuisine){
    showScreen('setup-screen');
  } else {
    restoNameDisplay.textContent = `${profile.restoName} • ${profile.cuisine}`;
    updateRankDisplay();
    showScreen('welcome-screen');
  }
  
  // Restore BGM icon state
  setBgmIcon();
  
  // Hide loading screen
  if (loadingScreen) {
    loadingScreen.classList.add('fade-out');
    setTimeout(() => {
      loadingScreen.style.display = 'none';
    }, 500);
  }

  // Show language modal (if needed) after UI built and loading screen hidden
  setTimeout(()=> showLanguageModalIfNeeded(), 300);
}

/* ---------- Auto-offer logic ---------- */
const autoOfferModal = document.getElementById('auto-offer-modal');
const offerTitle = document.getElementById('offer-title');
const offerDesc = document.getElementById('offer-desc');
const offerSkip = document.getElementById('offer-skip');
const offerBuy = document.getElementById('offer-buy');
let pendingOffer = null;

function findAffordableRecipe() {
  const active = getActiveRestaurant();
  const ranks = getActiveRanks();
  const activeIdx = (active && typeof active.rank === 'number') ? active.rank : 0;
  const currentRank = ranks[activeIdx];

  // Consider all not-yet-unlocked recipes of the active cuisine
  let notUnlockedAll = filterRecipesByCuisine(ALL_RECIPES)
    .filter(r => !(active.unlockedRecipeNames||[]).includes(r.name));

  // If the mandatory recipe for the next rank exists but has been already purchased, treat as not available.
  if (currentRank?.recipeToUnlock) {
    const mandatory = notUnlockedAll.find(r => r.name === currentRank.recipeToUnlock);
    // Only return mandatory if it's truly not yet unlocked and affordable
    if (mandatory && gameState.money >= mandatory.price) return mandatory;
  }

  // Otherwise pick the cheapest allowed by current rank but ensure it's not already unlocked and within cuisine
  const pool = notUnlockedAll.filter(r => activeIdx >= r.minRank);
  // if pool is empty try to fallback to any notUnlocked regardless of minRank (but must be affordable)
  let candidate = pool.sort((a,b)=>a.price-b.price)[0];
  if (!candidate) candidate = notUnlockedAll.sort((a,b)=>a.price-b.price)[0];
  return (candidate && gameState.money>=candidate.price) ? candidate : null;
}

function showAutoOffer(recipe){
  // validate recipe is still not unlocked and affordable (race safety)
  const active = getActiveRestaurant();
  if (!recipe || (active.unlockedRecipeNames||[]).includes(recipe.name) || gameState.money < recipe.price){
    // try to find another valid offer; if none, just start next order
    const alt = findAffordableRecipe();
    if (!alt) { startNewOrder(); return; }
    recipe = alt;
  }
  pendingOffer = recipe;

  // Determine next-rank requirement if this recipe is the rank-up recipe
  const ranks = getActiveRanks();
  const currIdx = (active && typeof active.rank === 'number') ? active.rank : 0;
  const nextIdx = Math.min(ranks.length - 1, currIdx + 1);
  const nextDef = ranks[nextIdx] || null;
  let starsNeeded = null;
  if (nextDef){
    // use configured requiredStars (no additional +1.0)
    const baseReq = Number(nextDef.requiredStars || 0);
    starsNeeded = Number((baseReq).toFixed(1));
  }

  // Build modal content with clearer presentation
  offerTitle.textContent = `Você pode comprar: ${recipe.name}`;
  let starsInfo = '';
  if (starsNeeded !== null){
    const have = Number(active.stars || 0);
    const meets = have >= starsNeeded;
    starsInfo = `<div style="margin-top:.5rem; color:${meets ? 'var(--success)' : 'var(--danger)'}; font-weight:700;">Requer: ${starsNeeded} ★ — Você: ${have.toFixed(1)} ★ ${meets ? '✓' : '✕'}</div>`;
  }
  offerDesc.innerHTML = `<div style="display:flex;align-items:center;gap:.6rem;justify-content:center">
      <span style="font-size:2.2rem">${recipe.emoji}</span>
      <div style="text-align:left">
        <div style="font-weight:800;font-size:1.05rem">${recipe.name}</div>
        <div style="opacity:.85">Preço: <span style="font-weight:700">$${recipe.price}</span></div>
        ${starsInfo}
      </div>
    </div>`;
  autoOfferModal.classList.remove('hidden');
  // ensure it's shown as modal-wrap for consistent scrim behavior
  autoOfferModal.classList.add('modal-wrap','show','modal-scrim-pane');
  const inner = autoOfferModal.querySelector('.card, .p-5');
  if (inner) inner.classList.add('modal-card','fade');
}

offerSkip?.addEventListener('click', ()=>{ autoOfferModal.classList.add('hidden'); pendingOffer=null; startNewOrder(); });
offerBuy?.addEventListener('click', ()=>{
  const active = getActiveRestaurant();
  if (!pendingOffer){ autoOfferModal.classList.add('hidden'); pendingOffer=null; startNewOrder(); return; }

  // Before attempting to buy, compute rank-up requirement and whether purchase would trigger rank advancement
  const recipe = pendingOffer;
  const ranks = getActiveRanks();
  let currIdx = (active && typeof active.rank === 'number') ? active.rank : 0;
  const cuisine = active.cuisine || profile.cuisine || null;
  const nextIdx = currIdx + 1;
  const nextDef = ranks[nextIdx] || null;
  const nextGoalName = nextDef ? (getRankUnlockRecipeName(currIdx, cuisine) || nextDef.recipeToUnlock) : null;
  const baseRequiredStars = nextDef ? Number(nextDef.requiredStars || 0) : 0;
  const starsNeeded = Number((baseRequiredStars).toFixed(1)); // use exact requiredStars

  // Perform purchase normally (will deduct money and unlock)
  buyRecipe(recipe.name);

  // if this purchase is the rank-up recipe attempt, check stars to decide whether we advanced or just bought it
  if (nextGoalName && recipe.name === nextGoalName){
    const haveStars = Number(active.stars || 0);
    if (haveStars < starsNeeded){
      showMarketMessage("Comprado — Estrelas insuficientes", `Você comprou ${recipe.name}, mas precisa de ★${starsNeeded.toFixed(1)} para subir de ranque (você tem ${haveStars.toFixed(1)}).`, false);
    } else {
      updateRankDisplay();
    }
  }

  autoOfferModal.classList.add('hidden'); pendingOffer=null; startNewOrder();
});

/* ---------- Background music handling ---------- */
document.addEventListener('visibilitychange', ()=>{
  if (document.hidden && bgAudio) { try { bgAudio.pause(); } catch(e){} }
});
window.addEventListener('pagehide', ()=>{ if (bgAudio) { try { bgAudio.pause(); } catch(e){} } });

/* ---------- Setup interactions (Halloween button) ---------- */
document.addEventListener('DOMContentLoaded', ()=>{
  const container = document.getElementById('cuisine-choices');
  if (container && !container.querySelector('[data-cuisine="Halloween"]')){
    const sep = document.createElement('div');
    sep.className = 'col-span-2 mt-2 border-t pt-2';
    sep.innerHTML = `<button class="cuisine-btn btn-main p-2 rounded-lg border" data-cuisine="Halloween">🎃 Halloween</button>`;
    container.appendChild(sep);
  }
  // place music toggle next to theme toggle on welcome and menu
  musicToggleWelcomeBtn = document.createElement('button');
  musicToggleWelcomeBtn.className = 'btn-theme w-12 h-12 rounded-full flex items-center justify-center';
  themeToggleWelcome?.parentElement?.appendChild(musicToggleWelcomeBtn);
  musicToggleWelcomeBtn?.addEventListener('click', toggleBgm);

  musicToggleMenuBtn = document.createElement('button');
  musicToggleMenuBtn.className = 'btn-theme w-12 h-12 rounded-full flex items-center justify-center';
  themeToggleMenu?.parentElement?.appendChild(musicToggleMenuBtn);
  musicToggleMenuBtn?.addEventListener('click', toggleBgm);
  setBgmIcon();

  // Restaurants logic
  renderRestaurantsButtonIfEligible();
  renderRestaurantsModal();
});

// New modal helpers: use .modal-wrap and .modal-card.fade for consistent show/hide with fade
function showModalById(id){
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove('hidden');
  el.classList.add('modal-wrap','show');
  const inner = el.querySelector('.p-5, .card, .modal-card');
  if (inner) inner.classList.add('modal-card','fade');
  // focus first button
  setTimeout(()=>{ const b = el.querySelector('button, [role="button"]'); if(b) b.focus(); }, 160);
}
function hideModalById(id){
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove('show');
  const inner = el.querySelector('.p-5, .card, .modal-card');
  if (inner) inner.classList.remove('modal-card','fade');
  // wait transition then hide
  setTimeout(()=>{ el.classList.add('hidden'); }, 300);
}

/* Replace direct .classList.remove/add('hidden') usages for restaurants modal only to avoid wide changes.
   Wire restaurants button to open restaurants modal; when closing restaurants modal, keep restaurants-button visible. */
document.addEventListener('click', (e)=>{
  if (e.target && e.target.id === 'restaurants-button'){
    renderRestaurantsModal();
    showModalById('restaurants-modal');
  }
});

/* Replace create-resto flow: open create screen instead of inline small input, and make sure create button on modal opens this screen */
const closeRestaurantsBtn = document.getElementById('close-restaurants');
closeRestaurantsBtn && closeRestaurantsBtn.addEventListener('click', ()=>{
  hideModalById('restaurants-modal');
  // ensure restaurants-button remains visible after closing
  document.getElementById('restaurants-button-container')?.classList.remove('hidden');
});

/* Hook create button to open full creation screen */
const createRestoBtn = document.getElementById('create-resto');
createRestoBtn && createRestoBtn.addEventListener('click', ()=>{
  // Close restaurants modal and open full create screen
  hideModalById('restaurants-modal');
  showScreen('create-restaurant-screen');
  return;
});

/* New handlers for full create screen */
document.addEventListener('DOMContentLoaded', ()=>{
  const createConfirm = document.getElementById('create-resto-confirm');
  const createCancel = document.getElementById('create-resto-cancel');
  const nameInputFull = document.getElementById('new-resto-name-full');
  // Dynamic choices
  const cuisineWrap = document.getElementById('create-cuisine-choices');
  const iconWrap = document.getElementById('icon-choices');
  const colorWrap = document.getElementById('color-choices');
  const icons = ["🍽️","🍣","🍕","🌮","🥐","🍜","🥗","🍔","🍰","🍛","🍟","🍩"];
  const colors = ["#8b5cf6","#06b6d4","#10b981","#f59e0b","#ef4444","#3b82f6","#111827","#14b8a6"];
  cuisineWrap.innerHTML = ["Brasileiro","Italiano","Japonês","Mexicano","Francês","Halloween"].map(c=>`<button class="create-cuisine-btn btn-main p-2 rounded-lg border text-sm" data-cuisine="${c}">${c}</button>`).join('');
  iconWrap.innerHTML = icons.map(i=>`<button class="icon-btn btn-main p-2 rounded-lg border">${i}</button>`).join('');
  colorWrap.innerHTML = colors.map(c=>`<button class="color-btn w-8 h-8 rounded-full border" style="background:${c}" data-color="${c}" aria-label="${c}"></button>`).join('');
  let chosenCuisine = null;
  let chosenIcon = "🍽️";
  let chosenColor = "#8b5cf6";
  document.getElementById('create-cuisine-choices')?.addEventListener('click', (e)=>{
    const b = e.target.closest('.create-cuisine-btn');
    if (!b) return;
    document.querySelectorAll('.create-cuisine-btn').forEach(x=>x.classList.remove('bg-green-500','text-white'));
    b.classList.add('bg-green-500','text-white');
    chosenCuisine = b.dataset.cuisine;
    document.getElementById('preview-meta').textContent = `${chosenCuisine} • 0.0 ★`;
  });
  iconWrap?.addEventListener('click',(e)=>{ const b=e.target.closest('.icon-btn'); if(!b)return; chosenIcon=b.textContent.trim(); document.getElementById('preview-icon').textContent=chosenIcon; });
  colorWrap?.addEventListener('click',(e)=>{ const b=e.target.closest('.color-btn'); if(!b)return; chosenColor=b.dataset.color; document.getElementById('preview-badge').style.background=chosenColor; });
  nameInputFull?.addEventListener('input',()=>{ document.getElementById('preview-name').textContent = (nameInputFull.value||'Restaurante').slice(0,24); });
  createCancel && createCancel.addEventListener('click', ()=>{
    showScreen('menu-screen');
    renderRestaurantsButtonIfEligible();
  });
  createConfirm && createConfirm.addEventListener('click', ()=>{
    const rawName = (nameInputFull && nameInputFull.value.trim()) || '';
    const defaultName = `Restaurante ${ (gameState.restaurants||[]).length + 1 }`;
    const name = rawName.length > 0 ? rawName.slice(0,24) : defaultName;

    if ((gameState.restaurants||[]).length >= 6){
      showMarketMessage('Limite atingido','Você não pode ter mais que 6 restaurantes.', false);
      return;
    }

    if (!chosenCuisine){
      showMarketMessage('Escolha uma culinária','Selecione a culinária para o novo restaurante.', false);
      return;
    }

    const chosen = chosenCuisine || profile.cuisine || null;
    // compute starting unlocks robustly and sanitize them against rank-required recipes
    const starters = getStartingUnlocks(chosen);
    const sanitizedStarters = sanitizeUnlocks(chosen, starters);
    const ingSet = new Set();
    sanitizedStarters.forEach(rn=>{
      const rec = ALL_RECIPES.find(x=>x.name===rn);
      if (rec){
        [...rec.baseRecipe, ...(rec.optionalIngredients||[])].forEach(i=>ingSet.add(i));
      }
    });

    const newR = { 
      id: crypto?.randomUUID?.() || `r${Date.now()}`, 
      name, 
      cuisine: chosen, 
      unlockedRecipeNames: Array.from(new Set(sanitizedStarters)), 
      unlockedIngredientIds: Array.from(ingSet), 
      rank: 0,
      icon: chosenIcon,
      color: chosenColor,
      stars: 0.0
    };

    // final sanitize: remove any accidental rank unlocks and ensure arrays exist
    newR.unlockedRecipeNames = sanitizeUnlocks(newR.cuisine, newR.unlockedRecipeNames || []);
    newR.unlockedIngredientIds = Array.from(new Set(newR.unlockedIngredientIds || []));

    gameState.restaurants = gameState.restaurants || [];
    gameState.restaurants.push(newR);
    gameState.activeRestaurantIndex = gameState.restaurants.length - 1;
    saveGame();

    // reset UI inputs and states
    if (nameInputFull) nameInputFull.value = '';
    chosenCuisine = null;
    document.querySelectorAll('.create-cuisine-btn').forEach(x=>x.classList.remove('bg-green-500','text-white'));

    // Re-render everything consistently
    renderRestaurantsModal();
    renderMarket();
    renderUnlockedIngredientBin();
    renderRestaurantsButtonIfEligible();

    // return to menu screen and show confirmation
    showScreen('menu-screen');
    showMarketMessage('Restaurante criado', `${newR.name} • ${newR.cuisine || '—'} criado com sucesso!`, true);
  });
});

// Helper: open language modal and wire buttons
function showLanguageModalIfNeeded(){
  try {
    const saved = localStorage.getItem(LANG_KEY);
    // If the current page already is one of the language-target pages, do not perform any redirects
    const currentNormalized = (u => u ? u.replace(/\/+$/, '') : '')(window.location.href);
    const noRedirectList = [
      'https://utters-apps.github.io/Follow-the-Recipe/index-spanish.html',
      'https://utters-apps.github.io/Follow-the-Recipe/index-english.html',
      'https://utters-apps.github.io/Follow-the-Recipe/index-german.html',
      // note: user provided a .htm for russian; include both .htm and .html just in case
      'https://utters-apps.github.io/Follow-the-Recipe/index-russian.htm',
      'https://utters-apps.github.io/Follow-the-Recipe/index-russian.html'
    ].map(u => u.replace(/\/+$/, ''));

    if (noRedirectList.includes(currentNormalized)) {
      // We're already on a language-specific page; do not open modal or redirect.
      return;
    }

    if (saved) {
      // If language saved and is not Portuguese, redirect immediately to language page
      const parsed = JSON.parse(saved);
      if (parsed && parsed.lang && parsed.href){
        if (parsed.lang !== 'Portuguese' && parsed.href) {
          // Avoid redirect loop: if stored href equals current location, do not redirect
          try {
            const normalize = (u) => u ? u.replace(/\/+$/, '') : u;
            const current = normalize(window.location.href);
            const target = normalize(parsed.href);
            if (target && current !== target) {
              // small delay to allow UI to render then redirect
              setTimeout(()=> { window.location.href = parsed.href; }, 250);
              return;
            } else {
              // same URL — do not redirect
              return;
            }
          } catch(e){
            // fallback: perform redirect if no error (defensive)
            setTimeout(()=> { window.location.href = parsed.href; }, 250);
            return;
          }
        }
      }
      return;
    }
  } catch(e){ /* ignore parse errors and show modal */ }

  const modal = document.getElementById('language-modal');
  if (!modal) return;
  modal.classList.remove('hidden');
  modal.classList.add('modal-wrap','show','modal-scrim-pane');
  const inner = modal.querySelector('.card');
  if (inner) inner.classList.add('modal-card','fade');

  modal.querySelectorAll('.lang-btn').forEach(btn=>{
    btn.addEventListener('click', (ev)=>{
      const lang = btn.dataset.lang;
      const href = btn.dataset.href || '';
      // persist choice
      try { localStorage.setItem(LANG_KEY, JSON.stringify({ lang, href })); } catch(e){}
      // hide modal
      modal.classList.remove('show');
      setTimeout(()=> modal.classList.add('hidden'), 260);
      // If non-Portuguese and href provided, redirect (only if it's not the same URL and not in noRedirectList)
      if (lang !== 'Portuguese' && href) {
        try {
          const normalize = (u) => u ? u.replace(/\/+$/, '') : u;
          const current = normalize(window.location.href);
          const target = normalize(href);
          // ensure target is not one of the pages that should never trigger redirects from this tab
          const blocked = [
            'https://utters-apps.github.io/Follow-the-Recipe/index-spanish.html',
            'https://utters-apps.github.io/Follow-the-Recipe/index-english.html',
            'https://utters-apps.github.io/Follow-the-Recipe/index-german.html',
            'https://utters-apps.github.io/Follow-the-Recipe/index-russian.htm',
            'https://utters-apps.github.io/Follow-the-Recipe/index-russian.html'
          ].map(u=>u.replace(/\/+$/, ''));

          if (blocked.includes(current)) {
            // current page is a blocked language page — do nothing (stay)
            playSound('success');
            return;
          }

          if (target && current !== target) {
            playSound('click');
            setTimeout(()=> window.location.href = href, 140);
          } else {
            // same URL — treat as stay
            playSound('success');
          }
        } catch(e){
          // fallback: redirect
          playSound('click');
          setTimeout(()=> window.location.href = href, 140);
        }
      } else {
        playSound('success');
      }
    });
  });
}

// Restaurants logic
function renderRestaurantsButtonIfEligible(){
  const active = getActiveRestaurant();
  // cuisine may be null for new restaurants; find cuisine-specific pool
  const cuisine = active.cuisine || profile.cuisine;
  const pool = ALL_RECIPES.filter(r => !cuisine || (Array.isArray(r.cuisine)? r.cuisine.includes(cuisine): true));
  const allNames = pool.map(r=>r.name);
  const unlocked = new Set(active.unlockedRecipeNames || []);
  const allBought = allNames.every(n=>unlocked.has(n));
  const container = document.getElementById('restaurants-button-container');
  if (allBought) container.classList.remove('hidden'); else container.classList.add('hidden');
}

function renderRestaurantsModal(){
  const list = document.getElementById('restaurants-list');
  list.innerHTML = '';
  (gameState.restaurants || []).forEach((r, idx)=>{
    const total = ALL_RECIPES.filter(rec => !r.cuisine || (Array.isArray(rec.cuisine)? rec.cuisine.includes(r.cuisine): true)).length || 1;
    const completed = (r.unlockedRecipeNames||[]).length;
    const pct = Math.round((completed/total)*100);
    const icon = r.icon || '🍽️'; const color = r.color || 'var(--accent)';
    const el = document.createElement('div');
    el.className = 'resto-entry';
    el.innerHTML = `
      <div style="display:flex;align-items:center;gap:.75rem;">
        <div style="width:48px;height:48px;border-radius:10px;display:flex;align-items:center;justify-content:center;background:${color}22;color:${color};font-size:1.2rem">${icon}</div>
        <div>
          <div class="font-bold">${r.name} ${idx===gameState.activeRestaurantIndex?'<span class="text-sm text-green-600"> (Ativo)</span>':''}</div>
          <div class="text-sm text-gray-500">${r.cuisine || '—'} • ${pct}% concluído (${completed}/${total})</div>
        </div>
      </div>
      <div style="display:flex;gap:.5rem;align-items:center">
        <button class="switch-resto btn-main px-3 py-1 rounded bg-blue-500 text-white" data-idx="${idx}">Abrir</button>
        <button class="delete-resto btn-main px-3 py-1 rounded bg-red-500 text-white" data-idx="${idx}">Apagar</button>
      </div>
    `;
    list.appendChild(el);
  });
  // attach handlers (rebind)
  list.querySelectorAll('.switch-resto').forEach(b=>b.addEventListener('click', (e)=>{
    const i = Number(e.currentTarget.dataset.idx);
    gameState.activeRestaurantIndex = i;
    saveGame();
    renderMarket();
    renderUnlockedIngredientBin();
    updateAllMoneyDisplays();
    renderRestaurantsModal();
    renderRestaurantsButtonIfEligible();
    playSound('click');
  }));
  list.querySelectorAll('.delete-resto').forEach(b=>b.addEventListener('click', (e)=>{
    const i = Number(e.currentTarget.dataset.idx);
    // confirmation modal improved (theme-aware)
    const confirmed = confirm(`Apagar "${gameState.restaurants[i].name}"? Esta ação não pode ser desfeita.`);
    if (!confirmed) return;
    gameState.restaurants.splice(i,1);
    if ((gameState.restaurants||[]).length === 0) {
      localStorage.clear();
      gameState = { money:50, restaurants: [{ id:'r0', name:'Meu Restaurante', cuisine:null, unlockedRecipeNames:[], unlockedIngredientIds:[], rank:0 }], activeRestaurantIndex:0 };
      saveGame();
      resetGame();
      return;
    }
    if (gameState.activeRestaurantIndex >= gameState.restaurants.length) gameState.activeRestaurantIndex = 0;
    saveGame();
    renderRestaurantsModal();
    renderRestaurantsButtonIfEligible();
    playSound('error');
  }));
}

document.addEventListener('click', (e)=>{
  if (e.target && e.target.id === 'restaurants-button'){
    renderRestaurantsModal();
    showModalById('restaurants-modal');
  }
});

// Executa quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
  const closeBtn = document.getElementById('close-restaurants');
  const createBtn = document.getElementById('create-resto');

  // Botão de fechar modal de restaurantes
  closeBtn?.addEventListener('click', () => { 
    hideModalById('restaurants-modal');
    // Garante que o botão de restaurantes continue visível após fechar
    document.getElementById('restaurants-button-container')?.classList.remove('hidden');
  });

  // Botão de criar novo restaurante
  createBtn?.addEventListener('click', () => {
    hideModalById('restaurants-modal');
    showScreen('create-restaurant-screen');
  });

  // Inicialização geral do app, se a função existir
  if (typeof init === 'function') init();
});

// Global unhandled rejection handler para prevenir crashes por áudio ou dispositivos
window.addEventListener('unhandledrejection', (event) => {
  try {
    console.warn('Unhandled promise rejection caught:', event.reason);

    // Se for erro relacionado a áudio/dispositivo, previne comportamento padrão
    if (event.reason && typeof event.reason === 'object' &&
        /audio|device|start/i.test(String(event.reason.message || event.reason))) {
      event.preventDefault?.();
    }
  } catch (e) {
    console.warn('Error in unhandledrejection handler', e);
  }
});

// Inside buildLayout() — locate the Welcome screen area and add an Install button below the Play button.
// The edit below replaces the welcome-screen block portion with an added install button with id="install-pwa-button".
// Add the runtime beforeinstallprompt handling near the end of the file (before the final unhandledrejection handler)
let deferredInstallPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => {
  // Prevent the automatic prompt
  e.preventDefault();
  deferredInstallPrompt = e;
  const installBtn = document.getElementById('install-pwa-button');
  if (installBtn) {
    installBtn.classList.remove('hidden');
    installBtn.addEventListener('click', async () => {
      try {
        installBtn.disabled = true;
        playSound('click');
        if (!deferredInstallPrompt) return;
        deferredInstallPrompt.prompt();
        const choice = await deferredInstallPrompt.userChoice;
        if (choice.outcome === 'accepted') {
          console.log('Usuário aceitou instalação PWA');
        } else {
          console.log('Usuário recusou instalação PWA');
        }
      } catch (err) {
        console.warn('Instalação PWA falhou', err);
      } finally {
        installBtn.disabled = false;
        installBtn.classList.add('hidden');
        deferredInstallPrompt = null;
      }
    });
  }
});

// Hide install button after appinstalled
window.addEventListener('appinstalled', (evt) => {
  deferredInstallPrompt = null;
  const installBtn = document.getElementById('install-pwa-button');
  if (installBtn) installBtn.classList.add('hidden');
  console.log('PWA instalada');
});

// small utility to shuffle arrays (used to randomize ingredient button order)
function shuffleArray(arr){
  for (let i = arr.length - 1; i > 0; i--){
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
