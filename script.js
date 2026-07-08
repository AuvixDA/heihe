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
    // Фолбэк, если API ЦБ недоступен — курс из data/limits.json (fallback_cny_to_eur)
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
const state = { category: null, value: null, weight: null, liters: null, tobaccoQty: null, purpose: null };
let limitsData = null;

async function loadLimits() {
  try {
    const res = await fetch('data/limits.json');
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

function initCalculator() {
  const categoryGroup = document.getElementById('category-group');
  const purposeGroup = document.getElementById('purpose-group');
  if (!categoryGroup) return; // не на странице калькулятора

  const step2Standard = document.getElementById('step2-standard');
  const step2Alcohol = document.getElementById('step2-alcohol');
  const errorEl2 = document.getElementById('step2-error');

  function selectChoice(group, key, onSelect) {
    group.querySelectorAll('.choice-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        group.querySelectorAll('.choice-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        state[key] = btn.dataset.value;
        if (onSelect) onSelect(btn.dataset.value);
      });
    });
  }

  selectChoice(categoryGroup, 'category', (val) => {
    document.getElementById('next-1').disabled = false;
    // Показываем нужный вариант шага 2 в зависимости от категории
    if (val === 'alcohol') {
      step2Standard.style.display = 'none';
      step2Alcohol.style.display = 'block';
    } else {
      step2Standard.style.display = 'block';
      step2Alcohol.style.display = 'none';
    }
  });

  selectChoice(purposeGroup, 'purpose', () => {
    document.getElementById('calc-submit').disabled = false;
  });

  function goTo(stepNum) {
    document.querySelectorAll('.calc-step').forEach(s => s.classList.remove('active'));
    document.getElementById(`step-${stepNum}`).classList.add('active');
    for (let i = 1; i <= 3; i++) {
      const dot = document.getElementById(`dot-${i}`);
      if (dot) dot.classList.toggle('done', i <= stepNum);
    }
  }

  function showError(msg) {
    if (errorEl2) { errorEl2.textContent = msg; errorEl2.style.display = 'block'; }
  }
  function clearError() {
    if (errorEl2) { errorEl2.style.display = 'none'; }
  }

  document.getElementById('next-1').addEventListener('click', () => { clearError(); goTo(2); });
  document.getElementById('back-2').addEventListener('click', () => { clearError(); goTo(1); });

  document.getElementById('next-2').addEventListener('click', () => {
    clearError();
    if (state.category === 'alcohol') {
      const liters = parseFloat(document.getElementById('liters-input').value);
      if (isNaN(liters) || liters <= 0) { showError('Укажите количество литров больше нуля'); return; }
      state.liters = liters;
    } else {
      const value = parseFloat(document.getElementById('value-input').value);
      const weight = parseFloat(document.getElementById('weight-input').value);
      if (isNaN(value) || value < 0 || isNaN(weight) || weight < 0) {
        showError('Заполните оба поля числами от 0 и больше');
        return;
      }
      if (value === 0 && weight === 0) {
        showError('Укажите хотя бы примерную стоимость или вес');
        return;
      }
      state.value = value;
      state.weight = weight;
    }
    goTo(3);
  });

  document.getElementById('back-3').addEventListener('click', () => goTo(2));

  document.getElementById('calc-submit').addEventListener('click', () => {
    showResult();
    goTo('result');
  });

  document.getElementById('restart').addEventListener('click', () => {
    state.category = state.value = state.weight = state.liters = state.purpose = null;
    document.querySelectorAll('.choice-btn').forEach(b => b.classList.remove('selected'));
    document.getElementById('value-input').value = '';
    document.getElementById('weight-input').value = '';
    document.getElementById('liters-input').value = '';
    document.getElementById('next-1').disabled = true;
    document.getElementById('calc-submit').disabled = true;
    step2Standard.style.display = 'block';
    step2Alcohol.style.display = 'none';
    clearError();
    goTo(1);
  });
}

function showResult() {
  const pb = limitsData.personal_baggage;
  const statusEl = document.getElementById('result-status');
  const valueEl = document.getElementById('result-value');
  const explainEl = document.getElementById('result-explain');

  if (state.purpose === 'commercial') {
    statusEl.textContent = 'ВНИМАНИЕ';
    valueEl.textContent = 'Другие правила';
    valueEl.className = 'result-value warn';
    explainEl.innerHTML = `Партия товара для перепродажи не подпадает под нормы личного пользования — она оформляется как коммерческий груз, с отдельным декларированием и пошлинами. Расчёт для физлиц здесь не применим.
      <span class="source">Источник: определение коммерческой партии, ФТС России · сверено 08.07.2026</span>`;
    return;
  }

  // Алкоголь — отдельная логика
  if (state.category === 'alcohol') {
    const limit = pb.alcohol.duty_free_liters;
    statusEl.textContent = 'РЕЗУЛЬТАТ';
    if (state.liters <= limit) {
      valueEl.textContent = 'Пошлина не нужна';
      valueEl.className = 'result-value ok';
      explainEl.innerHTML = `${state.liters} л укладывается в беспошлинную норму — до ${limit} л на совершеннолетнего.
        <span class="source">Источник: нормы ЕАЭС для алкоголя · сверено 08.07.2026</span>`;
    } else if (state.liters <= 5) {
      valueEl.textContent = 'Нужна пошлина';
      valueEl.className = 'result-value warn';
      explainEl.innerHTML = `От ${limit} до 5 л алкоголь провозится, но облагается пошлиной на превышение. Точную сумму рассчитает инспектор на месте.
        <span class="source">Источник: нормы ЕАЭС для алкоголя · сверено 08.07.2026</span>`;
    } else {
      valueEl.textContent = 'Провоз запрещён';
      valueEl.className = 'result-value warn';
      explainEl.innerHTML = `Свыше 5 л алкоголя провозить нельзя без специального разрешения — превышение может быть конфисковано.
        <span class="source">Источник: нормы ЕАЭС для алкоголя · сверено 08.07.2026</span>`;
    }
    return;
  }

  // Стандартная логика: стоимость + вес
  const limits = pb.land_transport;
  const valueEur = cnyToEur(state.value);
  const overValue = valueEur > limits.duty_free_value_eur;
  const overWeight = state.weight > limits.duty_free_weight_kg;

  statusEl.textContent = 'РЕЗУЛЬТАТ';

  if (!overValue && !overWeight) {
    valueEl.textContent = 'Пошлина не нужна';
    valueEl.className = 'result-value ok';
    explainEl.innerHTML = `Стоимость (~${valueEur.toFixed(0)} €) и вес (${state.weight} кг) укладываются в лимит ${limits.duty_free_value_eur} € / ${limits.duty_free_weight_kg} кг для личного багажа.
      <span class="source">Источник: нормы ЕАЭС для наземного/водного транспорта · сверено 08.07.2026</span>`;
  } else {
    const excessEur = Math.max(0, valueEur - limits.duty_free_value_eur);
    const excessKg = Math.max(0, state.weight - limits.duty_free_weight_kg);
    const dutyByValue = excessEur * (limits.excess_duty.rate_percent / 100);
    const dutyByWeight = excessKg * limits.excess_duty.min_rate_eur_per_kg;
    const duty = Math.max(dutyByValue, dutyByWeight);

    valueEl.textContent = `≈ ${duty.toFixed(0)} €`;
    valueEl.className = 'result-value warn';
    explainEl.innerHTML = `Превышен ${overValue ? 'лимит по стоимости' : ''}${overValue && overWeight ? ' и ' : ''}${overWeight ? 'лимит по весу' : ''} (норма: ${limits.duty_free_value_eur} € / ${limits.duty_free_weight_kg} кг). Пошлина считается как ${limits.excess_duty.rate_percent}% от превышения стоимости либо ${limits.excess_duty.min_rate_eur_per_kg} € за кг лишнего веса — берётся большее значение.
      <span class="source">Ориентировочный расчёт. Точную сумму определит инспектор на посту Кани-Курган · сверено 08.07.2026</span>`;
  }
}

document.addEventListener('DOMContentLoaded', initCalculator);
