// ======================= ГЛОБАЛЬНЫЕ ДАННЫЕ И НАСТРОЙКИ =======================
let tableData = [];
let certConfig = {
    align: 'center',
    width: 140, // По умолчанию уменьшен, чтобы влезло 2 на лист
    height: 90,
    bgImage: null,
    degree: { enabled: true, text: '1 место' },
    colors: { title: '#2c3e50', degree: '#e67e22', name: '#2980b9', body: '#555555', footer: '#777777' }
};
let currentPage = 0;
const rowsPerPage = 10;

// ======================= ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ =======================
function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function downloadFile(blob, name) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 100);
}

function syncColorPickersFromConfig() {
    ['title', 'degree', 'name', 'body', 'footer'].forEach(type => {
        const el = document.getElementById(`${type}Color`);
        const valEl = document.getElementById(`${type}ColorVal`);
        if (el) el.value = certConfig.colors[type];
        if (valEl) valEl.innerText = certConfig.colors[type];
    });
}

function resetColor(type) {
    const defaults = { title: '#2c3e50', degree: '#e67e22', name: '#2980b9', body: '#555555', footer: '#777777' };
    certConfig.colors[type] = defaults[type];
    localStorage.setItem('certColors', JSON.stringify(certConfig.colors));
    syncColorPickersFromConfig();
    renderPreview();
}

function saveDegreeConfig() { localStorage.setItem('certDegree', JSON.stringify(certConfig.degree)); }

// ======================= УПРАВЛЕНИЕ СТЕПЕНЬЮ =======================
function toggleDegree() {
    certConfig.degree.enabled = document.getElementById('showDegree').checked;
    document.getElementById('degreeSelect').disabled = !certConfig.degree.enabled;
    document.getElementById('customDegreeInput').style.display = certConfig.degree.enabled && document.getElementById('degreeSelect').value === 'custom' ? 'block' : 'none';
    saveDegreeConfig();
    renderPreview();
}

function updateDegree() {
    const select = document.getElementById('degreeSelect');
    const input = document.getElementById('customDegreeInput');
    certConfig.degree.text = select.value === 'custom' ? (input.value || 'Ваше место') : select.value;
    input.style.display = select.value === 'custom' ? 'block' : 'none';
    saveDegreeConfig();
    renderPreview();
}

function updateDegreeCustom(val) {
    certConfig.degree.text = val.trim();
    saveDegreeConfig();
    renderPreview();
}

// ======================= ИНИЦИАЛИЗАЦИЯ =======================
document.addEventListener('DOMContentLoaded', () => {
    const savedColors = localStorage.getItem('certColors');
    if (savedColors) try { certConfig.colors = { ...certConfig.colors, ...JSON.parse(savedColors) }; } catch(e) {}
    syncColorPickersFromConfig();

    ['title', 'degree', 'name', 'body', 'footer'].forEach(type => {
        const el = document.getElementById(`${type}Color`);
        if (el) el.addEventListener('input', function(e) {
            certConfig.colors[type] = e.target.value;
            document.getElementById(`${type}ColorVal`).innerText = e.target.value;
            localStorage.setItem('certColors', JSON.stringify(certConfig.colors));
            renderPreview();
        });
    });

    const savedDegree = localStorage.getItem('certDegree');
    if (savedDegree) try { certConfig.degree = { ...certConfig.degree, ...JSON.parse(savedDegree) }; } catch(e) {}
    const showDegChk = document.getElementById('showDegree');
    if (showDegChk) showDegChk.checked = certConfig.degree.enabled;
    toggleDegree();

    const stored = localStorage.getItem('excelDataForCertificate');
    if (stored) {
        try {
            tableData = JSON.parse(stored);
            if (tableData.length > 1) {
                document.getElementById('generateCertBtn').disabled = false;
                document.getElementById('hintText').textContent = `Строк: ${tableData.length - 1}`;
            }
        } catch (e) {}
    } else {
        tableData = [['ФИО Участника', 'Название курса', 'Дата'], ['Иванов Иван', 'Курс JS', '24.04.2026']];
        localStorage.setItem('excelDataForCertificate', JSON.stringify(tableData));
    }
    renderTable();
    renderPreview();
});

// ======================= EXCEL & ТАБЛИЦА =======================
document.getElementById('excelFile')?.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
        const data = new Uint8Array(ev.target.result);
        const wb = XLSX.read(data, { type: 'array' });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
        if (json.length > 0) {
            tableData = json;
            localStorage.setItem('excelDataForCertificate', JSON.stringify(tableData));
            currentPage = 0;
            document.getElementById('generateCertBtn').disabled = false;
            document.getElementById('hintText').textContent = `Строк: ${tableData.length - 1}`;
            renderTable();
            renderPreview();
        }
    };
    reader.readAsArrayBuffer(file);
    this.value = '';
});

function addColumn() {
    if (!tableData.length) tableData = [['Колонка 1'], ['']];
    const colName = prompt("Название колонки:", `Колонка ${tableData[0].length + 1}`);
    if (!colName) return;
    tableData.forEach((row, idx) => idx === 0 ? row.push(colName) : row.push(''));
    saveAndRenderTable();
}
function deleteColumn(colIdx) {
    if (tableData[0].length <= 1) return alert("Нельзя удалить последнюю колонку!");
    if (!confirm("Удалить колонку?")) return;
    tableData.forEach(row => row.splice(colIdx, 1));
    saveAndRenderTable();
}
function deleteRow(rowIdx) {
    if (tableData.length <= 1) return alert("Нет строк для удаления!");
    if (!confirm("Удалить строку?")) return;
    tableData.splice(rowIdx + 1, 1);
    saveAndRenderTable();
}
function resetTable() {
    if (!confirm("Сбросить таблицу?")) return;
    tableData = [tableData[0] || ['Колонка 1']];
    currentPage = 0;
    saveAndRenderTable();
    document.getElementById('generateCertBtn').disabled = true;
    document.getElementById('hintText').textContent = 'Загрузите Excel для начала';
    renderPreview();
}
function saveAndRenderTable() {
    localStorage.setItem('excelDataForCertificate', JSON.stringify(tableData));
    renderTable();
    renderPreview();
    const hint = document.getElementById('hintText');
    const btn = document.getElementById('generateCertBtn');
    if (hint) hint.textContent = tableData.length > 1 ? `Строк: ${tableData.length - 1}` : 'Нет данных';
    if (btn) btn.disabled = tableData.length <= 1;
}

function renderTable() {
    const thead = document.getElementById('tableHead');
    const tbody = document.getElementById('tableBody');
    if (!thead || !tbody) return;
    if (!tableData.length) {
        thead.innerHTML = '<th>Нет данных</th>';
        tbody.innerHTML = '';
        updatePaginationUI();
        return;
    }
    thead.innerHTML = tableData[0].map((h, i) => 
        `<th><div><span contenteditable="true" onblur="updateHeader(${i}, this.textContent)">${escapeHtml(h)}</span><button class="del-col" onclick="deleteColumn(${i})">×</button></div></th>`
    ).join('');

    const dataRows = tableData.slice(1);
    const start = currentPage * rowsPerPage;
    const pageData = dataRows.slice(start, start + rowsPerPage);

    tbody.innerHTML = pageData.map((row, idx) => {
        const realIdx = start + idx + 1;
        const cells = row.map((cell, cIdx) => `<td contenteditable="true" data-row="${realIdx}" data-col="${cIdx}">${escapeHtml(cell ?? '')}</td>`).join('');
        return `<tr>${cells}<td style="width:40px;text-align:center;"><button class="del-row-btn" onclick="deleteRow(${realIdx})">❌</button></td></tr>`;
    }).join('');

    tbody.querySelectorAll('td[contenteditable="true"]').forEach(td => td.onblur = handleCellBlur);
    updatePaginationUI();
}

function handleCellBlur() {
    const r = parseInt(this.dataset.row);
    const c = parseInt(this.dataset.col);
    if (tableData[r] && !isNaN(r) && !isNaN(c)) {
        tableData[r][c] = this.textContent;
        localStorage.setItem('excelDataForCertificate', JSON.stringify(tableData));
        if (r === 1) renderPreview();
    }
}
function updateHeader(colIdx, newText) {
    if (tableData[0] && colIdx >= 0 && colIdx < tableData[0].length) {
        tableData[0][colIdx] = newText.trim();
        localStorage.setItem('excelDataForCertificate', JSON.stringify(tableData));
    }
}
function updatePaginationUI() {
    const total = Math.max(0, tableData.length - 1);
    const pages = Math.ceil(total / rowsPerPage) || 1;
    document.getElementById('pageInfo').textContent = `Страница ${currentPage + 1} из ${pages}`;
    document.getElementById('prevBtn').disabled = currentPage === 0;
    document.getElementById('nextBtn').disabled = currentPage >= pages - 1;
}
function changePage(delta) {
    const pages = Math.ceil(Math.max(0, tableData.length - 1) / rowsPerPage) || 1;
    const newPage = currentPage + delta;
    if (newPage >= 0 && newPage < pages) { currentPage = newPage; renderTable(); }
}

// ======================= НАСТРОЙКИ =======================
function setAlign(align) {
    certConfig.align = align;
    document.querySelectorAll('.btn-group button').forEach(b => b.classList.remove('active'));
    document.getElementById(`btn-${align}`).classList.add('active');
    renderPreview();
}
function toggleBgInput() {
    const type = document.querySelector('input[name="bgType"]:checked')?.value;
    document.getElementById('bgFileInput').style.display = type === 'file' ? 'block' : 'none';
    document.getElementById('bgUrlInput').style.display = type === 'url' ? 'block' : 'none';
}
function handleBgFile(input) {
    if (!input.files?.[0]) return;
    const reader = new FileReader();
    reader.onload = (e) => { certConfig.bgImage = e.target.result; renderPreview(); };
    reader.readAsDataURL(input.files[0]);
}
function handleBgUrl(url) { if (url) { certConfig.bgImage = url.trim(); renderPreview(); } }
function clearBg() { certConfig.bgImage = null; renderPreview(); }

function updateSizeSettings() {
    const val = document.getElementById('sizeSelect').value;
    const customDiv = document.getElementById('customSizeDiv');
    if (val === 'custom') {
        customDiv.style.display = 'flex';
        certConfig.width = parseFloat(document.getElementById('customW').value) || 140;
        certConfig.height = parseFloat(document.getElementById('customH').value) || 90;
    } else {
        customDiv.style.display = 'none';
        certConfig.width = val === 'a4-l' ? 297 : 210;
        certConfig.height = val === 'a4-l' ? 210 : 297;
    }
    renderPreview();
}
document.getElementById('customW')?.addEventListener('input', updateSizeSettings);
document.getElementById('customH')?.addEventListener('input', updateSizeSettings);

// ======================= ПРЕДПРОСМОТР =======================
function renderPreview() {
    const container = document.getElementById('certificatePreview');
    if (!container) return;
    container.innerHTML = '';

    const maxWidth = Math.min(container.parentElement?.clientWidth - 40 || 800, 800);
    const ratio = certConfig.width / certConfig.height;
    container.style.width = `${maxWidth}px`;
    container.style.height = `${maxWidth / ratio}px`;
    container.style.position = 'relative';
    container.style.background = '#fff';

    if (certConfig.bgImage) {
        const img = document.createElement('img');
        img.src = certConfig.bgImage;
        img.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;z-index:0;';
        img.crossOrigin = "anonymous";
        container.appendChild(img);
    }

    const row = tableData[1] || tableData[0] || ['Имя', 'Описание'];
    const content = document.createElement('div');
    content.style.cssText = `position:relative;z-index:1;padding:40px;width:100%;height:100%;display:flex;flex-direction:column;justify-content:center;text-align:${certConfig.align};align-items:${certConfig.align==='left'?'flex-start':certConfig.align==='right'?'flex-end':'center'};box-sizing:border-box;`;

    const degreeHtml = certConfig.degree.enabled 
        ? `<div style="font-size:24px;font-weight:600;color:${certConfig.colors.degree};margin-bottom:10px;text-transform:uppercase;background:rgba(255,255,255,0.8);padding:4px 12px;border-radius:15px;box-shadow:0 2px 5px rgba(0,0,0,0.1);">${escapeHtml(certConfig.degree.text)}</div>`
        : '';

    const name = row[0] || 'Имя Участника';
    const bodyParts = row.slice(1).filter(v => String(v).trim()).map(v => escapeHtml(v));
    const bodyHtml = bodyParts.length > 0 ? bodyParts.join('<br>') : 'Описание из Excel';

    content.innerHTML = `
        <div style="font-size:36px;font-weight:bold;color:${certConfig.colors.title};margin-bottom:5px;text-transform:uppercase;letter-spacing:2px;">СЕРТИФИКАТ</div>
        ${degreeHtml}
        <div style="font-size:30px;color:${certConfig.colors.name};margin-bottom:15px;font-style:italic;border-bottom:2px solid ${certConfig.colors.name};display:inline-block;padding-bottom:5px;">${escapeHtml(name)}</div>
        <div style="font-size:16px;color:${certConfig.colors.body};line-height:1.6;margin-bottom:30px;white-space:pre-wrap;">${bodyHtml}</div>
        <div style="margin-top:auto;display:flex;justify-content:space-between;font-size:14px;color:${certConfig.colors.footer};border-top:1px solid rgba(0,0,0,0.1);padding-top:15px;">
            <span>Дата: ${new Date().toLocaleDateString('ru-RU')}</span><span>Подпись: _________________</span>
        </div>`;
    container.appendChild(content);
}

// ======================= ГЕНЕРАЦИЯ С СЕТКОЙ А4 =======================
async function generateCertificates() {
    const dataRows = tableData.slice(1).filter(r => r?.some(c => String(c).trim()));
    if (!dataRows.length) return alert("Нет данных для генерации!");
    
    const btn = document.getElementById('generateCertBtn');
    btn.disabled = true;
    btn.textContent = '⏳ Подготовка...';
    const format = document.getElementById('exportFormat')?.value || 'pdf';
    
    const tempDiv = document.createElement('div');
    tempDiv.style.cssText = 'position:absolute;left:-9999px;top:-9999px;';
    document.body.appendChild(tempDiv);

    try {
        const { jsPDF } = window.jspdf;
        const scale = 2.5;
        const wPx = certConfig.width * 3.78 * scale;
        const hPx = certConfig.height * 3.78 * scale;
        
        const degreeHtml = certConfig.degree.enabled 
            ? `<div style="font-size:${24*scale}px;font-weight:600;color:${certConfig.colors.degree};margin-bottom:${10*scale}px;text-transform:uppercase;background:rgba(255,255,255,0.85);padding:${4*scale}px ${12*scale}px;border-radius:15px;box-shadow:0 2px 5px rgba(0,0,0,0.1);">${escapeHtml(certConfig.degree.text)}</div>`
            : '';

        // Расчет сетки для А4
        const A4_W = 297, A4_H = 210;
        const cols = Math.max(1, Math.floor(A4_W / certConfig.width));
        const rows = Math.max(1, Math.floor(A4_H / certConfig.height));
        const perSheet = cols * rows;

        // Генерация канвасов для всех строк
        const canvases = [];
        for (let i = 0; i < dataRows.length; i++) {
            btn.textContent = `⏳ ${i + 1}/${dataRows.length}...`;
            const row = dataRows[i];
            const wrapper = document.createElement('div');
            wrapper.style.cssText = `width:${wPx}px;height:${hPx}px;position:relative;background:#fff;overflow:hidden;font-family:'Segoe UI',sans-serif;`;
            
            if (certConfig.bgImage) {
                const bg = document.createElement('img');
                bg.src = certConfig.bgImage;
                bg.style.cssText = 'width:100%;height:100%;object-fit:cover;position:absolute;top:0;left:0;';
                bg.crossOrigin = "anonymous";
                wrapper.appendChild(bg);
                await new Promise(res => bg.complete ? res() : bg.onload = res);
            }

            const contentDiv = document.createElement('div');
            const p = 40 * scale;
            contentDiv.style.cssText = `position:relative;z-index:2;padding:${p}px;display:flex;flex-direction:column;justify-content:center;text-align:${certConfig.align};align-items:${certConfig.align==='left'?'flex-start':certConfig.align==='right'?'flex-end':'center'};height:100%;box-sizing:border-box;background:transparent;`;
            
            const nameVal = row[0] || 'Участник';
            const bodyParts = row.slice(1).filter(v => String(v).trim()).map(v => escapeHtml(v));
            const bodyHtml = bodyParts.length > 0 ? bodyParts.join('<br>') : 'Завершил(а) курс успешно';
            
            contentDiv.innerHTML = `
                <div style="font-size:${36*scale}px;font-weight:bold;color:${certConfig.colors.title};margin-bottom:5px;text-transform:uppercase;letter-spacing:2px;">СЕРТИФИКАТ</div>
                ${degreeHtml}
                <div style="font-size:${30*scale}px;color:${certConfig.colors.name};margin-bottom:15px;font-style:italic;border-bottom:2px solid ${certConfig.colors.name};display:inline-block;padding-bottom:5px;">${escapeHtml(nameVal)}</div>
                <div style="font-size:${18*scale}px;color:${certConfig.colors.body};line-height:1.6;margin-bottom:30px;white-space:pre-wrap;">${bodyHtml}</div>
                <div style="margin-top:auto;display:flex;justify-content:space-between;font-size:${15*scale}px;color:${certConfig.colors.footer};border-top:1px solid rgba(0,0,0,0.15);padding-top:15px;">
                    <span>Дата: ${new Date().toLocaleDateString('ru-RU')}</span><span>Подпись: _________________</span>
                </div>`;
            wrapper.appendChild(contentDiv);
            tempDiv.appendChild(wrapper);
            await new Promise(r => setTimeout(r, 50));
            const canvas = await html2canvas(wrapper, { scale: 1.5, useCORS: true, allowTaint: false, logging: false, backgroundColor: '#ffffff' });
            canvases.push(canvas);
            tempDiv.innerHTML = '';
        }

        // Экспорт
        if (format === 'pdf' && perSheet > 1) {
            const pdf = new jsPDF({ orientation: 'l', unit: 'mm', format: [A4_W, A4_H] });
            for (let i = 0; i < canvases.length; i += perSheet) {
                if (i > 0) pdf.addPage();
                const pageCans = canvases.slice(i, i + perSheet);
                for (let j = 0; j < pageCans.length; j++) {
                    const col = j % cols;
                    const row = Math.floor(j / cols);
                    const x = col * certConfig.width;
                    const y = row * certConfig.height;
                    pdf.addImage(pageCans[j].toDataURL('image/jpeg', 0.95), 'JPEG', x, y, certConfig.width, certConfig.height);
                }
            }
            pdf.save(`Сертификаты_А4.pdf`);
        } else {
            // Один на лист или изображения
            if (format === 'pdf') {
                const orient = certConfig.width > certConfig.height ? 'l' : 'p';
                const pdf = new jsPDF({ orientation: orient, unit: 'mm', format: [certConfig.width, certConfig.height] });
                canvases.forEach((c, idx) => {
                    if (idx > 0) pdf.addPage();
                    pdf.addImage(c.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, certConfig.width, certConfig.height);
                });
                pdf.save(`Сертификаты.pdf`);
            } else {
                const zip = new JSZip();
                const mime = format === 'png' ? 'image/png' : 'image/jpeg';
                const ext = format === 'png' ? 'png' : 'jpg';
                const blobPromises = canvases.map((c, idx) => 
                    new Promise(res => c.toBlob(blob => zip.file(`Сертификат_${idx+1}.${ext}`, blob), mime, 0.95))
                );
                await Promise.all(blobPromises);
                downloadFile(await zip.generateAsync({ type: 'blob' }), `Сертификаты_${format}.zip`);
            }
        }
    } catch (err) {
        console.error(err);
        alert('Ошибка генерации: ' + err.message);
    } finally {
        if (document.body.contains(tempDiv)) document.body.removeChild(tempDiv);
        btn.disabled = false;
        btn.textContent = '📥 Скачать сертификаты';
    }
}