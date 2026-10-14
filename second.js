const STORAGE_KEY = 'excelNewsPayloadV1';

const fileInput = document.getElementById('exeshnikFile');
const newsGrid = document.getElementById('newsGrid');
const autoStatus = document.getElementById('autoStatus');

loadStoredPayload();

fileInput.addEventListener('change', async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;

  const lowerName = file.name.toLowerCase();

  if (lowerName.endsWith('.xlsx') || lowerName.endsWith('.xls')) {
    const reader = new FileReader();
    reader.onload = ({ target }) => {
      try {
        const buffer = target?.result;
        const workbook = XLSX.read(buffer, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
        const payload = { createdAt: new Date().toISOString(), rows };
        savePayload(payload);
        autoStatus.textContent = `Завантажено XLSX: ${rows.length} записів`;
        renderRows(rows);
      } catch {
        newsGrid.innerHTML = '<article class="empty-state">Не вдалося прочитати XLSX-файл.</article>';
      }
    };
    reader.readAsArrayBuffer(file);
    return;
  }

  const text = await file.text();

  try {
    const payload = JSON.parse(text);
    const rows = Array.isArray(payload?.rows) ? payload.rows : [];
    savePayload(payload);
    autoStatus.textContent = `Завантажено exeshnik: ${rows.length} записів`;
    renderRows(rows);
  } catch {
    newsGrid.innerHTML = '<article class="empty-state">Невірний файл.</article>';
  }
});

function loadStoredPayload() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;

    const payload = JSON.parse(raw);
    const rows = Array.isArray(payload?.rows) ? payload.rows : [];
    if (!rows.length) return;

    autoStatus.textContent = `Автоматично відкрито з сайту 1: ${rows.length} записів`;
    renderRows(rows);
  } catch {
    // ignore bad storage data
  }
}

function savePayload(payload) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // ignore storage errors
  }
}

function renderRows(rows) {
  newsGrid.innerHTML = '';

  if (!rows.length) {
    newsGrid.innerHTML = '<article class="empty-state">У файлі немає даних.</article>';
    return;
  }

  rows.forEach((row, index) => {
    const keys = Object.keys(row);
    const titleKey = findKey(keys, ['назва', 'title', 'імʼя', 'name']) || keys[0];
    const urlKey = findKey(keys, ['сайт', 'url', 'link', 'посилання', 'website']);

    const card = document.createElement('article');
    card.className = 'news-card';

    const title = document.createElement('h2');
    const rawTitle = String(row[titleKey] || '').trim();
    title.textContent = rawTitle && !isImageLike(titleKey, rawTitle) ? rawTitle : `Запис ${index + 1}`;
    card.appendChild(title);

    keys.forEach((key) => {
      if (key === titleKey || key === urlKey) return;
      const value = String(row[key] ?? '').trim();
      if (!value || isImageLike(key, value)) return;

      const line = document.createElement('p');
      const label = document.createElement('strong');
      label.textContent = `${key}: `;
      line.appendChild(label);
      line.append(document.createTextNode(value));
      card.appendChild(line);
    });

    if (urlKey && row[urlKey]) {
      const cleanUrl = normalizeUrl(String(row[urlKey]));
      if (cleanUrl) {
        const link = document.createElement('a');
        link.href = cleanUrl;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.textContent = cleanUrl;
        card.appendChild(link);
      }
    }

    newsGrid.appendChild(card);
  });
}

function findKey(keys, candidates) {
  const lowered = keys.map((key) => ({ original: key, lowered: key.toLowerCase() }));
  const match = lowered.find(({ lowered }) => candidates.some((candidate) => lowered.includes(candidate)));
  return match?.original;
}

function normalizeUrl(value) {
  const trimmed = value.trim();
  const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    const url = new URL(candidate);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return '';
    return url.toString();
  } catch {
    return '';
  }
}

function isImageLike(key, value) {
  const keyLower = String(key).toLowerCase();
  if (keyLower.includes('image') || keyLower.includes('img') || keyLower.includes('картин')) return true;

  const valueLower = String(value).toLowerCase();
  return /\.(png|jpe?g|gif|webp|svg)(\?.*)?$/i.test(valueLower);
}
