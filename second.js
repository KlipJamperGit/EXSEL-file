const fileInput = document.getElementById('exeshnikFile');
const newsGrid = document.getElementById('newsGrid');

fileInput.addEventListener('change', async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;

  const text = await file.text();

  try {
    const payload = JSON.parse(text);
    const rows = Array.isArray(payload?.rows) ? payload.rows : [];
    renderRows(rows);
  } catch {
    newsGrid.innerHTML = '<article class="empty-state">Невірний exeshnik-файл.</article>';
  }
});

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
      const link = document.createElement('a');
      const cleanUrl = normalizeUrl(String(row[urlKey]));
      link.href = cleanUrl;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = cleanUrl;
      card.appendChild(link);
    }

    newsGrid.appendChild(card);
  });
}

function findKey(keys, candidates) {
  const lowered = keys.map((key) => ({ original: key, lowered: key.toLowerCase() }));
  const match = lowered.find(({ lowered }) =>
    candidates.some((candidate) => lowered.includes(candidate))
  );
  return match?.original;
}

function normalizeUrl(value) {
  const trimmed = value.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function isImageLike(key, value) {
  const keyLower = String(key).toLowerCase();
  if (keyLower.includes('image') || keyLower.includes('img') || keyLower.includes('картин')) return true;

  const valueLower = String(value).toLowerCase();
  return /\.(png|jpe?g|gif|webp|svg)(\?.*)?$/i.test(valueLower);
}
