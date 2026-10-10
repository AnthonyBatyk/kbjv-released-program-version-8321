/* v96. Інструменти локальні; до чинного журналу передаються лише назви дій, без паролів та ваг. */
(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const passwordLength = $("utility-password-length");
  if (!passwordLength) return;

  const flags = [
    {node: $("utility-chars-lower"), chars: "abcdefghijklmnopqrstuvwxyz"},
    {node: $("utility-chars-upper"), chars: "ABCDEFGHIJKLMNOPQRSTUVWXYZ"},
    {node: $("utility-chars-digits"), chars: "0123456789"},
    {node: $("utility-chars-special"), chars: "!@#$%^&*()-_=+[]{};:,.?/"}
  ];
  const generateButton = $("utility-password-generate");
  const output = $("utility-password-result");
  const copyButton = $("utility-password-copy");
  const strengthFill = $("utility-strength-fill");
  const strengthLabel = $("utility-strength-label");
  const message = $("utility-password-message");
  const bodyWeight = $("utility-bodyweight");
  const liftWeight = $("utility-liftweight");
  const ratioResult = $("utility-ratio-result");
  const ratioNote = $("utility-ratio-note");
  const ratioCopy = $("utility-ratio-copy");
  const direction = $("utility-convert-direction");
  const convertInput = $("utility-convert-input");
  const convertResult = $("utility-convert-result");
  const convertNote = $("utility-convert-note");
  const convertCopy = $("utility-convert-copy");
  const clockDisplay = $("utility-clock-time");
  const clockDate = $("utility-clock-date");
  const clockZone = $("utility-clock-zone");
  const clockNote = $("utility-clock-note");
  let clockTimer = null;
  let clockActive = false;
  function record(type, details = {}) {
    // Надсилаємо лише визначену подію; пароль, довжина, символи та ваги тут відсутні.
    window.dispatchEvent(new CustomEvent("utilities:action", { detail: {type, ...details} }));
  }
  // Як і в інших кнопок сайту: успіх (зелений), помилка (червоний),
  // автоматичне повернення стандартного тексту через 1450 мс.
  function showUtilityButtonState(button, label, status) {
    if (!button) return;
    if (!button.dataset.utilityDefaultLabel) button.dataset.utilityDefaultLabel = button.textContent.trim();
    clearTimeout(button._utilityStateTimeout);
    clearTimeout(button._utilityStateLeaveTimeout);
    button.classList.remove("button-status-success", "button-status-error", "button-status-entering", "button-status-leaving");
    button.textContent = label;
    void button.offsetWidth;
    button.classList.add(`button-status-${status}`, "button-status-entering");
    button._utilityStateTimeout = setTimeout(() => {
      button.classList.remove("button-status-entering");
      button.classList.add("button-status-leaving");
      button._utilityStateLeaveTimeout = setTimeout(() => {
        button.textContent = button.dataset.utilityDefaultLabel;
        button.classList.remove("button-status-success", "button-status-error", "button-status-entering", "button-status-leaving");
      }, 250);
    }, 1200);
  }
  function clearUtilityButtonState(button) {
    if (!button) return;
    clearTimeout(button._utilityStateTimeout);
    clearTimeout(button._utilityStateLeaveTimeout);
    button.classList.remove("button-status-success", "button-status-error", "button-status-entering", "button-status-leaving");
    button.textContent = button.dataset.utilityDefaultLabel || button.textContent;
  }

  function setMessage(value = "", error = false) {
    message.textContent = value;
    message.dataset.error = String(error);
  }

  function clearGenerated() {
    output.value = "";
    copyButton.disabled = true;
    clearUtilityButtonState(copyButton);
    strengthFill.style.width = "0";
    strengthFill.removeAttribute("data-grade");
    strengthLabel.textContent = "Надійність: ще не розраховано";
    setMessage();
  }

  // Рівномірний вибір без модульного зміщення; Math.random() не використовується.
  function secureIndex(maxExclusive) {
    const bound = 4294967296;
    const cutoff = bound - (bound % maxExclusive);
    const random = new Uint32Array(1);
    do {
      crypto.getRandomValues(random);
    } while (random[0] >= cutoff);
    return random[0] % maxExclusive;
  }

  function generatePassword() {
    clearGenerated();
    clearUtilityButtonState(generateButton);
    const count = Number(passwordLength.value);
    if (!Number.isInteger(count) || count < 1 || count > 128) {
      setMessage("Вкажіть цілу довжину пароля від 1 до 128 символів.", true);
      showUtilityButtonState(generateButton, "Не згенеровано", "error");
      record("password_generation_failed");
      return;
    }
    const groups = flags.filter(option => option.node.checked).map(option => option.chars);
    if (!groups.length) {
      setMessage("Виберіть хоча б один тип символів.", true);
      showUtilityButtonState(generateButton, "Не згенеровано", "error");
      record("password_generation_failed");
      return;
    }
    if (count < groups.length) {
      setMessage(`Довжина повинна бути не меншою за ${groups.length}: по одному символу кожного вибраного типу.`, true);
      showUtilityButtonState(generateButton, "Не згенеровано", "error");
      record("password_generation_failed");
      return;
    }
    if (!globalThis.crypto || typeof crypto.getRandomValues !== "function") {
      setMessage("Захищений генератор випадкових чисел недоступний у цьому браузері.", true);
      showUtilityButtonState(generateButton, "Не згенеровано", "error");
      record("password_generation_failed");
      return;
    }

    try {
      const all = groups.join("");
      // Включаємо щонайменше один символ із кожної увімкненої групи.
      const result = groups.map(group => group[secureIndex(group.length)]);
      while (result.length < count) result.push(all[secureIndex(all.length)]);
      // Криптографічно рівномірне перемішування Фішера — Єйтса.
      for (let i = result.length - 1; i > 0; i--) {
        const j = secureIndex(i + 1);
        [result[i], result[j]] = [result[j], result[i]];
      }
      output.value = result.join("");
      copyButton.disabled = false;

      const approxBits = count * Math.log2(all.length);
      const grade = approxBits < 40 ? "weak" : approxBits < 60 ? "fair" : approxBits < 80 ? "good" : "strong";
      const captions = {weak: "Низька", fair: "Помірна", good: "Висока", strong: "Дуже висока"};
      const widths = {weak: 24, fair: 50, good: 75, strong: 100};
      strengthFill.dataset.grade = grade;
      strengthFill.style.width = `${widths[grade]}%`;
      strengthLabel.textContent = `Орієнтовна надійність: ${captions[grade]} (≈ ${approxBits.toFixed(1).replace(".", ",")} біт)`;
      setMessage("Оцінка враховує лише довжину та набір символів, а не перевірку витоків.");
      showUtilityButtonState(generateButton, "Згенеровано", "success");
      record("password_generated");
    } catch (_) {
      clearGenerated();
      setMessage("Не вдалося створити пароль. Спробуйте ще раз.", true);
      showUtilityButtonState(generateButton, "Не згенеровано", "error");
      record("password_generation_failed");
    }
  }

  // У всіх розрахунках використовуємо десяткові раціональні числа BigInt,
  // щоб уникати похибок двійкових дробів (0.1, 0.45359237 тощо).
  function decimalValue(raw) {
    const value = String(raw).trim().replace(/\s/g, "").replace(",", ".");
    if (!/^\d{1,12}(?:\.\d{1,9})?$/.test(value)) return null;
    const [whole, fraction = ""] = value.split(".");
    return {
      numerator: BigInt(whole + fraction),
      denominator: 10n ** BigInt(fraction.length)
    };
  }

  // Десяткове округлення half-up. Без небезпечного перетворення BigInt у Number.
  function renderFraction(num, den, places = 10) {
    const scale = 10n ** BigInt(places);
    const rounded = (num * scale * 2n + den) / (2n * den);
    const integer = rounded / scale;
    const frac = (rounded % scale).toString().padStart(places, "0").replace(/0+$/, "");
    return integer.toLocaleString("uk-UA") + (frac ? "," + frac : "");
  }

  function updateRatio() {
    const first = bodyWeight.value.trim();
    const second = liftWeight.value.trim();
    if (!first || !second) {
      ratioResult.textContent = "—";
      ratioNote.textContent = "Вкажіть обидві ваги";
      ratioCopy.disabled = true;
      clearUtilityButtonState(ratioCopy);
      return;
    }
    const body = decimalValue(first);
    const lifted = decimalValue(second);
    if (!body || !lifted || body.numerator <= 0n || lifted.numerator <= 0n) {
      ratioResult.textContent = "—";
      ratioNote.textContent = "Введіть додатні числа (кома або крапка допустимі)";
      ratioCopy.disabled = true;
      clearUtilityButtonState(ratioCopy);
      return;
    }
    ratioResult.textContent = renderFraction(lifted.numerator * body.denominator, body.numerator * lifted.denominator, 10) + "×";
    ratioNote.textContent = "Піднята вага ÷ власна вага; округлено до 10 знаків";
    ratioCopy.disabled = false;
  }

  function updateConversion() {
    const raw = convertInput.value.trim();
    if (!raw) {
      convertResult.textContent = "—";
      convertNote.textContent = "Введіть значення для конвертації";
      convertCopy.disabled = true;
      clearUtilityButtonState(convertCopy);
      return;
    }
    const value = decimalValue(raw);
    if (!value) {
      convertResult.textContent = "—";
      convertNote.textContent = "Введіть число від 0 (до 9 цифр після коми)";
      convertCopy.disabled = true;
      clearUtilityButtonState(convertCopy);
      return;
    }
    const lbToKg = direction.value === "lb-kg";
    // lb = 0.45359237 kg визначено точно, зворотне перетворення — частка.
    const numerator = lbToKg ? value.numerator * 45359237n : value.numerator * 100000000n;
    const denominator = lbToKg ? value.denominator * 100000000n : value.denominator * 45359237n;
    convertResult.textContent = renderFraction(numerator, denominator, 8) + (lbToKg ? " кг" : " lbs");
    convertNote.textContent = "Округлено до 8 знаків після коми";
    convertCopy.disabled = false;
  }

  generateButton.addEventListener("click", generatePassword);
  const resetPasswordPreview = () => { clearGenerated(); clearUtilityButtonState(generateButton); };
  passwordLength.addEventListener("input", resetPasswordPreview);
  passwordLength.addEventListener("change", () => record("password_settings_changed"));
  flags.forEach(flag => flag.node.addEventListener("change", () => {
    resetPasswordPreview();
    record("password_settings_changed");
  }));
  // Копіювання ініціюється виключно натисканням користувача.
  async function copyToClipboard(value) {
    let temporary = null;
    let copied = false;
    try {
      if (navigator.clipboard?.writeText) {
        try { await navigator.clipboard.writeText(value); copied = true; }
        catch (_) { /* У Safari спробуємо резервне копіювання. */ }
      }
      if (!copied) {
        temporary = document.createElement("textarea");
        temporary.value = value;
        temporary.setAttribute("readonly", "");
        temporary.style.cssText = "position:fixed;left:-10000px;top:0;opacity:0";
        document.body.append(temporary);
        temporary.select();
        copied = document.execCommand("copy") === true;
      }
    } catch (_) {
      copied = false;
    } finally {
      temporary?.remove();
    }
    return copied;
  }
  copyButton.addEventListener("click", async () => {
    if (!output.value) return;
    const copied = await copyToClipboard(output.value);
    showUtilityButtonState(copyButton, copied ? "Скопійовано" : "Не скопійовано", copied ? "success" : "error");
    setMessage(copied ? "Пароль скопійовано до буфера обміну." : "Копіювання недоступне. Виділіть пароль вручну.", !copied);
    record(copied ? "password_copied" : "password_copy_failed");
  });

  // Розрахунки оновлюються миттєво, але журналюємо ТІЛЬКИ
  // успішне копіювання результату — без введених користувачем ваг.
  bodyWeight.addEventListener("input", updateRatio);
  liftWeight.addEventListener("input", updateRatio);
  convertInput.addEventListener("input", updateConversion);
  direction.addEventListener("change", updateConversion);

  ratioCopy.addEventListener("click", async () => {
    if (ratioCopy.disabled) return;
    const value = ratioResult.textContent.replace(/×$/, "");
    const copied = await copyToClipboard(value);
    showUtilityButtonState(ratioCopy, copied ? "Скопійовано" : "Не скопійовано", copied ? "success" : "error");
    record(copied ? "ratio_copied" : "ratio_copy_failed", copied ? {value} : {});
  });
  convertCopy.addEventListener("click", async () => {
    if (convertCopy.disabled) return;
    const value = convertResult.textContent.replace(/(?: кг| lbs)$/, "");
    const unit = direction.value === "lb-kg" ? "кг" : "lbs";
    const copied = await copyToClipboard(value);
    showUtilityButtonState(convertCopy, copied ? "Скопійовано" : "Не скопійовано", copied ? "success" : "error");
    record(copied ? "conversion_copied" : "conversion_copy_failed", copied ? {value,unit} : {});
  });

  // Час визначається тільки локальним годинником; Intl коректно враховує
  // літній/зимовий час і дату в обраному IANA часовому поясі.
  function clockFormat(zone, options) {
    return new Intl.DateTimeFormat("uk-UA", { ...options, ...(zone === "local" ? {} : { timeZone: zone }) });
  }
  function drawClock() {
    if (!clockDisplay || !clockDate) return;
    try {
      const now = new Date();
      const zone = clockZone?.value || "local";
      const parts = clockFormat(zone, {hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23"}).formatToParts(now);
      const get = key => parts.find(part => part.type === key)?.value || "00";
      clockDisplay.textContent = `${get("hour")}:${get("minute")}:${get("second")}`;
      clockDate.textContent = clockFormat(zone, {day: "2-digit", month: "long", year: "numeric"}).format(now);
      clockDisplay.dateTime = now.toISOString();
      clockNote.textContent = zone === "local"
        ? "Місцевий час за налаштуваннями пристрою."
        : `Часовий пояс: ${clockZone.selectedOptions[0]?.textContent || zone}.`;
    } catch (_) {
      clockDisplay.textContent = "--:--:--";
      clockDate.textContent = "Час недоступний";
      clockNote.textContent = "Цей часовий пояс не підтримується вашим браузером.";
    }
  }
  function scheduleClock() {
    clearTimeout(clockTimer);
    if (!clockActive) return;
    drawClock();
    // Перерахунок на межі наступної секунди, а не накопичення похибок setInterval.
    clockTimer = setTimeout(scheduleClock, 1000 - (Date.now() % 1000) + 12);
  }
  function stopClock() { clockActive = false; clearTimeout(clockTimer); clockTimer = null; }
  function startClock() { clockActive = true; scheduleClock(); }
  clockZone?.addEventListener("change", () => {
    drawClock();
    record("timezone_changed", {zone: clockZone.selectedOptions[0]?.textContent?.trim() || "Часовий пояс пристрою"});
  });
  document.addEventListener("visibilitychange", () => { if (clockActive && !document.hidden) scheduleClock(); });
  // Повний список IANA зон, якщо браузер підтримує цей стандарт (без збереження).
  try {
    const others = $("utility-clock-other-zones");
    const builtIn = new Set(Array.from(clockZone.options, option => option.value));
    for (const zone of (Intl.supportedValuesOf?.("timeZone") || [])) {
      if (builtIn.has(zone)) continue;
      others.appendChild(new Option(zone.replaceAll("_", " "), zone));
    }
    if (!others?.children.length) others?.remove();
  } catch (_) { /* У старіших браузерах доступні вибрані основні часові пояси. */ }
  window.addEventListener("utilities:open", startClock);

  function resetUtilities() {
    // У журналі немає історії розрахунків, лише успішне копіювання.
    stopClock();
    if (clockZone) clockZone.value = "local";
    drawClock();
    clearUtilityButtonState(generateButton);
    clearUtilityButtonState(ratioCopy);
    clearUtilityButtonState(convertCopy);
    passwordLength.value = "16";
    flags.forEach(flag => { flag.node.checked = true; });
    clearGenerated();
    bodyWeight.value = "";
    liftWeight.value = "";
    convertInput.value = "";
    direction.value = "lb-kg";
    updateRatio();
    updateConversion();
  }
  // Повернення назад, повторне відкриття та bfcache не відновлюють введені дані.
  window.addEventListener("utilities:reset", resetUtilities);
  window.addEventListener("pageshow", event => { if (event.persisted) resetUtilities(); });
})();
