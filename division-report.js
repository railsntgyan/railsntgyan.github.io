/* ADD-ON: Division-wise detailed FY report, read-only access to loaded Firestore records.
   No changes to existing records, Firebase schema, FY summary or table filters. */
(function () {
  'use strict';

  const DIVISIONS = ['Bilaspur', 'Raipur', 'Nagpur'];
  // Matches FILES & APPROVALS categories in the existing sidebar, including six optional categories.
  const ALL_CATEGORIES = [
    'PCSTE SANCTION', 'EI TSAA', 'MSDAC TSAA', 'S&T SPEED CERTIFICATE',
    'DISPENSATION', 'GM SANCTION', 'GRADE CONDONATION', 'LINE OPENING',
    'SPEED RAISING', 'JOINT SAFETY CERTIFICATE (JSC)', 'INSPECTION NOTE',
    'SECR POLICY', 'SECR TYPICAL', 'JPO (JOINT PROCEDURE ORDER)',
    'LETTER ISSUED BY HQ', 'FILE MOVEMENT REGISTER'
  ];
  const DEFAULT_CATEGORIES = new Set(ALL_CATEGORIES.slice(0, 10));
  const MIN_ROWS_PER_DIVISION = 8;
  const COLUMNS = ['SN', 'STATION / SECTION', 'APPROVAL FOR', 'WORK', 'AGENCY', 'APPROVED BY / FORWARDED TO', 'DATE'];
  const byId = id => document.getElementById(id);
  const clean = value => value === null || value === undefined ? '' : String(value).trim();
  const escape = value => clean(value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));

  function canonicalDivision(raw) {
    const div = clean(raw).toUpperCase().replace(/[._/\\-]/g, ' ').replace(/\s+/g, ' ').trim();
    if (['BILASPUR', 'BSP', 'BILASPUR DIVISION'].includes(div)) return 'Bilaspur';
    if (['RAIPUR', 'R', 'RAIPUR DIVISION'].includes(div)) return 'Raipur';
    if (['NAGPUR', 'NGP', 'NAGPUR DIVISION'].includes(div)) return 'Nagpur';
    return null;
  }

  function fullFY(fy) {
    const first = Number(clean(fy).split('-')[0]);
    return Number.isFinite(first) ? first + '-' + (first + 1) : clean(fy);
  }

  function parseReportDate(dateValue) {
    const str = clean(dateValue);
    let day, month, year;
    let match = str.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
    if (match) {
      day = Number(match[1]); month = Number(match[2]); year = Number(match[3]);
    } else {
      match = str.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
      if (!match) return null;
      year = Number(match[1]); month = Number(match[2]); day = Number(match[3]);
    }
    const d = new Date(year, month - 1, day);
    if (d.getFullYear() !== year || d.getMonth() + 1 !== month || d.getDate() !== day) return null;
    const start = month >= 4 ? year : year - 1;
    return {
      time: d.getTime(), fy: start + '-' + String(start + 1).slice(-2),
      text: String(day).padStart(2, '0') + '/' + String(month).padStart(2, '0') + '/' + year
    };
  }

  function reportSourceRecords() {
    // 'records' is the live Firestore array already owned by the existing page.
    return (typeof records !== 'undefined' && Array.isArray(records)) ? records : [];
  }

  function initCategorySelector() {
    const grid = byId('divisionReportCategoryGrid');
    if (!grid || grid.children.length) return;
    grid.innerHTML = ALL_CATEGORIES.map(category => {
      const checked = DEFAULT_CATEGORIES.has(category) ? ' checked' : '';
      return '<label class="dr-category-option"><input type="checkbox" class="dr-category-checkbox" value="' +
        escape(category) + '"' + checked + ' onchange="renderDivisionReport()">' +
        '<span>' + escape(category) + '</span></label>';
    }).join('');
  }

  function selectedCategories() {
    return new Set(Array.from(document.querySelectorAll('#divisionReportCategoryGrid .dr-category-checkbox:checked'))
      .map(input => input.value));
  }

  function setCategories(mode) {
    initCategorySelector();
    document.querySelectorAll('#divisionReportCategoryGrid .dr-category-checkbox').forEach(input => {
      input.checked = mode === 'all' || (mode === 'default' && DEFAULT_CATEGORIES.has(input.value));
    });
    render();
  }

  function toggleCategories() {
    const panel = byId('divisionReportFilterPanel');
    const toggle = byId('divisionReportFilterToggle');
    const willShow = panel.hidden;
    panel.hidden = !willShow;
    toggle.setAttribute('aria-expanded', String(willShow));
  }

  function getReportData() {
    const fy = byId('divisionReportFY').value;
    const selectedDivision = byId('divisionReportDivision').value;
    const allowedCategories = selectedCategories();
    const divisions = selectedDivision === 'ALL' ? DIVISIONS : [selectedDivision];
    const grouped = Object.fromEntries(divisions.map(div => [div, []]));
    for (const rec of reportSourceRecords()) {
      const category = clean(rec.category).toUpperCase() === 'PCSTE DISPENSATION'
        ? 'DISPENSATION' : clean(rec.category).toUpperCase();
      if (!allowedCategories.has(category)) continue;
      const div = canonicalDivision(rec.division);
      if (!div || !Object.prototype.hasOwnProperty.call(grouped, div)) continue;
      // Existing website uses forwarding date as canonical reporting date, where available.
      const date = parseReportDate(typeof getReportingDate === 'function' ? getReportingDate(rec) : rec.date);
      if (!date || date.fy !== fy) continue;
      const authority = clean(rec.approvedBy) || clean(rec.forwardedTo) ||
        clean(rec.approvalBy) || clean(rec.sanctionBy) || clean(rec.givenBy) ||
        clean(rec.forwardedBy) || clean(rec.issuedBy) || '';
      grouped[div].push({
        station: clean(rec.station),
        category, work: clean(rec.work) || clean(rec.description),
        agency: clean(rec.agency), authority, date: date.text, time: date.time
      });
    }
    for (const div of divisions) {
      grouped[div].sort((a,b) => a.time - b.time ||
        a.station.localeCompare(b.station) || a.category.localeCompare(b.category));
    }
    return {fy, divisions, grouped, selectedCount: allowedCategories.size};
  }

  function updateFYChoices() {
    const dropdown = byId('divisionReportFY');
    if (!dropdown) return;
    const now = new Date();
    const currentStart = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
    const years = new Set();
    for (let year = 2023; year <= currentStart + 1; year++) {
      years.add(year + '-' + String(year + 1).slice(-2));
    }
    for (const rec of reportSourceRecords()) {
      const parsed = parseReportDate(typeof getReportingDate === 'function' ? getReportingDate(rec) : rec.date);
      if (parsed) years.add(parsed.fy);
    }
    const preserve = dropdown.value;
    dropdown.innerHTML = [...years].sort((a,b) => Number(b.slice(0,4)) - Number(a.slice(0,4)))
      .map(fy => '<option value="' + escape(fy) + '">' + escape(fullFY(fy)) + '</option>').join('');
    const selectedFromHome = typeof railSelectedDashboardFY !== 'undefined' ? railSelectedDashboardFY : null;
    const wanted = preserve || selectedFromHome || (typeof getCurrentFinancialYearString === 'function'
      ? getCurrentFinancialYearString() : currentStart + '-' + String(currentStart+1).slice(-2));
    dropdown.value = years.has(wanted) ? wanted : currentStart + '-' + String(currentStart+1).slice(-2);
  }

  function setStatus(message, error=false) {
    const status = byId('divisionReportStatus');
    if (!status) return;
    status.textContent = message;
    status.classList.toggle('dr-error', error);
  }

  function render() {
    if (!byId('divisionReportRows') || !byId('divisionReportFY').value) return;
    initCategorySelector();
    const {fy, divisions, grouped, selectedCount} = getReportData();
    byId('divisionReportSelectedCount').textContent = selectedCount + ' OF ' + ALL_CATEGORIES.length + ' SELECTED';
    byId('divisionReportExcelBtn').disabled = selectedCount === 0;
    const printBtn = byId('divisionReportPrintBtn');
    if (printBtn) printBtn.disabled = selectedCount === 0;
    if (!selectedCount) {
      byId('divisionReportRows').innerHTML = '<tr><td colspan="7" class="dr-no-selection">SELECT AT LEAST ONE FILE / APPROVAL TYPE TO GENERATE THE REPORT.</td></tr>';
      setStatus('No categories selected. Select at least one file / approval type.');
      return;
    }
    const html = [];
    html.push('<tr><th colspan="7" class="dr-title">DIVISION-WISE REPORT OF FY ' + escape(fullFY(fy)) + '</th></tr>');
    const total = divisions.reduce((sum,div) => sum+grouped[div].length,0);
    html.push('<tr><th colspan="7" class="dr-meta">' + 'TOTAL RECORDS: ' + total + '</th></tr>');
    for (const div of divisions) {
      const entries = grouped[div];
      html.push('<tr><th colspan="7" class="dr-division">DIVISION: ' + escape(div.toUpperCase()) + '</th></tr>');
      html.push('<tr class="dr-fields">' + COLUMNS.map(name => '<th scope="col">' + escape(name) + '</th>').join('') + '</tr>');
      for (let index = 0; index < Math.max(MIN_ROWS_PER_DIVISION, entries.length); index++) {
        const row = entries[index];
        if (!row) {
          html.push('<tr class="dr-empty"><td class="dr-sn"></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>');
        } else {
          const values = [index + 1, row.station, row.category, row.work, row.agency, row.authority, row.date];
          html.push('<tr class="dr-record">' + values.map((value,col) => '<td class="' + (col === 0 ? 'dr-sn' : col === 2 ? 'dr-type' : col === 6 ? 'dr-date' : '') + '">' + escape(value) + '</td>').join('') + '</tr>');
        }
      }
    }
    byId('divisionReportRows').innerHTML = html.join('');
    const labels = divisions.map(div => div.toUpperCase() + ': ' + grouped[div].length).join('  |  ');
    setStatus('FY ' + fullFY(fy) + '   •   ' + selectedCount + ' selected categories   •   ' + total +
      ' records   •   ' + labels +
      '   •   Records must have a saved division and valid date.');
  }

  function open() {
    initCategorySelector();
    updateFYChoices();
    byId('divisionReportDivision').value = 'ALL';
    render();
    byId('divisionReportModal').style.display = 'flex';
    try { history.pushState({view:'modal', modal:'divisionReport'}, '', ''); } catch (err) { console.warn('History unavailable', err); }
  }
  function close() { byId('divisionReportModal').style.display = 'none'; }

  function print() {
    document.body.classList.add('printing-division-report');
    const cleanPrintState = () => {
      document.body.classList.remove('printing-division-report');
      window.removeEventListener('afterprint', cleanPrintState);
    };
    window.addEventListener('afterprint', cleanPrintState);
    try { window.print(); } finally { setTimeout(cleanPrintState, 2000); }
  }

  let excelLoader = null;
  function ensureExcelJS() {
    if (window.ExcelJS && window.ExcelJS.Workbook) return Promise.resolve(window.ExcelJS);
    if (excelLoader) return excelLoader;
    const cdns = [
      'https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js',
      'https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js'
    ];
    excelLoader = (async () => {
      for (const url of cdns) {
        try {
          await new Promise((resolve,reject) => {
            const script = document.createElement('script');
            script.src = url; script.async = true;
            script.onload = () => window.ExcelJS && window.ExcelJS.Workbook
              ? resolve() : reject(new Error('ExcelJS not available'));
            script.onerror = () => reject(new Error('Unable to load ExcelJS'));
            document.head.appendChild(script);
          });
          return window.ExcelJS;
        } catch (err) { console.warn('Division report Excel library:', err.message); }
      }
      throw new Error('Excel library could not load. Please use an online connection and retry.');
    })();
    return excelLoader.catch(err => { excelLoader=null; throw err; });
  }

  // Excel safety: do not allow a Firebase text field to become a spreadsheet formula.
  const excelText = value => {
    const text = clean(value);
    return /^[=+@\t\r\n]/.test(text) || (/^-[^\d]/.test(text)) ? "'" + text : text;
  };

  async function exportExcel() {
    const button = byId('divisionReportExcelBtn');
    if (button.disabled) return;
    const {fy, divisions, grouped, selectedCount} = getReportData();
    if (!selectedCount) { setStatus('Select at least one file / approval type.', true); return; }
    button.disabled = true;
    setStatus('Preparing formatted Excel report for FY ' + fullFY(fy) + '…');
    try {
      const ExcelJS = await ensureExcelJS();
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'RailSNTGyan';
      workbook.subject = 'Division-wise S&T approval report';
      workbook.created = new Date();
      const ws = workbook.addWorksheet('Division-wise Report', {
        properties: {defaultRowHeight:18},
        pageSetup: {
          paperSize:9, orientation:'landscape', fitToPage:true, fitToWidth:1, fitToHeight:0,
          margins:{left:0.25,right:0.25,top:0.35,bottom:0.35,header:0.15,footer:0.15}
        }
      });
      ws.columns = [
        {width:7}, {width:21}, {width:20}, {width:48},
        {width:16}, {width:29}, {width:15}
      ];
      ws.pageSetup.horizontalCentered = true;
      const NAVY = 'FF133956';
      const BLUE = 'FF195983';
      const PALE = 'FFD9EDF9';
      const LIGHT = 'FFEBF4FA';
      const WHITE = 'FFFFFFFF';
      const INK = 'FF183149';
      const border = {top:{style:'thin',color:{argb:'FFADBFD0'}},
        left:{style:'thin',color:{argb:'FFADBFD0'}},
        bottom:{style:'thin',color:{argb:'FFADBFD0'}},
        right:{style:'thin',color:{argb:'FFADBFD0'}}};
      const outlineRow = (row, options={}) => {
        const fill = options.fill || WHITE;
        const color = options.color || INK;
        row.eachCell({includeEmpty:true}, cell => {
          cell.border = border;
          cell.font = {name:'Arial',size:options.size || 10,bold:!!options.bold,color:{argb:color}};
          cell.alignment = {vertical:'middle',horizontal:options.center ? 'center' : cell.col===1||cell.col===7?'center':'left',wrapText:true};
          cell.fill = {type:'pattern',pattern:'solid',fgColor:{argb:fill}};
        });
      };
      ws.mergeCells('A1:G1');
      const titleRow = ws.getRow(1);
      titleRow.height = 32;
      titleRow.getCell(1).value = 'DIVISION-WISE REPORT OF FY ' + fullFY(fy);
      outlineRow(titleRow,{fill:NAVY,color:WHITE,size:15,bold:true,center:true});
      ws.mergeCells('A2:G2');
      const summaryRow = ws.getRow(2);
      summaryRow.height = 22;
      const grandTotal = divisions.reduce((sum,div) => sum + grouped[div].length,0);
      summaryRow.getCell(1).value = 'TOTAL RECORDS: ' + grandTotal;
      outlineRow(summaryRow,{fill:LIGHT,color:BLUE,size:10,bold:true,center:true});
      let rowIndex = 3;
      for (const div of divisions) {
        ws.mergeCells('A'+rowIndex+':G'+rowIndex);
        const divRow = ws.getRow(rowIndex);
        divRow.height = 28;
        divRow.getCell(1).value = 'DIVISION: ' + div.toUpperCase();
        outlineRow(divRow,{fill:PALE,color:NAVY,size:12,bold:true,center:true});
        rowIndex++;
        const header = ws.getRow(rowIndex++);
        COLUMNS.forEach((col,i) => {header.getCell(i+1).value = col;});
        outlineRow(header,{fill:BLUE,color:WHITE,size:10,bold:true,center:true});
        header.height = 32;
        const entries = grouped[div];
        for (let i=0; i<Math.max(MIN_ROWS_PER_DIVISION, entries.length); i++) {
          const r = entries[i];
          const values = r ? [i+1,excelText(r.station),excelText(r.category),excelText(r.work),excelText(r.agency),excelText(r.authority),r.date]
            : ['', '', '', '', '', '', ''];
          const row = ws.getRow(rowIndex++);
          values.forEach((v,j) => {row.getCell(j+1).value = v;});
          outlineRow(row,{fill: i%2===1 ? 'FFF5F9FC' : WHITE});
          row.getCell(3).alignment = {horizontal:'center',vertical:'middle',wrapText:true};
          const workLines = r ? Math.ceil(r.work.length / 52) : 1;
          row.height = Math.min(90, Math.max(22, workLines * 15));
        }
      }
      ws.pageSetup.printArea = 'A1:G' + (rowIndex - 1);
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
      const objectURL = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = objectURL;
      anchor.download = 'RailSNTGyan_Division_Wise_Report_FY_' + fy + '.xlsx';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(objectURL), 10000);
      const count = divisions.reduce((sum,div)=>sum+grouped[div].length,0);
      setStatus('Excel report exported: FY ' + fullFY(fy) + '  •  ' + count + ' record(s).');
    } catch(err) {
      console.error('Division-wise Excel export failed',err);
      setStatus('Excel export failed: ' + (err && err.message || String(err)), true);
    } finally {
      button.disabled = false;
    }
  }

  window.openDivisionReportModal = open;
  window.closeDivisionReportModal = close;
  window.renderDivisionReport = render;
  window.toggleDivisionReportCategories = toggleCategories;
  window.setDivisionReportCategories = setCategories;
  window.printDivisionReport = print;
  window.exportDivisionReportExcel = exportExcel;
  window.railRefreshOpenDivisionReport = function () {
    const modal = byId('divisionReportModal');
    if (modal && getComputedStyle(modal).display !== 'none') {
      updateFYChoices(); render();
    }
  };
})();
