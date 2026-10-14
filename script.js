const fileInput = document.getElementById('excelFile');
const newsGrid = document.getElementById('newsGrid');

fileInput.addEventListener('change', (event) => {
  const file = event.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();

  reader.onload = ({ target }) => {
    const buffer = target?.result;
    const workbook = XLSX.read(buffer, { type: 'array' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    renderRows(rows);
  };

  reader.readAsArrayBuffer(file);
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
    title.textContent = String(row[titleKey] || `Запис ${index + 1}`);
    card.appendChild(title);

    keys.forEach((key) => {
      if (key === titleKey || key === urlKey) return;
      const value = String(row[key] ?? '').trim();
      if (!value) return;

      const line = document.createElement('p');
      line.innerHTML = `<strong>${escapeHtml(key)}:</strong> ${escapeHtml(value)}`;
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

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
