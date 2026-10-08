# КБЖВ v91 — окремий тестовий сайт 8321

Цей архів підготовлений на основі наданого користувачем `kbjv_v91_full_package.zip`.
Змінені лише налаштування нового середовища. Дизайн, HTML-структура, CSS,
іконки, функції сайту, синхронізація й авторизація v91 залишені без змін.

## Призначення

- GitHub-репозиторій: `AnthonyBatyk/kbjv-released-program-version-8321`
- Адреса GitHub Pages: `https://anthonybatyk.github.io/kbjv-released-program-version-8321/`
- Cloudflare Worker: `kbjv-auth-api-dev`
- API Worker: `https://kbjv-auth-api-dev.anthonybatyk.workers.dev`
- D1: `kbjv-auth-dev` (НОВА, порожня база)
- Binding D1: `DB`
- Runtime variable `ALLOWED_ORIGIN`: `https://anthonybatyk.github.io` (без шляху)

## Розгортання — лише тестове середовище

1. Збережіть окремі резервні копії поточного тестового репозиторію та Worker,
   якщо в них уже є цінні дані. **Не змінюйте** старі `kbjv-auth-api` та `kbjv-auth`.
2. У Cloudflare відкрийте ТІЛЬКИ Worker `kbjv-auth-api-dev` → **Edit code**,
   замініть шаблонний / раніше вставлений код повним вмістом
   `kbjv_worker_v91.js` із цього комплекту → **Deploy**.
3. Перевірте, що цей Worker має binding **`DB` → `kbjv-auth-dev`**.
   У Settings → Variables and secrets потрібні:
   `ALLOWED_ORIGIN`, `ADMIN_ACCESS_CODE` (secret), `OWNER_USERNAME`,
   `OWNER_RECOVERY_PASSWORD` (secret); `OWNER_TELEGRAM`, `OWNER_PHONE` — за бажанням.
   **Не публікуйте значення секретів.** Контакти можуть повертатися публічним API.
4. Для GitHub Pages скопіюйте **вміст папки `site/`** (не папку `site`)
   до кореня НОВОГО репозиторію `kbjv-released-program-version-8321`.
   GitHub Pages: Deploy from a branch → `main` → `/ (root)`.
   Для зручності окремо є ZIP, у якому файли сайту вже розташовані в корені.
5. Перевірте API `https://kbjv-auth-api-dev.anthonybatyk.workers.dev/health`:
   відповідь JSON має містити `version: 91` і `service: kbjv-auth-api-dev`.
   `GET /health` сам по собі **не створює** таблиці D1: схема створюється
   за першого запиту до API, що викликає `ensureSchema`.
6. Відкрийте тестовий сайт і зареєструйте окремий тестовий акаунт із
   логіном, що збігається з `OWNER_USERNAME`. Стандартна форма реєстрації
   **не запитує** `ADMIN_ACCESS_CODE`. Після першої реєстрації акаунт може
   мати роль `member`; вийдіть з акаунта і повторно увійдіть — Worker
   призначає роль `admin` цьому власнику під час успішного входу.
   Перевірте CRUD продуктів, калькулятор, архів, експорт/імпорт,
   синхронізацію між пристроями та PWA.

## Що саме адаптовано

- `site/script.js`: змінено адресу API на тестовий Worker;
  додано унікальний префікс `kbjv_8321_` для локальних і сесійних ключів,
  зокрема користувацьких і службових ключів, щоби не читати локальні дані
  старого сайту зі спільного origin GitHub Pages.
- `site/script.js`: окреме сховище IndexedDB `kbjv-8321-audit-queue`;
  не змінено формат JSON експорту `kbjv-full-backup-v2`.
- `site/manifest.webmanifest`: `id`, `start_url`, `scope` вказують лише на репозиторій `kbjv-released-program-version-8321`.
- `site/sw.js`: незалежний кеш `kbjv8321-pwa-v91`, який очищує лише
  попередні кеші цього тестового проєкту та НЕ видаляє кеш основного КБЖВ. Назва кешу також не збігається
  з маскою `kbjv-pwa-*`, яку очищує старий Worker сайту (service worker).
- `site/index.html`: змінено тільки параметр версії JS на `?v=91-8321`,
  щоб уникнути використання старого кешованого script.js.
- `kbjv_worker_v91.js`: змінено лише ідентифікатор сервісу в `/health`
  на `kbjv-auth-api-dev`. Основна логіка Worker v91 без змін.

## Важливо про ізоляцію

Обидва GitHub Pages знаходяться на одному браузерному origin
`https://anthonybatyk.github.io`. Розділення ключів localStorage,
sessionStorage, IndexedDB та Cache Storage запобігає **випадковим колізіям**,
але НЕ створює повної ізоляції безпеки: JavaScript із будь-якого шляху
цього домену технічно може прочитати дані іншого шляху.
Для суворої ізоляції браузерних даних потрібні різні домени / субдомени.
CORS `ALLOWED_ORIGIN` також спільний для обох шляхів на github.io.
Реальну Cloudflare D1 та Safari/iOS PWA потрібно протестувати після публікації;
локальна перевірка не є підтвердженням їхньої роботи.

## Вміст пакета

- `site/`: готові статичні файли нового GitHub Pages.
- `kbjv_worker_v91.js`: готовий код тільки для Worker `kbjv-auth-api-dev`.
- `tests/regression_v91.mjs`: оригінальні тести v91 (без змін).
- `README_v91.md`: інструкції для тестового середовища.
