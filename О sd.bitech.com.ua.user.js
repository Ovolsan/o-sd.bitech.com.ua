// ==UserScript==
// @name         О sd.bitech.com.ua
// @namespace    http://tampermonkey.net/
// @version      20260801
// @description  Переносить кнопку виходу на ліву панель. Стовпці «Статус» і «Черга» коротші. Назва без переносу рядка. Tooltip. Номер заявки, дата й час перенесено в стовпець «Агенти» (агенти в tooltip).
// @author       Ovolya
// @match        *://sd.bitech.com.ua/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=bitech.com.ua
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    // перенос кнопки выхода в левое меню
    function moveLogout() {
        const logoutBtn = document.querySelector('.pi-sign-out')?.closest('button') ||
                          [...document.querySelectorAll('.p-button-label')]
                              .find(el => el.textContent.trim() === "Вийти")
                              ?.closest('button');
        const sidebar = document.querySelector('.dpl-aside, aside, .layout-sidebar');
        if (logoutBtn && sidebar && !sidebar.contains(logoutBtn)) {
            logoutBtn.style.width = "calc(100% - 16px)";
            logoutBtn.style.margin = "10px 8px";
            logoutBtn.style.justifyContent = "flex-start";
            sidebar.appendChild(logoutBtn);
        }
    }

    // Список заявок
    function enhanceListPage() {
        document.querySelectorAll('.p-panel-header').forEach(panel => {
            if (panel.dataset.enhanced) return;
            const grid = panel.querySelector('.grid.align-items-start.flex-1');
            if (!grid) return;

            const propName = panel.querySelector('.property-name');
            if (propName) {
                const idMatch = propName.textContent.trim().match(/Заявка #(\d+)/);
                if (idMatch) {
                    const ticketId = idMatch[1];
                    const dateSpan = propName.querySelector('span');
                    // dateTime захватывает и дату, и время из оригинального элемента
                    const dateTime = dateSpan ? dateSpan.textContent.trim() : '';
                    const agentsCol = Array.from(grid.children).find(col => col.textContent.includes('Агенти'));

                    if (agentsCol) {
                        let agentsText = (agentsCol.querySelector('app-string-list-property') || agentsCol).textContent.trim();
                        agentsText = agentsText.replace(/^Агенти\s*/, '').trim();
                        if (agentsText === '-') agentsText = '';

                        const newText = `${ticketId} • ${dateTime}`;
                        const tooltipText = agentsText ? `Агенти: ${agentsText}` : 'Агенти не призначені';

                        agentsCol.innerHTML = `
                            <small class="property-name">Агенти</small>
                            <span
                                style="white-space:nowrap; cursor:help;"
                                title="${tooltipText.replace(/"/g, '&quot;')}"
                            >
                                ${newText}
                            </span>
                        `;
                    }
                }
            }

            const statusCol = Array.from(grid.children).find(c => c.textContent.includes('Статус'));
            const queueCol = Array.from(grid.children).find(c => c.textContent.includes('Черга'));
            if (statusCol) { statusCol.style.flex = '0 0 11%'; statusCol.style.maxWidth = '11%'; }
            if (queueCol) { queueCol.style.flex = '0 0 7%'; queueCol.style.maxWidth = '7%'; }

            const titleLink = grid.children[0]?.querySelector('a');
            if (titleLink) {
                titleLink.style.whiteSpace = 'nowrap';
                titleLink.style.overflow = 'hidden';
                titleLink.style.textOverflow = 'ellipsis';
                titleLink.title = titleLink.textContent.trim();
            }
            panel.dataset.enhanced = 'true';
        });
    }

    // Страница заявки
    function makeDetailPageCompact() {
        const style = document.createElement('style');
        style.id = 'sd-custom-layout-v2';
        style.textContent = `
            .dpl-main { padding: 12px !important; }

            .flex-grow-1 {
                display: grid !important;
                grid-template-columns: 1fr 1fr 1fr !important;
                grid-template-areas:
                    "client own node"
                    "header header equipment"
                    "statustxt iframe iframe"
                    "status queue criticality"
                    "department agent agent"
                    "rtype towork towork" !important;
                gap: 12px 16px !important;
                align-items: start !important;
            }

            /* === РЯД 1: Клієнт, Автор, Тип мережі === */
            app-radio-button-group[key="client"] { grid-area: client !important; }
            app-select[key="own"] { grid-area: own !important; }
            app-radio-button-group[key="node"] { grid-area: node !important; }

            /* === РЯД 2: Назва заявки (2 колонки), Обладнання === */
            app-text-input[key="header"] { grid-area: header !important; }
            app-multiselect[key="equipment"] { grid-area: equipment !important; }

            /* === РЯД 3: Опис статусу (1), Опис заявки (2) === */
            app-textarea[key="statustxt"] { grid-area: statustxt !important; }
            app-iframe { grid-area: iframe !important; }

            /* === РЯД 4: Статус, Черга, Критичність === */
            app-radio-button-group[key="status"] { grid-area: status !important; }
            app-radio-button-group[key="queue"] { grid-area: queue !important; }
            app-radio-button-group[key="criticality"] { grid-area: criticality !important; }

            /* === РЯД 5: Відповідальний відділ (1), Агент (2) === */
            app-radio-button-group[key="department"] { grid-area: department !important; }
            app-checkbox-group[key="agent"] { grid-area: agent !important; }

            /* === РЯД 6: Вид робіт (1), Тип робіт (2) === */
            app-radio-button-group[key="rtype"] { grid-area: rtype !important; }
            app-radio-button-group[key="towork"] { grid-area: towork !important; }

            /* Оставить оригинальную кнопку Зберегти */
            .app-action-buttons { display: flex !important; }

            /* Компактные радиокнопки */
            .radio-button-label {
                padding: 6px 10px !important;
                font-size: 12px !important;
            }

            /* Скрыть верхний tablist (переносим в сайдбар) */
            .p-tablist { display: none !important; }
        `;

        const oldStyle = document.getElementById('sd-custom-layout');
        if (oldStyle) oldStyle.remove();
        const oldStyleV2 = document.getElementById('sd-custom-layout-v2');
        if (oldStyleV2) oldStyleV2.remove();

        document.head.appendChild(style);
    }

    // Перенос переключателей окон заявки в левую панель
    function moveTabsToSidebar() {
        if (!window.location.pathname.includes('/admin/requests/') || !window.location.pathname.match(/\d+$/)) return;

        const tablist = document.querySelector('p-tablist');
        if (!tablist || tablist.dataset.moved) return;

        const sidebar = document.querySelector('.dpl-aside, aside, .layout-sidebar');
        if (!sidebar) return;

        const separator = document.createElement('div');
        separator.style.cssText = 'height:1px; background:#40444f; margin:8px 12px;';

        const tabsContainer = document.createElement('div');
        tabsContainer.style.cssText = 'padding:0 8px; display:flex; flex-direction:column; gap:4px;';

        tablist.querySelectorAll('p-tab').forEach(tab => {
            const clone = tab.cloneNode(true);
            clone.style.cssText = 'padding:8px 12px; border-radius:6px; cursor:pointer; font-size:13px; white-space:nowrap;';
            clone.classList.add('dpl-aside-link');
            if (tab.classList.contains('p-tab-active')) {
                clone.style.background = '#343741';
                clone.style.color = '#e2e6ec';
            }
            clone.addEventListener('click', () => tab.click());
            tabsContainer.appendChild(clone);
        });

        const logout = sidebar.querySelector('button');
        if (logout) {
            logout.after(separator);
            separator.after(tabsContainer);
        } else {
            sidebar.append(separator, tabsContainer);
        }
        tablist.dataset.moved = 'true';
    }


    // инициалиация
    const observer = new MutationObserver(() => {
        moveLogout();

        if (window.location.pathname === '/admin/requests') enhanceListPage();

        if (window.location.pathname.includes('/admin/requests/')) {
            makeDetailPageCompact();
            moveTabsToSidebar();
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    // Первичный запуск
    moveLogout();
    if (window.location.pathname === '/admin/requests') enhanceListPage();
    if (window.location.pathname.includes('/admin/requests/')) {
        makeDetailPageCompact();
        moveTabsToSidebar();
    }
})();
