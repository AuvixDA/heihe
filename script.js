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
    group.querySelectorAll('.category-card').forEach(btn => {
      btn.addEventListener('click', () => {
        group.querySelectorAll('.category-card').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        state[key] = btn.dataset.value;
        if (onSelect) onSelect(btn.dataset.value);
      });
    });
  }

  const step2Subtitle = document.getElementById('step2-subtitle');

  selectChoice(categoryGroup, 'category', (val) => {
    document.getElementById('next-1').disabled = false;
    // Показываем нужный вариант шага 2 в зависимости от категории
    if (val === 'alcohol') {
      step2Standard.style.display = 'none';
      step2Alcohol.style.display = 'block';
      if (step2Subtitle) step2Subtitle.textContent = 'Считайте общий объём по всем бутылкам и упаковкам сразу.';
    } else {
      step2Standard.style.display = 'block';
      step2Alcohol.style.display = 'none';
      if (step2Subtitle) step2Subtitle.textContent = 'Считайте общую сумму и вес по всем покупкам сразу, а не по отдельным вещам.';
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
    document.querySelectorAll('.category-card').forEach(b => b.classList.remove('selected'));
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
  const breakdownEl = document.getElementById('result-breakdown');
  const sourceEl = document.getElementById('result-source');

  function setBreakdown(rows) {
    if (!rows || !rows.length) {
      breakdownEl.style.display = 'none';
      breakdownEl.innerHTML = '';
      return;
    }
    breakdownEl.style.display = 'block';
    breakdownEl.innerHTML = rows.map(r =>
      `<div class="rb-row"><span>${r[0]}</span><strong>${r[1]}</strong></div>`
    ).join('');
  }

  if (state.purpose === 'commercial') {
    statusEl.textContent = 'ВНИМАНИЕ';
    valueEl.textContent = 'Другие правила';
    valueEl.className = 'result-value warn';
    explainEl.innerHTML = `Партия товара для перепродажи не подпадает под нормы личного пользования — она оформляется как коммерческий груз, с отдельным декларированием и пошлинами. Расчёт для физлиц здесь не применим.`;
    setBreakdown(null);
    sourceEl.textContent = 'Источник: определение коммерческой партии, ФТС России · сверено 08.07.2026';
    return;
  }

  // Алкоголь — отдельная логика
  if (state.category === 'alcohol') {
    const limit = pb.alcohol.duty_free_liters;
    statusEl.textContent = 'РЕЗУЛЬТАТ';
    if (state.liters <= limit) {
      valueEl.textContent = 'Пошлина не нужна';
      valueEl.className = 'result-value ok';
      explainEl.innerHTML = `Указанный объём укладывается в беспошлинную норму для одного совершеннолетнего.`;
      setBreakdown([
        ['Ваш объём', `${state.liters} л`],
        ['Беспошлинная норма', `до ${limit} л`],
      ]);
    } else if (state.liters <= 5) {
      valueEl.textContent = 'Нужна пошлина';
      valueEl.className = 'result-value warn';
      explainEl.innerHTML = `Алкоголь свыше нормы провозится, но с превышения берётся пошлина. Точную сумму рассчитает инспектор на месте.`;
      setBreakdown([
        ['Ваш объём', `${state.liters} л`],
        ['Беспошлинная норма', `до ${limit} л`],
        ['Превышение', `${(state.liters - limit).toFixed(1)} л — платно`],
      ]);
    } else {
      valueEl.textContent = 'Провоз запрещён';
      valueEl.className = 'result-value warn';
      explainEl.innerHTML = `Свыше 5 л алкоголя провозить нельзя без специального разрешения — превышение может быть конфисковано.`;
      setBreakdown([
        ['Ваш объём', `${state.liters} л`],
        ['Максимум с пошлиной', 'до 5 л'],
      ]);
    }
    sourceEl.textContent = 'Источник: нормы ЕАЭС для алкоголя · сверено 08.07.2026';
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
    explainEl.innerHTML = `Стоимость и вес укладываются в беспошлинный лимит для личного багажа.`;
    setBreakdown([
      ['Ваша стоимость', `≈ ${valueEur.toFixed(0)} €`],
      ['Ваш вес', `${state.weight} кг`],
      ['Беспошлинный лимит', `до ${limits.duty_free_value_eur} € / ${limits.duty_free_weight_kg} кг`],
    ]);
    sourceEl.textContent = 'Источник: нормы ЕАЭС для наземного/водного транспорта · сверено 08.07.2026';
  } else {
    const excessEur = Math.max(0, valueEur - limits.duty_free_value_eur);
    const excessKg = Math.max(0, state.weight - limits.duty_free_weight_kg);
    const dutyByValue = excessEur * (limits.excess_duty.rate_percent / 100);
    const dutyByWeight = excessKg * limits.excess_duty.min_rate_eur_per_kg;
    const duty = Math.max(dutyByValue, dutyByWeight);

    const overWhat = overValue && overWeight ? 'по стоимости и весу' : (overValue ? 'по стоимости' : 'по весу');

    valueEl.textContent = `≈ ${duty.toFixed(0)} €`;
    valueEl.className = 'result-value warn';
    explainEl.innerHTML = `Превышен лимит ${overWhat}. Пошлина считается как ${limits.excess_duty.rate_percent}% от превышения стоимости либо ${limits.excess_duty.min_rate_eur_per_kg} € за кг лишнего веса — берётся большее значение.`;
    setBreakdown([
      ['Ваша стоимость', `≈ ${valueEur.toFixed(0)} €`],
      ['Ваш вес', `${state.weight} кг`],
      ['Беспошлинный лимит', `${limits.duty_free_value_eur} € / ${limits.duty_free_weight_kg} кг`],
      ['Превышение', `${excessEur > 0 ? '≈ ' + excessEur.toFixed(0) + ' €' : ''}${excessEur > 0 && excessKg > 0 ? ' / ' : ''}${excessKg > 0 ? excessKg.toFixed(1) + ' кг' : ''}`],
    ]);
    sourceEl.textContent = 'Ориентировочный расчёт, точную сумму определит инспектор на посту Кани-Курган · сверено 08.07.2026';
  }
}

document.addEventListener('DOMContentLoaded', initCalculator);
