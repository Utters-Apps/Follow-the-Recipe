export const NPCS = ["👩‍💼","🧑‍💻","👨‍🎨","👩‍🚀","🧑‍🚒","👮‍♀️","👷‍♂️","👩‍⚕️","🧑‍🎤","👨‍🌾","🧑‍🍳","👩‍🎓","🧑‍🔧","🧑‍🌾","🧑‍🏫","🧑‍✈️","🧙‍♂️","🧛‍♀️","🧚‍♂️","🦸‍♀️","🦹‍♂️","🤵","👸","🧕","👨‍⚖️"];

export const ALL_INGREDIENTS = {
  'pao': { type: 'emoji', value: '🍞' },
  'alface': { type: 'emoji', value: '🥬' },
  'bife': { type: 'emoji', value: '🥩' },
  'queijo': { type: 'emoji', value: '🧀' },
  'tomate': { type: 'emoji', value: '🍅' },
  'pepino': { type: 'emoji', value: '🥒' },
  'cebola': { type: 'emoji', value: '🧅' },
  'pimenta': { type: 'emoji', value: '🌶️' },
  'taco_shell': { type: 'emoji', value: '🌮' },
  'alga': { type: 'emoji', value: '🍙' },
  'peixe': { type: 'emoji', value: '🐟' },
  'abacate': { type: 'emoji', value: '🥑' },
  'ovo': { type: 'emoji', value: '🥚' },
  'bacon': { type: 'emoji', value: '🥓' },
  'cogumelo': { type: 'emoji', value: '🍄' },
  'salsicha': { type: 'emoji', value: '🌭' },
  'frango': { type: 'emoji', value: '🍗' },
  'milho': { type: 'emoji', value: '🌽' },
  'camarao': { type: 'emoji', value: '🦐' },
  'pizza_massa': { type: 'emoji', value: '🍕' },
  'leite': { type: 'emoji', value: '🥛' },
  'mel': { type: 'emoji', value: '🍯' },
  'waffle': { type: 'emoji', value: '🧇' },
  'panqueca': { type: 'emoji', value: '🥞' },
  'brocolis': { type: 'emoji', value: '🥦' },
  'cenoura': { type: 'emoji', value: '🥕' },
  'mirtilo': { type: 'emoji', value: '🫐' },
  'arroz': { type: 'emoji', value: '🍚' },
  'guioza_massa': { type: 'emoji', value: '🥟' },
  'limao': { type: 'emoji', value: '🍋' },
  'sal': { type: 'emoji', value: '🧂' },
  'sopa_base': { type: 'emoji', value: '🥣' },
  'amendoim': { type: 'emoji', value: '🥜' },
  'feijao': { type: 'emoji', value: '🫘' },
  'bolo_massa': { type: 'emoji', value: '🎂' },
  'manteiga': { type: 'emoji', value: '🧈' },
  'ervas': { type: 'emoji', value: '🌿' },
  'morango': { type: 'emoji', value: '🍓' },
  'abacaxi': { type: 'emoji', value: '🍍' },
  'berinjela': { type: 'emoji', value: '🍆' },
  'batata': { type: 'emoji', value: '🥔' },
  'azeitona': { type: 'emoji', value: '🫒' },
  'alho': { type: 'emoji', value: '🧄' },
  'pimentao': { type: 'emoji', value: '🫑' },
  'massa': { type: 'emoji', value: '🍝' },
  'ramen_massa': { type: 'emoji', value: '🍜' },
  'sushi_base': { type: 'emoji', value: '🍣' },
  'croissant_massa': { type: 'emoji', value: '🥐' },
  'baguete': { type: 'emoji', value: '🥖' },
  'chocolate': { type: 'emoji', value: '🍫' },
  'gelo': { type: 'emoji', value: '🧊' },
  'molho_soja': { type: 'emoji', value: '🫙' },
  'coco': { type: 'emoji', value: '🥥' },
  'banana': { type: 'emoji', value: '🍌' },
  'maca': { type: 'emoji', value: '🍎' },
  'uva': { type: 'emoji', value: '🍇' },
  'kiwi': { type: 'emoji', value: '🥝' },
  'donut_massa': { type: 'emoji', value: '🍩' },
  'cookie_massa': { type: 'emoji', value: '🍪' },
  'sorvete_base': { type: 'emoji', value: '🍦' },
  'ervilha': { type: 'emoji', value: '🫛' },
  'pretzel': { type: 'emoji', value: '🥨' },
  'bagel': { type: 'emoji', value: '🥯' },
  'laranja': { type: 'emoji', value: '🍊' },
  'melancia': { type: 'emoji', value: '🍉' },
  'tofu': { type: 'image', value: 'https://cdn-icons-png.flaticon.com/512/4463/4463838.png' },
  'cafe': { type: 'emoji', value: '☕' },
  'manteiga_amendoim': { type: 'emoji', value: '🥜' },
  'geleia': { type: 'emoji', value: '🍇' },
  'cha_verde': { type: 'emoji', value: '🍵' },
  'carne_seca': { type: 'emoji', value: '🍖' },
  'acucar': { type: 'emoji', value: '🍚' },
  'repolho': { type: 'emoji', value: '🥬' },
  'farinha': { type: 'emoji', value: '🍚' },
  'couve': { type: 'emoji', value: '🥬' },
  'mascarpone': { type: 'emoji', value: '🧀' },
  'polvo': { type: 'emoji', value: '🐙' },
  'molho_okono': { type: 'emoji', value: '🥫' }
};

// Tag recipes by cuisine to drive filtering
export const ALL_RECIPES = [
  { name: "Misto Quente", emoji: "🥪", price: 0, minRank: 0, baseRecipe: ["pao","manteiga","queijo","pao"], optionalIngredients:["tomate"], cuisine:["Brasileiro","Italiano"] },
  { name: "Limonada", emoji: "🍋", price: 60, minRank: 0, baseRecipe: ["limao","mel","gelo"], optionalIngredients:["ervas"], cuisine:["Brasileiro","Mexicano","Francês"] },
  { name: "Torrada", emoji: "🍞", price: 40, minRank: 0, baseRecipe: ["pao","manteiga"], optionalIngredients:["morango","mel"], cuisine:["Francês","Italiano","Brasileiro"] },
  { name: "Café", emoji: "☕", price: 50, minRank: 0, baseRecipe: ["cafe","leite"], optionalIngredients:["mel"], cuisine:["Brasileiro","Italiano","Francês"] },
  { name: "Salada", emoji: "🥗", price: 100, minRank: 0, baseRecipe: ["alface","tomate","pepino"], optionalIngredients:["cebola","abacate","milho","ovo"], cuisine:["Mexicano","Italiano","Francês","Brasileiro"] },
  { name: "Sopa de Tomate", emoji: "🥣", price: 110, minRank: 1, baseRecipe: ["tomate","cebola","ervas"], optionalIngredients:["manteiga"], cuisine:["Italiano","Francês"] },
  { name: "Vitamina de Banana", emoji: "🍌", price: 120, minRank: 1, baseRecipe: ["banana","leite","mel"], optionalIngredients:["morango","abacate"], cuisine:["Brasileiro"] },
  { name: "Sushi", emoji: "🍣", price: 150, minRank: 1, baseRecipe: ["alga","peixe","pepino"], optionalIngredients:["abacate"], cuisine:["Japonês"] },
  { name: "Suco de Laranja", emoji: "🍊", price: 90, minRank: 1, baseRecipe: ["laranja","gelo"], optionalIngredients:[], cuisine:["Mexicano","Brasileiro"] },
  { name: "Sanduíche Simples", emoji: "🥪", price: 130, minRank: 1, baseRecipe: ["pao","alface","tomate"], optionalIngredients:["queijo","bacon"], cuisine:["Italiano","Brasileiro","Francês"] },
  { name: "Sand. de Geleia", emoji: "🥪", price: 160, minRank: 1, baseRecipe: ["pao","manteiga_amendoim","geleia","pao"], optionalIngredients:["banana"], cuisine:["Francês","Brasileiro"] },
  { name: "Hambúrguer", emoji: "🍔", price: 200, minRank: 1, baseRecipe: ["pao","bife","alface","pao"], optionalIngredients:["queijo","tomate","bacon","cebola"], cuisine:["Americano","Brasileiro","Mexicano"] },

  /* Expanded selection */
  { name: "Taco", emoji: "🌮", price: 180, minRank: 1, baseRecipe:["taco_shell","bife","alface"], optionalIngredients:["tomate","cebola","pimenta","milho"], cuisine:["Mexicano"] },
  { name: "Ramen", emoji: "🍜", price: 220, minRank: 2, baseRecipe:["ramen_massa","cebola","ervas"], optionalIngredients:["ovo","frango"], cuisine:["Japonês"] },
  { name: "Pizza Margherita", emoji: "🍕", price: 240, minRank: 2, baseRecipe:["pizza_massa","tomate","queijo"], optionalIngredients:["ervas","azeitona"], cuisine:["Italiano"] },
  { name: "Guioza", emoji: "🥟", price: 210, minRank: 2, baseRecipe:["guioza_massa","frango","ervas"], optionalIngredients:["cebola","alho"], cuisine:["Japonês"] },
  { name: "Panqueca Doce", emoji: "🥞", price: 170, minRank: 1, baseRecipe:["panqueca","mel"], optionalIngredients:["morango","mirtilo","chocolate"], cuisine:["Americano","Francês","Brasileiro"] },
  { name: "Waffle", emoji: "🧇", price: 190, minRank: 1, baseRecipe:["waffle","mel"], optionalIngredients:["manteiga","morango","chocolate"], cuisine:["Americano","Francês"] },
  { name: "Sorvete", emoji: "🍦", price: 160, minRank: 1, baseRecipe:["sorvete_base"], optionalIngredients:["chocolate","morango","banana"], cuisine:["Americano","Italiano"] },
  { name: "Bolo Simples", emoji: "🎂", price: 260, minRank: 2, baseRecipe:["bolo_massa","manteiga"], optionalIngredients:["morango","chocolate"], cuisine:["Francês","Brasileiro"] },
  { name: "Sopa Miso", emoji: "🥣", price: 200, minRank: 2, baseRecipe:["sopa_base","alga","tofu","molho_soja"], optionalIngredients:["ervas"], cuisine:["Japonês"] },
  { name: "Bruschetta", emoji: "🥖", price: 150, minRank: 1, baseRecipe:["baguete","tomate","alho"], optionalIngredients:["ervas","azeitona"], cuisine:["Italiano"] },
  { name: "Croissant", emoji: "🥐", price: 230, minRank: 2, baseRecipe:["croissant_massa","manteiga"], optionalIngredients:["chocolate"], cuisine:["Francês"] },
  { name: "Bagel", emoji: "🥯", price: 140, minRank: 1, baseRecipe:["bagel","manteiga"], optionalIngredients:["manteiga_amendoim","geleia"], cuisine:["Americano"] },
  { name: "Pretzel", emoji: "🥨", price: 160, minRank: 1, baseRecipe:["pretzel","manteiga"], optionalIngredients:["manteiga_amendoim","chocolate"], cuisine:["Alemão"] },
  { name: "Sashimi", emoji: "🐟", price: 400, minRank: 3, baseRecipe:["peixe"], optionalIngredients:["ervas","limao"], cuisine:["Japonês"] },
  { name: "Salada César", emoji: "🥗", price: 280, minRank: 2, baseRecipe:["alface","queijo"], optionalIngredients:["frango","ovo","cebola"], cuisine:["Italiano","Francês"] },
  { name: "Ratatouille", emoji: "🍲", price: 550, minRank: 3, baseRecipe:["berinjela","tomate","pimentao"], optionalIngredients:["cebola","ervas","alho"], cuisine:["Francês"] },
  { name: "Pasta Alfredo", emoji: "🍝", price: 380, minRank: 2, baseRecipe:["massa","manteiga","queijo"], optionalIngredients:["frango","ervas"], cuisine:["Italiano"] },
  { name: "Tostada", emoji: "🫔", price: 320, minRank: 2, baseRecipe:["taco_shell","feijao","alface"], optionalIngredients:["milho","tomate","pimenta"], cuisine:["Mexicano"] },
  { name: "Brigadeiro", emoji: "🍬", price: 280, minRank: 2, baseRecipe:["chocolate","manteiga"], optionalIngredients:["leite"], cuisine:["Brasileiro"] },
  { name: "Caprese", emoji: "🥗", price: 300, minRank: 2, baseRecipe:["tomate","queijo","ervas"], optionalIngredients:["azeitona"], cuisine:["Italiano"] },
  { name: "Temaki", emoji: "🍣", price: 340, minRank: 2, baseRecipe:["alga","peixe","arroz"], optionalIngredients:["pepino","abacate"], cuisine:["Japonês"] },
  { name: "Churros", emoji: "🍩", price: 310, minRank: 2, baseRecipe:["donut_massa","mel"], optionalIngredients:["chocolate"], cuisine:["Mexicano","Espanhol"] },
  { name: "Onigiri", emoji: "🍙", price: 70, minRank: 0, baseRecipe:["arroz","alga","sal"], optionalIngredients:["ervas"], cuisine:["Japonês"] },
  { name: "Chá Verde", emoji: "🍵", price: 40, minRank: 0, baseRecipe:["cha_verde"], optionalIngredients:["gelo"], cuisine:["Japonês"] },
  { name: "Yakitori", emoji: "🍢", price: 160, minRank: 1, baseRecipe:["frango","ervas","sal"], optionalIngredients:[], cuisine:["Japonês"] },
  { name: "Tempurá", emoji: "🍤", price: 360, minRank: 2, baseRecipe:["camarao","arroz"], optionalIngredients:["brocolis"], cuisine:["Japonês"] },

  /* New Recipes */
  { name: "Feijoada", emoji: "🍲", price: 650, minRank: 3, baseRecipe: ["feijao", "carne_seca"], optionalIngredients: ["couve", "arroz"], cuisine: ["Brasileiro"] },
  { name: "Caipirinha", emoji: "🍹", price: 300, minRank: 2, baseRecipe: ["limao", "acucar", "gelo"], optionalIngredients: [], cuisine: ["Brasileiro"] },
  { name: "Carbonara", emoji: "🍝", price: 450, minRank: 3, baseRecipe: ["massa", "ovo", "bacon"], optionalIngredients: ["queijo"], cuisine: ["Italiano"] },
  { name: "Guacamole", emoji: "🥑", price: 290, minRank: 2, baseRecipe: ["abacate", "tomate", "cebola", "limao"], optionalIngredients: ["pimenta"], cuisine: ["Mexicano"] },
  { name: "Sopa Azteca", emoji: "🥣", price: 410, minRank: 3, baseRecipe: ["sopa_base", "frango", "pimenta"], optionalIngredients: ["tomate", "queijo"], cuisine: ["Mexicano"] },
  { name: "Okonomiyaki", emoji: "🥞", price: 500, minRank: 3, baseRecipe: ["farinha", "repolho", "ovo"], optionalIngredients: ["bacon", "molho_okono"], cuisine: ["Japonês"] },
  { name: "Takoyaki", emoji: "🐙", price: 520, minRank: 3, baseRecipe: ["polvo", "farinha", "molho_okono"], optionalIngredients: ["ervas"], cuisine: ["Japonês"] },
  { name: "Tiramisu", emoji: "🍰", price: 580, minRank: 4, baseRecipe: ["bolo_massa", "cafe", "mascarpone"], optionalIngredients: ["chocolate"], cuisine: ["Italiano"] },
  { name: "Crepe Suzette", emoji: "🥞", price: 480, minRank: 3, baseRecipe: ["panqueca", "laranja", "manteiga"], optionalIngredients: ["mel"], cuisine: ["Francês"] }
];

// Add 100 extra recipes programmatically
const EXTRA_CUIS = ["Brasileiro","Italiano","Japonês","Mexicano","Francês"];
const basePool = ["pao","queijo","tomate","alface","pepino","cebola","ovo","frango","bife","arroz","alga","limao","mel","ervas"];
/* The programmatic recipe generation loops are removed here */


// Themed ranks per cuisine
export const CUISINE_DEFS = {
  "Brasileiro": [
    { name: "Aprendiz de Boteco", icon:"🧼", recipeToUnlock:"Salada", baseReward: 10 },
    { name: "Cozinheiro Caseiro", icon:"🍳", recipeToUnlock:"Caipirinha", baseReward: 15 },
    { name: "Chef do Quintal", icon:"🥘", recipeToUnlock:"Feijoada", baseReward: 25 },
    { name: "Maestro do Sabor", icon:"🥇", recipeToUnlock:null, baseReward: 40 }
  ],
  "Italiano": [
    { name: "Pizzaiolo Novato", icon:"🍕", recipeToUnlock:"Sopa de Tomate", baseReward: 12 },
    { name: "Maestro della Pasta", icon:"🍝", recipeToUnlock:"Caprese", baseReward: 20 },
    { name: "Chef Rinomato", icon:"🥇", recipeToUnlock:"Carbonara", baseReward: 35 },
    { name: "Grande Chef", icon:"🏆", recipeToUnlock:"Tiramisu", baseReward: 50 },
    { name: "Lendário Culinário", icon:"🌟", recipeToUnlock:null, baseReward: 70 }
  ],
  "Japonês": [
    { name: "Itamae Iniciante", icon:"🍣", recipeToUnlock:"Yakitori", baseReward: 10 },
    { name: "Sushiman Pleno", icon:"🔪", recipeToUnlock:"Ramen", baseReward: 18 },
    { name: "Mestre do Sushi", icon:"🐟", recipeToUnlock:"Okonomiyaki", baseReward: 30 },
    { name: "Itamae Lendário", icon:"🏆", recipeToUnlock:"Takoyaki", baseReward: 50 },
    { name: "Shogun do Sabor", icon:"⛩️", recipeToUnlock:null, baseReward: 75 }
  ],
  "Mexicano": [
    { name: "Taquero Novato", icon:"🌮", recipeToUnlock:"Suco de Laranja", baseReward: 11 },
    { name: "Maestro de Sazón", icon:"🌶️", recipeToUnlock:"Guacamole", baseReward: 19 },
    { name: "Chef Leyenda", icon:"🏆", recipeToUnlock:"Sopa Azteca", baseReward: 38 },
    { name: "Cozinheiro Supremo", icon:"🇲🇽", recipeToUnlock:null, baseReward: 60 }
  ],
  "Francês": [
    { name: "Commis de Cuisine", icon:"🥖", recipeToUnlock:"Torrada", baseReward: 10 },
    { name: "Sous-chef", icon:"🥈", recipeToUnlock:"Salada César", baseReward: 16 },
    { name: "Chef de Cuisine", icon:"🥇", recipeToUnlock:"Crepe Suzette", baseReward: 30 },
    { name: "Patrono Culinário", icon:"🇫🇷", recipeToUnlock:null, baseReward: 50 }
  ]
};

// Default ranks fallback (kept for legacy load)
export const RANKS = [
  { name: "Lava-pratos", icon: "🧼", recipeToUnlock: "Salada", baseReward: 8 },
  { name: "Ajudante de Cozinha", icon: "🧑‍🍳", recipeToUnlock: "Hambúrguer", baseReward: 12 },
  { name: "Cozinheiro Júnior", icon: "🔪", recipeToUnlock: "Taco", baseReward: 16 },
  { name: "Cozinheiro Pleno", icon: "🥘", recipeToUnlock: "Pizza Margherita", baseReward: 22 },
  { name: "Subchefe", icon: "🥈", recipeToUnlock: "Ramen", baseReward: 30 },
  { name: "Chefe de Cozinha", icon: "🥇", recipeToUnlock: "Ratatouille", baseReward: 40 },
  { name: "Mestre Cuca", icon: "🏆", recipeToUnlock: null, baseReward: 60 }
];

export const SAVE_KEY = 'recipeGameData_v6';
export const THEME_KEY = 'recipeGameTheme_v6';
export const RESTO_NAME_KEY = 'recipeGameRestoName_v6';
export const CUISINE_KEY = 'recipeGameCuisine_v6';
