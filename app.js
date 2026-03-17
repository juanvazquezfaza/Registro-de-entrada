const STORAGE_KEY = 'registroEntradaApp_v1';

const state = loadState();

const els = {
  btnEntradaAhora: document.getElementById('btnEntradaAhora'),
  btnSalidaAhora: document.getElementById('btnSalidaAhora'),
  todayBadge: document.getElementById('todayBadge'),
  todayDate: document.getElementById('todayDate'),
  todayEntry: document.getElementById('todayEntry'),
  todayExit: document.getElementById('todayExit'),
  todayWorked: document.getElementById('todayWorked'),
  todayMessage: document.getElementById('todayMessage'),
  saldoTotalCard: document.getElementById('saldoTotalCard'),
  saldoTotal: document.getElementById('saldoTotal'),
  saldoTotalTexto: document.getElementById('saldoTotalTexto'),
  saldoMesCard: document.getElementById('saldoMesCard'),
  saldoMes: document.getElementById('saldoMes'),
  saldoMesTexto: document.getElementById('saldoMesTexto'),
  dailyTargetLabel: document.getElementById('dailyTargetLabel'),
  recordForm: document.getElementById('recordForm'),
  editingDate: document.getElementById('editingDate'),
  recordDate: document.getElementById('recordDate'),
  recordEntry: document.getElementById('recordEntry'),
  recordExit: document.getElementById('recordExit'),
  recordBreak: document.getElementById('recordBreak'),
  recordNote: document.getElementById('recordNote'),
  btnResetForm: document.getElementById('btnResetForm'),
  configForm: document.getElementById('configForm'),
  configTargetHours: document.getElementById('configTargetHours'),
  configTargetMinutes: document.getElementById('configTargetMinutes'),
  configDefaultBreak: document.getElementById('configDefaultBreak'),
  configCompanyName: document.getElementById('configCompanyName'),
  recordsTableBody: document.getElementById('recordsTableBody'),
  recordRowTemplate: document.getElementById('recordRowTemplate'),
  btnExportJson: document.getElementById('btnExportJson'),
  btnExportCsv: document.getElementById('btnExportCsv'),
  importJsonInput: document.getElementById('importJsonInput')
};

bindEvents();
prefillForms();
render();
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}
setInterval(render, 30000);

function defaultState() {
  return {
    config: {
      dailyTargetMinutes: 450,
      defaultBreakMinutes: 0,
      companyName: 'la empresa'
    },
    records: {}
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    return {
      config: {
        dailyTargetMinutes: Number(parsed?.config?.dailyTargetMinutes ?? 450),
        defaultBreakMinutes: Number(parsed?.config?.defaultBreakMinutes ?? 0),
        companyName: String(parsed?.config?.companyName || 'la empresa')
      },
      records: parsed?.records && typeof parsed.records === 'object' ? parsed.records : {}
    };
  } catch {
    return defaultState();
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function bindEvents() {
  els.btnEntradaAhora.addEventListener('click', () => quickPunch('entry'));
  els.btnSalidaAhora.addEventListener('click', () => quickPunch('exit'));

  els.recordForm.addEventListener('submit', (event) => {
    event.preventDefault();
    saveRecordFromForm();
  });

  els.btnResetForm.addEventListener('click', resetRecordForm);

  els.configForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const hours = Number(els.configTargetHours.value || 0);
    const minutes = Number(els.configTargetMinutes.value || 0);
    const total = Math.max(0, hours * 60 + minutes);
    state.config.dailyTargetMinutes = total;
    state.config.defaultBreakMinutes = Math.max(0, Number(els.configDefaultBreak.value || 0));
    state.config.companyName = (els.configCompanyName.value || 'la empresa').trim() || 'la empresa';
    saveState();
    render();
  });

  els.btnExportJson.addEventListener('click', exportJson);
  els.btnExportCsv.addEventListener('click', exportCsv);
  els.importJsonInput.addEventListener('change', importJson);

  els.recordsTableBody.addEventListener('click', (event) => {
    const editBtn = event.target.closest('.edit');
    const deleteBtn = event.target.closest('.delete');
    if (!editBtn && !deleteBtn) return;

    const row = event.target.closest('tr');
    const date = row?.dataset?.date;
    if (!date) return;

    if (editBtn) {
      loadRecordIntoForm(date);
    }

    if (deleteBtn) {
      const record = state.records[date];
      const ok = window.confirm(`¿Borrar el registro del ${formatDate(date)}?`);
      if (!ok) return;
      delete state.records[date];
      saveState();
      if (els.editingDate.value === date) resetRecordForm();
      render();
    }
  });
}

function prefillForms() {
  const today = todayKey();
  if (!els.recordDate.value) els.recordDate.value = today;
  if (!els.recordBreak.value) els.recordBreak.value = state.config.defaultBreakMinutes;
  const [h, m] = minutesToHoursMinutes(state.config.dailyTargetMinutes);
  els.configTargetHours.value = h;
  els.configTargetMinutes.value = m;
  els.configDefaultBreak.value = state.config.defaultBreakMinutes;
  els.configCompanyName.value = state.config.companyName;
}

function resetRecordForm() {
  els.editingDate.value = '';
  els.recordDate.value = todayKey();
  els.recordEntry.value = '';
  els.recordExit.value = '';
  els.recordBreak.value = state.config.defaultBreakMinutes;
  els.recordNote.value = '';
}

function saveRecordFromForm() {
  const date = els.recordDate.value;
  if (!date) {
    alert('Elige una fecha.');
    return;
  }

  const entry = els.recordEntry.value || '';
  const exit = els.recordExit.value || '';
  const breakMinutes = Math.max(0, Number(els.recordBreak.value || 0));
  const note = (els.recordNote.value || '').trim();

  if (!entry && !exit) {
    alert('Introduce al menos una hora de entrada o de salida.');
    return;
  }

  if (entry && exit && compareTimes(exit, entry) < 0) {
    alert('La salida no puede ser anterior a la entrada en este formato.');
    return;
  }

  state.records[date] = {
    date,
    entry,
    exit,
    breakMinutes,
    note
  };
  saveState();
  resetRecordForm();
  render();
}

function loadRecordIntoForm(date) {
  const record = state.records[date];
  if (!record) return;
  els.editingDate.value = date;
  els.recordDate.value = record.date;
  els.recordEntry.value = record.entry || '';
  els.recordExit.value = record.exit || '';
  els.recordBreak.value = Number(record.breakMinutes ?? 0);
  els.recordNote.value = record.note || '';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function quickPunch(type) {
  const today = todayKey();
  const currentTime = nowTime();
  const currentRecord = state.records[today] || {
    date: today,
    entry: '',
    exit: '',
    breakMinutes: state.config.defaultBreakMinutes,
    note: ''
  };

  if (type === 'entry' && currentRecord.entry) {
    const ok = window.confirm(`Hoy ya tienes una entrada (${currentRecord.entry}). ¿Quieres reemplazarla por ${currentTime}?`);
    if (!ok) return;
  }

  if (type === 'exit' && currentRecord.exit) {
    const ok = window.confirm(`Hoy ya tienes una salida (${currentRecord.exit}). ¿Quieres reemplazarla por ${currentTime}?`);
    if (!ok) return;
  }

  currentRecord[type] = currentTime;

  if (currentRecord.entry && currentRecord.exit && compareTimes(currentRecord.exit, currentRecord.entry) < 0) {
    alert('La salida quedó antes que la entrada. Revisa la hora.');
    return;
  }

  state.records[today] = currentRecord;
  saveState();
  render();
}

function render() {
  prefillForms();
  renderSummary();
  renderToday();
  renderTable();
}

function renderSummary() {
  const allRecords = sortedRecords();
  const today = todayKey();
  const currentMonthPrefix = today.slice(0, 7);

  let totalBalance = 0;
  let monthBalance = 0;

  for (const record of allRecords) {
    const calc = calculateRecord(record);
    if (Number.isFinite(calc.balanceMinutes)) {
      totalBalance += calc.balanceMinutes;
      if (record.date.startsWith(currentMonthPrefix)) monthBalance += calc.balanceMinutes;
    }
  }

  applySaldoCard(els.saldoTotalCard, els.saldoTotal, els.saldoTotalTexto, totalBalance, state.config.companyName, 'acumulado');
  applySaldoCard(els.saldoMesCard, els.saldoMes, els.saldoMesTexto, monthBalance, state.config.companyName, 'este mes');
  els.dailyTargetLabel.textContent = formatClockFromMinutes(state.config.dailyTargetMinutes);
}

function applySaldoCard(card, valueEl, textEl, minutes, companyName, scopeLabel) {
  valueEl.textContent = formatSignedMinutes(minutes);
  card.className = 'summary-card';
  if (minutes > 0) {
    card.classList.add('positive');
    textEl.textContent = `Vas a favor ${scopeLabel}`;
  } else if (minutes < 0) {
    card.classList.add('negative');
    textEl.textContent = `Debes a ${companyName} ${Math.abs(minutes)} min ${scopeLabel}`;
  } else {
    card.classList.add('neutral');
    textEl.textContent = `Saldo cuadrado ${scopeLabel}`;
  }
}

function renderToday() {
  const key = todayKey();
  const record = state.records[key];
  els.todayDate.textContent = formatDate(key);

  if (!record) {
    els.todayEntry.textContent = '—';
    els.todayExit.textContent = '—';
    els.todayWorked.textContent = '—';
    els.todayBadge.className = 'badge neutral';
    els.todayBadge.textContent = 'Sin fichaje';
    els.todayMessage.className = 'status-banner neutral';
    els.todayMessage.textContent = 'Todavía no hay registro para hoy.';
    return;
  }

  const calc = calculateRecord(record);
  els.todayEntry.textContent = record.entry || '—';
  els.todayExit.textContent = record.exit || '—';
  els.todayWorked.textContent = calc.workedDisplay;

  if (calc.status === 'open') {
    els.todayBadge.className = 'badge info';
    els.todayBadge.textContent = 'Jornada en curso';
    els.todayMessage.className = 'status-banner neutral';
    els.todayMessage.textContent = `Has fichado entrada a las ${record.entry}. El saldo provisional ahora mismo es ${formatSignedMinutes(calc.balanceMinutes)}.`;
    return;
  }

  if (calc.status === 'complete-positive') {
    els.todayBadge.className = 'badge positive';
    els.todayBadge.textContent = 'A favor';
    els.todayMessage.className = 'status-banner positive';
    els.todayMessage.textContent = `Hoy vas a favor ${formatSignedMinutes(calc.balanceMinutes)}.`;
    return;
  }

  if (calc.status === 'complete-negative') {
    els.todayBadge.className = 'badge negative';
    els.todayBadge.textContent = 'Debes minutos';
    els.todayMessage.className = 'status-banner negative';
    els.todayMessage.textContent = `Hoy debes a ${state.config.companyName} ${Math.abs(calc.balanceMinutes)} min.`;
    return;
  }

  if (calc.status === 'complete-even') {
    els.todayBadge.className = 'badge neutral';
    els.todayBadge.textContent = 'Cuadrado';
    els.todayMessage.className = 'status-banner neutral';
    els.todayMessage.textContent = 'Hoy has cuadrado exactamente tu jornada objetivo.';
    return;
  }

  els.todayBadge.className = 'badge neutral';
  els.todayBadge.textContent = 'Incompleto';
  els.todayMessage.className = 'status-banner neutral';
  els.todayMessage.textContent = 'El registro de hoy está incompleto.';
}

function renderTable() {
  const records = sortedRecords();
  els.recordsTableBody.innerHTML = '';

  if (!records.length) {
    els.recordsTableBody.innerHTML = '<tr><td colspan="9" class="empty-row">Todavía no hay registros.</td></tr>';
    return;
  }

  for (const record of records) {
    const calc = calculateRecord(record);
    const fragment = els.recordRowTemplate.content.cloneNode(true);
    const tr = fragment.querySelector('tr');
    tr.dataset.date = record.date;

    if (calc.status === 'open') tr.classList.add('row-open');
    else if (calc.balanceMinutes > 0) tr.classList.add('row-positive');
    else if (calc.balanceMinutes < 0) tr.classList.add('row-negative');

    fragment.querySelector('.cell-date').textContent = formatDate(record.date);
    fragment.querySelector('.cell-entry').textContent = record.entry || '—';
    fragment.querySelector('.cell-exit').textContent = record.exit || '—';
    fragment.querySelector('.cell-break').textContent = `${Number(record.breakMinutes || 0)} min`;
    fragment.querySelector('.cell-worked').textContent = calc.workedDisplay;
    fragment.querySelector('.cell-target').textContent = formatClockFromMinutes(state.config.dailyTargetMinutes);

    const balanceCell = fragment.querySelector('.cell-balance');
    balanceCell.textContent = formatSignedMinutes(calc.balanceMinutes);
    if (calc.balanceMinutes > 0) balanceCell.classList.add('positive');
    else if (calc.balanceMinutes < 0) balanceCell.classList.add('negative');

    const statusBadge = document.createElement('span');
    statusBadge.className = 'table-badge';
    if (calc.status === 'open') {
      statusBadge.classList.add('warning');
      statusBadge.textContent = 'En curso';
    } else if (calc.status === 'complete-positive') {
      statusBadge.classList.add('positive');
      statusBadge.textContent = 'A favor';
    } else if (calc.status === 'complete-negative') {
      statusBadge.classList.add('negative');
      statusBadge.textContent = 'Debes';
    } else if (calc.status === 'complete-even') {
      statusBadge.classList.add('neutral');
      statusBadge.textContent = 'Cuadrado';
    } else {
      statusBadge.classList.add('neutral');
      statusBadge.textContent = 'Incompleto';
    }
    fragment.querySelector('.cell-status').appendChild(statusBadge);

    els.recordsTableBody.appendChild(fragment);
  }
}

function calculateRecord(record) {
  const target = state.config.dailyTargetMinutes;
  const breakMinutes = Math.max(0, Number(record.breakMinutes || 0));

  if (record.entry && record.exit) {
    const workedMinutes = Math.max(0, diffMinutes(record.entry, record.exit) - breakMinutes);
    const balanceMinutes = workedMinutes - target;
    return {
      workedMinutes,
      workedDisplay: formatDuration(workedMinutes),
      balanceMinutes,
      status: balanceMinutes > 0 ? 'complete-positive' : balanceMinutes < 0 ? 'complete-negative' : 'complete-even'
    };
  }

  if (record.entry && !record.exit && record.date === todayKey()) {
    const provisionalWorked = Math.max(0, diffMinutes(record.entry, nowTime()) - breakMinutes);
    return {
      workedMinutes: provisionalWorked,
      workedDisplay: `${formatDuration(provisionalWorked)} (en curso)`,
      balanceMinutes: provisionalWorked - target,
      status: 'open'
    };
  }

  return {
    workedMinutes: 0,
    workedDisplay: '—',
    balanceMinutes: 0,
    status: 'incomplete'
  };
}

function sortedRecords() {
  return Object.values(state.records)
    .sort((a, b) => b.date.localeCompare(a.date));
}

function exportJson() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  downloadBlob(blob, `registro-entrada-${todayKey()}.json`);
}

function exportCsv() {
  const rows = [
    ['fecha', 'entrada', 'salida', 'pausa_min', 'trabajado_min', 'objetivo_min', 'saldo_min', 'nota']
  ];

  for (const record of sortedRecords().slice().reverse()) {
    const calc = calculateRecord(record);
    rows.push([
      record.date,
      record.entry || '',
      record.exit || '',
      String(Number(record.breakMinutes || 0)),
      String(calc.workedMinutes || 0),
      String(state.config.dailyTargetMinutes),
      String(calc.balanceMinutes || 0),
      record.note || ''
    ]);
  }

  const csv = rows.map(row => row.map(csvEscape).join(';')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, `registro-entrada-${todayKey()}.csv`);
}

function importJson(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(String(reader.result || '{}'));
      if (!parsed || typeof parsed !== 'object') throw new Error('Formato no válido');
      state.config.dailyTargetMinutes = Number(parsed?.config?.dailyTargetMinutes ?? state.config.dailyTargetMinutes);
      state.config.defaultBreakMinutes = Number(parsed?.config?.defaultBreakMinutes ?? state.config.defaultBreakMinutes);
      state.config.companyName = String(parsed?.config?.companyName || state.config.companyName);
      state.records = parsed?.records && typeof parsed.records === 'object' ? parsed.records : {};
      saveState();
      resetRecordForm();
      render();
      alert('Datos importados correctamente.');
    } catch {
      alert('No pude importar ese JSON.');
    } finally {
      event.target.value = '';
    }
  };
  reader.readAsText(file);
}

function downloadBlob(blob, filename) {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

function csvEscape(value) {
  const text = String(value ?? '');
  if (/[";\n]/.test(text)) return `"${text.replaceAll('"', '""')}"`;
  return text;
}

function todayKey() {
  const now = new Date();
  return toDateKey(now);
}

function nowTime() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

function toDateKey(date) {
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
}

function formatDate(dateKey) {
  const [year, month, day] = dateKey.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return new Intl.DateTimeFormat('es-ES', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
}

function diffMinutes(start, end) {
  return Math.max(0, timeToMinutes(end) - timeToMinutes(start));
}

function compareTimes(a, b) {
  return timeToMinutes(a) - timeToMinutes(b);
}

function timeToMinutes(value) {
  if (!value || !value.includes(':')) return 0;
  const [h, m] = value.split(':').map(Number);
  return (h * 60) + m;
}

function minutesToHoursMinutes(totalMinutes) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return [hours, minutes];
}

function formatClockFromMinutes(totalMinutes) {
  const [hours, minutes] = minutesToHoursMinutes(totalMinutes);
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function formatDuration(totalMinutes) {
  const abs = Math.abs(Math.round(totalMinutes));
  const hours = Math.floor(abs / 60);
  const minutes = abs % 60;
  if (hours === 0) return `${minutes} min`;
  if (minutes === 0) return `${hours} h`;
  return `${hours} h ${minutes} min`;
}

function formatSignedMinutes(totalMinutes) {
  const rounded = Math.round(totalMinutes);
  if (rounded === 0) return '0 min';
  const sign = rounded > 0 ? '+' : '-';
  return `${sign}${formatDuration(Math.abs(rounded))}`;
}
