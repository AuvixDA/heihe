// ===== Баннер о cookie =====
(function () {
  var STORAGE_KEY = 'amurgid_cookie_consent';

  function hasConsent() {
    try {
      return localStorage.getItem(STORAGE_KEY) === 'accepted';
    } catch (e) {
      return false;
    }
  }

  function setConsent() {
    try {
      localStorage.setItem(STORAGE_KEY, 'accepted');
    } catch (e) {
      // localStorage недоступен (приватный режим и т.п.) — просто скроем баннер на эту сессию
    }
  }

  function showBanner() {
    var banner = document.createElement('div');
    banner.className = 'cookie-banner';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-label', 'Уведомление об использовании cookie');

    banner.innerHTML =
      '<div class="cookie-banner-inner">' +
        '<p>Мы используем файлы cookie для работы сайта и аналитики. ' +
        'Продолжая пользоваться сайтом, вы соглашаетесь с ' +
        '<a href="privacy.html">политикой конфиденциальности</a>.</p>' +
        '<button type="button" class="btn btn-primary cookie-banner-btn" id="cookie-accept-btn">Понятно</button>' +
      '</div>';

    document.body.appendChild(banner);

    document.getElementById('cookie-accept-btn').addEventListener('click', function () {
      setConsent();
      banner.remove();
    });
  }

  function init() {
    if (!hasConsent()) {
      showBanner();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
