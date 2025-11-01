import { ALL_INGREDIENTS } from './data.js';

export const createElementFromHTML = (html) => {
  const template = document.createElement('template');
  template.innerHTML = html.trim();
  return template.content.firstChild;
};

export function getIngredientHTML(id, classes = '') {
  const ingredient = ALL_INGREDIENTS && ALL_INGREDIENTS[id];
  if (!ingredient) {
    // readable fallback pill instead of '?' to avoid confusion in UI and tests
    const label = String(id || '').replace(/[_\-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || 'Ingrediente';
    return `<span class="${classes}" style="display:inline-block;padding:.15rem .45rem;border-radius:.45rem;background:rgba(0,0,0,0.04);font-weight:700">${label}</span>`;
  }
  if (ingredient.type === 'image' && typeof ingredient.value === 'string' && ingredient.value.trim().length>0) {
    const safeSrc = ingredient.value.trim();
    const fallback = `https://placehold.co/40x40/efefef/111?text=${encodeURIComponent((id||'I').substring(0,1).toUpperCase())}`;
    return `<img src="${safeSrc}" class="ing-img ${classes}" alt="${id}" onerror="this.onerror=null;this.src='${fallback}';this.style.objectFit='contain'">`;
  }
  // emoji or text
  return `<span class="${classes}">${ingredient.value || String(id)}</span>`;
}
