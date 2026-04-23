// ======================= ПРЕДПРОСМОТР =======================
function renderPreview() {
    const container = document.getElementById('certificatePreview');
    container.innerHTML = '';
    
    // ✅ Добавляем класс для анимированной рамки
    container.classList.add('cert-wrapper');
    
    const maxWidth = 800;
    const scale = maxWidth / certConfig.width;
    const height = certConfig.height * scale;
    
    container.style.width = `${maxWidth}px`;
    container.style.height = `${height}px`;
    container.style.position = 'relative';
    container.style.overflow = 'hidden';
    container.style.boxSizing = 'border-box';
    // ✅ Убрали конфликтующие инлайн-стили: background и borderRadius
    // (они теперь берутся из .cert-wrapper)

    // Фон (если загружен)
    if (certConfig.bgImage) {
        const bgImg = document.createElement('img');
        bgImg.src = certConfig.bgImage;
        bgImg.style.cssText = 'position:absolute; top:0; left:0; width:100%; height:100%; object-fit:cover; z-index:0;';
        container.appendChild(bgImg);
    }

    const rowData = (tableData.length > 1 && tableData[1]) ? tableData[1] : tableData[0];
    const fullName = rowData[0] || 'Фамилия Имя';
    const mainText = rowData.slice(1).filter(m => m && m.trim() !== '').join(' ') || 'достиг(ла) выдающихся успехов';
    const degreeText = getDegreeText(certConfig.degree);

    const content = document.createElement('div');
    content.style.cssText = `
        position: relative; z-index: 1; width:100%; height:100%;
        padding: 8% 10%; box-sizing: border-box;
        display: flex; flex-direction: column;
        font-family: 'Times New Roman', Times, serif;
        text-align: center;
        background: transparent;
    `;

    let degreeHtml = '';
    if (degreeText) {
        degreeHtml = `<div style="font-size: 28px; font-weight: bold; color: ${certConfig.colors.degree}; margin-bottom: 15px;">${degreeText}</div>`;
    }

    content.innerHTML = `
        <div style="flex:1; display:flex; flex-direction:column; justify-content:center;">
            <h1 style="font-size: 52px; color: ${certConfig.colors.title}; margin-bottom: 30px; font-weight: bold;">Сертификат участника</h1>
            ${degreeHtml}
            <div style="font-size: 38px; font-weight: bold; color: ${certConfig.colors.name}; margin: 15px 0 20px; letter-spacing: 1px;">${escapeHtml(fullName)}</div>
            <div style="font-size: 22px; color: ${certConfig.colors.body}; line-height: 1.5; max-width: 85%; margin: 0 auto;">
                ${escapeHtml(mainText)}
            </div>
        </div>
        <div style="margin-top: 50px; font-size: 18px; color: ${certConfig.colors.footer}; border-top: 1px solid rgba(0,0,0,0.1); padding-top: 20px;">
            ${escapeHtml(certConfig.footerText)}
        </div>
    `;
    container.appendChild(content);
}