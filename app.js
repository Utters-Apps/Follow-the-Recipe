import { NPCS, ALL_RECIPES, RANKS, SAVE_KEY, THEME_KEY, CUISINE_KEY, RESTO_NAME_KEY, CUISINE_DEFS } from './data.js';
import { initializeAudio, playSound, ensureAudioStarted } from './audio.js';
import { createElementFromHTML, getIngredientHTML } from './ui.js';

const appRoot = document.getElementById('app');

/* --- GAME CONSTANTS --- */
const PENALTY_FAILURE = 10;
const BASE_PENALTY_PER_RANK = 4;
const VIP_PENALTY_BONUS = 10;
const VIP_CHANCE_BASE = 0.05;
const VIP_CHANCE_PER_RANK = 0.06;
const RUSH_HOUR_CHANCE_BASE = 0.08;
const RUSH_HOUR_CHANCE_PER_RANK = 0.07;
const BASE_TIMER_DURATION = 15;
const MIN_TIMER_DURATION = 5;
const RUSH_HOUR_TIMER_MULTIPLIER = 0.7;
const VIP_REWARD_MULTIPLIER = 1.8;
const SUCCESS_MODAL_DURATION = 1600;
const FAILURE_MODAL_DURATION = 2000;
/* ---------------------- */

function buildLayout() {
  appRoot.innerHTML = `
  <div id="game-container" class="w-full max-w-md h-full md:h-[95vh] md:max-h-[800px] shadow-xl rounded-2xl flex flex-col overflow-hidden relative bg-white/80 backdrop-blur-sm border border-white/30">
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
      </div>
      <div id="rank-goal" class="p-3 rounded-xl mb-4 text-center w-full shadow-inner border">
        <h4 class="text-base font-bold">Próximo Nível</h4>
        <p id="rank-goal-text" class="text-sm">Compre a receita no Mercado!</p>
      </div>
      <button id="play-button" class="btn-main w-full bg-green-500 text-white font-bold px-10 py-4 rounded-xl text-2xl shadow-lg mb-3"><i class="fas fa-play mr-2"></i> Próximo Pedido</button>
      <button id="market-button" class="btn-main w-full bg-blue-500 text-white font-bold px-10 py-4 rounded-xl text-2xl shadow-lg"><i class="fas fa-store mr-2"></i> Mercado</button>
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
      <header class="border-b p-3 flex justify-between items-center z-10">
        <button id="menu-button-market" class="text-2xl w-10 h-10 flex items-center justify-center"><i class="fas fa-arrow-left"></i></button>
        <h2 class="text-xl font-bold">Mercado</h2>
        <div id="money-display-market" class="money-pill font-bold px-5 py-2 rounded-full text-lg shadow-md">$50</div>
      </header>
      <main class="flex-1 p-3 overflow-y-auto w-full space-y-3">
        <div class="tabbar">
          <button id="tab-buy" class="tab active"><i class="fas fa-coins mr-2"></i>Comprar Pratos</button>
          <button id="tab-owned" class="tab"><i class="fas fa-utensils mr-2"></i>Meus Pratos</button>
        </div>
        <div id="market-items-grid" class="space-y-3"></div>
        <div id="market-owned-grid" class="space-y-3 hidden"></div>
      </main>
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
  unlockedRecipeNames: ["Misto Quente","Limonada","Café"],
  unlockedIngredientIds: ["pao","manteiga","queijo","tomate","limao","mel","gelo","ervas","cafe","leite"],
  rank: 0
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

/* NEW: Loading Screen Ref */
const loadingScreen = document.getElementById('loading-screen'); 

/* ---------- Screen helpers ---------- */
function showScreen(id){
  const screens = [setupScreen, welcomeScreen, menuScreen, gameScreen, marketScreen];
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
function filterRecipesByCuisine(recipes){
  if (!profile.cuisine) return recipes;
  return recipes.filter(r => Array.isArray(r.cuisine) ? r.cuisine.includes(profile.cuisine) : true);
}

/* Helper: starting unlocks per cuisine */
function getStartingUnlocks(cuisine){
  if (cuisine === 'Japonês') return ["Onigiri","Chá Verde","Sushi"];
  return ["Misto Quente","Limonada","Café"];
}

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
}

function updateRankDisplay(){
  const ranks = getActiveRanks();
  const current = ranks[gameState.rank] || ranks[0];
  rankIcon.textContent = current.icon;
  rankName.textContent = current.name;
  const nextRank = ranks[gameState.rank+1];
  if (nextRank){
    const goal = current.recipeToUnlock || '—';
    rankGoal.style.display = 'block';
    rankGoalText.innerHTML = `Compre a receita <span class="font-bold">${goal}</span> no Mercado para atingir <span class="text-purple-600">${nextRank.name}</span>!`;
  } else {
    rankGoal.style.display = 'none';
  }
}

function renderUnlockedIngredientBin(){
  ingredientBin.innerHTML = '';
  const ids = [...gameState.unlockedIngredientIds].sort(()=>Math.random()-0.5);
  // Limit visible ingredient pool to max 15 to avoid clutter
  const visible = ids.slice(0, 15);
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
  const ranks = getActiveRanks();
  marketItemsGrid.innerHTML = '';
  marketOwnedGrid.innerHTML = '';

  const currentRank = ranks[gameState.rank];
  const rankUp = [], buyable = [], locked = [], unlocked = [];

  filterRecipesByCuisine(ALL_RECIPES).forEach(recipe=>{
    const isUnlocked = gameState.unlockedRecipeNames.includes(recipe.name);
    let isBuyable = gameState.rank >= recipe.minRank;
    const isRankUpCard = currentRank && currentRank.recipeToUnlock && recipe.name === currentRank.recipeToUnlock && !isUnlocked;
    
    if (isRankUpCard) {
      isBuyable = true; // Override minRank if it's the mandatory rank-up recipe
    }
    
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
    card.innerHTML = `
      ${isRankUpCard ? `<span class="absolute top-0 right-0 bg-yellow-500 text-white text-xs font-bold px-3 py-1 rounded-bl-xl">META</span>` : ''}
      <div class="text-5xl">${recipe.emoji}</div>
      <div class="flex-1">
        <h4 class="text-xl font-bold">${recipe.name}</h4>
        <p class="text-sm">${[...new Set([...recipe.baseRecipe,...recipe.optionalIngredients])].map(id=>getIngredientHTML(id,'text-sm')).join(' + ')}</p>
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
      card.innerHTML = `
        <div class="text-5xl">${recipe.emoji}</div>
        <div class="flex-1">
          <h4 class="text-xl font-bold">${recipe.name}</h4>
          <p class="text-sm">${[...new Set([...recipe.baseRecipe,...recipe.optionalIngredients])].map(id=>getIngredientHTML(id,'text-sm')).join(' + ')}</p>
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
  localStorage.removeItem(SAVE_KEY);
  localStorage.removeItem(RESTO_NAME_KEY);
  localStorage.removeItem(CUISINE_KEY);
  gameState = { money:50, unlockedRecipeNames:["Misto Quente","Limonada","Café"], unlockedIngredientIds:["pao","manteiga","queijo","tomate","limao","mel","gelo","ervas","cafe","leite"], rank:0 };
  profile = { restoName:null, cuisine:null };
  saveGame();
  updateRankDisplay();
  confirmResetModal.classList.add('hidden');
  showScreen('setup-screen');
  renderMarket();
  updateAllMoneyDisplays();
}

function showConfirmResetModal(){ playSound('click'); confirmResetModal.classList.remove('hidden'); }
function showMarketMessage(title,text,isSuccess=true){
  marketMessageTitle.textContent = title;
  marketMessageText.textContent = text;
  marketMessageIcon.className = `fas ${isSuccess ? 'fa-check-circle text-green-500' : 'fa-times-circle text-red-500'}`;
  marketMessageModal.classList.remove('hidden');
}
function showRankUpModal(){
  playSound('success');
  const ranks = getActiveRanks();
  rankUpIconModal.textContent = ranks[gameState.rank].icon;
  rankUpText.textContent = `Parabéns, você agora é ${ranks[gameState.rank].name}!`;
  rankUpModal.classList.remove('hidden');
}

function buyRecipe(recipeName){
  const recipe = ALL_RECIPES.find(r=>r.name===recipeName);
  if (!recipe) return;
  if (gameState.money >= recipe.price){
    playSound('buy');
    gameState.money -= recipe.price;
    gameState.unlockedRecipeNames.push(recipe.name);
    const s = new Set(gameState.unlockedIngredientIds);
    [...recipe.baseRecipe, ...recipe.optionalIngredients].forEach(id=>s.add(id));
    gameState.unlockedIngredientIds = Array.from(s);

    // Rank progression by cuisine
    const ranks = getActiveRanks();
    if (ranks[gameState.rank] && ranks[gameState.rank].recipeToUnlock === recipe.name){
      gameState.rank++;
      updateRankDisplay();
      showRankUpModal();
    } else {
      showMarketMessage("Receita Comprada!", `Você aprendeu a fazer ${recipe.name}!`, true);
    }
    saveGame();
    renderMarket();
    updateAllMoneyDisplays();
  } else {
    playSound('error');
    showMarketMessage("Dinheiro Insuficiente!", `Você precisa de $${recipe.price}.`, false);
  }
}

function getTimerDuration(){
  const ranks = getActiveRanks();
  const base = BASE_TIMER_DURATION; 
  const maxDifficultyRanks = ranks.length - 1;
  const difficultyFactor = Math.min(maxDifficultyRanks * 1.5, gameState.rank + (session.isVIP ? 1 : 0)); 
  
  let dur = Math.max(MIN_TIMER_DURATION, base - Math.round(difficultyFactor * 1.5)); 
  if (session.isRushHour) dur = Math.max(MIN_TIMER_DURATION-2, Math.round(dur * RUSH_HOUR_TIMER_MULTIPLIER));
  if (dur < 3) dur = 3; // Absolute minimum time to prevent instant loss
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

  // Safe recipe pool selection (prevents undefined currentOrder)
  const unlockedRecipes = ALL_RECIPES.filter(r => gameState.unlockedRecipeNames.includes(r.name));
  const availableByCuisine = filterRecipesByCuisine(unlockedRecipes);
  const pool = (availableByCuisine.length > 0 ? availableByCuisine : unlockedRecipes);
  if (pool.length === 0){
    // Fallback: if no unlocked recipes found, unlock a basic one and retry
    const fallback = ALL_RECIPES.find(r => r.name === "Misto Quente") || ALL_RECIPES[0];
    if (fallback && !gameState.unlockedRecipeNames.includes(fallback.name)){
      gameState.unlockedRecipeNames.push(fallback.name);
      const s = new Set(gameState.unlockedIngredientIds);
      [...fallback.baseRecipe, ...fallback.optionalIngredients].forEach(id=>s.add(id));
      gameState.unlockedIngredientIds = Array.from(s);
      saveGame();
    }
  }
  const finalPool = (pool.length > 0 ? pool : ALL_RECIPES.filter(r => gameState.unlockedRecipeNames.includes(r.name)));
  session.currentOrder = finalPool[Math.floor(Math.random()*finalPool.length)];
  if (!session.currentOrder || !Array.isArray(session.currentOrder.baseRecipe)){
    // Last guard: show menu and prompt user to buy recipes
    showScreen('menu-screen');
    renderMarket();
    return;
  }

  let finalRecipe = [...session.currentOrder.baseRecipe];
  const availableOptionals = (Array.isArray(session.currentOrder.optionalIngredients) ? session.currentOrder.optionalIngredients : [])
    .filter(id=>gameState.unlockedIngredientIds.includes(id));

  // More optionals with rank; VIP adds 1 extra if possible
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
  startTimer();
}

function checkOrder(isSuccess, reason=''){
  if (!session.gameActive) return;
  session.gameActive = false;
  stopTimer(true);
  if (isSuccess){
    playSound('success');
    session.currentStreak++;
    
    // Increased base reward calculation to match increased progression difficulty
    const ranks = getActiveRanks();
    const currentRankDef = ranks[gameState.rank] || ranks[0];
    const baseReward = currentRankDef.baseReward || 12; // Use defined base reward
    
    const streakBonus = Math.max(3, Math.round(baseReward*0.2));
    const streakExtra = (session.currentStreak-1)*streakBonus;
    let total = baseReward + streakExtra;
    if (session.isRushHour){ total = (baseReward*2)+(streakExtra*2); session.isRushHour = false; }
    if (session.isVIP){ total = Math.round(total * VIP_REWARD_MULTIPLIER); }
    gameState.money += total;
    updateAllMoneyDisplays();
    successMessage.textContent = `Perfeito! +$${total}`;
    successModal.classList.remove('hidden');
    setTimeout(()=>{ successModal.classList.add('hidden'); startNewOrder(); },SUCCESS_MODAL_DURATION);
  } else {
    playSound('error');
    session.currentStreak = 0;
    session.isRushHour = false;
    let penalty = PENALTY_FAILURE + Math.round(gameState.rank * BASE_PENALTY_PER_RANK);
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
    // will attempt to play on user interaction (see setupConfirm and welcomePlay)
  } catch (e) { bgAudio = null; console.warn('BG music init failed', e); }
}
function tryPlayBgMusic() {
  if (!bgAudio) return;
  bgAudio.play().catch(()=>{ /* autoplay blocked; will play on next user gesture */ });
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
  gameState = {
    money: 50,
    unlockedRecipeNames: startRecipes,
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
  initBackgroundMusic();
  tryPlayBgMusic();
});

/* ---------- Navigation & buttons ---------- */
welcomePlayButton.addEventListener('click', ()=>{
  initializeAudio().catch(()=>{});
  tryPlayBgMusic();
  showScreen('menu-screen');
});

/* Also ensure first click on ingredient bin triggers audio start and bg music */
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

playButton.addEventListener('click', ()=>{ renderUnlockedIngredientBin(); startNewOrder(); showScreen('game-screen'); });
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

menuButtonMarket.addEventListener('click', ()=>{ showScreen('menu-screen'); });
marketMessageClose.addEventListener('click', ()=>{ playSound('click'); marketMessageModal.classList.add('hidden'); });
resetButtonWelcome.addEventListener('click', showConfirmResetModal);
resetButtonMenu.addEventListener('click', showConfirmResetModal);
confirmResetCancel.addEventListener('click', ()=>{ playSound('click'); confirmResetModal.classList.add('hidden'); });
confirmResetConfirm.addEventListener('click', resetGame);
rankUpClose.addEventListener('click', ()=>{ rankUpModal.classList.add('hidden'); });
themeToggleWelcome && themeToggleWelcome.addEventListener('click', toggleTheme);
themeToggleMenu && themeToggleMenu.addEventListener('click', toggleTheme);
themeToggleSetup && themeToggleSetup.addEventListener('click', toggleTheme);

tabBuy.addEventListener('click', ()=>{ activateTab('buy'); });
tabOwned.addEventListener('click', ()=>{ activateTab('owned'); });

/* ---------- Init ---------- */
function init(){
  loadTheme();
  initBackgroundMusic(); // prepare audio object; playback happens on user actions
  updateAllMoneyDisplays();
  renderUnlockedIngredientBin();
  renderMarket();

  // First-run setup
  if (!profile.restoName || !profile.cuisine){
    showScreen('setup-screen');
  } else {
    restoNameDisplay.textContent = `${profile.restoName} • ${profile.cuisine}`;
    updateRankDisplay();
    showScreen('welcome-screen');
  }
  
  // Hide loading screen
  if (loadingScreen) {
    loadingScreen.classList.add('fade-out');
    setTimeout(() => {
      loadingScreen.style.display = 'none';
    }, 500);
  }
}
init();
