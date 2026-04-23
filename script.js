// ======================= ГЛОБАЛЬНЫЕ ДАННЫЕ И НАСТРОЙКИ =======================
let tableData = [];
let certConfig = { 
    align: 'center', 
    width: 297, 
    height: 210, 
    bgImage: null,
    colors: {
        title: '#2c3e50',
        name: '#2980b9',
        body: '#555555',
        footer: '#777777'
    }
};
let currentPage = 0;
const rowsPerPage = 10;

// ======================= ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ =======================
function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    }).replace(/[\n]/g, '<br>');
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
    const titleColor = document.getElementById('titleColor');
    const nameColor = document.getElementById('nameColor');
    const bodyColor = document.getElementById('bodyColor');
    const footerColor = document.getElementById('footerColor');
    const titleColorVal = document.getElementById('titleColorVal');
    const nameColorVal = document.getElementById('nameColorVal');
    const bodyColorVal = document.getElementById('bodyColorVal');
    const footerColorVal = document.getElementById('footerColorVal');
    
    if (titleColor) {
        titleColor.value = certConfig.colors.title;
        if (titleColorVal) titleColorVal.innerText = certConfig.colors.title;
    }
    if (nameColor) {
        nameColor.value = certConfig.colors.name;
        if (nameColorVal) nameColorVal.innerText = certConfig.colors.name;
    }
    if (bodyColor) {
        bodyColor.value = certConfig.colors.body;
        if (bodyColorVal) bodyColorVal.innerText = certConfig.colors.body;
    }
    if (footerColor) {
        footerColor.value = certConfig.colors.footer;
        if (footerColorVal) footerColorVal.innerText = certConfig.colors.footer;
    }
}

function resetColor(type) {
    const defaults = { title: '#2c3e50', name: '#2980b9', body: '#555555', footer: '#777777' };
    certConfig.colors[type] = defaults[type];
    localStorage.setItem('certColors', JSON.stringify(certConfig.colors));
    syncColorPickersFromConfig();
    renderPreview();
}

// ======================= ИНИЦИАЛИЗАЦИЯ =======================
document.addEventListener('DOMContentLoaded', () => {
    // Загрузка цветов из localStorage
    const savedColors = localStorage.getItem('certColors');
    if (savedColors) {
        try {
            const cols = JSON.parse(savedColors);
            certConfig.colors = { ...certConfig.colors, ...cols };
        } catch(e) {
            console.error('Ошибка загрузки цветов:', e);
        }
    }
    
    syncColorPickersFromConfig();
    
    // Добавляем обработчики изменения цвета
    const colorElements = [
        { id: 'titleColor', key: 'title' },
        { id: 'nameColor', key: 'name' },
        { id: 'bodyColor', key: 'body' },
        { id: 'footerColor', key: 'footer' }
    ];
    
    colorElements.forEach(item => {
        const el = document.getElementById(item.id);
        if (el) {
            el.addEventListener('input', function(e) {
                certConfig.colors[item.key] = e.target.value;
                const valSpan = document.getElementById(`${item.id}Val`);
                if (valSpan) valSpan.innerText = e.target.value;
                localStorage.setItem('certColors', JSON.stringify(certConfig.colors));
                renderPreview();
            });
        }
    });
    
    // Загрузка данных из localStorage
    const stored = localStorage.getItem('excelDataForCertificate');
    if (stored) {
        try {
            tableData = JSON.parse(stored);
            if (tableData.length > 1) {
                const generateBtn = document.getElementById('generateCertBtn');
                const hintText = document.getElementById('hintText');
                if (generateBtn) generateBtn.disabled = false;
                if (hintText) hintText.textContent = `Строк: ${tableData.length - 1}`;
            }
        } catch (e) { 
            console.error('Ошибка загрузки данных:', e);
        }
    } else {
        tableData = [
            ['ФИО Участника', 'Название курса', 'Дата окончания'],
            ['Иванов Иван', 'Курс JavaScript', '23.04.2026'],
            ['Петрова Анна', 'Курс Дизайн', '23.04.2026']
        ];
        localStorage.setItem('excelDataForCertificate', JSON.stringify(tableData));
    }
    renderTable();
    renderPreview();
});

// ======================= ЗАГРУЗКА EXCEL =======================
const excelFileInput = document.getElementById('excelFile');
if (excelFileInput) {
    excelFileInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            const data = new Uint8Array(ev.target.result);
            const wb = XLSX.read(data, { type: 'array' });
            const sheet = wb.Sheets[wb.SheetNames[0]];
            let json = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
            
            if (json.length > 0) {
                tableData = json;
                localStorage.setItem('excelDataForCertificate', JSON.stringify(tableData));
                currentPage = 0;
                const generateBtn = document.getElementById('generateCertBtn');
                const hintText = document.getElementById('hintText');
                if (generateBtn) generateBtn.disabled = false;
                if (hintText) hintText.textContent = `Строк: ${tableData.length - 1}`;
                renderTable();
                renderPreview();
            }
        };
        reader.readAsArrayBuffer(file);
        this.value = '';
    });
}

// ======================= НАСТРОЙКИ =======================
function setAlign(align) {
    certConfig.align = align;
    const buttons = document.querySelectorAll('.btn-group button');
    buttons.forEach(b => b.classList.remove('active'));
    const activeBtn = document.getElementById(`btn-${align}`);
    if (activeBtn) activeBtn.classList.add('active');
    renderPreview();
}

function toggleBgInput() {
    const selected = document.querySelector('input[name="bgType"]:checked');
    if (!selected) return;
    const type = selected.value;
    const bgFileInput = document.getElementById('bgFileInput');
    const bgUrlInput = document.getElementById('bgUrlInput');
    if (bgFileInput) bgFileInput.style.display = type === 'file' ? 'block' : 'none';
    if (bgUrlInput) bgUrlInput.style.display = type === 'url' ? 'block' : 'none';
}

function handleBgFile(input) {
    if (!input.files || !input.files[0]) return;
    const reader = new FileReader();
    reader.onload = (e) => { 
        certConfig.bgImage = e.target.result; 
        renderPreview(); 
    };
    reader.readAsDataURL(input.files[0]);
}

function handleBgUrl(url) { 
    if (url) {
        certConfig.bgImage = url.trim(); 
        renderPreview();
    }
}

function clearBg() { 
    certConfig.bgImage = null; 
    renderPreview(); 
}

function updateSizeSettings() {
    const sizeSelect = document.getElementById('sizeSelect');
    const customDiv = document.getElementById('customSizeDiv');
    if (!sizeSelect) return;
    
    const val = sizeSelect.value;
    if (val === 'custom') {
        if (customDiv) customDiv.style.display = 'flex';
        const customW = document.getElementById('customW');
        const customH = document.getElementById('customH');
        certConfig.width = parseFloat(customW?.value) || 400;
        certConfig.height = parseFloat(customH?.value) || 200;
    } else {
        if (customDiv) customDiv.style.display = 'none';
        if (val === 'a4-l') { certConfig.width = 297; certConfig.height = 210; }
        if (val === 'a4-p') { certConfig.width = 210; certConfig.height = 297; }
    }
    renderPreview();
}

const customW = document.getElementById('customW');
const customH = document.getElementById('customH');
if (customW) customW.addEventListener('input', updateSizeSettings);
if (customH) customH.addEventListener('input', updateSizeSettings);

// ======================= УПРАВЛЕНИЕ ТАБЛИЦЕЙ =======================
function addColumn() {
    if (tableData.length === 0) tableData = [['Колонка 1'], ['']];
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
    if (!confirm("Сбросить таблицу и удалить все данные?")) return;
    tableData = [tableData[0] || ['Колонка 1']];
    currentPage = 0;
    saveAndRenderTable();
    const generateBtn = document.getElementById('generateCertBtn');
    const hintText = document.getElementById('hintText');
    if (generateBtn) generateBtn.disabled = true;
    if (hintText) hintText.textContent = 'Загрузите Excel для начала';
    renderPreview();
}

function saveAndRenderTable() {
    localStorage.setItem('excelDataForCertificate', JSON.stringify(tableData));
    renderTable();
    renderPreview();
    const hintText = document.getElementById('hintText');
    const generateBtn = document.getElementById('generateCertBtn');
    if (hintText) hintText.textContent = tableData.length > 1 ? `Строк: ${tableData.length - 1}` : 'Нет данных';
    if (generateBtn) generateBtn.disabled = tableData.length <= 1;
}

function renderTable() {
    const thead = document.getElementById('tableHead');
    const tbody = document.getElementById('tableBody');
    
    if (!thead || !tbody) return;
    
    if (tableData.length === 0) {
        thead.innerHTML = '<th>Нет данных</th>';
        tbody.innerHTML = '';
        updatePaginationUI();
        return;
    }

    const headers = tableData[0];
    thead.innerHTML = headers.map((h, i) => `
        <th>
            <div>
                <span contenteditable="true" onblur="updateHeader(${i}, this.textContent)">${escapeHtml(h)}</span>
                <button class="del-col" onclick="deleteColumn(${i})">×</button>
            </div>
        </th>
    `).join('');

    const dataRows = tableData.slice(1);
    const start = currentPage * rowsPerPage;
    const end = start + rowsPerPage;
    const pageData = dataRows.slice(start, end);

    tbody.innerHTML = pageData.map((row, idx) => {
        const realIdx = start + idx + 1;
        return `<tr>
            ${row.map((cell, cIdx) => 
                `<td contenteditable="true" data-row="${realIdx}" data-col="${cIdx}">${escapeHtml(cell ?? '')}</td>`
            ).join('')}
            <td style="width: 40px; text-align: center;">
                <button class="del-row-btn" onclick="deleteRow(${realIdx})">❌</button>
             </td>
        <tr>`;
    }).join('');

    document.querySelectorAll('td[contenteditable="true"]').forEach(td => {
        td.removeEventListener('blur', handleCellBlur);
        td.addEventListener('blur', handleCellBlur);
    });
    
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
    const totalRows = Math.max(0, tableData.length - 1);
    const totalPages = Math.ceil(totalRows / rowsPerPage) || 1;
    const pageInfo = document.getElementById('pageInfo');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    
    if (pageInfo) pageInfo.textContent = `Страница ${currentPage + 1} из ${totalPages}`;
    if (prevBtn) prevBtn.disabled = currentPage === 0;
    if (nextBtn) nextBtn.disabled = currentPage >= totalPages - 1;
}

function changePage(delta) {
    const totalRows = Math.max(0, tableData.length - 1);
    const totalPages = Math.ceil(totalRows / rowsPerPage) || 1;
    const newPage = currentPage + delta;
    if (newPage >= 0 && newPage < totalPages) {
        currentPage = newPage;
        renderTable();
    }
}

// ======================= ПРЕДПРОСМОТР =======================
function renderPreview() {
    const container = document.getElementById('certificatePreview');
    if (!container) return;
    
    container.innerHTML = '';

    const maxWidth = Math.min(container.parentElement?.clientWidth - 40 || 800, 800);
    const aspectRatio = certConfig.width / certConfig.height;
    const screenW = maxWidth;
    const screenH = screenW / aspectRatio;

    container.style.width = `${screenW}px`;
    container.style.height = `${screenH}px`;
    container.style.position = 'relative';
    container.style.background = '#fff';

    if (certConfig.bgImage) {
        const img = document.createElement('img');
        img.src = certConfig.bgImage;
        img.style.cssText = 'position:absolute; top:0; left:0; width:100%; height:100%; object-fit:cover; z-index:0;';
        img.crossOrigin = "anonymous";
        container.appendChild(img);
    }

    const row = tableData[1] || tableData[0] || ['Имя', 'Описание'];
    const content = document.createElement('div');
    content.style.cssText = `
        position: relative; z-index: 1; padding: 40px; width: 100%; height: 100%;
        display: flex; flex-direction: column; justify-content: center;
        text-align: ${certConfig.align};
        align-items: ${certConfig.align === 'left' ? 'flex-start' : certConfig.align === 'right' ? 'flex-end' : 'center'};
        box-sizing: border-box;
    `;
    
    const name = row[0] || 'Имя Участника';
    const body = row.slice(1).join('<br>') || 'Описание курса';

    content.innerHTML = `
        <div style="font-size: 36px; font-weight: bold; color: ${certConfig.colors.title}; margin-bottom: 15px; text-transform: uppercase; letter-spacing: 2px;">СЕРТИФИКАТ</div>
        <div style="font-size: 30px; color: ${certConfig.colors.name}; margin-bottom: 20px; font-style: italic; border-bottom: 2px solid ${certConfig.colors.name}; display: inline-block; padding-bottom: 5px;">${escapeHtml(name)}</div>
        <div style="font-size: 16px; color: ${certConfig.colors.body}; line-height: 1.6; margin-bottom: 40px; white-space: pre-wrap;">${escapeHtml(body)}</div>
        <div style="margin-top: auto; display: flex; justify-content: space-between; font-size: 14px; color: ${certConfig.colors.footer}; border-top: 1px solid rgba(0,0,0,0.1); padding-top: 15px;">
            <span>Дата: ${new Date().toLocaleDateString('ru-RU')}</span>
            <span>Подпись: _________________</span>
        </div>
    `;
    container.appendChild(content);
}

// ======================= ГЕНЕРАЦИЯ СЕРТИФИКАТОВ =======================
async function generateCertificates() {
    const dataRows = tableData.slice(1).filter(r => r && r.some(c => c && String(c).trim()));
    if (dataRows.length === 0) {
        alert("Нет данных для генерации!");
        return;
    }

    const btn = document.getElementById('generateCertBtn');
    if (!btn) return;
    
    btn.disabled = true;
    btn.textContent = '⏳ Подготовка...';
    const formatSelect = document.getElementById('exportFormat');
    const format = formatSelect ? formatSelect.value : 'pdf';

    const tempDiv = document.createElement('div');
    tempDiv.style.cssText = 'position:absolute;left:-9999px;top:-9999px;';
    document.body.appendChild(tempDiv);

    try {
        const files = [];
        const { jsPDF } = window.jspdf;
        const scale = 2.5;
        const wPx = certConfig.width * 3.78 * scale;
        const hPx = certConfig.height * 3.78 * scale;

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
                await new Promise((resolve) => {
                    if (bg.complete) resolve();
                    else bg.onload = resolve;
                });
            }

            const contentDiv = document.createElement('div');
            const paddingPx = 40 * scale;
            contentDiv.style.cssText = `
                position: relative; z-index: 2; padding: ${paddingPx}px;
                display: flex; flex-direction: column; justify-content: center;
                text-align: ${certConfig.align};
                align-items: ${certConfig.align === 'left' ? 'flex-start' : certConfig.align === 'right' ? 'flex-end' : 'center'};
                height: 100%; box-sizing: border-box;
                background-color: transparent;
            `;
            
            const nameValue = row[0] || 'Участник';
            const bodyValue = row.slice(1).filter(v => v && String(v).trim()).join('<br>') || 'Завершил(а) курс успешно';
            
            contentDiv.innerHTML = `
                <div style="font-size:${36 * scale}px;font-weight:bold;color:${certConfig.colors.title};margin-bottom:${15 * scale}px;text-transform:uppercase;letter-spacing:2px;">СЕРТИФИКАТ</div>
                <div style="font-size:${30 * scale}px;color:${certConfig.colors.name};margin-bottom:${20 * scale}px;font-style:italic;border-bottom:2px solid ${certConfig.colors.name};display:inline-block;padding-bottom:${5 * scale}px;">${escapeHtml(nameValue)}</div>
                <div style="font-size:${18 * scale}px;color:${certConfig.colors.body};line-height:1.6;margin-bottom:${40 * scale}px;white-space:pre-wrap;">${escapeHtml(bodyValue)}</div>
                <div style="margin-top:auto;display:flex;justify-content:space-between;font-size:${15 * scale}px;color:${certConfig.colors.footer};border-top:1px solid rgba(0,0,0,0.15);padding-top:${15 * scale}px;">
                    <span>Дата: ${new Date().toLocaleDateString('ru-RU')}</span>
                    <span>Подпись: _________________</span>
                </div>
            `;
            wrapper.appendChild(contentDiv);
            tempDiv.appendChild(wrapper);
            
            await new Promise(r => setTimeout(r, 50));
            const canvas = await html2canvas(wrapper, { 
                scale: 1.5, 
                useCORS: true, 
                allowTaint: false, 
                logging: false,
                backgroundColor: '#ffffff'
            });
            
            if (format === 'pdf') {
                const orientation = certConfig.width > certConfig.height ? 'l' : 'p';
                const pdf = new jsPDF({ orientation: orientation, unit: 'mm', format: [certConfig.width, certConfig.height] });
                const imgData = canvas.toDataURL('image/jpeg', 0.95);
                pdf.addImage(imgData, 'JPEG', 0, 0, certConfig.width, certConfig.height);
                files.push({ data: pdf.output('blob'), name: `Сертификат_${i+1}.pdf` });
            } else {
                const mime = format === 'png' ? 'image/png' : 'image/jpeg';
                const ext = format === 'png' ? 'png' : 'jpg';
                const blob = await new Promise(resolve => canvas.toBlob(resolve, mime, 0.95));
                files.push({ data: blob, name: `Сертификат_${i+1}.${ext}` });
            }
            
            tempDiv.innerHTML = '';
        }

        if (files.length > 1) {
            const zip = new JSZip();
            files.forEach(f => zip.file(f.name, f.data));
            const zipBlob = await zip.generateAsync({ type: 'blob' });
            downloadFile(zipBlob, 'Сертификаты.zip');
        } else if (files.length === 1) {
            downloadFile(files[0].data, files[0].name);
        } else {
            alert('Не удалось создать файлы');
        }
    } catch (err) {
        console.error('Ошибка генерации:', err);
        alert('Ошибка генерации: ' + err.message);
    } finally {
        if (document.body.contains(tempDiv)) {
            document.body.removeChild(tempDiv);
        }
        btn.disabled = false;
        btn.textContent = '📥 Скачать сертификаты';
    }
}