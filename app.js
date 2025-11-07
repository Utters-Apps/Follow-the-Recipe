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
const BASE_TIMER_DURATION = 10; // Changed from 15 to 10
const MIN_TIMER_DURATION = 5; // Changed from 3 to 5
const RUSH_HOUR_TIMER_MULTIPLIER = 0.6; // faster during rush
const VIP_REWARD_MULTIPLIER = 1.9; // slightly bigger VIP reward
const SUCCESS_MODAL_DURATION = 1600;
const FAILURE_MODAL_DURATION = 2000;
const BGM_KEY = 'recipeGameBGMMuted_v6';
// new: global price multiplier to make recipes more expensive and scale with progression
const BASE_PRICE_MULTIPLIER = 1.6; // global inflation so buying recipes is meaningful
// NEW: reduce how much players earn on success (0.6 = 60% of previous rewards)
const SUCCESS_EARN_MULTIPLIER = 0.6;
function getEffectivePrice(recipe){
  // scale price by global multiplier and slightly by recipe.minRank to make higher-rank dishes cost more
  const rankFactor = 1 + ((recipe.minRank || 0) * 0.08);
  return Math.max(1, Math.round((recipe.price || 0) * BASE_PRICE_MULTIPLIER * rankFactor));
}
/* ---------------------- */

const BOOSTS = [
    { 
        id: 'timer_plus_1', 
        name: '+1s Tempo Base', 
        desc: 'Aumenta o tempo base do pedido em 1 segundo. Nível Máximo: +5s.', 
        price: 500, 
        maxLevel: 5,
        icon: '⏱️'
    },
    { 
        id: 'vip_chance_increase', 
        name: '+5% Chance VIP', 
        desc: 'Aumenta a chance de clientes VIPs aparecerem. Nível Máximo: +15%.', 
        price: 800, 
        maxLevel: 3,
        icon: '✨'
    },
    { 
        id: 'streak_star_boost', 
        name: 'Bônus Estrela Aprimorado', 
        desc: 'Dobra o ganho de estrelas (★) por sequência de acertos (2x).', 
        price: 1500, 
        maxLevel: 1,
        icon: '⭐'
    },
    { 
        id: 'optional_ingredient_reduction', 
        name: 'Receitas mais Simples', 
        desc: 'Reduz a chance de ingredientes opcionais serem adicionados aos pedidos.', 
        price: 1200, 
        maxLevel: 2,
        icon: '➖'
    }
];

const EMPLOYEES = [
    {
        id: 'cook_base',
        name: 'Cozinheiro Júnior',
        desc: 'Aumenta o tempo base do pedido em +1s por nível. (Nível Máximo: 3)',
        price: 1000,
        maxLevel: 3,
        icon: '👨‍🍳'
    },
    {
        id: 'waiter_base',
        name: 'Garçom Eficiente',
        desc: 'Aumenta o dinheiro base ganho por pedido em +10% por nível. (Nível Máximo: 5)',
        price: 1500,
        maxLevel: 5,
        icon: '🤵'
    }
];

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
            {groupLabel: 'Principais', items:[
              {n:"Brasileiro",e:"🇧🇷"},{n:"Italiano",e:"🇮🇹"},{n:"Japonês",e:"🇯🇵"},{n:"Mexicano",e:"🇲🇽"},{n:"Francês",e:"🇫🇷"}
            ]},
            {groupLabel: 'Sazonais', items:[
              {n:"Natal", e:"🎄"},{n:"Halloween", e:"🎃"}
            ]}
          ].map(group=>{
            if(group.groupLabel === 'Sazonais'){
              return `<div class="col-span-2 mt-2">
                        <div class="text-xs font-semibold mb-1 opacity-80">${group.groupLabel}</div>
                        <div class="grid grid-cols-2 gap-2">${group.items.map(c=>`<button class="cuisine-btn btn-main w-full p-3 rounded-xl border" data-cuisine="${c.n}">${c.e} ${c.n}</button>`).join('')}</div>
                      </div>`;
            }
            return group.items.map(c=>`<button class="cuisine-btn btn-main w-full p-3 rounded-xl border" data-cuisine="${c.n}">${c.e} ${c.n}</button>`).join('');
          }).join('')}
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
      <div class="w-full grid grid-cols-3 gap-2 mt-3 mb-2">
        <button id="welcome-stats-button" class="btn-main w-full text-white font-bold py-3 rounded-xl text-lg shadow-lg" style="background:#5e72e4!important; display: flex; flex-direction: column; align-items: center;"><i class="fas fa-chart-line"></i> <span class="text-sm">Estatísticas</span></button>
        <button id="welcome-settings-button" class="btn-main w-full text-white font-bold py-3 rounded-xl text-lg shadow-lg" style="background:#8c5cf6!important; display: flex; flex-direction: column; align-items: center;"><i class="fas fa-cog"></i> <span class="text-sm">Configurações</span></button>
        <button id="welcome-tutorial-button" class="btn-main w-full text-white font-bold py-3 rounded-xl text-lg shadow-lg" style="background:#f97316!important; display: flex; flex-direction: column; align-items: center;"><i class="fas fa-book"></i> <span class="text-sm">Tutorial</span></button>
      </div>
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
        <button id="view-tutorial" class="btn-main mt-2 bg-gray-100 text-gray-800 px-4 py-2 rounded-lg text-sm ml-2">Ver Tutorial</button>
      </div>
      <div id="rank-goal" class="p-3 rounded-xl mb-4 text-center w-full shadow-inner border">
        <h4 class="text-base font-bold">Próximo Nível</h4>
        <p id="rank-goal-text" class="text-sm">Compre a receita no Mercado!</p>
      </div>
      <button id="play-button" class="btn-main w-full bg-green-500 text-white font-bold px-10 py-4 rounded-xl text-2xl shadow-lg mb-3"><i class="fas fa-play mr-2"></i> Próximo Pedido</button>
      <button id="market-button" class="btn-main w-full bg-blue-500 text-white font-bold px-10 py-4 rounded-xl text-2xl shadow-lg mb-3"><i class="fas fa-store mr-2"></i> Mercado</button>
      <button id="boosts-button" class="btn-main w-full bg-yellow-600 text-white font-bold px-10 py-4 rounded-xl text-2xl shadow-lg mb-3"><i class="fas fa-rocket mr-2"></i> <span id="boosts-label">Vantagens</span></button>
      <div class="w-full grid grid-cols-3 gap-2 mt-2">
        <!-- Buttons moved to Welcome screen for clearer flow -->
        <div></div><div></div><div></div>
      </div>
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
      <main class="flex-1 p-3 w-full space-y-3 flex flex-col overflow-hidden">
        <div class="tabbar sticky top-0 z-10">
          <button id="tab-buy" class="tab active"><i class="fas fa-coins mr-2"></i>Comprar Pratos</button>
          <button id="tab-owned" class="tab"><i class="fas fa-utensils mr-2"></i>Meus Pratos</button>
        </div>
        <div id="market-scroll" class="relative flex-1 overflow-y-auto">
          <div id="market-items-grid" class="space-y-3"></div>
          <div id="market-owned-grid" class="space-y-3 hidden"></div>
        </div>
      </main>
    </div>

    <!-- Boosts Screen -->
    <div id="boosts-screen" class="screen flex-col hidden h-full">
        <header class="border-b p-3 z-10">
          <div class="flex items-center justify-between">
            <button id="menu-button-boosts" class="text-2xl w-10 h-10 flex items-center justify-center"><i class="fas fa-arrow-left"></i></button>
            <h2 class="text-xl font-bold flex-1 text-center m-0 title-wrap">Vantagens</h2>
            <div class="header-right flex items-center gap-2">
              <div id="money-display-boosts" class="money-pill font-bold px-4 py-2 rounded-full text-base shadow-md">$50</div>
              <div id="stars-display-boosts" class="stars-pill font-bold text-base">0.0 ★</div>
            </div>
          </div>
        </header>
        <main class="flex-1 p-3 w-full flex flex-col overflow-hidden">
          <div class="tabbar sticky top-0 z-10">
            <button id="tab-improvements" class="tab active"><i class="fas fa-magic mr-2"></i>Melhorias</button>
            <button id="tab-employees" class="tab"><i class="fas fa-users mr-2"></i>Funcionários</button>
          </div>
          <div id="boosts-scroll" class="relative flex-1 overflow-y-auto">
            <div id="boosts-improvements-list" class="space-y-3">
              <!-- Improvement cards generated here -->
            </div>
            <div id="boosts-employees-list" class="space-y-3 hidden">
              <!-- Employee cards generated here -->
            </div>
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

    <div id="insufficient-funds-modal" class="hidden absolute inset-0 z-50 flex items-center justify-center p-6">
      <div class="card p-5 rounded-2xl w-full max-w-sm text-center">
        <h3 class="text-2xl font-bold mb-2" id="funds-title">Dinheiro Insuficiente!</h3>
        <p class="text-sm mb-4" id="funds-text">Você precisa de <span id="funds-needed">$0</span> para comprar isso.</p>
        <div class="flex gap-2">
          <button id="funds-skip" class="btn-main w-full bg-gray-400 text-white font-bold py-3 rounded-lg">Depois</button>
          <button id="funds-buy" class="btn-main w-full bg-purple-600 text-white font-bold py-3 rounded-lg">Comprar</button>
        </div>
      </div>
    </div>

    <div id="tutorial-modal" class="hidden absolute inset-0 z-50 flex items-center justify-center p-6">
      <div class="card p-5 rounded-2xl w-full max-w-md text-center">
        <h3 class="text-2xl font-bold mb-2">Tutorial</h3>
        <p class="text-sm mb-4" id="tutorial-content"></p>
        <div class="flex gap-2">
          <button id="tutorial-prev" class="btn-main w-full bg-gray-400 text-white font-bold py-3 rounded-lg">Anterior</button>
          <button id="tutorial-next" class="btn-main w-full bg-purple-600 text-white font-bold py-3 rounded-lg">Próximo</button>
        </div>
        <div class="mt-4 flex gap-2">
          <button id="tutorial-start" class="btn-main w-full bg-green-500 text-white font-bold py-3 rounded-lg">Começar</button>
          <button id="tutorial-close-btn" class="btn-main w-full bg-gray-400 text-white font-bold py-3 rounded-lg">Fechar</button>
        </div>
      </div>
    </div>

    <!-- Stats Modal -->
    <div id="stats-modal" class="hidden absolute inset-0 z-60 flex items-center justify-center p-6">
      <div class="modal-card p-5 rounded-2xl w-full max-w-sm text-left">
        <div class="flex justify-between items-center mb-3"><h3 class="text-2xl font-bold">📊 Estatísticas</h3><button id="close-stats" class="btn-main btn-ghost px-3 py-2 rounded-lg">Fechar</button></div>
        <div id="stats-content" class="text-sm opacity-90 space-y-3 font-semibold">
          <div class="flex justify-between items-center"><div>💰 Dinheiro</div><span id="stat-money" class="text-base font-bold text-green-600">$0</span></div>
          <div class="flex justify-between items-center"><div>🏅 Ranque Atual</div><span id="stat-rank" class="text-base font-bold">—</span></div>
          <div class="flex justify-between items-center"><div>⭐ Estrelas (restaurante)</div><span id="stat-stars" class="text-base font-bold text-yellow-500">0.0 ★</span></div>
          <div class="flex justify-between items-center"><div>🍽️ Receitas Compradas</div><span id="stat-recipes" class="text-base font-bold">0</span></div>
        </div>
      </div>
    </div>

    <!-- Settings Modal -->
    <div id="settings-modal" class="hidden absolute inset-0 z-60 flex items-center justify-center p-6">
      <div class="modal-card p-5 rounded-2xl w-full max-w-sm text-left">
        <div class="flex justify-between items-center mb-3"><h3 class="text-2xl font-bold">⚙️ Configurações</h3><button id="close-settings" class="btn-main btn-ghost px-3 py-2 rounded-lg">Fechar</button></div>
        <div id="settings-content" class="text-sm opacity-90 space-y-3">
          <div class="flex items-center justify-between"><div>Som (Música de Fundo)</div><button id="settings-toggle-sound" class="btn-main bg-gray-100 text-gray-800 px-3 py-1 rounded">Ativado</button></div>
          <div class="flex items-center justify-between"><div>Tema (Claro/Escuro)</div><button id="settings-toggle-theme" class="btn-main bg-gray-100 text-gray-800 px-3 py-1 rounded">Alternar Tema</button></div>
          <div><small class="opacity-70">Mais opções virão em atualizações.</small></div>
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
  </div>
  `;
}
buildLayout();

// localization helper: set boost label according to browser language
function applyLocalizationLabels(){
  const lang = (navigator.language || navigator.userLanguage || 'en').toLowerCase();
  const isPt = lang.startsWith('pt');
  const boostsLabel = document.getElementById('boosts-label');
  const boostsHeader = document.querySelector('#boosts-screen h2.title-wrap') || document.querySelector('#boosts-screen h2');
  if (boostsLabel) boostsLabel.textContent = isPt ? 'Vantagens' : 'Boosts';
  if (boostsHeader) boostsHeader.textContent = isPt ? 'Vantagens' : 'Boosts';
  
  // New: Update tab labels if not PT
  if (!isPt) {
      if (tabImprovements) tabImprovements.innerHTML = `<i class="fas fa-magic mr-2"></i>Improvements`;
      if (tabEmployees) tabEmployees.innerHTML = `<i class="fas fa-users mr-2"></i>Employees`;
  } else {
      // Ensure PT names are always correct if PT
      if (tabImprovements) tabImprovements.innerHTML = `<i class="fas fa-magic mr-2"></i>Melhorias`;
      if (tabEmployees) tabEmployees.innerHTML = `<i class="fas fa-users mr-2"></i>Funcionários`;
  }
}

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
    { id: crypto?.randomUUID?.() || 'r0', name: 'Meu Restaurante', cuisine: null, unlockedRecipeNames: ["Misto Quente","Limonada","Café"], unlockedIngredientIds: ["pao","manteiga","queijo","tomate","limao","mel","gelo","ervas","cafe","leite"], rank:0, stars: 0.0, boosts: {} } // Initialized with boosts field
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
const boostsButton = query('boosts-button');
const pauseButton = query('pause-button');
const menuButtonMarket = query('menu-button-market');
const menuButtonBoosts = query('menu-button-boosts');
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
const moneyDisplayBoosts = query('money-display-boosts');
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
const boostsScreen = document.querySelector('#boosts-screen');
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

/* NEW: Boost Tabs Refs */
const tabImprovements = query('tab-improvements');
const tabEmployees = query('tab-employees');
const boostsImprovementsList = query('boosts-improvements-list');
const boostsEmployeesList = query('boosts-employees-list');

/* NEW: Insufficient Funds Modal Refs */
const insufficientFundsModal = query('insufficient-funds-modal');
const fundsTitle = query('funds-title');
const fundsText = query('funds-text');
const fundsNeeded = query('funds-needed');
const fundsClose = query('funds-close');

/* NEW: Tutorial Modal Refs */
const tutorialModal = query('tutorial-modal');
const tutorialContent = query('tutorial-content');
const tutorialPrev = query('tutorial-prev');
const tutorialNext = query('tutorial-next');
const tutorialStart = query('tutorial-start');
const tutorialCloseBtn = query('tutorial-close-btn');

/* NEW: Loading Screen Ref */
const loadingScreen = document.getElementById('loading-screen'); 

/* NEW: Rank Up Context Flag */
let rankUpContext = null; // 'market_purchase' or 'auto_offer'

/* NEW: Stats Modal Refs */
const statsModal = query('stats-modal');
const statsContent = query('stats-content');
const statMoney = query('stat-money');
const statRank = query('stat-rank');
const statStars = query('stat-stars');
const statRecipes = query('stat-recipes');
const closeStats = query('close-stats');

/* NEW: Settings Modal Refs */
const settingsModal = query('settings-modal');
const settingsContent = query('settings-content');
const settingsToggleSound = query('settings-toggle-sound');
const settingsToggleTheme = query('settings-toggle-theme');
const closeSettings = query('close-settings');

/* ---------- Screen helpers ---------- */
function showScreen(id){
  const screens = [setupScreen, welcomeScreen, menuScreen, gameScreen, marketScreen, boostsScreen, createRestaurantScreen];
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

/* New function: Insufficient funds modal */
function showInsufficientFundsModal(neededPrice){
  fundsNeeded.textContent = neededPrice;
  // Ensure icon shakes visually
  const icon = insufficientFundsModal.querySelector('.shake-animation');
  if(icon){ 
    icon.classList.remove('shake-animation'); 
    void icon.offsetWidth; 
    icon.classList.add('shake-animation');
  }
  
  showModalById('insufficient-funds-modal');
}
fundsClose?.addEventListener('click', ()=>{ hideModalById('insufficient-funds-modal'); playSound('click'); });

/* ---------- Theme helpers (fixed to apply consistently) ---------- */
function applyTheme(theme){
  const html = document.documentElement;
  const t = theme === 'dark' ? 'dark' : 'light';
  html.classList.toggle('dark', t==='dark');
  html.classList.toggle('light', t==='light');
  const icon = t === 'dark' ? 'fa-sun' : 'fa-moon';
  [themeToggleSetup, themeToggleWelcome, themeToggleMenu].forEach(btn => { if (btn) btn.innerHTML = `<i class="fas ${icon}"></i>`; });
  setTheme(t);

  // Ensure key UI controls adapt their text/classes for dark mode immediately
  try {
    // Tutorial button: ensure it is visible and has clear styling in both themes
    const vt = document.getElementById('view-tutorial');
    if (vt) {
      vt.classList.add('btn-main');
      // Theme-adaptive background for visibility
      if (t === 'dark') {
        vt.classList.remove('bg-gray-100','text-gray-800');
        vt.classList.add('bg-gray-700','text-white','border','border-gray-600');
      } else {
        vt.classList.remove('bg-gray-700','text-white','border','border-gray-600');
        vt.classList.add('bg-gray-100','text-gray-800');
      }
      // (re)bind click to be certain it works
      vt.onclick = () => { playSound('click'); showTutorialModal(true); };
    }

    // Settings buttons text should reflect current theme/sound state in the correct language
    const settingsThemeBtn = document.getElementById('settings-toggle-theme');
    if (settingsThemeBtn) {
      settingsThemeBtn.textContent = t === 'dark' ? 'Tema: Escuro' : 'Tema: Claro';
      settingsThemeBtn.classList.add('btn-main','btn-theme');
      if (t === 'dark') settingsThemeBtn.classList.add('bg-gray-700','text-white'); else settingsThemeBtn.classList.remove('bg-gray-700','text-white');
    }
    const settingsSoundBtn = document.getElementById('settings-toggle-sound');
    if (settingsSoundBtn) {
      const muted = localStorage.getItem(BGM_KEY) === '1';
      settingsSoundBtn.textContent = muted ? 'Som: Desativado' : 'Som: Ativado';
      settingsSoundBtn.classList.add('btn-main','btn-theme');
      if (t === 'dark') settingsSoundBtn.classList.add('bg-gray-700','text-white'); else settingsSoundBtn.classList.remove('bg-gray-700','text-white');
    }
  } catch(e){
    // non-critical, keep app running
    console.warn('Theme adapt helpers failed', e);
  }
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
    const defaultResto = { id: crypto?.randomUUID?.() || 'r0', name: profile.restoName || 'Meu Restaurante', cuisine: profile.cuisine || null, unlockedRecipeNames: gameState.unlockedRecipeNames || [], unlockedIngredientIds: gameState.unlockedIngredientIds || [], rank: gameState.rank || 0, stars: 0.0, boosts: {} }; // Initialize boosts
    gameState.restaurants = [defaultResto];
    gameState.activeRestaurantIndex = 0;
    saveGame();
  }
  // migrate legacy top-level lists into first restaurant if legacy fields exist
  const r = gameState.restaurants[gameState.activeRestaurantIndex || 0];
  if (!r.unlockedRecipeNames && gameState.unlockedRecipeNames) r.unlockedRecipeNames = gameState.unlockedRecipeNames;
  // Initialize stars and boosts if absent (new fields)
  if (typeof r.stars === 'undefined' || r.stars === null) r.stars = 0.0;
  if (typeof r.boosts === 'undefined' || r.boosts === null) r.boosts = {};
  return gameState.restaurants[gameState.activeRestaurantIndex || 0];
}

// Helper function for Boost levels
function getBoostLevel(id){
    const active = getActiveRestaurant();
    return active?.boosts?.[id] || 0;
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
    "Natal": ["Chocolate Quente", "Biscoito de Gengibre", "Rabanada (mini)"],
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
  if (moneyDisplayBoosts) moneyDisplayBoosts.textContent = txt;
  [moneyDisplayGame, moneyDisplayMarket, moneyDisplayBoosts].forEach(d => { 
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

    // Game screen may not have the stars element hardcoded, so use helper
    const gameStars = document.getElementById('stars-display-game') || ensureStarsElement(moneyDisplayGame, 'stars-display-game');
    // Market and Boosts have it hardcoded
    const marketStars = document.getElementById('stars-display-market');
    const boostsStars = document.getElementById('stars-display-boosts');

    const starHTML = `${starsVal} ★`;
    if (gameStars) { gameStars.textContent = starHTML; gameStars.classList.remove('hidden'); }
    if (marketStars) { marketStars.textContent = starHTML; marketStars.classList.remove('hidden'); }
    if (boostsStars) { boostsStars.textContent = starHTML; boostsStars.classList.remove('hidden'); }
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
      // Added stars requirement hint to menu goal
      const nextRankStars = nextRank.requiredStars || 0.0; // Correctly pull requiredStars from the RANK definition
      rankGoalText.innerHTML = `Compre a receita <span class="font-bold">${goalName}</span> (★${nextRankStars.toFixed(1)}) no Mercado para atingir <span class="text-purple-600">${nextRank.name}</span>!`;
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
    // Safely use image only if it's a non-empty string to avoid "undefined" src showing;
    const safeImg = (recipe && typeof recipe.image === 'string' && recipe.image.trim().length>0) ? recipe.image.trim() : null;
    const iconHtml = recipe.emoji ? `<div class="text-5xl">${recipe.emoji}</div>` 
                      : (safeImg ? `<div style="width:56px;height:56px"><img src="${safeImg}" alt="${recipe.name}" class="ing-img" style="width:56px;height:56px;object-fit:contain;border-radius:8px" onerror="this.style.display='none'"></div>` : `<div class="text-5xl">🍽️</div>`);
    card.innerHTML = `
      ${isRankUpCard ? `<span class="absolute top-0 right-0 bg-yellow-500 text-white text-xs font-bold px-3 py-1 rounded-bl-xl">META</span>` : ''}
      ${iconHtml}
      <div class="flex-1">
        <h4 class="text-xl font-bold">${recipe.name}</h4>
        <p class="text-sm">${[...new Set([...recipe.baseRecipe,...recipe.optionalIngredients])].map(id=>getIngredientHTML(id,'text-sm')).join(' + ')}</p>
      </div>
      ${
        isUnlocked ? `<div class="font-bold px-4 py-2 rounded-lg" style="background:var(--muted); color:var(--text-primary)">Comprado</div>` :
        isBuyable ? `<button class="btn-buy btn-main bg-purple-500 text-white font-bold px-6 py-3 rounded-lg text-lg" data-recipe="${recipe.name}"><i class="fas fa-coins mr-1"></i> $${getEffectivePrice(recipe)}</button>` :
        `<div class="font-bold px-3 py-2 rounded-lg text-center" style="background:var(--muted); color:var(--text-primary)"><i class="fas fa-lock mr-1"></i><span class="text-xs">Ranque: ${ranks[recipe.minRank]?.name || '—'}</span></div>`
      }
    `;
    marketItemsGrid.appendChild(card);
    if (!isUnlocked && isBuyable){
      const btn = card.querySelector('.btn-buy');
      if (btn){
        // enable/disable based on effective price (prevents greyed out when affordable)
        const effective = getEffectivePrice(recipe);
        btn.disabled = gameState.money < effective;
        // btn.addEventListener('click', ()=> buyRecipe(recipe.name)); // REMOVED: using delegated listener
      }
    }
  });

  // OWNED TAB
  if (sortedOwned.length === 0){
    marketOwnedGrid.innerHTML = `<div class="text-center text-sm opacity-75">Você ainda não comprou pratos.</div>`;
  } else {
    sortedOwned.forEach(({recipe})=>{
      const card = document.createElement('div');
      card.className = `card rounded-xl shadow-lg p-4 flex items-center space-x-4 transition-all relative border`;
      const safeImg = (recipe && typeof recipe.image === 'string' && recipe.image.trim().length>0) ? recipe.image.trim() : null;
      const iconHtmlOwned = recipe.emoji ? `<div class="text-5xl">${recipe.emoji}</div>` 
                          : (safeImg ? `<div style="width:56px;height:56px"><img src="${safeImg}" alt="${recipe.name}" class="ing-img" style="width:56px;height:56px;object-fit:contain;border-radius:8px" onerror="this.style.display='none'"></div>` : `<div class="text-5xl">🍽️</div>`);
      card.innerHTML = `
        ${iconHtmlOwned}
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

// NEW: Improvements Shop Renderer (modified from old renderBoostShop)
function renderImprovementsShop(){
    const listEl = boostsImprovementsList;
    const active = getActiveRestaurant();
    if (!listEl) return;
    listEl.innerHTML = '';
    
    BOOSTS.forEach(boost => {
        const currentLevel = getBoostLevel(boost.id);
        const maxLevel = boost.maxLevel;
        const isMax = currentLevel >= maxLevel;
        const price = boost.price * (currentLevel + 1); // Simple multiplicative cost increase

        let statusHtml = '';
        if (isMax) {
            statusHtml = `<div class="font-bold px-4 py-2 rounded-lg bg-green-100 text-green-700">Máximo Atingido</div>`;
        } else {
            const canBuy = gameState.money >= price;
            // Use purple accent for buy buttons (consistent with market)
            statusHtml = `<button class="btn-buy-boost btn-main ${canBuy ? 'bg-purple-500 text-white' : 'bg-gray-400 text-gray-700'} font-bold px-6 py-3 rounded-lg text-lg" data-boost-id="${boost.id}" ${!canBuy ? 'disabled' : ''}>
                            <i class="fas fa-coins mr-1"></i> $${price}
                          </button>`;
        }

        const levelText = maxLevel > 1 ? `Nível ${currentLevel} / ${maxLevel}` : (isMax ? 'Comprado' : 'Disponível');
        
        const card = document.createElement('div');
        card.className = `card rounded-xl shadow-lg p-4 flex items-start space-x-4 transition-all relative border`;
        card.innerHTML = `
            <div class="text-4xl mt-1">${boost.icon}</div>
            <div class="flex-1">
                <h4 class="text-xl font-bold">${boost.name}</h4>
                <p class="text-sm opacity-80">${boost.desc}</p>
                <p class="text-xs mt-1 font-semibold text-purple-600">${levelText}</p>
            </div>
            ${statusHtml}
        `;
        listEl.appendChild(card);
        
        if (!isMax) {
            const btn = card.querySelector('.btn-buy-boost');
            if (btn){
              btn.disabled = gameState.money < price;
              // delegated listener handles purchase later
            }
        }
    });
}

// NEW: Employees Shop Renderer
function renderEmployeesShop(){
    const listEl = boostsEmployeesList;
    const active = getActiveRestaurant();
    if (!listEl) return;
    listEl.innerHTML = '';
    
    EMPLOYEES.forEach(employee => {
        const currentLevel = getBoostLevel(employee.id);
        const maxLevel = employee.maxLevel;
        const isMax = currentLevel >= maxLevel;
        const price = employee.price * (currentLevel + 1);

        let statusHtml = '';
        if (isMax) {
            statusHtml = `<div class="font-bold px-4 py-2 rounded-lg bg-green-100 text-green-700">Contratado (Máx)</div>`;
        } else {
            const canBuy = gameState.money >= price;
            // Use indigo accent for employee buy buttons
            statusHtml = `<button class="btn-hire-employee btn-main ${canBuy ? 'bg-indigo-500 text-white' : 'bg-gray-400 text-gray-700'} font-bold px-6 py-3 rounded-lg text-lg" data-employee-id="${employee.id}" ${!canBuy ? 'disabled' : ''}>
                            <i class="fas fa-user-plus mr-1"></i> $${price}
                          </button>`;
        }

        const levelText = `Nível ${currentLevel} / ${maxLevel}`;
        
        const card = document.createElement('div');
        card.className = `card rounded-xl shadow-lg p-4 flex items-start space-x-4 transition-all relative border`;
        card.innerHTML = `
            <div class="text-4xl mt-1">${employee.icon}</div>
            <div class="flex-1">
                <h4 class="text-xl font-bold">${employee.name}</h4>
                <p class="text-sm opacity-80">${employee.desc}</p>
                <p class="text-xs mt-1 font-semibold text-indigo-600">${levelText}</p>
            </div>
            ${statusHtml}
        `;
        listEl.appendChild(card);
        
        if (!isMax) {
            const btn = card.querySelector('.btn-hire-employee');
            if (btn){
              btn.disabled = gameState.money < price;
              // Delegated listener handles purchase later
            }
        }
    });
}

function buyImprovement(boostId){
    const boost = BOOSTS.find(b => b.id === boostId);
    if (!boost) return;
    
    const active = getActiveRestaurant();
    const currentLevel = getBoostLevel(boostId);
    if (currentLevel >= boost.maxLevel) {
        showMarketMessage("Nível Máximo!", `${boost.name} já está no nível máximo.`, false);
        return;
    }

    const price = boost.price * (currentLevel + 1);
    
    if (gameState.money >= price){
        playSound('buy');
        gameState.money -= price;
        active.boosts[boostId] = currentLevel + 1;
        
        saveGame();
        renderImprovementsShop();
        updateAllMoneyDisplays();
        
        const lang = (navigator.language || navigator.userLanguage || 'en').toLowerCase();
        const msg = lang.startsWith('pt') ? "Melhoria Comprada!" : "Improvement Purchased!";
        showMarketMessage(msg, `Você melhorou ${boost.name} para Nível ${currentLevel + 1}!`, true);

    } else {
        playSound('error');
        showInsufficientFundsModal(price);
    }
}

function buyEmployee(employeeId){
    const employee = EMPLOYEES.find(e => e.id === employeeId);
    if (!employee) return;
    
    const active = getActiveRestaurant();
    const currentLevel = getBoostLevel(employeeId);
    if (currentLevel >= employee.maxLevel) {
        const lang = (navigator.language || navigator.userLanguage || 'en').toLowerCase();
        const msg = lang.startsWith('pt') ? "Contratação Máxima!" : "Maximum Hired!";
        showMarketMessage(msg, `${employee.name} já está no nível máximo de contratações.`, false);
        return;
    }

    const price = employee.price * (currentLevel + 1);
    
    if (gameState.money >= price){
        playSound('buy');
        gameState.money -= price;
        active.boosts[employeeId] = currentLevel + 1;
        
        saveGame();
        renderEmployeesShop();
        updateAllMoneyDisplays();
        
        const lang = (navigator.language || navigator.userLanguage || 'en').toLowerCase();
        const msg = lang.startsWith('pt') ? "Funcionário Contratado!" : "Employee Hired!";
        showMarketMessage(msg, `Você contratou ${employee.name} (Nível ${currentLevel + 1})!`, true);

    } else {
        playSound('error');
        showInsufficientFundsModal(price);
    }
}

// Helper to switch boost tabs
function activateBoostTab(tab){
    if (tab === 'improvements'){
        tabImprovements.classList.add('active'); tabEmployees.classList.remove('active');
        boostsImprovementsList.classList.remove('hidden'); boostsEmployeesList.classList.add('hidden');
        renderImprovementsShop();
    } else {
        tabEmployees.classList.add('active'); tabImprovements.classList.remove('active');
        boostsEmployeesList.classList.remove('hidden'); boostsImprovementsList.classList.add('hidden');
        renderEmployeesShop();
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
  // Redirect player to the external follow-the-recipe page and request it to clear its own storage via query flag
  window.location.href = 'https://utters-apps.github.io/Follow-the-Recipe?clearStorage=1';
  // (following redirect; fallback local reset retained for safety if redirect blocked)
  gameState = { money:50, restaurants:[{ id:'r0', name:'Meu Restaurante', cuisine:null, unlockedRecipeNames:[], unlockedIngredientIds:[], rank:0, stars:0.0, boosts:{} }], activeRestaurantIndex:0 };
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
  playSound('rank_up');
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
  if (!recipe) return { success: false, advanced: false };
  const active = getActiveRestaurant();
  const effective = getEffectivePrice(recipe);
  if (gameState.money >= effective){
    playSound('buy');
    gameState.money -= effective;
    active.unlockedRecipeNames = Array.from(new Set([...(active.unlockedRecipeNames||[]), recipe.name]));
    const s = new Set(active.unlockedIngredientIds || []);
    [...recipe.baseRecipe, ...recipe.optionalIngredients].forEach(id=>s.add(id));
    active.unlockedIngredientIds = Array.from(s);
    
    // Check if the recipe is the rank goal and prevent purchase if stars are insufficient
    const ranks = getActiveRanks();
    let currIdx = (active && typeof active.rank === 'number') ? active.rank : 0;
    const nextDef = ranks[currIdx + 1] || null;
    const requiredRankGoalName = getRankUnlockRecipeName(currIdx, active.cuisine || profile.cuisine);
    const isRankGoal = recipe.name === requiredRankGoalName;
    const requiredStars = isRankGoal ? (Number(nextDef?.requiredStars || 0)) : 0;
    const activeStars = Number(active.stars || 0);

    // FIX 1: Prevent purchasing the rank-up recipe if Star requirement is not met
    if (isRankGoal && activeStars < requiredStars){
      playSound('error');
      showMarketMessage("Estrelas Insuficientes", `Você precisa de ★${requiredStars.toFixed(1)} para desbloquear o ranque ${nextDef.name} antes de comprar esta receita.`, false);
      return { success: false, advanced: false };
    }

    // After purchase check if this purchase satisfies any rank-up(s).
    const cuisine = active.cuisine || profile.cuisine || null;
    // Only advance a single rank if the purchased recipe exactly matches the next rank goal AND stars requirement is met.
    let advanced = false;
    if (currIdx < ranks.length - 1){
      const nextIdx = currIdx + 1;
      const nextDef = ranks[nextIdx] || null;
      const nextGoalName = nextDef ? (getRankUnlockRecipeName(currIdx, cuisine) || nextDef.recipeToUnlock) : null;
      // Use the configured requiredStars from the rank definition (no additional +1.0)
      const requiredStars = ALL_RECIPES.find(r => r.name === nextGoalName)?.requiredStars || 0.0;
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
      // Do NOT show generic message if already shown for star-blocked promotion (which we now prevent above)
      if (!isRankGoal && !marketMessageModal.classList.contains('show')) showMarketMessage("Receita Comprada!", `Você aprendeu a fazer ${recipe.name}!`, true);
    }
    saveGame(); renderMarket(); updateAllMoneyDisplays();
    return { success: true, advanced: advanced }; // Return status
  } else {
    playSound('error');
    // Use new insufficient funds modal
    showInsufficientFundsModal(effective);
    return { success: false, advanced: false }; // Return status
  }
}

function getTimerDuration(){
  const active = getActiveRestaurant();
  const ranks = getActiveRanks();
  
  // Apply Boost: timer_plus_1
  const timerBoost = getBoostLevel('timer_plus_1');
  // Apply Employee Boost: cook_base
  const cookBoost = getBoostLevel('cook_base');
  
  const base = BASE_TIMER_DURATION + timerBoost + cookBoost; // Add cook boost here
  
  const maxDifficultyRanks = Math.max(0, ranks.length - 1);
  const activeRank = (active && typeof active.rank === 'number') ? active.rank : 0;

  // Aggressive difficulty curve: each rank reduces time progressively
  const rankFactor = Math.min(maxDifficultyRanks, activeRank);
  // decay reduces based on rank (each rank removes ~0.8s)
  const decayReduction = Math.round(rankFactor * 0.8);
  let dur = Math.max(MIN_TIMER_DURATION, base - decayReduction);

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
  
  // ensure the player's plate is cleared at the start of a new order
  try { playerPlate.innerHTML = ''; } catch(e){ /* ignore if not yet mounted */ }
  
  const active = getActiveRestaurant();
  const activeRank = active.rank || 0;
  
  // Apply Boost: vip_chance_increase
  const vipBoostLevel = getBoostLevel('vip_chance_increase');
  const vipChance = Math.min(VIP_CHANCE_BASE + activeRank * VIP_CHANCE_PER_RANK + vipBoostLevel * 0.05, 0.6); // Cap VIP chance at 60%
  session.isVIP = Math.random() < vipChance;

  // Rush hour occurs more often at higher rank
  session.isRushHour = Math.random() < Math.min(RUSH_HOUR_CHANCE_BASE + activeRank * RUSH_HOUR_CHANCE_PER_RANK, 0.45);
  if (session.isRushHour) rushHourBanner.classList.remove('hidden'); else rushHourBanner.classList.add('hidden');

  // Safe recipe pool selection (per-restaurant)
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

  // Apply Boost: optional_ingredient_reduction
  const reductionBoostLevel = getBoostLevel('optional_ingredient_reduction');
  // Base rate depends on rank, reduced by boost (Level 1: -0.1, Level 2: -0.2)
  const baseOptionalRate = 0.3 + activeRank * 0.1;
  const optionalRate = Math.min(0.5, Math.max(0.1, baseOptionalRate - reductionBoostLevel * 0.1));
  
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
  
  const icon = session.currentOrder.emoji;
  const image = session.currentOrder.image;
  const vipSparkle = session.isVIP ? ' ✨' : '';

  if (image && typeof image === 'string' && image.trim().length > 0) {
    // Use innerHTML for image, sizing it appropriately for the text-5xl container
    dishEmoji.innerHTML = `<img src="${image}" alt="${session.currentOrder.name}" class="ing-img inline-block" style="width:3.5rem; height:3.5rem; object-fit:contain;">${vipSparkle}`;
  } else {
    // Default to emoji (textContent handles text/emoji rendering)
    dishEmoji.textContent = (icon || '🍽️') + vipSparkle;
  }
  
  dishName.textContent = session.currentOrder.name + (session.isVIP ? ' (CLIENTE VIP)' : '');

  // Ensure the ingredient bin reflects the new order (always include needed + shuffled)
  renderUnlockedIngredientBin();
  startTimer();
}

function checkOrder(isSuccess, reason=''){
  if (!session.gameActive) return;
  session.gameActive = false;
  stopTimer(true);
  // always clear the player's placed-ingredient emojis when an order finishes (success or failure)
  try { playerPlate.innerHTML = ''; } catch(e){ /* ignore if element missing */ }
  session.playerSelection = []; // Ensure selection array is explicitly cleared here too, in case of timer expiry or external failure call
  const active = getActiveRestaurant();
  if (isSuccess){
    playOutcomeAudio('success');
    session.currentStreak++;
    
    // Apply Boost: streak_star_boost
    const starBoost = getBoostLevel('streak_star_boost');
    const starIncrement = starBoost > 0 ? 0.2 : 0.1;

    // Every time the player completes 2 correct orders in a row, award stars (clamped to 5.0)
    const active = getActiveRestaurant(); // use same active here
    if (session.currentStreak > 0 && session.currentStreak % 2 === 0){
      active.stars = Math.min(5.0, Number((Number(active.stars || 0) + starIncrement).toFixed(1)));
    }

    const ranks = getActiveRanks();
    const activeIdx = (active && typeof active.rank === 'number') ? active.rank : 0;
    const baseReward = (ranks[activeIdx]?.baseReward) ?? 12;
    const streakBonus = Math.max(3, Math.round(baseReward*0.2));
    const streakExtra = (session.currentStreak-1)*streakBonus;
    let total = baseReward + streakExtra;
    if (session.isRushHour){ total = (baseReward*2)+(streakExtra*2); session.isRushHour = false; }
    if (session.isVIP){ total = Math.round(total * VIP_REWARD_MULTIPLIER); }
    
    // Apply Employee Boost: waiter_base (10% per level)
    const waiterLevel = getBoostLevel('waiter_base');
    if (waiterLevel > 0) {
        total = Math.round(total * (1 + waiterLevel * 0.10));
    }

    // Scale reward by stars: stars in [0..5] map to multiplier roughly 0.8..1.4
    const starsVal = Number(active.stars || 0);
    const starMultiplier = 0.8 + (Math.max(0, Math.min(5, starsVal)) / 5) * 0.6;
    total = Math.round(total * starMultiplier);

    // Apply global success earnings reduction
    total = Math.max(1, Math.round(total * SUCCESS_EARN_MULTIPLIER));

    gameState.money += total;
    updateAllMoneyDisplays();
    successMessage.textContent = `Perfeito! +$${total}`;
    successModal.classList.remove('hidden');
    setTimeout(()=>{
      successModal.classList.add('hidden');
      
      const recipeOffer = findAffordableRecipe();
      if (recipeOffer){ 
        showAutoOffer(recipeOffer); 
      } else {
        const boostOffer = findAffordableBoost();
        if (boostOffer) {
          showAutoOffer(boostOffer);
        } else {
          startNewOrder(); 
        }
      }
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
  
  // Play a tactile click sound on any ingredient click (Click.mp3)
  playSound('click');
  
  // Use ingredient ID as sound name (audio.js handles fallback to click if specific sound is missing)
  const id = btn.dataset.id;
  // playSound(id); // keep optional ingredient-specific sound suppressed to prioritize click feedback
  session.playerSelection.push(id);
  const span = document.createElement('span'); span.className='text-3xl'; span.innerHTML = getIngredientHTML(id,'inline-block');
  playerPlate.appendChild(span);
  playerPlate.scrollTop = playerPlate.scrollHeight;
  const idx = session.playerSelection.length-1;
  if (session.playerSelection[idx] !== session.currentOrder.recipe[idx]) { 
    playSound('error'); 
    span.classList.add('text-red-500'); 
    
    // Clear display immediately upon failure visual feedback
    playerPlate.innerHTML = '';

    checkOrder(false,'Ingrediente errado!'); 
    return; 
  }
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
    // Instead of showMarketMessage, show the new visual tutorial
    showTutorialModal();
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

boostsButton?.addEventListener('click', ()=>{ 
  playSound('click');
  updateAllMoneyDisplays();
  renderImprovementsShop();
  activateBoostTab('improvements');
  showScreen('boosts-screen'); 
});

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
menuButtonBoosts?.addEventListener('click', ()=>{ showScreen('menu-screen'); });
marketMessageClose.addEventListener('click', ()=>{ playSound('click'); marketMessageModal.classList.add('hidden'); });
resetButtonWelcome.addEventListener('click', showConfirmResetModal);
resetButtonMenu.addEventListener('click', showConfirmResetModal);
confirmResetCancel.addEventListener('click', ()=>{ playSound('click'); confirmResetModal.classList.add('hidden'); });
confirmResetConfirm.addEventListener('click', ()=>{
  // Close modal before resetting to avoid lingering overlay
  confirmResetModal.classList.add('hidden');
  resetGame();
});
rankUpClose.addEventListener('click', ()=>{ 
  rankUpModal.classList.add('hidden'); 
  
  if (rankUpContext === 'auto_offer') {
    // Continue the post-order flow (check for remaining offers or start new order)
    const recipeOffer = findAffordableRecipe();
    if (recipeOffer){ 
      showAutoOffer(recipeOffer); 
      return;
    }
    const boostOffer = findAffordableBoost();
    if (boostOffer) {
      showAutoOffer(boostOffer); 
      return;
    }
    startNewOrder();
  } else {
    // Default: return to menu (e.g., from Market button click)
    showScreen('menu-screen');
  }
});
themeToggleWelcome && themeToggleWelcome.addEventListener('click', toggleTheme);
themeToggleMenu && themeToggleMenu.addEventListener('click', toggleTheme);
themeToggleSetup && themeToggleSetup.addEventListener('click', toggleTheme);

tabBuy.addEventListener('click', ()=>{ activateTab('buy'); });
tabOwned.addEventListener('click', ()=>{ activateTab('owned'); });

// NEW: Boosts/Employees tab listeners
tabImprovements?.addEventListener('click', () => { playSound('click'); activateBoostTab('improvements'); });
tabEmployees?.addEventListener('click', () => { playSound('click'); activateBoostTab('employees'); });

// NEW: Delegated listener for Boost item purchases (Improvements tab)
document.addEventListener('DOMContentLoaded', () => {
    // This listener should be delegated globally or attached to the boost screen container.
    // Since marketItemsGrid listener is fine, we can add boost specific listeners here.
    boostsImprovementsList?.addEventListener('click', (e) => {
        const btn = e.target.closest('.btn-buy-boost');
        if (btn && !btn.disabled) {
            const boostId = btn.dataset.boostId;
            buyImprovement(boostId);
        }
    });

    // NEW: Delegated listener for Employee item purchases (Employees tab)
    boostsEmployeesList?.addEventListener('click', (e) => {
        const btn = e.target.closest('.btn-hire-employee');
        if (btn && !btn.disabled) {
            const employeeId = btn.dataset.employeeId;
            buyEmployee(employeeId);
        }
    });
});

/* ---------- Init ---------- */
function init(){
  // migrate legacy top-level fields into restaurants if needed
  if (!gameState.restaurants || !Array.isArray(gameState.restaurants)){
    const migrated = { id: 'r0', name:'Meu Restaurante', cuisine: profile.cuisine || null, unlockedRecipeNames: gameState.unlockedRecipeNames || [], unlockedIngredientIds: gameState.unlockedIngredientIds || [], rank: gameState.rank || 0, stars: 0.0, boosts: {} }; // Init boosts
    // sanitize migrated unlocked recipes so required rank recipes are not pre-bought
    migrated.unlockedRecipeNames = sanitizeUnlocks(migrated.cuisine, migrated.unlockedRecipeNames || []);
    gameState.restaurants = [migrated];
    gameState.activeRestaurantIndex = 0;
    // remove legacy top-level lists (kept but not used)
    delete gameState.unlockedRecipeNames; delete gameState.unlockedIngredientIds; delete gameState.rank;
    saveGame();
  }

  // Disable right-click context menu inside the game to prevent cheating/inspect usage
  document.addEventListener('contextmenu', (e) => { e.preventDefault(); });

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
  
  // apply localization labels early so UI shows correct words
  applyLocalizationLabels();
  
  // wire quick tutorial/settings/stats buttons added to menu
  // Welcome screen action buttons (moved from Menu)
  document.getElementById('welcome-tutorial-button')?.addEventListener('click', ()=>{ playSound('click'); showTutorialModal(true); });
  document.getElementById('welcome-stats-button')?.addEventListener('click', ()=>{ playSound('click'); showStatsModal(); });
  document.getElementById('welcome-settings-button')?.addEventListener('click', ()=>{ playSound('click'); showSettingsModal(); });
  
  // Hide loading screen
  if (loadingScreen) {
    loadingScreen.classList.add('fade-out');
    setTimeout(() => {
      loadingScreen.style.display = 'none';
    }, 500);
  }
}

/* ---------- Auto-offer logic ---------- */
const autoOfferModal = document.getElementById('auto-offer-modal');
const offerTitle = document.getElementById('offer-title');
const offerDesc = document.getElementById('offer-desc');
const offerSkip = document.getElementById('offer-skip');
const offerBuy = document.getElementById('offer-buy');
let pendingOffer = null; // Can be a recipe object or a boost object + level info

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
    // Only return mandatory if it's truly not yet unlocked and affordable (use effective price)
    if (mandatory && gameState.money >= getEffectivePrice(mandatory)) return mandatory;
  }

  // Otherwise pick the cheapest allowed by current rank but ensure it's not already unlocked and within cuisine
  const pool = notUnlockedAll.filter(r => activeIdx >= r.minRank);
  // if pool is empty try to fallback to any notUnlocked regardless of minRank (but must be affordable)
  let candidate = pool.sort((a,b)=>a.price-b.price)[0];
  if (!candidate) candidate = notUnlockedAll.sort((a,b)=>a.price-b.price)[0];
  return (candidate && gameState.money>=getEffectivePrice(candidate)) ? candidate : null;
}

function findAffordableBoost(){
    const active = getActiveRestaurant();
    
    // Combine BOOSTS and EMPLOYEES for centralized logic
    const allPurchasables = [...BOOSTS.map(b => ({...b, type: 'improvement'})), ...EMPLOYEES.map(e => ({...e, type: 'employee'}))];

    const affordable = allPurchasables.map(item => {
        const currentLevel = getBoostLevel(item.id);
        if (currentLevel >= item.maxLevel) return null;
        const price = item.price * (currentLevel + 1);
        if (gameState.money >= price) {
            return {
                id: item.id,
                name: item.name,
                icon: item.icon,
                currentLevel: currentLevel,
                maxLevel: item.maxLevel,
                price: price,
                desc: item.desc,
                type: item.type
            };
        }
        return null;
    }).filter(Boolean);

    // Prioritize cheapest purchasable
    affordable.sort((a, b) => a.price - b.price);
    return affordable[0] || null;
}


function showAutoOffer(item){
  const active = getActiveRestaurant();
  // Check if item is a Recipe or a Purchasable (Improvement/Employee)
  const isRecipe = !!item.baseRecipe;

  if (isRecipe) {
    // RECIPE LOGIC (uses definitive rank requiredStars)
    // Validate recipe is still not unlocked and affordable (race safety)
    const ranks = getActiveRanks();
    let currIdx = (active && typeof active.rank === 'number') ? active.rank : 0;
    const nextDef = ranks[currIdx + 1] || null;
    const requiredRankGoalName = getRankUnlockRecipeName(currIdx, active.cuisine || profile.cuisine);
    const isRankGoal = item.name === requiredRankGoalName;

    let requiredStars = 0.0;
    if (isRankGoal) {
        // Use rank's requiredStars
        requiredStars = Number(nextDef?.requiredStars || 0);
    }
    
    // Safety check for purchase capability based on money and required stars (only for rank goal recipes)
    if (!item || (active.unlockedRecipeNames||[]).includes(item.name) || gameState.money < getEffectivePrice(item) || (isRankGoal && Number(active.stars || 0) < requiredStars)){
      const alt = findAffordableRecipe();
      if (!alt) { 
        const purchasableAlt = findAffordableBoost(); 
        if (purchasableAlt) { showAutoOffer(purchasableAlt); return; }
        startNewOrder(); 
        return; 
      }
      item = alt;
      // Re-evaluate requiredStars and isRankGoal for the new item if needed, but since it passed findAffordableRecipe, we proceed with the offer.
    }
    pendingOffer = item;

    // Build modal content for Recipe
    const effectivePrice = getEffectivePrice(item);
    offerTitle.textContent = `Você pode comprar: ${item.name}`;
    let starsInfo = '';
    
    // Recalculate stars info based on potentially new item (if original failed)
    const have = Number(active.stars || 0);
    if (isRankGoal){
      const meets = have >= requiredStars;
      starsInfo = `<div style="margin-top:.5rem; color:${meets ? 'var(--success)' : 'var(--danger)'}; font-weight:700;">Ranque: ★${requiredStars.toFixed(1)} (Você: ${have.toFixed(1)} ★ ${meets ? '✓' : '✕'})</div>`;
    }
    
    offerDesc.innerHTML = `<div style="display:flex;align-items:center;gap:.6rem;justify-content:center">
        <span style="font-size:2.2rem">${item.emoji || '🍽️'}</span>
        <div style="text-align:left">
          <div style="font-weight:800;font-size:1.05rem">${item.name}</div>
          <div style="opacity:.85">Preço: <span style="font-weight:700">$${effectivePrice}</span></div>
          ${starsInfo}
        </div>
      </div>`;
    offerBuy.textContent = `Comprar ($${effectivePrice})`;
  } else {
    // Handling BOOST or EMPLOYEE
    const purchasable = item;
    // Validate is still affordable (race safety)
    const expectedPrice = purchasable.price;
    const currentLevel = getBoostLevel(purchasable.id);
    const isMax = currentLevel >= purchasable.maxLevel;

    if (isMax || gameState.money < expectedPrice) {
        // Find next affordable item if this one fails
        const alt = findAffordableBoost();
        if (alt) { showAutoOffer(alt); return; }
        const recipeAlt = findAffordableRecipe();
        if (recipeAlt) { showAutoOffer(recipeAlt); return; }
        startNewOrder();
        return;
    }

    pendingOffer = purchasable; 

    const levelText = purchasable.maxLevel > 1 ? `Nível ${currentLevel} -> ${currentLevel + 1}` : 'Nível Máximo';
    
    const lang = (navigator.language || navigator.userLanguage || 'en').toLowerCase();
    const typeLabel = lang.startsWith('pt') ? (purchasable.type === 'employee' ? 'Funcionário' : 'Vantagem') : (purchasable.type === 'employee' ? 'Employee' : 'Boost');
    
    offerTitle.textContent = `Novo ${typeLabel} Disponível!`;
    offerDesc.innerHTML = `<div style="display:flex;align-items:center;gap:.6rem;justify-content:center">
        <span style="font-size:2.2rem">${purchasable.icon}</span>
        <div style="text-align:left">
          <div style="font-weight:800;font-size:1.05rem">${purchasable.name} (${levelText})</div>
          <div style="opacity:.85">${purchasable.desc}</div>
          <div style="opacity:.85; margin-top: .5rem">Custo: <span style="font-weight:700">$${purchasable.price}</span></div>
        </div>
      </div>`;
    offerBuy.textContent = `Comprar ${typeLabel} ($${purchasable.price})`;
  }

  // Show modal
  autoOfferModal.classList.remove('hidden');
  autoOfferModal.classList.add('modal-wrap','show','modal-scrim-pane');
  const inner = autoOfferModal.querySelector('.card, .p-5');
  if (inner) inner.classList.add('modal-card','fade');
}

offerSkip?.addEventListener('click', ()=>{ 
  // If skipping a recipe offer, check for affordable boost next
  if (pendingOffer && pendingOffer.baseRecipe) {
    const boostAlt = findAffordableBoost();
    if (boostAlt) { 
        autoOfferModal.classList.add('hidden'); 
        pendingOffer = null; 
        showAutoOffer(boostAlt); 
        return; 
    }
  }
  // If skipping a boost offer, or if no boost alternative found, continue to next order
  autoOfferModal.classList.add('hidden'); 
  pendingOffer=null; 
  startNewOrder(); 
});

offerBuy?.addEventListener('click', ()=>{
  const active = getActiveRestaurant();
  if (!pendingOffer){ autoOfferModal.classList.add('hidden'); pendingOffer=null; startNewOrder(); return; }

  const item = pendingOffer;

  if (item.baseRecipe){
    // Buying Recipe
    const recipe = item;
    
    // Crucial: check required stars again before buying rank goal recipe
    const ranks = getActiveRanks();
    let currIdx = active.rank || 0;
    const nextDef = ranks[currIdx + 1] || null;
    const nextGoalName = nextDef ? (getRankUnlockRecipeName(currIdx, active.cuisine || profile.cuisine) || nextDef.recipeToUnlock) : null;
    const isRankGoal = nextGoalName && nextGoalName === item.name;
    const requiredStars = isRankGoal ? (Number(nextDef?.requiredStars || 0)) : 0;

    if (isRankGoal && Number(active.stars || 0) < requiredStars) {
         // Should have been caught by showAutoOffer logic, but double check
        autoOfferModal.classList.add('hidden'); 
        showMarketMessage("Estrelas Insuficientes", `Você precisa de ★${requiredStars.toFixed(1)} para subir de ranque.`, false);
        pendingOffer = null;
        return; 
    }
    
    rankUpContext = 'auto_offer';
    const result = buyRecipe(recipe.name); 
    rankUpContext = null; 

    // If purchase succeeded AND triggered rank advancement, the rankUpModal is now visible.
    // The rankUpModalClose handler must take over the flow. We exit here.
    if (result.success && result.advanced) {
        autoOfferModal.classList.add('hidden'); 
        pendingOffer = null;
        return; 
    }
    
    // If purchase failed (not enough money), the Insufficient Funds modal is visible. We exit.
    if (!result.success) {
        autoOfferModal.classList.add('hidden');
        pendingOffer = null;
        return; 
    }
    
    // After buying recipe, check for affordable boost/employee before starting new order
    const purchasableAlt = findAffordableBoost();
    if (purchasableAlt) { 
        autoOfferModal.classList.add('hidden'); 
        pendingOffer = null; 
        showAutoOffer(purchasableAlt); 
        return; 
    }

  } else {
    // Buying Boost or Employee
    const purchasable = item;
    
    if (gameState.money >= purchasable.price){
        if (purchasable.type === 'improvement') {
            buyImprovement(purchasable.id);
        } else if (purchasable.type === 'employee') {
            buyEmployee(purchasable.id);
        }
    } else {
        showMarketMessage("Dinheiro Insuficiente!", `Você precisa de $${purchasable.price}.`, false);
    }
    
    // After buying, check for next offer
    const recipeAlt = findAffordableRecipe();
    if (recipeAlt) { 
        autoOfferModal.classList.add('hidden'); 
        pendingOffer = null; 
        showAutoOffer(recipeAlt); 
        return; 
    }
    const purchasableAlt = findAffordableBoost();
    if (purchasableAlt) {
        autoOfferModal.classList.add('hidden');
        pendingOffer = null;
        showAutoOffer(purchasableAlt);
        return;
    }
  }

  // If nothing else to offer, start new order
  autoOfferModal.classList.add('hidden'); pendingOffer=null; startNewOrder();
});

/* ---------- Background music handling ---------- */
/* Removed explicit pause listeners to fix user background music stopping issue */


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

  // ensure localized labels are applied for dynamically injected elements too
  applyLocalizationLabels();

  // Restaurants logic
  renderRestaurantsButtonIfEligible();
  renderRestaurantsModal();
});

// New modal helpers: use .modal-wrap and .modal-card.fade for consistent show/hide with fade
function showModalById(id){
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove('hidden');
  el.classList.add('modal-wrap','show','modal-scrim-pane');
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
  setTimeout(()=>{ el.classList.add('hidden'); el.classList.remove('modal-scrim-pane'); }, 300);
}

// TUTORIAL LOGIC START
const TUTORIAL_STEPS = [
    { 
        title: "Bem-vindo(a), Chef!", 
        content: "Siga a Receita é um jogo de gerenciamento de tempo rápido. Seu objetivo é montar pratos na ordem correta antes que o tempo acabe! Cada segundo conta.", 
        emoji: "🧑‍🍳",
        visual: `<i class="fas fa-hat-chef text-6xl text-purple-600 mb-2 animate-bounce"></i>` // Added subtle animation hint
    },
    { 
        title: "O Pedido e o Timer", 
        content: "O cliente (NPC) faz o pedido, mostrando a receita e o prato. A barra de tempo conta abaixo. Se o tempo zerar, você perde reputação (★) e dinheiro.", 
        emoji: "⏱️",
        visual: `<div class="w-full max-w-[200px] h-8 bg-gray-200 rounded-full overflow-hidden shadow-inner flex items-center mb-2 mx-auto"><div class="h-full bg-red-500 w-3/4" style="width: 75%;"></div></div><div class="text-sm font-bold mb-2 text-red-600">⏳ O tempo é seu maior desafio!</div>` // Ensured visual elements are centered
    },
    { 
        title: "Montando o Prato", 
        content: "Os ingredientes no topo são o gabarito. Selecione os ingredientes na parte inferior EXATAMENTE na mesma sequência. Um erro ou ingrediente faltando, e o pedido falha.", 
        emoji: "🍔",
        visual: `<div class="p-3 border-2 border-green-500 rounded-lg flex justify-center gap-2 items-center"><span class="text-3xl">🍞</span><span class="text-3xl text-green-500 font-bold">-></span><span class="text-3xl">🧀</span><span class="text-3xl text-green-500 font-bold">-></span><span class="text-3xl">🍅</span></div><div class="text-xs mt-2 font-bold text-purple-600">A ordem correta (esquerda para direita) é crucial!</div>`
    },
    { 
        title: "Mercado e Ranques", 
        content: "Compre novas receitas no Mercado para avançar seu Ranque. Cada ranque desbloqueado aumenta o dinheiro base que você ganha por pedido.", 
        emoji: "💰",
        visual: `<div class="flex gap-4 justify-center items-center"><i class="fas fa-store text-4xl text-blue-500"></i><i class="fas fa-arrow-right text-lg text-gray-400"></i><i class="fas fa-star text-4xl text-yellow-500"></i><div class="text-2xl font-bold">Chef II</div></div><div class="text-sm mt-2">Invista em novos pratos para progredir!</div>`
    },
    { 
        title: "Estrelas e Vantagens", 
        content: "Sua avaliação de Estrelas (★) aumenta ao completar sequências (streaks) de acertos. Estrelas são necessárias para subir de Ranque após comprar a receita-chave. Use Vantagens (Boosts) para melhorar permanentemente o jogo.", 
        emoji: "⭐",
        visual: `<div class="flex gap-4 justify-center items-center"><span class="stars-pill">★ 1.8</span><i class="fas fa-arrow-right text-lg text-gray-400"></i><button class="btn-main bg-yellow-600 text-white font-bold px-4 py-2 rounded-lg text-lg"><i class="fas fa-rocket mr-1"></i> Vantagens</button></div>`
    },
    {
        title: "Estatísticas e Configurações",
        content: "Acesse suas estatísticas de jogo e gerencie o Tema (Claro/Escuro) e o Som de Fundo através dos botões na tela de Menu Inicial.",
        emoji: "⚙️",
        visual: `<div class="flex gap-3 justify-center items-center"><button class="text-2xl text-purple-600"><i class="fas fa-chart-line"></i></button><button class="text-2xl text-purple-600"><i class="fas fa-cog"></i></button><button class="text-2xl text-purple-600"><i class="fas fa-book"></i></button></div><div class="text-sm mt-2">Seus controles de jogo e progresso.</div>`
    }
];

let currentTutorialStep = 0;

function renderTutorialStep(stepIndex) {
    const step = TUTORIAL_STEPS[stepIndex];
    if (!step) return;

    tutorialContent.innerHTML = `
        <div class="flex flex-col items-center flex-1 text-center">
            <div class="text-6xl mb-4">${step.emoji}</div>
            <h3 class="text-2xl font-bold mb-2">${step.title}</h3>
            <p class="text-base opacity-90 mb-4">${step.content}</p>
            <div class="mt-4 w-full flex flex-col items-center justify-center">
                ${step.visual || ''}
            </div>
        </div>
        <div class="text-center text-sm opacity-60 pt-4">Passo ${stepIndex + 1} de ${TUTORIAL_STEPS.length}</div>
    `;

    // Update navigation buttons
    tutorialPrev.classList.toggle('hidden', stepIndex === 0);
    tutorialNext.classList.toggle('hidden', stepIndex === TUTORIAL_STEPS.length - 1);
    
    // Ensure 'Start' or 'Close' is shown on the last step
    const isFromMenu = tutorialCloseBtn.classList.contains('hidden') === false; // Check context set by showTutorialModal
    const totalSteps = TUTORIAL_STEPS.length;

    if (stepIndex === totalSteps - 1) {
        tutorialNext.classList.add('hidden');
        // If we are on the first step AND it was triggered from a non-menu flow, show START
        if (currentTutorialStep === 0 && !isFromMenu) {
            tutorialStart.classList.remove('hidden');
            tutorialCloseBtn.classList.add('hidden');
        } else {
            // Otherwise, if finished or called from menu link, show CLOSE
            tutorialStart.classList.add('hidden');
            tutorialCloseBtn.classList.remove('hidden');
        }
    } else {
        tutorialStart.classList.add('hidden');
        tutorialCloseBtn.classList.add('hidden');
    }
}

function showTutorialModal(fromMenu = false) {
    currentTutorialStep = 0;
    
    // Set initial state for close/start buttons based on context
    if (fromMenu) {
        // If coming from the menu link, we intend to close it afterwards
        tutorialCloseBtn.classList.remove('hidden');
        tutorialStart.classList.add('hidden');
    } else {
        // If coming from the first time play click, we intend to start the game afterwards
        tutorialCloseBtn.classList.add('hidden');
        tutorialStart.classList.remove('hidden');
    }
    
    renderTutorialStep(currentTutorialStep);
    showModalById('tutorial-modal');
}

tutorialPrev?.addEventListener('click', () => {
    if (currentTutorialStep > 0) {
        playSound('click');
        currentTutorialStep--;
        renderTutorialStep(currentTutorialStep);
    }
});

tutorialNext?.addEventListener('click', () => {
    if (currentTutorialStep < TUTORIAL_STEPS.length - 1) {
        playSound('click');
        currentTutorialStep++;
        renderTutorialStep(currentTutorialStep);
    }
});

tutorialStart?.addEventListener('click', () => {
    // If successful, transition to menu screen (used on first run)
    playSound('success');
    hideModalById('tutorial-modal');
    showScreen('menu-screen');
});

tutorialCloseBtn?.addEventListener('click', () => {
    playSound('click');
    hideModalById('tutorial-modal');
});


// Add a button in the Menu screen to view the tutorial again
document.addEventListener('DOMContentLoaded', () => {
    // Find the container for rank information
    const rankDisplay = query('rank-display');
    if(rankDisplay && !rankDisplay.querySelector('#view-tutorial')){
        const existingButton = query('view-upcoming-ranks');
        const tutorialBtn = createElementFromHTML(`<button id="view-tutorial" class="btn-main mt-2 bg-gray-100 text-gray-800 px-4 py-2 rounded-lg text-sm ml-2">Ver Tutorial</button>`);
        
        // Insert 'Ver Tutorial' right after 'Ver próximos ranques'
        if (existingButton) {
            existingButton.insertAdjacentElement('afterend', tutorialBtn);
        } else {
            rankDisplay.appendChild(tutorialBtn);
        }

        tutorialBtn.addEventListener('click', () => {
            playSound('click');
            showTutorialModal(true); // pass true to indicate opening from menu
        });
    }

    // NEW: Delegated listener for Market item purchases (moved here to ensure it only binds once)
    marketItemsGrid.addEventListener('click', (e) => {
        const btn = e.target.closest('.btn-buy');
        if (btn && !btn.disabled) {
            const recipeName = btn.dataset.recipe;
            // The logic inside buyRecipe handles the purchase, failure modal, and rank up flow
            rankUpContext = 'market_purchase';
            buyRecipe(recipeName);
            rankUpContext = null;
        }
    });

    // NEW: Delegated listener for Boost item purchases (Improvements tab)
    boostsImprovementsList?.addEventListener('click', (e) => {
        const btn = e.target.closest('.btn-buy-boost');
        if (btn && !btn.disabled) {
            const boostId = btn.dataset.boostId;
            buyImprovement(boostId);
        }
    });

    // NEW: Delegated listener for Employee item purchases (Employees tab)
    boostsEmployeesList?.addEventListener('click', (e) => {
        const btn = e.target.closest('.btn-hire-employee');
        if (btn && !btn.disabled) {
            const employeeId = btn.dataset.employeeId;
            buyEmployee(employeeId);
        }
    });

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

  // Global handler for the restaurants button which is dynamically hidden/shown
  document.addEventListener('click', (e)=>{
      if (e.target && e.target.id === 'restaurants-button'){
        renderRestaurantsModal();
        showModalById('restaurants-modal');
      }
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

// New function: renderRestaurantsButtonIfEligible
function renderRestaurantsButtonIfEligible(){
  const active = getActiveRestaurant();
  // cuisine may be null for new restaurants; find cuisine-specific pool
  const cuisine = active.cuisine || profile.cuisine;
  // Consider all recipes associated with this cuisine
  const pool = ALL_RECIPES.filter(r => !cuisine || (Array.isArray(r.cuisine)? r.cuisine.includes(cuisine): true));
  const allNames = pool.map(r=>r.name);
  const unlocked = new Set(active.unlockedRecipeNames || []);
  // A restaurant is 'complete' when all relevant recipes are unlocked
  const allBought = allNames.every(n=>unlocked.has(n));
  const container = document.getElementById('restaurants-button-container');
  if (container) container.classList.toggle('hidden', !allBought);
}

// New function: renderRestaurantsModal
function renderRestaurantsModal(){
  const list = document.getElementById('restaurants-list');
  list.innerHTML = '';
  (gameState.restaurants || []).forEach((r, idx)=>{
    const total = ALL_RECIPES.filter(rec => !r.cuisine || (Array.isArray(rec.cuisine)? rec.cuisine.includes(r.cuisine): true)).length || 1;
    const completed = (r.unlockedRecipeNames||[]).length;
    const pct = Math.round((completed/total)*100);
    const el = document.createElement('div');
    el.className = 'resto-entry flex items-center justify-between p-2 border rounded-lg'; // Use resto-entry class for style
    el.innerHTML = `<div>
                      <div class="font-bold">${r.name} ${idx===gameState.activeRestaurantIndex?'<span class="text-sm text-green-600"> (Ativo)</span>':''}</div>
                      <div class="text-sm text-gray-500">${r.cuisine || '—'} • ${pct}% concluído (${completed}/${total})</div>
                    </div>
                    <div class="flex gap-2">
                      <button class="switch-resto btn-main bg-indigo-500 text-white px-3 py-1 rounded" data-idx="${idx}">Abrir</button>
                      <button class="delete-resto btn-main bg-red-500 text-white px-3 py-1 rounded" data-idx="${idx}" ${gameState.restaurants.length <= 1 ? 'disabled' : ''}>Apagar</button>
                    </div>`;
    list.appendChild(el);
  });
  // attach handlers
  list.querySelectorAll('.switch-resto').forEach(b=>b.addEventListener('click', (e)=>{
    const i = Number(e.currentTarget.dataset.idx);
    gameState.activeRestaurantIndex = i;
    saveGame();
    // Update profile context for non-multiresto specific calls
    const active = getActiveRestaurant();
    profile.restoName = active.name;
    profile.cuisine = active.cuisine;
    restoNameDisplay.textContent = `${profile.restoName} • ${profile.cuisine}`;
    updateRankDisplay();
    renderMarket();
    renderUnlockedIngredientBin();
    updateAllMoneyDisplays();
    renderRestaurantsModal();
    renderRestaurantsButtonIfEligible();
    hideModalById('restaurants-modal'); // Auto close after switch
  }));
  list.querySelectorAll('.delete-resto').forEach(b=>b.addEventListener('click', (e)=>{
    const idxToDelete = Number(e.currentTarget.dataset.idx);
    if (gameState.restaurants.length <= 1) {
        showMarketMessage("Erro", "Você não pode deletar seu último restaurante!", false);
        return;
    }
    
    // Confirm delete flow
    if (!window.confirm(`Tem certeza que deseja apagar o restaurante ${gameState.restaurants[idxToDelete].name}?`)) return;

    gameState.restaurants.splice(idxToDelete,1);
    
    if (gameState.activeRestaurantIndex === idxToDelete) {
        // If the active restaurant was deleted, switch to the first one available
        gameState.activeRestaurantIndex = 0;
    } else if (gameState.activeRestaurantIndex > idxToDelete) {
        // If an earlier restaurant was deleted, adjust the index
        gameState.activeRestaurantIndex--;
    }
    
    saveGame();
    
    // Switch context to new active restaurant if needed
    const active = getActiveRestaurant();
    profile.restoName = active.name;
    profile.cuisine = active.cuisine;
    restoNameDisplay.textContent = `${profile.restoName} • ${profile.cuisine}`;
    updateRankDisplay();

    renderRestaurantsModal();
    renderRestaurantsButtonIfEligible();
  }));
}

// Global helper: ensure audio starts on first user interaction and play a tactile click for buttons
document.addEventListener('click', (e) => {
    const el = e.target.closest('button, .btn-main, .ingredient-btn, .btn-buy, .btn-buy-boost, [role="button"]');
    if (!el) return;
    try { ensureAudioStarted(); playSound('click', 0.9); } catch (err) { console.warn('Click sound failed', err); }
});

// New: showStatsModal & showSettingsModal functions and handlers
function showStatsModal(){
  const active = getActiveRestaurant();
  document.getElementById('stat-money').textContent = `$${gameState.money}`;
  const ranks = getActiveRanks();
  const idx = Number.isInteger(active?.rank) ? active.rank : 0;
  // Use current rank name, and the goal recipe requirement if applicable, for better flavor
  const currentRank = ranks[idx];
  let rankText = `${currentRank?.name || '—'} (Lv ${idx})`;
  if (idx < ranks.length - 1) {
      const nextGoal = getRankUnlockRecipeName(idx, active.cuisine || profile.cuisine);
      if (nextGoal) rankText += ` | Próx: ${nextGoal}`;
  }
  document.getElementById('stat-rank').textContent = rankText;
  document.getElementById('stat-stars').textContent = `${Number(active.stars||0).toFixed(1)} ★`;
  document.getElementById('stat-recipes').textContent = `${(active.unlockedRecipeNames||[]).length}`;
  showModalById('stats-modal');
}
document.getElementById('close-stats')?.addEventListener('click', ()=>{ playSound('click'); hideModalById('stats-modal'); });

// Settings modal
function showSettingsModal(){
  // set initial settings state
  const muted = localStorage.getItem(BGM_KEY) === '1';
  document.getElementById('settings-toggle-sound').textContent = muted ? 'Som: Desativado' : 'Som: Ativado';
  
  // Update theme button text for better clarity
  const currentTheme = document.documentElement.classList.contains('dark') ? 'Escuro' : 'Claro';
  document.getElementById('settings-toggle-theme').textContent = `Tema: ${currentTheme}`;

  showModalById('settings-modal');
}
document.getElementById('close-settings')?.addEventListener('click', ()=>{ playSound('click'); hideModalById('settings-modal'); });
document.getElementById('settings-toggle-theme')?.addEventListener('click', ()=>{ 
    playSound('click'); 
    toggleTheme(); 
    const currentTheme = document.documentElement.classList.contains('dark') ? 'Escuro' : 'Claro';
    document.getElementById('settings-toggle-theme').textContent = `Tema: ${currentTheme}`;
});
document.getElementById('settings-toggle-sound')?.addEventListener('click', ()=>{ 
    playSound('click'); 
    toggleBgm(); 
    document.getElementById('settings-toggle-sound').textContent = (localStorage.getItem(BGM_KEY) === '1') ? 'Som: Desativado' : 'Som: Ativado'; 
});
