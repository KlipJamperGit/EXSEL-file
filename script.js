const STORAGE_KEY = 'excelNewsPayloadV1';

const fileInput = document.getElementById('excelFile');
const exportBtn = document.getElementById('exportBtn');
const openSecondBtn = document.getElementById('openSecondBtn');
const newsGrid = document.getElementById('newsGrid');
const fileName = document.getElementById('fileName');
const fileSize = document.getElementById('fileSize');
const fileStatus = document.getElementById('fileStatus');

let currentRows = [];
let currentPayload = null;

fileInput.addEventListener('change', (event) => {
  const file = event.target.files?.[0];
  if (!file) return;

  fileName.textContent = file.name;
  fileSize.textContent = formatFileSize(file.size);
  fileStatus.textContent = 'Обробка...';

  const reader = new FileReader();

  reader.onload = ({ target }) => {
    try {
      const buffer = target?.result;
      const workbook = XLSX.read(buffer, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

      currentRows = rows;
      currentPayload = {
        createdAt: new Date().toISOString(),
        sourceFile: {
          name: file.name,
          size: file.size,
          lastModified: file.lastModified,
        },
        rows,
      };

      exportBtn.disabled = !rows.length;
      openSecondBtn.disabled = !rows.length;
      fileStatus.textContent = rows.length ? `Готово: ${rows.length} записів` : 'Файл порожній';
      savePayload(currentPayload);
      renderRows(rows);
    } catch {
      currentRows = [];
      currentPayload = null;
      exportBtn.disabled = true;
      openSecondBtn.disabled = true;
      fileStatus.textContent = 'Помилка читання XLSX';
      newsGrid.innerHTML = '<article class="empty-state">Не вдалося прочитати XLSX-файл.</article>';
    }
  };

  reader.readAsArrayBuffer(file);
});

openSecondBtn.addEventListener('click', () => {
  if (!currentRows.length) return;
  window.location.href = './second.html';
});

exportBtn.addEventListener('click', () => {
  if (!currentPayload?.rows?.length) return;

  const blob = new Blob([JSON.stringify(currentPayload, null, 2)], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'news.exeshnik';
  link.click();
  URL.revokeObjectURL(link.href);
});

function savePayload(payload) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // ignore storage errors
  }
}

function formatFileSize(bytes) {
  if (!bytes) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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
