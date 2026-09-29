# OPENsport — гайд по визуальному языку для нового проекта

Аудитория: кодинг-агент, который переносит дизайн на новый проект (другие
экраны и элементы, тот же характер). Источник истины — `src/redesign.css`,
`src/index.css`, `tailwind.config.ts`, `src/pages/Home.tsx`,
`src/components/redesign/primitives.tsx`.

> ВАЖНО: `design/tokens.ts`, `design/README.md`, `design/components/*` и
> `design/gaps.md` описывают СТАРЫЙ дизайн (тёмно-синий navy + мятный
> `hsl(123,48%,72%)`, Inter, скругления 8–16px, градиенты, glass). Текущий
> сайт — совсем другой. **Не использовать эти файлы как эталон.**
> Значения ниже — актуальные. «Токены с неоднозначным статусом» из gaps.md
> (`glass-card`, `shadow-premium`, `bg-gradient-premium` …) — мёртвый код,
> в новом дизайне их быть не должно.

---

## 0. Суть дизайна в одном абзаце

Это **редакционный / «газетный» спорт-аналитический стиль**: тёплая
бумага (не белая), почти-чёрные «чернильные» блоки на всю ширину,
единственный глубокий зелёный акцент («pitch»), гигантские узкие
UPPERCASE-заголовки в extra-wide Archivo 800, моноширинные цифры IBM Plex
Mono как «данные», тонкие 1px-линии вместо карточек, **ноль скруглений,
ноль теней, ноль градиентов**. Ощущение — спортивный журнал × научная
статья × табло. «Сочность» создаётся не эффектами, а контрастом:
гигантский тип vs. мелкий моно-лейбл, светлая бумага vs. чёрный блок,
крупные числа, жёсткая сетка и много воздуха.

**Чего категорически не делать:** `border-radius`, `box-shadow`,
`linear-gradient`, glassmorphism/blur, неон, эмодзи-иконки, синие
ссылки, серые «карточки» с тенью, иконки в цветных кружках, hover-lift.

---

## 1. Токены

### 1.1 Цвета (hex — как в коде)

| Токен | Значение | Роль |
|---|---|---|
| `paper` | `#F3F1EC` | фон страницы, «карточек», хедера, футера |
| `paper-deep` | `#EAE7DF` | секции-подложки (audience, панели фильтров) |
| `paper-hover` | `#E4E1D9` | hover кнопок/строк-контролов |
| `paper-row-hover` | `#ECEAE3` | hover строки таблицы |
| `ink` | `#14150F` | основной текст И тёмные блоки (hero, science, CTA, хедер-dark) |
| `ink-80` | `#3A3C33` | body-текст на бумаге |
| `ink-60` | `#5C5E54` | вторичный текст, eyebrow, подписи |
| `hairline` | `#D9D6CE` | основная 1px-линия |
| `row-line` | `#E4E1D9` | линия между строками таблицы (мягче) |
| `stroke-strong` | `#C8C4BA` | рамки инпутов/моно-кнопок, порядковые цифры 01/02/03 |
| `meter-track` | `#E0DCD2` | трек прогресс-бара на бумаге |
| `pitch` | `#0E5C3A` | **единственный акцент**: primary-кнопка, активная вкладка, ссылки, прогресс |
| `pitch-hover` | `#0A4429` | hover pitch |
| `pitch-tint` | `#E4ECE3` / `#E3EBE1` | светло-зелёный фон «активной/демо» плашки |
| `pitch-tint-border` | `#C5D5C5`, `#A7BDA7`, `#BDD0BE` | рамки на tint |
| `signal` | `#A13B18` | негатив / предупреждение (кирпично-рыжий, НЕ ярко-красный) |
| `signal-tint` | bg `#F2DFD7`, text `#8F3414` | тег-предупреждение |
| `mint` (только на чёрном) | `#6FD39C` | акцент на ink-блоках: eyebrow, ссылки, прогресс, позитивный рост |
| `signal-on-ink` | `#E7A28A` | негатив на чёрном |
| `gold` | `#8A6A1F` | только №1 в рейтинге |

Цвета на чёрном (`ink`) блоке:

| Роль | Значение |
|---|---|
| заголовок/значение | `#F3F1EC` (paper) |
| body | `#C9CABF` |
| caption/лейбл | `#9A9B90` |
| разделитель-линия | `#2E302A` (иногда `#3F413A` внутри профиля) |
| рамка контрола | `#56584F` |
| «экранная» поверхность (видеокадр) | `#1D1F18` |
| hover на чёрном | `#2E302A` |

**Правило акцентов:** на бумаге акцент = `pitch #0E5C3A`, на чёрном =
`mint #6FD39C`. Никогда не смешивать. Один акцент на экран-зону.
Selection: bg `#B8D9C7`, text `#14150F`. Focus: `outline: 2px solid pitch;
outline-offset: 3px` (на dark-хедере — `currentColor`, offset 4px).

Логотип на бумаге: цветной эмблем сохраняется, белый вордмарк
перекрашивается в ink через SVG `feColorMatrix` (см. `Brand` в
`primitives.tsx`). На dark — без фильтра, `--pitch` внутри бренда
переопределён на `#6FD39C`.

Тёмной темы нет (`color-scheme: light`). «Тёмные» — это отдельные
секции-блоки внутри светлой страницы, а не тема.

### 1.2 Типографика

Два шрифта, только они:

- **Archivo** (variable, 400–900, ось `wdth`) — весь текст и заголовки.
- **IBM Plex Mono** (400, 500–700) — цифры, лейблы, метаданные, кнопки-моно,
  таблицы. Кириллица подключена.

Подключение: self-host woff2 (`public/fonts/*`), `font-display: swap`,
`unicode-range` для latin-ext/cyrillic. Никаких Google Fonts.

**Ключевой трюк заголовков:** `font-variation-settings: 'wdth' 110–125`
(растягивает Archivo вширь) + `weight 800` + `text-transform: uppercase` +
отрицательный tracking + line-height < 1.

Шкала (десктоп → мобильный):

| Роль | Размер | Вес | wdth | tracking | line-height | Регистр |
|---|---|---|---|---|---|---|
| Hero H1 | 92px → 72 (768–1250) → 58 | 800 | 125 | -0.04em | 0.88 | UPPER |
| H2 крупный (how) | 60px → 38 | 800 | 122 | -0.035em | 0.95 | UPPER |
| H2 (science) | 52px → 38 | 800 | 120 | -0.035em | 0.95 | UPPER |
| H2 (roadmap/cta/audience) | `clamp(32px,3vw,48px)` | 800 | 115 | -0.03em | 1.08 | UPPER |
| Page H1 (rank/team/player) | 52 / 44 / `clamp(40,4vw,64)` → 36 / 30 | 800 | 120–122 | -0.03em | 0.95–1 | UPPER |
| H3 шага | 28px → 22 | 700 | 110 | -0.02em | — | Sentence |
| Section heading (в приложении) | 26px → 20 | 700 | 112 → 110 | -0.02em | — | Sentence |
| Body lead | 19px → 16 | 400 | — | — | 1.55–1.7 | — |
| Body | 16–17px | 400 | — | — | 1.6–1.7 | — |
| Small | 13–15px | 400–600 | — | — | 1.5 | — |
| **Eyebrow** | Plex Mono 11px (10 в футере) | 500 | — | .12–.18em | 1.4 | UPPER |
| Mono-лейбл на кадре | Plex Mono 10px | 400 | — | .14em | — | UPPER |

Глобально: `h1..h4 { letter-spacing:-.025em; font-variation-settings:'wdth' 112 }`,
`h1 line-height:1.03`, `p line-height:1.6`, `-webkit-font-smoothing:antialiased`.

**Числа** всегда Plex Mono 500, `font-variant-numeric: tabular-nums`,
tracking -0.03…-0.055em, line-height 0.9–1.3:

| Роль | Размер |
|---|---|
| главный score | 96px (мобильный крупнее не нужно, но масштабировать до ~56) |
| stat в hero / step-score | 56px / 38–46px |
| stat в дашборде | 42 / 36 / 32 / 28px |
| число в таблице | 13–22px |
| единица (`/100`, `small`) | 14–18px, цвет ink-60 (на ink: `#9A9B90`), tracking normal |

Ru/Kk-локали: заголовки уменьшены (`[lang=ru] .title { 43–72px }`), т.к.
кириллица шире. Закладывайте `clamp()` для локализуемых H1.

### 1.3 Геометрия

- **Радиус: 0 везде** (кнопки, инпуты, теги, карточки, бейджи, аватары —
  всё квадратное). `--radius` формально 0.25rem, но реально почти не
  используется. Исключение — только круглые элементы данных (точки на
  графиках/маркеры).
- **Тени: нет.** Глубина = цвет фона + 1px линия.
- **Градиентов нет.** `bg-gradient-*` в CSS принудительно сведены к
  плоскому цвету.
- **Линии:** 1px `hairline`. Ключевой «заголовочный» разделитель —
  1px solid `ink` (под H2 секции, `thead` таблицы рейтинга).
- **Прогресс-бар:** высота **3px**, трек `#E0DCD2`, заливка `pitch`
  (на ink: трек `#2E302A`, заливка `#6FD39C`).
- **Page gutter:** `clamp(20px, 4vw, 80px)` — единственный горизонтальный
  паддинг для всех секций. На планшете 768–1250 таблицы 32px, на
  мобильном 20px.
- **Ритм вертикали:** секции `72px / 80px / 96px` сверху-снизу (48–56px
  на мобильном). Внутри блока gap 32 → 28 → 24 → 16 → 12 → 8.
- **Max width:** контент тянется на всю ширину с gutter; текст режется
  `max-width` в `ch`/px (`60ch`, `560px`, `45ch`, `34ch`, `18ch` для
  заголовков) — это даёт «журнальные» колонки.
- **Брейкпоинты:** 1350 (скрыть nav в workspace), 1250, 1199 (nav → меню),
  1000 (roadmap в 1 колонку), 900, **767 (мобильный)**, 480, 359.
- **Высоты контролов:** кнопка 46 (hero 52, CTA 56, header 44, mono 40–44,
  sm 36), инпут/поиск 40–44, иконка-кнопка 24–32, хедер 76 (64 на моб.),
  мобильный таб-бар 76 + safe-area.
- **Motion:** почти нет. `transition: background .15s` / `colors`.
  Hover ссылок на лендинге — `filter: brightness(1.15)`. Никаких
  parallax, scale, lift, spring. Уважать `prefers-reduced-motion`
  (`animation/transition-duration: .01ms`). Разрешены только тихие
  fade-in (`0.6s ease-out`, translateY 20px) при появлении секций —
  опционально.

---

## 2. Компоненты (паттерны, не привязанные к экранам)

### Кнопки
Все прямоугольные, `border-radius:0`, Archivo 600 14–16px.

- **Primary:** bg `pitch`, текст `#fff`, hover `#0A4429`, disabled opacity .45.
- **Outline:** `1px solid ink`, transparent, текст ink, hover bg `#E4E1D9`.
- **Outline-on-dark:** border `#56584F`, текст paper, hover bg `#2E302A`.
- **Mono-кнопка (утилитарная):** h40–44, border `#C8C4BA`, Plex Mono 11px,
  tracking .1em, UPPER, текст ink-80.
- **Text-link:** pitch, 600, `border-bottom:1px solid currentColor;
  padding-bottom:2px`, мин. высота 44 для тача. Стрелка `→` в тексте
  («See a player profile →»), не иконка.
- **Loading-состояния нет** — если нужно, спиннер = 2px квадратный/линейный
  индикатор в цвете текста, без округлого «сочного» лоадера.

### Eyebrow (обязательный элемент почти каждой секции)
Plex Mono 11px, UPPER, tracking .12–.18em. На бумаге цвет `ink-60`, на
чёрном `#6FD39C`. Ставится над заголовком или как caption справа от него
(`NO SENSORS · NO STUDIO · NO COACH REQUIRED`). Разделитель в тексте — `·`.

### Секционный заголовок
`flex; justify-content:space-between; align-items:flex-end;
border-bottom:1px solid ink; padding-bottom:22px` — слева гигантский
UPPER H2, справа mono-caption. Это фирменный «газетный» приём.

### Строка-список (вместо карточки)
Нет карточек. Элемент списка = блок с `border-top:1px solid hairline`,
`padding:14–28px 0`, последний получает `border-bottom`. Внутри:
mono-категория (pitch, UPPER, .12em) → название 600 17px → mono-мета
(ink-60 UPPER 12px). Hover: цвет заголовка → `pitch` или bg `#ECEAE3`.
Активная строка: bg `#E3EBE1` + `border-top-color: pitch`.

### Статус-пилюля / тег (не круглая!)
`padding:5–6px 10px; font: Plex Mono 11–12px; UPPER; tracking .1em;`
- default: border `hairline`, текст ink-60
- shipped: border `#BDD0BE`, текст pitch
- active: bg pitch, текст paper
- ok-тег: bg `#E2EAE4`, текст `#0B4A2F`
- warn-тег: bg `#F2DFD7`, текст `#8F3414`
- на чёрном: `1px solid #3F413A`, текст `#C9CABF`

### Stat-блок («табло»)
Ряд из 3–4 колонок, между ними вертикальные 1px-разделители
(`border-left:1px solid hairline`, padding 24–32 по бокам, у первой
`padding-left:0; border:0`). В колонке: mono-eyebrow → большое mono-число
(32–56px) → мелкая caption 13px. На мобильном 2×2 с горизонтальными
линиями.

### Метрика с баром (MetricList)
Строка: слева название (Archivo 600 18px), справа mono-число (32px);
ниже 3px-бар. Между метриками `border-top: hairline`. Compact-вариант (на
чёрном): одна строка `лейбл(84px, #C9CABF 13px) | бар(flex) | число(38px
right)`, gap 12, gap между строками 9.

### Таблица
`border-collapse:collapse`; `thead`: верхняя/нижняя линия 1px ink (рейтинг)
или hairline; `th` — Plex Mono 10px UPPER .14em ink-60; `td` — padding
11–14px 0, `border-top:1px solid row-line`; последняя строка
`border-bottom: hairline`; hover строки `#ECEAE3`; отступ между колонками
`padding-right:18–20px`, последняя колонка вправо. Ранг — 20px 600,
№1 золотой `#8A6A1F`; главный score — Plex Mono 22px. Фиксированные ширины
колонок (`table-layout:fixed`), на мобильном `min-width:620–980px` +
горизонтальный скролл в обёртке.

### Вкладки
Underline-табы: контейнер `border-bottom:1px solid hairline`, кнопки
`padding:0 0 12px`, 14px 500 ink-60, `gap:26–28px`, `overflow-x:auto`.
Активная: ink 600 + `border-bottom:2px solid pitch`.
**Второй вариант (audience):** сегменты широкие (`flex:0 1 180px;
padding:18px 28px; 17px 600`), активный = **сплошная заливка pitch +
текст paper**, hover `#DEDACE`; под ними панель на `paper` внутри секции
`#EAE7DF`, padding 48.

### Инпуты / фильтры
`height 40–44; padding 0 12–14; border:1px solid #C8C4BA; radius 0;
bg transparent (или paper); Archivo 14px`. Focus: border pitch + ring 1px
pitch. Панель фильтров: bg `#EAE7DF`, `1px solid hairline`, padding 24,
сетка 4 колонки + кнопка. Чекбоксы `accent-color: pitch`. Лейблы —
mono 11px UPPER .12em ink-60.

### Хедер
Sticky, высота 76 (64 моб), bg paper, `border-bottom:1px solid hairline`.
Лого слева, nav (14px 500 ink-60; активный — ink 600 +
`border-bottom:2px solid pitch; padding-bottom:4px`), справа
контролы: язык (mono 12px), аккаунт (border hairline, h44), primary
h44. Dark-вариант: bg ink, ссылки `#C9CABF`, границы `#2E302A/#56584F`.
Демо-плашка под хедером: bg `#E4ECE3`, текст pitch, бейдж mono 10px UPPER
в рамке `#A7BDA7`.

### Мобильная нижняя навигация (<768)
Fixed bottom, h76 + safe-area, bg paper, `border-top hairline`, 4–5
пунктов: иконка 19px (stroke 1.5) + подпись Plex Mono **9px** UPPER .1em;
активный — ink 600. Центральная «Upload» — **квадрат 56×56 сплошной
pitch**, иконка 22px белая, без скругления. Плавающие элементы
(back-to-top, compare-tray) поднимаются над баром (`bottom: 92px +
safe-area`).

### Иконки
Линейные (lucide-стиль), **stroke 1.3–1.5**, 13–20px, цвет ink-60 →
hover pitch. Никаких заливок, никаких иконок в цветных подложках.
Иконка-кнопка — квадрат 24–32 с `1px hairline`; pressed:
bg pitch, текст paper.

### Иллюстрации / «данные как графика»
Все иллюстрации — тонкий inline-SVG: stroke 1.5–2.2, `#C8C4BA` для
осей/каркаса, `#5C5E54` для контуров, `pitch` для «главной линии» и
маркера, dashed (`5 5`) для вспомогательных, подписи Plex Mono 10–11px.
Скелет-фигура игрока: линии pitch + узлы `#F3F1EC`, акцентный узел
`#6FD39C` (r=4.6 против 3.6). Кадр-«экран»: bg `#1D1F18`, рамка `#2E302A`,
aspect 1.3, mono-подписи в углах (10px, `#9A9B90`, акцент `#6FD39C`),
формат подписей: `IMG_5141.MP4 · CONTACT FRAME 0:42` — стилизация под
технический оверлей. Это важно: **декор = инженерные чертежи и
телеметрия, а не стоковые фото и не 3D**.

---

## 3. Композиция страниц

### 3.1 Ритм чередования фонов (главный источник «сочности»)

Страница — вертикальная стопка полноширинных блоков, фон чередуется:

```
[Header  paper, линия снизу]
[HERO    INK  ]  двухколоночный: текст 1.2fr | «экран+отчёт» 1fr
[HOW     paper]  заголовок с линией ink + нумерованные шаги 01/02/03
[SCIENCE INK  ]  0.85fr интро | 1fr список метрик с линиями #2E302A
[ROADMAP paper]  0.8fr заголовок+proof | 1.2fr список статусов
[AUDIENCE #EAE7DF] вкладки-сегменты + панель paper
[CTA     INK  ]  заголовок слева | вертикальные кнопки 280px справа
[Footer  paper, линия сверху]
```

Правило: не более двух светлых секций подряд без ink или `#EAE7DF`.
Первый экран ВСЕГДА ink (максимальный контраст + гигантский H1).
Последний перед футером — ink CTA.

### 3.2 Hero-рецепт
1. Eyebrow mint (`#6FD39C`, .18em).
2. H1 из 3 коротких строк с `<br>`, UPPER, 92px/0.88, цвет paper.
3. Lead 19px `#C9CABF`, max-width 560.
4. Два действия: primary (pitch, h52) + outline-dark (h52).
5. Ряд из 4 фактов: `border-top:1px solid #2E302A`, значение mono 38px
   paper, подпись 13px `#9A9B90` — **конкретные числа** (`600+`, `<60s`,
   `54`, `0₸`), не абстракции.
6. Справа: «экран» с телеметрией + под ним «отчёт» (рамка `#2E302A`,
   mono-лейбл `GENERATED REPORT`, score 34px `/100`, compact-метрики).

### 3.3 Шаг «01/02/03»
`flex; gap:40; align-items:center; border-bottom:1px solid hairline;
padding:16px 0 40px`: номер (Plex Mono 46px, цвет `#C8C4BA` — намеренно
блёклый, 92px ширина) | текст (max 60ch: H3 28px + p 16px ink-80) | справа
SVG-схема 220×120. На мобильном номер 28px/40px, art на всю ширину.

### 3.4 Science/спецификация на ink
Слева eyebrow + H2 + текст + mint-ссылка с подчёркиванием. Справа
строки-«спеки»: `grid 120px | 1fr`, `border-top:#2E302A`, слева
значение (mono 34px paper: `155°`) ИЛИ mono-маркер (`HIP→FOOT`), справа
заголовок 19px 600 + описание 15px `#9A9B90`. Последняя строка ещё и с
нижней линией.

### 3.5 Приложение (дашборды, рейтинг, профиль)
- Верх страницы игрока — ink-hero: имя UPPER 64px wdth 122, mono-теги с
  рамкой, гигантский score 96px, рост (`+2.4` mono, mint/`#E7A28A`),
  справа `border-left:1px solid #3F413A` блок с 4 mono-статами.
- Ниже на бумаге две колонки `1fr / 1.15fr`: метрики с барами | список
  дрилов (строки с линиями).
- История — таблица. Рейтинг — H1 UPPER + вкладки + плотная таблица +
  пагинация (квадратные mono-кнопки, активная = bg ink, текст paper).
- Sticky compare-tray снизу: bg paper, `border-top hairline`, padding
  12/56, кнопки h40.

### 3.6 Пустые/ошибочные состояния
Плоский текстовый блок: `padding:40px 20px; color:ink-60; text-align:center;
border-bottom:1px solid hairline`. Без иллюстраций-«грустных» и иконок в
кружках. Ошибка — `signal #A13B18` для текста, тег warn для статуса.

---

## 4. Тон и копирайтинг (часть дизайна)

Короткие, дерзкие, конкретные заголовки в 2–3 строки: «A scout for every
auyl», «Not a black box», «Film it today. Know by tonight.». Подписи —
как технические спецификации: `33 KEYPOINTS TRACKED · CPU ONLY`,
`UPDATED SEP 2026`. Цифры вместо прилагательных. Ссылки-CTA со стрелкой
`→`. Разделитель `·`. Без восклицательных знаков и эмодзи.

---

## 5. Пошаговый план для агента

1. **Токены.** Завести CSS-переменные / Tailwind theme строго из §1
   (цвета, шрифты, gutter). Radius = 0, shadow = none. Запретить
   произвольные hex вне таблицы §1.1 (в RN/NativeWind — вынести в
   `tokens.ts`, переписав старые значения).
2. **Шрифты.** Archivo (variable, wdth) + IBM Plex Mono, self-host.
   Для RN/Expo: `expo-font`; **variable-ось `wdth` в RN не работает** —
   взять статический Archivo Expanded/Extra-Expanded 800 (или
   `Archivo_ExtraExpanded_800ExtraBold`) для заголовков, Plex Mono
   400/500.
3. **Базовые утилиты:** `eyebrow`, `hairline` (border 1px), `mono-number`
   (tabular-nums), `section-heading` (линия ink), `ink-block` (bg ink +
   цвета текста §1.1 для dark), `meter` (3px).
4. **Примитивы:** Button (primary/outline/outline-dark/mono/link), Tag,
   Eyebrow, Stat, MetricBar, ListRow, Table, Tabs (underline + segmented),
   Input, IconButton, BottomNav, SectionHeading, DataFrame («экран с
   телеметрией»).
5. **Экраны:** собирать по §3.1 — чередование paper/ink, первый экран
   ink, гигантский UPPER H1, mono-цифры, линии вместо карточек.
6. **Иллюстрации:** только линейные SVG по §2 «Иллюстрации». Никаких
   стоковых картинок, градиентных фонов, blur.
7. **Мобильный:** заголовки ×0.6 (92→58, 60→38), gutter 20, нижний
   таб-бар с mono 9px подписями и квадратной pitch-кнопкой, таблицы —
   горизонтальный скролл, stat-сетки 2×2.
8. **Проверка (чек-лист приёмки):**
   - [ ] нигде нет скруглений, теней, градиентов, blur
   - [ ] фон страницы `#F3F1EC`, не белый; нет чисто белых карточек
   - [ ] только один акцент: pitch (бумага) / mint (ink)
   - [ ] все числа — Plex Mono с tabular-nums
   - [ ] H1/H2 — Archivo 800 UPPER, wide, отрицательный tracking
   - [ ] у каждой секции есть mono-eyebrow
   - [ ] списки — строки с 1px линиями, а не карточки
   - [ ] есть минимум один ink-блок на экран/страницу
   - [ ] иконки линейные, stroke ≤1.5
   - [ ] focus-visible виден (2px pitch, offset 3px)
   - [ ] `prefers-reduced-motion` учтён

---

## 6. Быстрый эталон CSS (скопировать как основу)

```css
:root{
  --paper:#F3F1EC; --paper-deep:#EAE7DF; --ink:#14150F;
  --ink-80:#3A3C33; --ink-60:#5C5E54;
  --hairline:#D9D6CE; --row-line:#E4E1D9; --stroke:#C8C4BA;
  --pitch:#0E5C3A; --pitch-hover:#0A4429; --mint:#6FD39C;
  --signal:#A13B18;
  --on-ink:#C9CABF; --on-ink-dim:#9A9B90; --on-ink-line:#2E302A; --on-ink-stroke:#56584F;
  --page-gutter:clamp(20px,4vw,80px);
}
body{background:var(--paper);color:var(--ink);font-family:Archivo,Arial,sans-serif;-webkit-font-smoothing:antialiased}
h1,h2,h3{font-variation-settings:'wdth' 112;letter-spacing:-.025em;margin:0}
.eyebrow{font:500 11px/1.4 'IBM Plex Mono',monospace;letter-spacing:.14em;text-transform:uppercase;color:var(--ink-60)}
.display{font-weight:800;text-transform:uppercase;font-variation-settings:'wdth' 122;letter-spacing:-.035em;line-height:.92}
.num{font-family:'IBM Plex Mono',monospace;font-variant-numeric:tabular-nums;letter-spacing:-.045em;font-weight:500}
.btn{height:46px;padding:0 24px;border:0;border-radius:0;background:var(--pitch);color:#fff;font:600 14px Archivo;transition:background .15s}
.btn:hover{background:var(--pitch-hover)}
.btn-outline{background:transparent;border:1px solid var(--ink);color:var(--ink)}
.ink-block{background:var(--ink);color:var(--paper);padding:72px var(--page-gutter)}
.ink-block .eyebrow{color:var(--mint);letter-spacing:.18em}
.meter{height:3px;background:#E0DCD2}.meter>span{display:block;height:3px;background:var(--pitch)}
.row{border-top:1px solid var(--hairline);padding:16px 0}
.row:last-child{border-bottom:1px solid var(--hairline)}
```
