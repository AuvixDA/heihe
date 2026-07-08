// ===== Курсы валют (ЦБ РФ через бесплатное зеркало cbr-xml-daily.ru) =====
let rubPerCny = null;
let rubPerEur = null;

async function loadRate() {
  const rateEl = document.getElementById('rate-value');
  const updatedEl = document.getElementById('rate-updated');

  try {
    const res = await fetch('https://www.cbr-xml-daily.ru/daily_json.js');
    const data = await res.json();
    rubPerCny = data.Valute.CNY.Value / data.Valute.CNY.Nominal;
    rubPerEur = data.Valute.EUR.Value / data.Valute.EUR.Nominal;

    if (rateEl) {
      rateEl.textContent = `${rubPerCny.toFixed(2)} ₽`;
      updatedEl.textContent = `Обновлено: ${new Date(data.Date).toLocaleDateString('ru-RU')} · ЦБ РФ`;
    }
  } catch (e) {
    // Фолбэк, если API ЦБ недоступен — курс из limits.json (fallback_cny_to_eur)
    rubPerCny = 12.60;
    rubPerEur = 98.50;
    if (rateEl) {
      rateEl.textContent = `≈ 12.60 ₽`;
      updatedEl.textContent = 'Курс ЦБ временно недоступен, показан ориентировочный';
    }
  }
}
loadRate();

function cnyToEur(amountCny) {
  if (!rubPerCny || !rubPerEur) return amountCny * 0.128; // жёсткий фолбэк на случай, если курсы ещё не загрузились
  return (amountCny * rubPerCny) / rubPerEur;
}

// ===== Калькулятор =====
const STANDARD_CATEGORIES = ['electronics', 'clothing', 'food', 'other'];
const FLAGGABLE_CATEGORIES = ['electronics', 'clothing', 'other']; // где имеет смысл предупреждать про заводскую партию

const CATEGORY_LABELS = {
  electronics: '📱 Техника',
  clothing: '👕 Одежда / товары',
  food: '🍬 Продукты',
  alcohol: '🍷 Алкоголь',
  tobacco: '🚬 Табак',
  other: '📦 Другое'
};

const state = { purpose: null };
let limitsData = null;
let itemIdSeq = 0;

async function loadLimits() {
  try {
    const res = await fetch('limits.json');
    limitsData = await res.json();
  } catch (e) {
    limitsData = {
      personal_baggage: {
        land_transport: { duty_free_value_eur: 500, duty_free_weight_kg: 25, excess_duty: { rate_percent: 15, min_rate_eur_per_kg: 4 } },
        alcohol: { duty_free_liters: 3 },
        tobacco: { duty_free_cigarettes: 200 }
      }
    };
  }
}
loadLimits();

// ===== Управление строками товаров (Шаг 1) =====

function categoryOptionsHtml() {
  return Object.entries(CATEGORY_LABELS)
    .map(([value, label]) => `<option value="${value}">${label}</option>`)
    .join('');
}

function createItemRow() {
  itemIdSeq += 1;
  const id = `item-${itemIdSeq}`;

  const row = document.createElement('div');
  row.className = 'item-row';
  row.dataset.id = id;

  row.innerHTML = `
    <div class="item-row-head">
      <select class="item-category" aria-label="Категория товара">${categoryOptionsHtml()}</select>
      <button class="item-remove" type="button" aria-label="Удалить товар">✕</button>
    </div>
    <input type="text" class="item-name" placeholder="Название (необязательно), например «кроссовки»">

    <div class="item-fields item-fields-standard">
      <div class="field-inline">
        <label>Цена, ¥</label>
        <input type="number" class="item-price" min="0" placeholder="0">
      </div>
      <div class="field-inline">
        <label>Вес, кг</label>
        <input type="number" class="item-weight" min="0" step="0.1" placeholder="0">
      </div>
      <div class="field-inline">
        <label>Кол-во, шт</label>
        <input type="number" class="item-qty" min="1" step="1" placeholder="1">
      </div>
    </div>

    <div class="item-fields item-fields-alcohol" style="display:none;">
      <div class="field-inline">
        <label>Объём, л (все бутылки вместе)</label>
        <input type="number" class="item-liters" min="0" step="0.1" placeholder="0">
      </div>
    </div>

    <div class="item-fields item-fields-tobacco" style="display:none;">
      <div class="field-inline">
        <label>Сигареты, шт (всего)</label>
        <input type="number" class="item-cigs" min="0" step="1" placeholder="0">
      </div>
    </div>

    <label class="item-checkbox" style="display:none;">
      <input type="checkbox" class="item-factory">
      Новое, в заводской упаковке
    </label>

    <div class="item-flag" style="display:none;">⚠️ Похоже на партию для перепродажи — 3+ одинаковых в заводской упаковке</div>
  `;

  return row;
}

function applyCategoryVisibility(row) {
  const category = row.querySelector('.item-category').value;
  const isAlcohol = category === 'alcohol';
  const isTobacco = category === 'tobacco';
  const isStandard = STANDARD_CATEGORIES.includes(category);

  row.querySelector('.item-fields-standard').style.display = isStandard ? 'grid' : 'none';
  row.querySelector('.item-fields-alcohol').style.display = isAlcohol ? 'grid' : 'none';
  row.querySelector('.item-fields-tobacco').style.display = isTobacco ? 'grid' : 'none';

  const checkbox = row.querySelector('.item-checkbox');
  checkbox.style.display = FLAGGABLE_CATEGORIES.includes(category) ? 'flex' : 'none';
  if (!FLAGGABLE_CATEGORIES.includes(category)) {
    row.querySelector('.item-factory').checked = false;
  }

  updateFlag(row);
}

function updateFlag(row) {
  const category = row.querySelector('.item-category').value;
  const flagEl = row.querySelector('.item-flag');
  if (!FLAGGABLE_CATEGORIES.includes(category)) {
    flagEl.style.display = 'none';
    return;
  }
  const qty = parseInt(row.querySelector('.item-qty').value, 10) || 1;
  const factory = row.querySelector('.item-factory').checked;
  flagEl.style.display = (qty >= 3 && factory) ? 'flex' : 'none';
}

function wireItemRow(row, onChange) {
  row.querySelector('.item-remove').addEventListener('click', () => {
    row.remove();
    onChange();
  });
  row.querySelector('.item-category').addEventListener('change', () => {
    applyCategoryVisibility(row);
    onChange();
  });
  row.querySelector('.item-qty').addEventListener('input', () => updateFlag(row));
  row.querySelector('.item-factory').addEventListener('change', () => updateFlag(row));
}

function getItemsData() {
  return Array.from(document.querySelectorAll('.item-row')).map(row => {
    const category = row.querySelector('.item-category').value;
    const name = row.querySelector('.item-name').value.trim();
    const priceCny = parseFloat(row.querySelector('.item-price').value) || 0;
    const weightKg = parseFloat(row.querySelector('.item-weight').value) || 0;
    const qty = parseInt(row.querySelector('.item-qty').value, 10) || 1;
    const factory = row.querySelector('.item-factory').checked;
    const liters = parseFloat(row.querySelector('.item-liters').value) || 0;
    const cigs = parseInt(row.querySelector('.item-cigs').value, 10) || 0;
    const flagged = FLAGGABLE_CATEGORIES.includes(category) && qty >= 3 && factory;

    return { row, category, name, priceCny, weightKg, qty, factory, liters, cigs, flagged };
  });
}

function validateItems(items) {
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    if (STANDARD_CATEGORIES.includes(it.category)) {
      if (it.priceCny <= 0 && it.weightKg <= 0) {
        return { ok: false, message: `Товар №${i + 1}: укажите цену или вес больше нуля`, row: it.row };
      }
    } else if (it.category === 'alcohol') {
      if (it.liters <= 0) {
        return { ok: false, message: `Товар №${i + 1}: укажите объём алкоголя в литрах`, row: it.row };
      }
    } else if (it.category === 'tobacco') {
      if (it.cigs <= 0) {
        return { ok: false, message: `Товар №${i + 1}: укажите количество сигарет`, row: it.row };
      }
    }
  }
  return { ok: true };
}

function initCalculator() {
  const itemsList = document.getElementById('items-list');
  const purposeGroup = document.getElementById('purpose-group');
  if (!itemsList) return; // не на странице калькулятора

  const step1Error = document.getElementById('step1-error');
  const nextBtn1 = document.getElementById('next-1');

  function refreshNextButtonState() {
    nextBtn1.disabled = itemsList.children.length === 0;
  }

  function addItem() {
    const row = createItemRow();
    wireItemRow(row, () => { clearStep1Error(); refreshNextButtonState(); });
    itemsList.appendChild(row);
    applyCategoryVisibility(row);
    refreshNextButtonState();
  }

  function clearStep1Error() {
    step1Error.style.display = 'none';
  }
  function showStep1Error(msg, row) {
    step1Error.textContent = msg;
    step1Error.style.display = 'block';
    if (row) row.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  document.getElementById('add-item-btn').addEventListener('click', addItem);

  // Стартуем с одной пустой строкой
  addItem();

  function selectChoice(group, key, onSelect) {
    group.querySelectorAll('.category-card').forEach(btn => {
      btn.addEventListener('click', () => {
        group.querySelectorAll('.category-card').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        state[key] = btn.dataset.value;
        if (onSelect) onSelect(btn.dataset.value);
      });
    });
  }

  selectChoice(purposeGroup, 'purpose', () => {
    document.getElementById('calc-submit').disabled = false;
  });

  function goTo(stepNum) {
    document.querySelectorAll('.calc-step').forEach(s => s.classList.remove('active'));
    document.getElementById(`step-${stepNum}`).classList.add('active');
    for (let i = 1; i <= 2; i++) {
      const dot = document.getElementById(`dot-${i}`);
      if (dot) dot.classList.toggle('done', i <= stepNum);
    }
  }

  document.getElementById('next-1').addEventListener('click', () => {
    clearStep1Error();
    const items = getItemsData();
    const validation = validateItems(items);
    if (!validation.ok) {
      showStep1Error(validation.message, validation.row);
      return;
    }
    goTo(2);
  });

  document.getElementById('back-2').addEventListener('click', () => goTo(1));

  document.getElementById('calc-submit').addEventListener('click', () => {
    const items = getItemsData();
    showResult(items);
    goTo('result');
  });

  document.getElementById('restart').addEventListener('click', () => {
    itemsList.innerHTML = '';
    addItem();
    state.purpose = null;
    document.querySelectorAll('#purpose-group .category-card').forEach(b => b.classList.remove('selected'));
    document.getElementById('calc-submit').disabled = true;
    clearStep1Error();
    goTo(1);
  });
}

function rbRow(label, value) {
  return `<div class="rb-row"><span>${label}</span><strong>${value}</strong></div>`;
}

function resultSection(title, ok, rowsHtml) {
  return `<div class="result-section">
    <div class="result-section-title">
      <span>${title}</span>
      <span class="status-pill ${ok ? 'ok' : 'warn'}">${ok ? 'В норме' : 'Превышение'}</span>
    </div>
    ${rowsHtml}
  </div>`;
}

function showResult(items) {
  const pb = limitsData.personal_baggage;
  const statusEl = document.getElementById('result-status');
  const valueEl = document.getElementById('result-value');
  const explainEl = document.getElementById('result-explain');
  const breakdownEl = document.getElementById('result-breakdown');
  const sourceEl = document.getElementById('result-source');
  const flagBanner = document.getElementById('commercial-flag-banner');

  const standardItems = items.filter(i => STANDARD_CATEGORIES.includes(i.category));
  const alcoholItems = items.filter(i => i.category === 'alcohol');
  const tobaccoItems = items.filter(i => i.category === 'tobacco');
  const flaggedItems = items.filter(i => i.flagged);

  const totalValueCny = standardItems.reduce((sum, i) => sum + i.priceCny, 0);
  const totalWeightKg = standardItems.reduce((sum, i) => sum + i.weightKg, 0);
  const totalLiters = alcoholItems.reduce((sum, i) => sum + i.liters, 0);
  const totalCigs = tobaccoItems.reduce((sum, i) => sum + i.cigs, 0);
  const valueEur = cnyToEur(totalValueCny);

  statusEl.textContent = 'РЕЗУЛЬТАТ';

  // Баннер про признаки коммерческой партии — показываем в любом случае, если что-то помечено
  if (flaggedItems.length > 0) {
    const names = flaggedItems.map(i => i.name || CATEGORY_LABELS[i.category].replace(/^\S+\s/, '')).join(', ');
    flagBanner.style.display = 'flex';
    flagBanner.innerHTML = `<span>⚠️</span><span><strong>Похоже на коммерческую партию:</strong> ${names} — 3 и более одинаковых предмета в заводской упаковке. ` +
      (state.purpose === 'commercial'
        ? 'Это согласуется с вашим ответом «партия на продажу».'
        : 'Если это правда для личного пользования, будьте готовы объяснить это инспектору — иначе товар могут переквалифицировать как коммерческий ввоз.') +
      `</span>`;
  } else {
    flagBanner.style.display = 'none';
    flagBanner.innerHTML = '';
  }

  // ===== Коммерческая партия =====
  if (state.purpose === 'commercial') {
    valueEl.textContent = 'Другие правила';
    valueEl.className = 'result-value warn';
    explainEl.innerHTML = `Партия товара для перепродажи не подпадает под нормы личного пользования — она оформляется как коммерческий груз, с отдельным декларированием и пошлинами. Расчёт для физлиц здесь не применим.`;
    breakdownEl.style.display = 'none';
    breakdownEl.innerHTML = '';
    sourceEl.innerHTML = 'Источник: определение коммерческой партии, ФТС России · сверено 08.07.2026 · <a href="about.html#sources" style="color:var(--river); text-decoration:underline;">как мы сверяем данные</a>';
    return;
  }

  // ===== Личное пользование =====
  const limits = pb.land_transport;
  const alcLimit = pb.alcohol.duty_free_liters;
  const tobLimit = pb.tobacco.duty_free_cigarettes;

  const overValue = valueEur > limits.duty_free_value_eur;
  const overWeight = totalWeightKg > limits.duty_free_weight_kg;
  const overStandard = overValue || overWeight;

  const overAlcohol = totalLiters > alcLimit;
  const alcoholForbidden = totalLiters > 5;
  const overTobacco = totalCigs > tobLimit;

  let dutyStandard = 0;
  if (overStandard) {
    const excessEur = Math.max(0, valueEur - limits.duty_free_value_eur);
    const excessKg = Math.max(0, totalWeightKg - limits.duty_free_weight_kg);
    const dutyByValue = excessEur * (limits.excess_duty.rate_percent / 100);
    const dutyByWeight = excessKg * limits.excess_duty.min_rate_eur_per_kg;
    dutyStandard = Math.max(dutyByValue, dutyByWeight);
  }

  // Главный результат
  if (alcoholForbidden) {
    valueEl.textContent = 'Провоз запрещён';
    valueEl.className = 'result-value warn';
  } else if (!overStandard && !overAlcohol && !overTobacco) {
    valueEl.textContent = 'Пошлина не нужна';
    valueEl.className = 'result-value ok';
  } else if (dutyStandard > 0 && !overAlcohol && !overTobacco) {
    valueEl.textContent = `≈ ${dutyStandard.toFixed(0)} €`;
    valueEl.className = 'result-value warn';
  } else if (dutyStandard > 0) {
    valueEl.textContent = `от ≈ ${dutyStandard.toFixed(0)} €`;
    valueEl.className = 'result-value warn';
  } else {
    valueEl.textContent = 'Нужна пошлина';
    valueEl.className = 'result-value warn';
  }

  // Пояснение
  const explainParts = [];
  if (!overStandard && !overAlcohol && !overTobacco) {
    explainParts.push('Всё, что вы указали, укладывается в беспошлинные нормы для личного багажа.');
  } else {
    if (overStandard) {
      explainParts.push(`Обычные товары превышают лимит ${overValue && overWeight ? 'по стоимости и весу' : (overValue ? 'по стоимости' : 'по весу')} — пошлина считается как ${limits.excess_duty.rate_percent}% от превышения стоимости либо ${limits.excess_duty.min_rate_eur_per_kg} € за кг лишнего веса, берётся большее значение.`);
    }
    if (alcoholForbidden) {
      explainParts.push('Алкоголя больше 5 л — провоз свыше этого объёма запрещён без специального разрешения, превышение может быть конфисковано.');
    } else if (overAlcohol) {
      explainParts.push('Алкоголь свыше беспошлинной нормы (3 л) провозится, но с превышения берётся пошлина — точную сумму определит инспектор.');
    }
    if (overTobacco) {
      explainParts.push('Табак свыше нормы (200 сигарет) — превышение тоже облагается пошлиной, сумму озвучит инспектор на месте.');
    }
  }
  explainEl.innerHTML = explainParts.map(p => `<p>${p}</p>`).join('');

  // Разбивка по секциям
  const sections = [];

  if (standardItems.length > 0) {
    const rows = [
      rbRow('Ваша стоимость', `≈ ${valueEur.toFixed(0)} €`),
      rbRow('Ваш вес', `${totalWeightKg.toFixed(1)} кг`),
      rbRow('Беспошлинный лимит', `${limits.duty_free_value_eur} € / ${limits.duty_free_weight_kg} кг`)
    ];
    if (overStandard) {
      const excessEur = Math.max(0, valueEur - limits.duty_free_value_eur);
      const excessKg = Math.max(0, totalWeightKg - limits.duty_free_weight_kg);
      const excessParts = [];
      if (excessEur > 0) excessParts.push(`≈ ${excessEur.toFixed(0)} €`);
      if (excessKg > 0) excessParts.push(`${excessKg.toFixed(1)} кг`);
      rows.push(rbRow('Превышение', excessParts.join(' / ')));
      rows.push(rbRow('Оценка пошлины', `≈ ${dutyStandard.toFixed(0)} €`));
    }
    sections.push(resultSection('Обычные товары', !overStandard, rows.join('')));
  }

  if (alcoholItems.length > 0) {
    const rows = [
      rbRow('Ваш объём', `${totalLiters.toFixed(1)} л`),
      rbRow('Беспошлинная норма', `до ${alcLimit} л`)
    ];
    if (overAlcohol) {
      rows.push(rbRow(alcoholForbidden ? 'Максимум с пошлиной' : 'Превышение', alcoholForbidden ? 'до 5 л' : `${(totalLiters - alcLimit).toFixed(1)} л — платно`));
    }
    sections.push(resultSection('Алкоголь', !overAlcohol, rows.join('')));
  }

  if (tobaccoItems.length > 0) {
    const rows = [
      rbRow('Ваше количество', `${totalCigs} шт`),
      rbRow('Беспошлинная норма', `до ${tobLimit} шт`)
    ];
    if (overTobacco) {
      rows.push(rbRow('Превышение', `${totalCigs - tobLimit} шт — платно`));
    }
    sections.push(resultSection('Табак', !overTobacco, rows.join('')));
  }

  if (sections.length > 0) {
    breakdownEl.style.display = 'block';
    breakdownEl.innerHTML = sections.join('');
  } else {
    breakdownEl.style.display = 'none';
    breakdownEl.innerHTML = '';
  }

  const usedCategories = [];
  if (standardItems.length > 0) usedCategories.push('наземного/водного транспорта');
  if (alcoholItems.length > 0) usedCategories.push('алкоголя');
  if (tobaccoItems.length > 0) usedCategories.push('табака');
  sourceEl.innerHTML = `Ориентировочный расчёт на основе норм ЕАЭС для ${usedCategories.join(', ')}. Точную сумму определит инспектор на посту Кани-Курган · сверено 08.07.2026 · <a href="about.html#sources" style="color:var(--river); text-decoration:underline;">как мы сверяем данные</a>`;
}

document.addEventListener('DOMContentLoaded', initCalculator);
