const STORAGE_KEY = 'registroEntradaApp.v3';
const DEFAULT_STATE = {
  config: {
    targetTime: '07:00'
  },
  records: []
};

let state = loadState();

const els = {
  btnEntradaAhora: document.getElementById('btnEntradaAhora'),
  todayBadge: document.getElementById('todayBadge'),
  todayDate: document.getElementById('todayDate'),
  todayEntry: document.getElementById('todayEntry'),
  todayTarget: document.getElementById('todayTarget'),
  todayBalance: document.getElementById('todayBalance'),
  todayMessage: document.getElementById('todayMessage'),
  saldoTotalCard: document.getElementById('saldoTotalCard'),
  saldoTotal: document.getElementById('saldoTotal'),
  saldoTotalTexto: document.getElementById('saldoTotalTexto'),
  tomorrowCard: document.getElementById('tomorrowCard'),
  tomorrowTime: document.getElementById('tomorrowTime'),
  tomorrowText: document.getElementById('tomorrowText'),
  dailyTargetLabel: document.getElementById('dailyTargetLabel'),
  recordForm: document.getElementById('recordForm'),
  editingDate: document.getElementById('editingDate'),
  recordDate: document.getElementById('recordDate'),
  recordEntry: document.getElementById('recordEntry'),
  recordNote: document.getElementById('recordNote'),
  btnResetForm: document.getElementById('btnResetForm'),
  configForm: document.getElementById('configForm'),
  configTargetTime: document.getElementById('configTargetTime'),
  btnExportJson: document.getElementById('btnExportJson'),
  btnExportCsv: document.getElementById('btnExportCsv'),
  importJsonInput: document.getElementById('importJsonInput'),
  importExcelInput: document.getElementById('importExcelInput'),
  importInfo: document.getElementById('importInfo'),
  recordsTableBody: document.getElementById('recordsTableBody'),
  rowTemplate: document.getElementById('recordRowTemplate')
};

bootstrap();

function bootstrap(){
  wireEvents();
  seedFormDefaults();
  render();
  registerServiceWorker();
}

function wireEvents(){
  els.btnEntradaAhora.addEventListener('click', handleQuickEntry);
  els.recordForm.addEventListener('submit', handleSaveRecord);
  els.btnResetForm.addEventListener('click', resetForm);
  els.configForm.addEventListener('submit', handleSaveConfig);
  els.btnExportJson.addEventListener('click', exportJson);
  els.btnExportCsv.addEventListener('click', exportCsv);
  els.importJsonInput.addEventListener('change', importJson);
  els.importExcelInput.addEventListener('change', importExcel);
}

function seedFormDefaults(){
  const today = getTodayIso();
  els.recordDate.value = today;
  els.configTargetTime.value = state.config.targetTime || '07:00';
}

function loadState(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem('registroEntradaApp.v2');
    if(!raw) return structuredClone(DEFAULT_STATE);
    const parsed = JSON.parse(raw);
    return {
      config: {
        targetTime: parsed?.config?.targetTime || '07:00'
      },
      records: Array.isArray(parsed?.records)
        ? parsed.records.filter(r => r?.date && r?.entry).map(r => ({
            date: r.date,
            entry: r.entry,
            note: r.note || ''
          }))
        : []
    };
  }catch{
    return structuredClone(DEFAULT_STATE);
  }
}

function saveState(){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function handleQuickEntry(){
  const now = new Date();
  const date = toIsoDate(now);
  const entry = toHHMM(now);
  const existing = state.records.find(r => r.date === date);
  if(existing){
    const ok = confirm(`Ya existe una entrada hoy (${existing.entry}). ¿Quieres reemplazarla por ${entry}?`);
    if(!ok) return;
    existing.entry = entry;
    existing.note = existing.note || '';
  }else{
    state.records.push({ date, entry, note: '' });
  }
  sortRecords();
  saveState();
  render();
}

function handleSaveRecord(event){
  event.preventDefault();
  const date = els.recordDate.value;
  const entry = els.recordEntry.value;
  const note = (els.recordNote.value || '').trim();
  if(!date || !entry) return;
  const idx = state.records.findIndex(r => r.date === date);
  const payload = { date, entry, note };
  if(idx >= 0){
    state.records[idx] = payload;
  }else{
    state.records.push(payload);
  }
  sortRecords();
  saveState();
  resetForm();
  render();
}

function resetForm(){
  els.editingDate.value = '';
  els.recordDate.value = getTodayIso();
  els.recordEntry.value = '';
  els.recordNote.value = '';
}

function handleSaveConfig(event){
  event.preventDefault();
  state.config.targetTime = els.configTargetTime.value || '07:00';
  saveState();
  render();
}

function render(){
  sortRecords();
  const rows = computeRows(state.records, state.config.targetTime);
  renderSummary(rows);
  renderToday(rows);
  renderTable(rows);
  els.dailyTargetLabel.textContent = state.config.targetTime;
  els.configTargetTime.value = state.config.targetTime;
}

function renderSummary(rows){
  const total = rows.reduce((acc, row) => acc + row.balance, 0);
  setTotalCard(total);
  setTomorrowCard(total, state.config.targetTime, rows.length > 0);
}

function setTotalCard(value){
  const card = els.saldoTotalCard;
  card.classList.remove('positive','negative','neutral');
  els.saldoTotal.textContent = formatMinutes(value);

  if(value > 0){
    card.classList.add('positive');
    els.saldoTotalTexto.textContent = `Vas a favor por ${formatMinutesAbs(value)}.`;
  }else if(value < 0){
    card.classList.add('negative');
    els.saldoTotalTexto.textContent = `Debes ${formatMinutesAbs(value)}.`;
  }else{
    card.classList.add('neutral');
    els.saldoTotalTexto.textContent = 'Estás a saldo cero.';
  }
}

function setTomorrowCard(total, targetTime, hasRows){
  const card = els.tomorrowCard;
  card.classList.remove('positive','negative','neutral');

  const targetMin = hhmmToMinutes(targetTime);
  const recommendedMin = normalizeDayMinutes(targetMin + total);
  els.tomorrowTime.textContent = minutesToHHMM(recommendedMin);

  if(!hasRows){
    card.classList.add('neutral');
    els.tomorrowText.textContent = 'Cuando importes o registres entradas, aquí verás la hora orientativa para volver a saldo cero.';
    return;
  }

  if(total > 0){
    card.classList.add('positive');
    els.tomorrowText.textContent = `Con tu saldo actual, mañana puedes entrar a las ${minutesToHHMM(recommendedMin)} y quedar a saldo cero.`;
  }else if(total < 0){
    card.classList.add('negative');
    els.tomorrowText.textContent = `Con tu saldo actual, mañana deberías entrar a las ${minutesToHHMM(recommendedMin)} para volver a saldo cero.`;
  }else{
    card.classList.add('neutral');
    els.tomorrowText.textContent = `Mañana puedes entrar a tu hora objetivo habitual: ${targetTime}.`;
  }
}

function renderToday(rows){
  const today = getTodayIso();
  const row = rows.find(r => r.date === today);
  els.todayDate.textContent = formatDate(today);
  els.todayTarget.textContent = state.config.targetTime;

  els.todayBadge.className = 'badge neutral';
  els.todayMessage.className = 'status-banner neutral';

  if(!row){
    els.todayEntry.textContent = '—';
    els.todayBalance.textContent = '—';
    els.todayBadge.textContent = 'Sin fichaje';
    els.todayMessage.textContent = 'Todavía no hay registro para hoy.';
    return;
  }

  els.todayEntry.textContent = row.entry;
  els.todayBalance.textContent = formatMinutes(row.balance);

  if(row.balance > 0){
    els.todayBadge.className = 'badge positive';
    els.todayBadge.textContent = 'A favor';
    els.todayMessage.className = 'status-banner positive';
    els.todayMessage.textContent = `Hoy vas a favor por ${formatMinutesAbs(row.balance)}.`;
  }else if(row.balance < 0){
    els.todayBadge.className = 'badge negative';
    els.todayBadge.textContent = 'Debes';
    els.todayMessage.className = 'status-banner negative';
    els.todayMessage.textContent = `Hoy debes ${formatMinutesAbs(row.balance)}.`;
  }else{
    els.todayBadge.className = 'badge neutral';
    els.todayBadge.textContent = 'Justo';
    els.todayMessage.className = 'status-banner neutral';
    els.todayMessage.textContent = 'Hoy estás justo en la hora objetivo.';
  }
}

function renderTable(rows){
  els.recordsTableBody.innerHTML = '';
  if(!rows.length){
    els.recordsTableBody.innerHTML = '<tr><td colspan="9" class="empty-row">Todavía no hay registros.</td></tr>';
    return;
  }

  rows.forEach(row => {
    const fragment = els.rowTemplate.content.cloneNode(true);
    const tr = fragment.querySelector('tr');
    tr.querySelector('.cell-date').textContent = formatDate(row.date);
    tr.querySelector('.cell-day').textContent = row.dayShort;
    tr.querySelector('.cell-entry').textContent = row.entry || '—';
    tr.querySelector('.cell-early').textContent = row.excess ? `${row.excess} min` : '—';
    tr.querySelector('.cell-late').textContent = row.defect ? `${row.defect} min` : '—';

    const balanceCell = tr.querySelector('.cell-balance');
    balanceCell.textContent = formatMinutes(row.balance);
    balanceCell.classList.add(balanceClass(row.balance));

    const runningCell = tr.querySelector('.cell-running');
    runningCell.textContent = formatMinutes(row.running);
    runningCell.classList.add(balanceClass(row.running));

    const statusWrap = tr.querySelector('.cell-status');
    const pill = document.createElement('span');
    pill.className = `state-pill ${stateClass(row.balance)}`;
    pill.textContent = row.balance > 0 ? 'A favor' : row.balance < 0 ? 'Debes' : 'Justo';
    statusWrap.appendChild(pill);

    tr.querySelector('.edit').addEventListener('click', () => editRecord(row.date));
    tr.querySelector('.delete').addEventListener('click', () => deleteRecord(row.date));

    els.recordsTableBody.appendChild(fragment);
  });
}

function editRecord(date){
  const record = state.records.find(r => r.date === date);
  if(!record) return;
  els.editingDate.value = record.date;
  els.recordDate.value = record.date;
  els.recordEntry.value = record.entry;
  els.recordNote.value = record.note || '';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function deleteRecord(date){
  const record = state.records.find(r => r.date === date);
  if(!record) return;
  if(!confirm(`¿Borrar el registro del ${formatDate(date)}?`)) return;
  state.records = state.records.filter(r => r.date !== date);
  saveState();
  render();
}

function computeRows(records, targetTime){
  const sorted = [...records].sort((a,b) => a.date.localeCompare(b.date));
  let running = 0;
  return sorted.map(record => {
    const targetMin = hhmmToMinutes(targetTime);
    const entryMin = hhmmToMinutes(record.entry);
    const excess = Math.max(0, targetMin - entryMin);
    const defect = Math.max(0, entryMin - targetMin);
    const balance = excess - defect;
    running += balance;
    return {
      ...record,
      excess,
      defect,
      balance,
      running,
      dayShort: weekdayShort(record.date)
    };
  });
}

function sortRecords(){
  state.records.sort((a,b) => a.date.localeCompare(b.date));
}

function exportJson(){
  downloadFile(
    `registro-entrada-${safeTimestamp()}.json`,
    JSON.stringify(state, null, 2),
    'application/json'
  );
}

function exportCsv(){
  const rows = computeRows(state.records, state.config.targetTime);
  const header = ['Fecha','Dia','Entrada','Exceso (min)','Defecto (min)','Saldo dia (min)','Saldo acumulado (min)','Observacion'];
  const lines = [header.join(',')];
  rows.forEach(row => {
    lines.push([
      row.date,
      row.dayShort,
      row.entry,
      row.excess,
      row.defect,
      row.balance,
      row.running,
      csvEscape(row.note || '')
    ].join(','));
  });
  downloadFile(`registro-entrada-${safeTimestamp()}.csv`, lines.join('\n'), 'text/csv;charset=utf-8');
}

function importJson(event){
  const file = event.target.files?.[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try{
      const parsed = JSON.parse(String(reader.result));
      if(!Array.isArray(parsed.records)) throw new Error('Formato no válido');
      const ok = confirm('Esto reemplazará los datos actuales de la app. ¿Continuar?');
      if(!ok) return;
      state = {
        config: {
          targetTime: parsed?.config?.targetTime || '07:00'
        },
        records: parsed.records
          .filter(r => r?.date && r?.entry)
          .map(r => ({ date: r.date, entry: r.entry, note: r.note || '' }))
      };
      saveState();
      render();
      setImportInfo('JSON importado correctamente.');
    }catch(err){
      alert('No se pudo importar el JSON.');
    }finally{
      event.target.value = '';
    }
  };
  reader.readAsText(file);
}

function importExcel(event){
  const file = event.target.files?.[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try{
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array', cellDates: true });
      const result = parseRegistroWorkbook(workbook);
      if(!result.records.length){
        alert('No encontré registros con hora de entrada en el Excel.');
        return;
      }
      const ok = confirm(`Se importarán ${result.records.length} registros y se reemplazarán los actuales. ¿Continuar?`);
      if(!ok) return;

      state = {
        config: {
          targetTime: result.targetTime || state.config.targetTime || '07:00'
        },
        records: result.records
      };
      saveState();
      render();
      setImportInfo(`Excel importado: ${result.records.length} registros cargados. Hora objetivo: ${state.config.targetTime}.`);
    }catch(err){
      console.error(err);
      alert('No se pudo leer ese Excel. Usa el archivo anual que preparaste para el registro.');
    }finally{
      event.target.value = '';
    }
  };
  reader.readAsArrayBuffer(file);
}

function parseRegistroWorkbook(workbook){
  const targetTime = parseTargetTimeFromConfig(workbook);
  const registroSheet = workbook.Sheets['REGISTRO'] || workbook.Sheets[workbook.SheetNames[0]];
  if(!registroSheet) throw new Error('No existe la hoja REGISTRO');

  const rows = XLSX.utils.sheet_to_json(registroSheet, { header: 1, raw: true, defval: null });
  const records = [];
  for(let i = 1; i < rows.length; i++){
    const row = rows[i];
    const rawDate = row[0];
    const rawEntry = row[2];
    const rawNote = row[7];

    const date = normalizeExcelDate(rawDate);
    const entry = normalizeExcelTime(rawEntry);
    if(!date || !entry) continue;

    records.push({
      date,
      entry,
      note: rawNote ? String(rawNote).trim() : ''
    });
  }
  records.sort((a,b) => a.date.localeCompare(b.date));
  return { targetTime, records };
}

function parseTargetTimeFromConfig(workbook){
  const sheet = workbook.Sheets['CONFIG'];
  if(!sheet) return null;
  const value = sheet['B3'] ? sheet['B3'].v : null;
  return normalizeExcelTime(value);
}

function normalizeExcelDate(value){
  if(!value) return null;
  if(value instanceof Date && !Number.isNaN(value.getTime())){
    return toIsoDate(value);
  }
  if(typeof value === 'number'){
    const parts = XLSX.SSF.parse_date_code(value);
    if(!parts) return null;
    const d = new Date(parts.y, parts.m - 1, parts.d);
    return toIsoDate(d);
  }
  const text = String(value).trim();
  if(/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  const date = new Date(text);
  if(!Number.isNaN(date.getTime())) return toIsoDate(date);
  const m = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if(m){
    const [,dd,mm,yyyy] = m;
    return `${yyyy}-${String(mm).padStart(2,'0')}-${String(dd).padStart(2,'0')}`;
  }
  return null;
}

function normalizeExcelTime(value){
  if(value === null || value === undefined || value === '') return null;
  if(value instanceof Date && !Number.isNaN(value.getTime())){
    return toHHMM(value);
  }
  if(typeof value === 'number'){
    const totalMinutes = Math.round(value * 24 * 60);
    const hh = String(Math.floor(totalMinutes / 60) % 24).padStart(2,'0');
    const mm = String(totalMinutes % 60).padStart(2,'0');
    return `${hh}:${mm}`;
  }
  const text = String(value).trim();
  const match = text.match(/^(\d{1,2}):(\d{2})/);
  if(match){
    return `${match[1].padStart(2,'0')}:${match[2]}`;
  }
  return null;
}

function registerServiceWorker(){
  if('serviceWorker' in navigator){
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    });
  }
}

function setImportInfo(message){
  els.importInfo.textContent = message;
}

function balanceClass(value){
  return value > 0 ? 'positive' : value < 0 ? 'negative' : 'neutral';
}
function stateClass(value){ return balanceClass(value); }

function weekdayShort(isoDate){
  return new Intl.DateTimeFormat('es-ES', { weekday: 'short' }).format(new Date(`${isoDate}T00:00:00`)).replace('.', '');
}
function formatDate(isoDate){
  return new Intl.DateTimeFormat('es-ES', { day:'2-digit', month:'2-digit', year:'numeric' }).format(new Date(`${isoDate}T00:00:00`));
}
function toIsoDate(date){
  const y = date.getFullYear();
  const m = String(date.getMonth()+1).padStart(2,'0');
  const d = String(date.getDate()).padStart(2,'0');
  return `${y}-${m}-${d}`;
}
function getTodayIso(){ return toIsoDate(new Date()); }
function toHHMM(date){
  return `${String(date.getHours()).padStart(2,'0')}:${String(date.getMinutes()).padStart(2,'0')}`;
}
function hhmmToMinutes(value){
  const [h,m] = String(value || '00:00').split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}
function minutesToHHMM(totalMinutes){
  const minutes = normalizeDayMinutes(totalMinutes);
  const hh = String(Math.floor(minutes / 60)).padStart(2,'0');
  const mm = String(minutes % 60).padStart(2,'0');
  return `${hh}:${mm}`;
}
function normalizeDayMinutes(totalMinutes){
  return ((totalMinutes % 1440) + 1440) % 1440;
}
function formatMinutes(value){
  const sign = value > 0 ? '+' : value < 0 ? '-' : '';
  return `${sign}${Math.abs(value)} min`;
}
function formatMinutesAbs(value){
  return `${Math.abs(value)} min`;
}
function safeTimestamp(){
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}-${String(d.getHours()).padStart(2,'0')}${String(d.getMinutes()).padStart(2,'0')}`;
}
function csvEscape(value){
  const text = String(value ?? '');
  if(/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}
function downloadFile(filename, content, type){
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 250);
}
