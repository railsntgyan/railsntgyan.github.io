/* ADD-ON: Division-wise detailed FY report, reading the existing Firestore records.
   Explicit outcome fields are optional and saved by the existing Add/Edit form. */
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
  const COLUMNS = ['SN', 'STATION / SECTION', 'FILE CATEGORY', 'WORK', 'AGENCY', 'FILE ACTION / AUTHORITY', 'DATE'];
  const byId = id => document.getElementById(id);
  const clean = value => value === null || value === undefined ? '' : String(value).trim();
  const escape = value => clean(value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));

  const WORKFLOW_GUIDES = Object.freeze({
    'PCSTE SANCTION':'PCSTE is the normal sanctioning authority',
    'EI TSAA':'PCSTE sanction or PCSTE forwarding to RDSO',
    'MSDAC TSAA':'CSE / CCE / CSTE/Planning / PCSTE',
    'S&T SPEED CERTIFICATE':'CSE / CCE / CSTE/Planning',
    'GM SANCTION':'PCSTE forwarding to PCSO for GM sanction',
    'JOINT SAFETY CERTIFICATE (JSC)':'PCSTE signature and return to department',
    'LINE OPENING':'PCSTE signature and return to department',
    'GRADE CONDONATION':'PCSTE signature and return to department',
    'SPEED RAISING':'CSE / CCE / CSTE/Planning / PCSTE signature',
    'DISPENSATION':'PCSTE / PCSTE & PCEE approval, or forwarding'
  });

  // A normal workflow is guidance, not evidence that a specific file was approved.
  // Only explicit saved outcomes are shown as completed actions.
  function workflowFor(record) {
    const category = clean(record.category).toUpperCase() === 'PCSTE DISPENSATION'
      ? 'DISPENSATION' : clean(record.category).toUpperCase();
    let action = clean(record.fileAction || record.actionTaken || record.disposalAction);
    let by = clean(record.actionBy || record.approvedBy || record.forwardedBy || record.signedBy);
    const to = clean(record.actionTo || record.forwardedTo || record.returnedTo);
    let source = 'EXPLICIT';
    // PCSTE Sanction is a sanctioned category: the sanctioning authority is
    // always PCSTE. Older records need no extra authority data entry.
    if (category === 'PCSTE SANCTION') by = 'PCSTE';
    if (!action) {
      if (category === 'PCSTE SANCTION') {
        action = 'SANCTIONED';
        source = 'CATEGORY';
      } else if (category === 'DISPENSATION' && (record.givenBy || record.sanctionBy)) {
        action = 'ISSUING AUTHORITY RECORDED';
        by = by || clean(record.givenBy || record.sanctionBy);
        source = 'LEGACY';
      } else if (category === 'EI TSAA' && record.sanctionBy) {
        action = 'SANCTION AUTHORITY RECORDED';
        by = by || clean(record.sanctionBy);
        source = 'LEGACY';
      } else {
        action = 'NOT RECORDED';
        source = 'UNRECORDED';
      }
    }
    if (!by && source === 'EXPLICIT' && /^(APPROVED|SANCTIONED|ISSUED)$/.test(action)) {
      by = clean(category === 'DISPENSATION' ? (record.givenBy || record.sanctionBy) :
        category === 'EI TSAA' ? record.sanctionBy : '');
    }
    return {action, by, to, source, category, guide:WORKFLOW_GUIDES[category]||''};
  }

  // Use exactly the same clear, authority-first wording in the website, print and Excel.
  // A forwarding destination or approving officer is never guessed from a typical route.
  function workflowPresentation(info, compact=false) {
    const action = clean(info.action).toUpperCase();
    const by = clean(info.by) || 'NOT RECORDED';
    const to = clean(info.to) || 'NOT RECORDED';
    let label = action;
    let note = '';

    if (action === 'APPROVED' || action === 'SANCTIONED' ||
        action === 'SANCTION AUTHORITY RECORDED' || action === 'ISSUING AUTHORITY RECORDED') {
      // Existing PCSTE SANCTION records may still store APPROVED; category always
      // means sanction. Other categories use the separately saved actual outcome.
      label = ((info.category === 'PCSTE SANCTION' || action === 'SANCTIONED')
        ? 'SANCTIONED BY ' : 'APPROVED BY ') + by;
    } else if (action === 'FORWARDED') {
      label = 'FORWARDED BY ' + by + ' TO ' + to;
    } else if (action === 'SIGNED & RETURNED') {
      label = 'SIGNED BY ' + by + ' / RETURNED TO ' + to;
    } else if (action === 'ISSUED') {
      label = 'ISSUED BY ' + by;
    } else if (action === 'RETURNED FOR COMPLIANCE') {
      label = 'RETURNED BY ' + by + ' TO ' + to + ' FOR COMPLIANCE';
    } else if (action === 'UNDER PROCESS') {
      label = 'UNDER PROCESS' + (info.by ? ' — WITH ' + info.by : '');
    } else if (action === 'NOT RECORDED') {
      label = 'ACTION NOT RECORDED';
    } else {
      // Keep future / custom workflow actions readable without altering saved data.
      label = action + (info.by ? ' — BY ' + info.by : '') + (info.to ? ' — TO ' + info.to : '');
    }

    // Legacy authority details are already visible in the main label.
    // Do not print redundant internal field descriptions under the badge.
    if (info.source === 'UNRECORDED') {
      note = compact ? 'VERIFY IN EDIT' :
        (info.guide ? 'STANDARD ROUTE: ' + info.guide + ' (NOT VERIFIED)' : 'UPDATE IN EDIT RECORD');
    }
    return {label, note};
  }

  function workflowMarkup(item, compact=false) {
    const info = item && item.action ? item : workflowFor(item || {});
    const style = info.source === 'UNRECORDED' ? 'dr-workflow-unknown' :
      /RETURNED FOR COMPLIANCE/.test(info.action) ? 'dr-workflow-warn' :
      /FORWARDED/.test(info.action) ? 'dr-workflow-forwarded' :
      /APPROVED|ISSUED|SIGNED|SANCTION/.test(info.action) ? 'dr-workflow-approved' :
      'dr-workflow-neutral';
    const display = workflowPresentation(info, compact);
    return '<div class="dr-workflow-result"><span class="dr-workflow-pill ' + style + '">' +
      escape(display.label) + '</span>' +
      (display.note ? '<span class="dr-workflow-hint">' + escape(display.note) + '</span>' : '') + '</div>';
  }
  window.railRenderWorkflowCell = rec => workflowMarkup(rec,true);

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
        escape(category) + '"' + checked + ' onchange="scheduleDivisionReportRender()">' +
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

  // Cache only this report's derived read-only data. Existing Firestore listener creates
  // a new records array whenever cloud data changes, so a fresh snapshot is picked up
  // automatically. This avoids repeatedly parsing every date for each checkbox click.
  let preparedCache = null;
  let cachedSource = null;
  let cachedLength = -1;
  function preparedReportRecords() {
    const source = reportSourceRecords();
    if (preparedCache && source === cachedSource && source.length === cachedLength) {
      return preparedCache;
    }
    const rows = [];
    const financialYears = new Set();
    for (const rec of source) {
      const date = parseReportDate(typeof getReportingDate === 'function' ? getReportingDate(rec) : rec.date);
      if (!date) continue;
      financialYears.add(date.fy);
      const division = canonicalDivision(rec.division);
      if (!division) continue;
      const rawCategory = clean(rec.category).toUpperCase();
      const category = rawCategory === 'PCSTE DISPENSATION' ? 'DISPENSATION' : rawCategory;
      rows.push({
        fy:date.fy, division,
        station:clean(rec.station) || clean(rec.wagon) || clean(rec.department),
        category, work:clean(rec.work) || clean(rec.description), agency:clean(rec.agency),
        workflow:workflowFor(rec), date:date.text, time:date.time
      });
    }
    rows.sort((a,b) => a.time-b.time ||
      a.station.localeCompare(b.station) || a.category.localeCompare(b.category));
    cachedSource = source;
    cachedLength = source.length;
    preparedCache = {rows, financialYears};
    return preparedCache;
  }

  function getReportData() {
    const fy = byId('divisionReportFY').value;
    const selectedDivision = byId('divisionReportDivision').value;
    const allowedCategories = selectedCategories();
    const divisions = selectedDivision === 'ALL' ? DIVISIONS : [selectedDivision];
    const grouped = Object.fromEntries(divisions.map(div => [div, []]));
    for (const row of preparedReportRecords().rows) {
      if (row.fy !== fy || !allowedCategories.has(row.category) || !Object.prototype.hasOwnProperty.call(grouped, row.division)) continue;
      grouped[row.division].push(row);
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
    for (const fy of preparedReportRecords().financialYears) years.add(fy);
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

  let pendingRender = null;
  function scheduleRender() {
    if (pendingRender !== null) clearTimeout(pendingRender);
    pendingRender = setTimeout(() => { pendingRender = null; render(); }, 70);
  }

  // Each division uses a real THEAD. Browsers repeat THEAD when a table flows
  // onto another printed page, retaining the correct division and column labels.
  function reportColumnGroup() {
    return '<colgroup><col class="dr-col-sn"><col class="dr-col-station">' +
      '<col class="dr-col-approval"><col class="dr-col-work"><col class="dr-col-agency">' +
      '<col class="dr-col-authority"><col class="dr-col-date"></colgroup>';
  }

  function render() {
    if (!byId('divisionReportRows') || !byId('divisionReportFY').value) return;
    initCategorySelector();
    const {fy, divisions, grouped, selectedCount} = getReportData();
    const visibleDivisions = divisions.filter(div => grouped[div].length > 0);
    const reportRoot = byId('divisionReportRows');
    byId('divisionReportSelectedCount').textContent = selectedCount + ' OF ' + ALL_CATEGORIES.length + ' SELECTED';
    byId('divisionReportExcelBtn').disabled = selectedCount === 0;
    const printBtn = byId('divisionReportPrintBtn');
    if (printBtn) printBtn.disabled = selectedCount === 0;
    if (!selectedCount) {
      reportRoot.innerHTML = '<div class="dr-no-selection dr-message">SELECT AT LEAST ONE FILE / APPROVAL TYPE TO GENERATE THE REPORT.</div>';
      setStatus('No categories selected. Select at least one file / approval type.');
      return;
    }

    const total = divisions.reduce((sum, div) => sum + grouped[div].length, 0);
    const html = [];
    // One-time document heading; never part of the repeating print table THEAD.
    html.push('<header class="dr-report-intro">' +
      '<div class="dr-report-main-title">DIVISION-WISE REPORT OF FY ' + escape(fullFY(fy)) + '</div>' +
      '<div class="dr-report-grand-total">TOTAL RECORDS: ' + total + '</div>' +
      '</header>');
    if (!visibleDivisions.length) {
      html.push('<div class="dr-no-results dr-message">NO RECORDS FOUND FOR THE SELECTED FY, DIVISION AND FILE TYPES.</div>');
    }
    for (let divIndex = 0; divIndex < visibleDivisions.length; divIndex++) {
      const div = visibleDivisions[divIndex];
      const entries = grouped[div];
      // Division heading occurs ONCE per division. Only column headings are
      // children of THEAD and hence repeated on subsequent printed pages.
      html.push('<section class="dr-division-block" aria-label="Division ' + escape(div) + '">' +
        '<h4 class="dr-division-heading">DIVISION: ' + escape(div.toUpperCase()) + '</h4>' +
        '<div class="dr-mobile-table-note">SWIPE LEFT / RIGHT TO VIEW ALL TABLE COLUMNS</div>' +
        '<div class="dr-report-table-wrap" role="region" aria-label="' + escape(div) + ' report table, scroll horizontally" tabindex="0">' +
        '<table class="dr-report-table dr-division-table">' + reportColumnGroup() +
        '<thead class="dr-print-repeat"><tr class="dr-fields">' +
        COLUMNS.map(name => '<th scope="col">' + escape(name) + '</th>').join('') +
        '</tr></thead><tbody>');
      for (let index = 0; index < entries.length; index++) {
        const row = entries[index];
        const values = [index + 1, row.station, row.category, row.work, row.agency, row.workflow, row.date];
        html.push('<tr class="dr-record' + (divIndex === visibleDivisions.length - 1 && index === entries.length - 1 ? ' dr-last-record' : '') + '">' +
          values.map((value,col) => '<td data-label="' + escape(COLUMNS[col]) + '" class="' +
            (col===0?'dr-sn':col===2?'dr-type':col===5?'dr-outcome':col===6?'dr-date':'') + '">' +
            (col===5 ? workflowMarkup(value) : escape(value)) + '</td>').join('') + '</tr>');
      }
      if (divIndex === visibleDivisions.length - 1) {
        html.push('<tr class="dr-prepared-row"><td colspan="7">' +
          '<div class="dr-prepared-by"><span>PREPARED BY</span><strong>SSE/Signal/QA</strong></div>' +
          '</td></tr>');
      }
      html.push('</tbody></table></div></section>');
    }
    if (!visibleDivisions.length) {
      html.push('<div class="dr-prepared-by"><span>PREPARED BY</span><strong>SSE/Signal/QA</strong></div>');
    }
    reportRoot.innerHTML = html.join('');
    const labels = divisions.map(div => div.toUpperCase() + ': ' + grouped[div].length).join('  |  ');
    setStatus('FY ' + fullFY(fy) + '   •   ' + selectedCount + ' selected categories   •   ' + total +
      ' records   •   ' + labels +
      '   •   Records must have a saved division and valid date.');
  }

  function open() {
    initCategorySelector();
    updateFYChoices();
    byId('divisionReportDivision').value = 'ALL';
    byId('divisionReportFilterPanel').hidden = true;
    byId('divisionReportFilterToggle').setAttribute('aria-expanded','false');
    render();
    byId('divisionReportModal').style.display = 'flex';
    try { history.pushState({view:'modal', modal:'divisionReport'}, '', ''); } catch (err) { console.warn('History unavailable', err); }
  }
  function close() {
    if (pendingRender !== null) { clearTimeout(pendingRender); pendingRender = null; }
    byId('divisionReportModal').style.display = 'none';
  }

  // Print orientation is a report-only choice; screen, other print flows and
  // Excel export keep their existing behaviour.
  function print() {
    const chooser = byId('divisionReportPrintOrientation');
    const orientation = chooser && chooser.value === 'portrait' ? 'portrait' : 'landscape';
    const modeClass = orientation === 'portrait' ? 'dr-print-portrait' : 'dr-print-landscape';
    document.body.classList.add('printing-division-report', modeClass);

    // Browser print preview follows the orientation selected in the report.
    // This style is temporary and does not affect other website printing.
    const previousStyle = byId('divisionReportPrintPageSize');
    if (previousStyle) previousStyle.remove();
    const pageStyle = document.createElement('style');
    pageStyle.id = 'divisionReportPrintPageSize';
    const margins = orientation === 'portrait' ? '10mm 8mm 16mm' : '10mm 9mm 16mm';
    pageStyle.textContent = '@page { size: A4 ' + orientation + '; margin: ' + margins + '; ' +
      '@bottom-center { content: counter(page) " of " counter(pages); font-family: "Times New Roman", serif; font-size: 10pt; color: #243747; } }';
    document.head.appendChild(pageStyle);

    let cleaned = false;
    const cleanPrintState = () => {
      if (cleaned) return;
      cleaned = true;
      document.body.classList.remove('printing-division-report', modeClass);
      pageStyle.remove();
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
        {width:7}, {width:21}, {width:20}, {width:52},
        {width:16}, {width:25}, {width:15}
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
          cell.font = {name:'Times New Roman',size:options.size || 11,bold:!!options.bold,color:{argb:color}};
          cell.alignment = {vertical:'middle',horizontal:'center',wrapText:true};
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
      // First page order: FY heading -> TOTAL RECORDS -> DIVISION -> COLUMN HEADER.
      // Excel repeats ONLY row 4 on subsequent printed pages.
      const populatedDivisions = divisions.filter(d => grouped[d].length);
      ws.mergeCells('A3:G3');
      const firstDivisionRow = ws.getRow(3);
      firstDivisionRow.height = 28;
      firstDivisionRow.getCell(1).value = populatedDivisions.length
        ? 'DIVISION: ' + populatedDivisions[0].toUpperCase() : 'NO DIVISION DATA';
      outlineRow(firstDivisionRow,{fill:PALE,color:NAVY,size:12,bold:true,center:true});
      const globalHeader = ws.getRow(4);
      COLUMNS.forEach((col,i) => {globalHeader.getCell(i+1).value = col;});
      outlineRow(globalHeader,{fill:BLUE,color:WHITE,size:10,bold:true});
      globalHeader.height = 34;
      ws.pageSetup.printTitlesRow = '4:4';
      ws.headerFooter.oddFooter = '&CPage &P of &N';
      ws.views = [{state:'frozen',ySplit:4,showGridLines:false}];
      let rowIndex = 5;
      for (let divIndex=0; divIndex<populatedDivisions.length; divIndex++) {
        const div = populatedDivisions[divIndex];
        // First division was already written immediately after TOTAL RECORDS.
        if (divIndex > 0) {
          ws.mergeCells('A'+rowIndex+':G'+rowIndex);
          const divRow = ws.getRow(rowIndex);
          divRow.height = 28;
          divRow.getCell(1).value = 'DIVISION: ' + div.toUpperCase();
          outlineRow(divRow,{fill:PALE,color:NAVY,size:12,bold:true,center:true});
          rowIndex++;
        }
        const entries = grouped[div];
        for (let i=0; i<entries.length; i++) {
          const r = entries[i];
          const display = workflowPresentation(r.workflow);
          const detail = [display.label];
          if (display.note) detail.push(display.note);
          const values = [i+1,excelText(r.station),excelText(r.category),excelText(r.work),excelText(r.agency),excelText(detail.join('\n')),r.date];
          const row = ws.getRow(rowIndex++);
          values.forEach((v,j) => {row.getCell(j+1).value = v;});
          outlineRow(row,{fill: i%2===1 ? 'FFF5F9FC' : WHITE});
          const workLines = Math.max(1, Math.ceil(r.work.length / 52));
          const outcomeLines = Math.max(1, Math.ceil(display.label.length / 25) + (display.note ? Math.ceil(display.note.length / 25) : 0));
          row.height = Math.min(105,Math.max(26,workLines*15,outcomeLines*15));
        }
      }
      if (rowIndex === 5) {
        ws.mergeCells('A5:G5');
        ws.getCell('A5').value = 'NO RECORDS FOUND FOR THE SELECTED FILTERS';
        outlineRow(ws.getRow(5),{fill:LIGHT,color:BLUE,bold:true,center:true});
        rowIndex++;
      }
      // A single, right-aligned signature designation follows the last record.
      rowIndex++;
      ws.mergeCells('F'+rowIndex+':G'+rowIndex);
      const preparedLabel = ws.getRow(rowIndex);
      preparedLabel.getCell(6).value = 'PREPARED BY';
      preparedLabel.getCell(6).alignment = {horizontal:'center',vertical:'middle'};
      preparedLabel.getCell(6).font = {name:'Times New Roman',size:11,bold:true,color:{argb:INK}};
      rowIndex++;
      ws.mergeCells('F'+rowIndex+':G'+rowIndex);
      const preparedName = ws.getRow(rowIndex);
      preparedName.getCell(6).value = 'SSE/Signal/QA';
      preparedName.getCell(6).alignment = {horizontal:'center',vertical:'middle'};
      preparedName.getCell(6).font = {name:'Times New Roman',size:12,bold:true,color:{argb:INK}};
      preparedName.height = 23;
      rowIndex++;
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
  window.scheduleDivisionReportRender = scheduleRender;
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
