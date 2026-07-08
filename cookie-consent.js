<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Калькулятор таможенной пошлины — АмурГид</title>
<meta name="description" content="Посчитайте, нужно ли платить пошлину при провозе товаров через границу Благовещенск—Хэйхэ.">
<link rel="icon" href="favicon.svg" type="image/svg+xml">

<meta property="og:type" content="website">
<meta property="og:title" content="Калькулятор таможенной пошлины — АмурГид">
<meta property="og:description" content="Три вопроса — и понятно, нужно ли платить пошлину на границе Благовещенск—Хэйхэ.">
<meta property="og:image" content="og-image.png">
<meta name="twitter:card" content="summary_large_image">

<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@700;800&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="styles.css">
</head>
<body>

<header class="site-header">
  <div class="container">
    <a class="logo" href="index.html">Амур<span class="dot">Гид</span></a>
    <nav class="main-nav">
      <a href="index.html">Главная</a>
      <a href="calculator.html" class="active">Калькулятор</a>
      <a href="guide.html">Гид по границе</a>
    </nav>
  </div>
</header>

<section class="section">
  <div class="container">
    <div class="section-head" style="text-align:center; margin: 0 auto 36px;">
      <h1 style="font-size:clamp(1.6rem,3.5vw,2.4rem);">Калькулятор пошлины</h1>
      <p>Три вопроса — и понятный ответ, без формулировок из закона.</p>
    </div>

    <div class="calc-wrap">
      <div class="calc-progress">
        <div class="dot done" id="dot-1"></div>
        <div class="dot" id="dot-2"></div>
        <div class="dot" id="dot-3"></div>
      </div>

      <!-- Step 1 -->
      <div class="calc-step active" id="step-1">
        <h3 style="margin-bottom:18px;">Что везёте?</h3>
        <div class="choice-group" id="category-group">
          <button class="choice-btn" data-value="electronics">📱 Техника</button>
          <button class="choice-btn" data-value="clothing">👕 Одежда / товары</button>
          <button class="choice-btn" data-value="food">🍬 Продукты</button>
          <button class="choice-btn" data-value="alcohol">🍷 Алкоголь</button>
          <button class="choice-btn" data-value="other">📦 Другое</button>
        </div>
        <div class="calc-nav">
          <span></span>
          <button class="btn btn-primary" id="next-1" disabled>Далее →</button>
        </div>
      </div>

      <!-- Step 2 -->
      <div class="calc-step" id="step-2">
        <h3 style="margin-bottom:18px;">Стоимость и вес</h3>

        <div id="step2-standard">
          <div class="field">
            <label for="value-input">Общая стоимость (в юанях, ¥)</label>
            <input type="number" id="value-input" placeholder="Например, 3500" min="0">
          </div>
          <div class="field">
            <label for="weight-input">Общий вес (кг)</label>
            <input type="number" id="weight-input" placeholder="Например, 12" min="0">
          </div>
        </div>

        <div id="step2-alcohol" style="display:none;">
          <div class="field">
            <label for="liters-input">Общее количество (в литрах)</label>
            <input type="number" id="liters-input" placeholder="Например, 2" min="0" step="0.1">
          </div>
        </div>

        <p id="step2-error" style="display:none; color:var(--coral); font-size:0.9rem; margin-top:-8px; margin-bottom:16px;"></p>

        <div class="calc-nav">
          <button class="btn btn-outline" id="back-2">← Назад</button>
          <button class="btn btn-primary" id="next-2">Далее →</button>
        </div>
      </div>

      <!-- Step 3 -->
      <div class="calc-step" id="step-3">
        <h3 style="margin-bottom:18px;">Это для себя или на продажу?</h3>
        <div class="choice-group" id="purpose-group">
          <button class="choice-btn" data-value="personal">🎒 Для личного пользования</button>
          <button class="choice-btn" data-value="commercial">📈 Партия на продажу</button>
        </div>
        <div class="calc-nav">
          <button class="btn btn-outline" id="back-3">← Назад</button>
          <button class="btn btn-primary" id="calc-submit" disabled>Показать результат</button>
        </div>
      </div>

      <!-- Result -->
      <div class="calc-step" id="step-result">
        <div class="result-box">
          <div class="result-status" id="result-status">РЕЗУЛЬТАТ</div>
          <div class="result-value" id="result-value">—</div>
          <div class="result-explain" id="result-explain"></div>
        </div>
        <div class="calc-nav" style="justify-content:center;">
          <button class="btn btn-outline" id="restart">Посчитать заново</button>
        </div>
      </div>
    </div>

    <div class="ad-slot" data-ads-enabled="false" style="max-width:640px; margin:32px auto 0;">Место для рекламного блока</div>
  </div>
</section>

<footer>
  <div class="container">
    <span>© 2026 АмурГид · Справочный сервис, не является таможенным брокером</span>
    <span>Данные обновлены: 08.07.2026</span>
  </div>

  <div class="container footer-links">
    <a href="about.html">О проекте</a>
    <a href="privacy.html">Политика конфиденциальности</a>
  </div>
</footer>

<script src="script.js"></script>
<script src="cookie-consent.js"></script>
</body>
</html>
