// ==UserScript==
// @name         О sd.bitech
// @namespace    http://tampermonkey.net/
// @version      20260901.17
// @description  Видалення кнопки виходу. Компактні списки заявок. Ярлики для кнопок та черг на лівій панелі.
// @author       Ovolya
// @match        *://sd.bitech.com.ua/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=bitech.com.ua
// @updateURL    https://github.com/Ovolsan/o-sd.bitech/raw/refs/heads/main/%D0%9E%20sd.bitech.user.js
// @downloadURL  https://github.com/Ovolsan/o-sd.bitech/raw/refs/heads/main/%D0%9E%20sd.bitech.user.js
// @grant        none
// ==/UserScript==

(function () {
    'use strict';
    let lastShortcutsSnapshot = '';

    // Кастомная карта сокращений для очередей
    const QUEUE_MAP = {
        'Виїзд': 'Виїзд',
        'Мої заявки': 'Заявки',
        'Мої черги': 'Черги',
        'IoT_LoRaWAN': 'LoRaWAN',
        'L1_Jira': 'Моніторинг',
        'NOC': 'NOC',
        'SOC': 'SOC',
        'Регламент': 'Регламент',
        'IoT_LoRaWAN_status': 'LoRaWAN status',
        'L0.email': 'Email'
    };

    // Удаление кнопки выхода везде, кроме страницы профиля
    function manageLogoutButton() {
        const logoutBtn = [...document.querySelectorAll('button')]
            .find(b => b.querySelector('.fa-sign-out-alt') || b.textContent.trim() === "Вийти");

        if (!logoutBtn) return;

        const isProfilePage = window.location.pathname.includes('/admin/profile');

        if (!isProfilePage) {
            logoutBtn.remove();
        }
    }

    // Поиск нижнего контейнера с кнопками действий (без очередей)
    function findBottomActionContainer() {
        const containers = [...document.querySelectorAll('div.flex.flex-wrap.gap-2.mb-3, div.flex.gap-2')]
            .filter(container => {
                // Не блок очередей
                if (container.querySelector('app-badge-link')) return false;
                // Содержит хотя бы одну нужную кнопку
                const buttons = container.querySelectorAll('button, a[pbutton]');
                return [...buttons].some(btn => {
                    const text = btn.textContent.trim();
                    return text.includes('Фільтр') || text.includes('Фільтрувати') ||
                           text.includes('Додати') || text.includes('Редагувати') ||
                           btn.getAttribute('aria-label') === 'Інші дії' ||
                           btn.classList.contains('p-splitbutton-dropdown');
                });
            });

        // Возвращаем последний (нижний) контейнер, если он есть
        return containers.length > 0 ? containers[containers.length - 1] : null;
    }

    // Создание ярлыков для кнопок действий
    function createActionShortcuts(customContainer) {
        // Удаляем старые ярлыки
        customContainer.querySelectorAll('.ovolya-shortcut-btn').forEach(el => el.remove());

        const container = findBottomActionContainer();
        if (!container) return;

        container.querySelectorAll('button, a[pbutton]').forEach(btn => {
            const text = btn.textContent.trim();
            let iconClass = '';
            let title = '';

            if (text.includes('Фільтр') || text.includes('Фільтрувати')) {
                iconClass = 'ovolya-btn-filter';
                title = 'Фільтрувати';
            } else if (text.includes('Додати')) {
                iconClass = 'ovolya-btn-add';
                title = 'Додати';
            } else if (text.includes('Редагувати')) {
                iconClass = 'ovolya-btn-edit';
                title = 'Редагувати';
            } else if (btn.getAttribute('aria-label') === 'Інші дії' || btn.classList.contains('p-splitbutton-dropdown')) {
                iconClass = 'ovolya-btn-more';
                title = 'Інші дії';
            } else {
                return; // пропускаем другие кнопки
            }

            const shortcut = document.createElement('button');
            shortcut.className = `ovolya-shortcut-btn ovolya-btn-icon-mode ${iconClass}`;
            shortcut.title = title;
            shortcut.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                btn.click(); // вызываем оригинальный обработчик
            });
            customContainer.appendChild(shortcut);
        });
    }
    // Создание ярлыков для очередей
    function createQueueShortcuts(customContainer) {
        // Удаляем старые ярлыки очередей
        customContainer.querySelectorAll('.ovolya-queue-shortcut').forEach(el => el.remove());

        // Находим все app-badge-link на странице
        const badgeLinks = document.querySelectorAll('app-badge-link');
        if (badgeLinks.length === 0) return;

        badgeLinks.forEach(badgeLink => {
            const anchor = badgeLink.querySelector('a');
            if (!anchor) return;

            // Получаем полное название очереди из title или текста
            let fullName = anchor.title || '';
            if (!fullName) {
                fullName = Array.from(anchor.childNodes)
                    .filter(node => node.nodeType === Node.TEXT_NODE)
                    .map(node => node.textContent.trim())
                    .join('').trim();
            }
            if (fullName === 'Мої заявки') return; // пропускаем

            // Применяем сокращение
            let shortName = QUEUE_MAP[fullName];
            if (!shortName) {
                shortName = fullName.length > 3 ? fullName.substring(0, 3) : fullName;
            }

            const shortcut = document.createElement('a');
            shortcut.className = 'ovolya-queue-shortcut';
            shortcut.textContent = shortName;
            shortcut.title = fullName;
            shortcut.href = anchor.getAttribute('href') || '#';
            shortcut.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                anchor.click(); // программный клик по оригинальной ссылке
                lastShortcutsSnapshot = ''; // сбрасываем кэш, чтобы ярлыки действий обновились
            });
            // Если оригинальная кнопка активна — помечаем ярлык
            if (anchor.classList.contains('p-button-contrast')) {
                shortcut.classList.add('active');
            }
            customContainer.appendChild(shortcut);
        });
    }

    function relocateControlsAndQueues() {
    const sidebar = document.querySelector('aside, .sidebar, app-sidebar, .layout-sidebar');
    if (!sidebar) return;

    let customContainer = sidebar.querySelector('#ovolya-custom-sidebar-container');
    if (!customContainer) {
        customContainer = document.createElement('div');
        customContainer.id = 'ovolya-custom-sidebar-container';
        sidebar.appendChild(customContainer);
    }

    // 1. Скрываем оригинальный блок очередей (если он есть)
    const queuesBlock = document.querySelector('div.flex.flex-wrap.gap-2.mb-3:has(app-badge-link)');
    if (queuesBlock) {
        queuesBlock.style.display = 'none';
    }
        // Снимаем «слепок» существующих ярлыков (если они есть)
const currentSnapshot = Array.from(customContainer.querySelectorAll('.ovolya-queue-shortcut, .ovolya-shortcut-btn'))
    .map(el => `${el.className}:${el.textContent.trim()}:${el.title}`)
    .join('|');

// Если слепок совпадает с прошлым, значит, изменения не требуются – выходим
if (currentSnapshot === lastShortcutsSnapshot && currentSnapshot !== '') {
    return;
}

        // 2. Создаём ярлыки для очередей
        createQueueShortcuts(customContainer);

        // 2. Создаём ярлыки для кнопок действий (нижний контейнер)
        createActionShortcuts(customContainer);

        //создаём цифровой отпечаток (снимок) всех ярлыков в контейнере
        lastShortcutsSnapshot = Array.from(customContainer.querySelectorAll('.ovolya-queue-shortcut, .ovolya-shortcut-btn'))
            .map(el => `${el.className}:${el.textContent.trim()}:${el.title}`)
            .join('|');
    }
        
    // Оптимизация списка заявок (без изменений)
    function enhanceListPage() {
        document.querySelectorAll('.p-panel-header').forEach(header => {
            if (header.dataset.enhanced) return;

            const columns = Array.from(header.querySelectorAll('.request-column'));
            if (columns.length === 0) return;

            let ticketId = '';
            let dateTime = '';

            const idElement = header.querySelector('.property-name');
            if (idElement && idElement.textContent.includes('Заявка #')) {
                const idMatch = idElement.textContent.match(/Заявка #(\d+)/);
                if (idMatch) ticketId = idMatch[1];

                const dateSpan = idElement.querySelector('app-datetime-property span');
                if (dateSpan) dateTime = dateSpan.textContent.trim();
            }

            const agentsCol = columns.find(col => {
                const propName = col.querySelector('.property-name');
                return propName && propName.textContent.includes('Агенти');
            });

            if (agentsCol && ticketId) {
                const contentDiv = agentsCol.querySelector('.request-column-content');
                if (contentDiv) {
                    const agentsListEl = contentDiv.querySelector('app-string-list-property');
                    let agentsText = agentsListEl ? agentsListEl.textContent.trim() : '';
                    if (agentsText === '-') agentsText = '';

                    const tooltipText = agentsText ? `Агенти: ${agentsText}` : 'Агенти не призначені';

                    Array.from(contentDiv.children).forEach(child => {
                        child.style.display = 'none';
                    });

                    const customSpan = document.createElement('span');
                    customSpan.className = 'ovolya-custom-agents';
                    customSpan.style.whiteSpace = 'nowrap';
                    customSpan.style.cursor = 'help';
                    customSpan.title = tooltipText;
                    customSpan.textContent = `${ticketId} • ${dateTime}`;

                    contentDiv.appendChild(customSpan);
                }
            }

            const statusCol = columns.find(col => {
                const propName = col.querySelector('.property-name');
                return propName && propName.textContent.includes('Статус');
            });
            const queueCol = columns.find(col => {
                const propName = col.querySelector('.property-name');
                return propName && propName.textContent.includes('Черга');
            });

            if (statusCol) { statusCol.style.flexBasis = '11%'; }
            if (queueCol) { queueCol.style.flexBasis = '7%'; }

            const titleLink = header.querySelector('a[href^="/admin/requests/"]');
            if (titleLink) {
                titleLink.style.display = 'inline-block';
                titleLink.style.maxWidth = '100%';
                titleLink.style.whiteSpace = 'nowrap';
                titleLink.style.overflow = 'hidden';
                titleLink.style.textOverflow = 'ellipsis';
                titleLink.title = titleLink.textContent.trim();
            }

            header.dataset.enhanced = 'true';
        });
    }
    // замена в статусе "первинна обробка" на "потрогали" :D
    function replaceStatusText() {
        const target = 'Первинна обробка';
        const replacement = 'Потрогали';

        document.querySelectorAll('.status-badge, .p-badge, .request-column .property-value, .app-string-list-property').forEach(el => {
            if (el.textContent.includes(target)) {
                el.textContent = el.textContent.replace(target, replacement);
            }
        });
    }

    // Вызывать при загрузке и при изменениях DOM
    const statusObserver = new MutationObserver(replaceStatusText);
    statusObserver.observe(document.body, { childList: true, subtree: true });
    replaceStatusText();

    // Общая функция выполнения всех задач (с отключением observer)
    function runAllTasks() {
        observer.disconnect();
        try {
            manageLogoutButton();
            if (window.location.pathname.startsWith('/admin/requests')) {
                relocateControlsAndQueues();
                enhanceListPage();
            }
        } finally {
            observer.observe(document.body, { childList: true, subtree: true });
        }
    }

    // Инициализация observer
    const observer = new MutationObserver(() => {
        runAllTasks();
    });

    observer.observe(document.body, { childList: true, subtree: true });

    // Первичный запуск
    runAllTasks();
})();
