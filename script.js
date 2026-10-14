const fileInput = document.getElementById('excelFile');
const exportBtn = document.getElementById('exportBtn');
const newsGrid = document.getElementById('newsGrid');

let currentRows = [];

fileInput.addEventListener('change', (event) => {
  const file = event.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();

  reader.onload = ({ target }) => {
    const buffer = target?.result;
    const workbook = XLSX.read(buffer, { type: 'array' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    currentRows = rows;
    exportBtn.disabled = !rows.length;
    renderRows(rows);
  };

  reader.readAsArrayBuffer(file);
});

exportBtn.addEventListener('click', () => {
  if (!currentRows.length) return;

  const payload = {
    createdAt: new Date().toISOString(),
    rows: currentRows,
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'news.exeshnik';
  link.click();
  URL.revokeObjectURL(link.href);
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
  const match = lowered.find(({ lowered }) =>
    candidates.some((candidate) => lowered.includes(candidate))
  );
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
