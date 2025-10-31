import { ALL_INGREDIENTS } from './data.js';

export const createElementFromHTML = (html) => {
  const template = document.createElement('template');
  template.innerHTML = html.trim();
  return template.content.firstChild;
};

export function getIngredientHTML(id, classes = '') {
  const ingredient = ALL_INGREDIENTS[id];
  if (!ingredient) {
    // improved fallback: show a readable pill with the id (sanitized) instead of "?"
    const label = id.replace(/[_\-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    return `<span class="${classes}" style="display:inline-block;padding:.15rem .45rem;border-radius:.45rem;background:rgba(0,0,0,0.06);font-size:0.95em">${label}</span>`;
  }
  if (ingredient.type === 'image') {
    const fallback = `https://placehold.co/40x40/efefef/111?text=${id.substring(0,1).toUpperCase()}`;
    // normalize image size to emoji with ing-img class
    return `<img src="${ingredient.value}" class="ing-img ${classes}" alt="${id}" onerror="this.src='${fallback}'">`;
  }
  return `<span class="${classes}">${ingredient.value}</span>`;
}
