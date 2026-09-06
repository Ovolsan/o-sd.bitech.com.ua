// ==UserScript==
// @name         О sd.bitech
// @namespace    http://tampermonkey.net/
// @version      20260906.2
// @description  Видалення кнопки виходу. Компактні списки заявок. Ярлики. Моніторинг нових заявок + Звук и Фильтры
// @author       Ovolsan
// @match        *://sd.bitech.com.ua/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=bitech.com.ua
// @updateURL    https://github.com/Ovolsan/o-sd.bitech/raw/refs/heads/main/%D0%9E%20sd.bitech.user.js
// @downloadURL  https://raw.githubusercontent.com/Ovolsan/o-sd.bitech/main/%D0%9E%20sd.bitech.user.js
// @grant        none
// ==/UserScript==

(function () {
    'use strict';
    let lastShortcutsSnapshot = '';

// ================================КАРТА СОКРАЩЕНИЙ ОЧЕРЕДЕЙ============================
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
        'L0.email': 'Email',
        'TETRA_Information': 'TETRA info'
    };

// ==============================УДАЛЕНИЕ КНОПКИ ВЫХОДА==============================
    function manageLogoutButton() {
        const logoutBtn = [...document.querySelectorAll('button')]
            .find(b => b.querySelector('.fa-sign-out-alt') || b.textContent.trim() === "Вийти");
        if (!logoutBtn) return;
        if (!window.location.pathname.includes('/admin/profile')) {
            logoutBtn.remove();
        }
    }

// =================================ПОИСК НИЖНЕГО КОНТЕЙНЕРА С КНОПКАМИ===========================
    function findBottomActionContainer() {
        const containers = [...document.querySelectorAll('div.flex.flex-wrap.gap-2.mb-3, div.flex.gap-2')].filter(container => {
            if (container.querySelector('app-badge-link')) return false;
            const buttons = container.querySelectorAll('button, a[pbutton]');
            return [...buttons].some(btn => {
                const text = btn.textContent.trim();
                return text.includes('Фільтр') || text.includes('Фільтрувати') || text.includes('Додати') || text.includes('Редагувати') || btn.getAttribute('aria-label') === 'Інші дії' || btn.classList.contains('p-splitbutton-dropdown');
            });
        })
        return containers.length > 0 ? containers[containers.length - 1] : null;
    }

// ====================================ЯРЛЫКИ КНОПОК====================================
    function createActionShortcuts(customContainer) {
        customContainer.querySelectorAll('.ovolya-shortcut-btn').forEach(el => el.remove());
        const container = findBottomActionContainer();
        if (!container) return;
        container.querySelectorAll('button, a[pbutton]').forEach(btn => {
            const text = btn.textContent.trim();
            let iconClass = '', title = '';
            if (text.includes('Фільтр') || text.includes('Фільтрувати')) { iconClass = 'ovolya-btn-filter'; title = 'Фільтрувати'; }
            else if (text.includes('Додати')) { iconClass = 'ovolya-btn-add'; title = 'Додати'; }
            else if (text.includes('Редагувати')) { iconClass = 'ovolya-btn-edit'; title = 'Редагувати'; }
            else if (btn.getAttribute('aria-label') === 'Інші дії' || btn.classList.contains('p-splitbutton-dropdown')) { iconClass = 'ovolya-btn-more'; title = 'Інші дії'; }
            else return;

            const shortcut = document.createElement('button');
            shortcut.className = `ovolya-shortcut-btn ovolya-btn-icon-mode ${iconClass}`;
            shortcut.title = title;
            shortcut.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); btn.click(); });
            customContainer.appendChild(shortcut);
        });
    }

    // =================================ЯРЛЫКИ ОЧЕРЕДЕЙ===========================
    function createQueueShortcuts(customContainer) {
        customContainer.querySelectorAll('.ovolya-queue-shortcut').forEach(el => el.remove());
        const badgeLinks = document.querySelectorAll('app-badge-link');
        if (badgeLinks.length === 0) return;
        badgeLinks.forEach(badgeLink => {
            const anchor = badgeLink.querySelector('a');
            if (!anchor) return;
            let fullName = anchor.title || '';
            if (!fullName) {
                fullName = Array.from(anchor.childNodes).filter(node => node.nodeType === Node.TEXT_NODE).map(node => node.textContent.trim()).join('').trim();
            }
            if (fullName === 'Мої заявки') return;
            let shortName = QUEUE_MAP[fullName] || (fullName.length > 10 ? fullName.substring(0, 10) : fullName);
            const shortcut = document.createElement('a');
            shortcut.className = 'ovolya-queue-shortcut';
            shortcut.textContent = shortName;
            shortcut.title = fullName;
            shortcut.href = anchor.getAttribute('href') || '#';
            shortcut.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); anchor.click(); lastShortcutsSnapshot = ''; });
            if (anchor.classList.contains('p-button-contrast')) shortcut.classList.add('active');
            customContainer.appendChild(shortcut);
        });
    }

// ==================================ПЕРЕНОС КНОПОК И ОЧЕРЕДЕЙ==========================
    function relocateControlsAndQueues() {
        const sidebar = document.querySelector('aside, .sidebar, app-sidebar, .layout-sidebar');
        if (!sidebar) return;
        let customContainer = sidebar.querySelector('#ovolya-custom-sidebar-container');
        if (!customContainer) {
            customContainer = document.createElement('div');
            customContainer.id = 'ovolya-custom-sidebar-container';
            sidebar.appendChild(customContainer);
        }
        const queuesBlock = document.querySelector('div.flex.flex-wrap.gap-2.mb-3:has(app-badge-link)');
        if (queuesBlock) queuesBlock.style.display = 'none';

        const currentSnapshot = Array.from(customContainer.querySelectorAll('.ovolya-queue-shortcut, .ovolya-shortcut-btn'))
            .map(el => `${el.className}:${el.textContent.trim()}:${el.title}`).join('|');
        if (currentSnapshot === lastShortcutsSnapshot && currentSnapshot !== '') return;

        createQueueShortcuts(customContainer);
        createActionShortcuts(customContainer);
        lastShortcutsSnapshot = Array.from(customContainer.querySelectorAll('.ovolya-queue-shortcut, .ovolya-shortcut-btn'))
            .map(el => `${el.className}:${el.textContent.trim()}:${el.title}`).join('|');
    }

//=====================================ОПТИМИЗАЦИЯ СПИСКА ЗАЯВОК=======================
    function enhanceListPage() {
        document.querySelectorAll('.p-panel-header').forEach(header => {
            if (header.dataset.enhanced) return;
            const columns = Array.from(header.querySelectorAll('.request-column'));
            if (columns.length === 0) return;
            let ticketId = '', dateTime = '';
            const idElement = header.querySelector('.property-name');
            if (idElement && idElement.textContent.includes('Заявка #')) {
                const idMatch = idElement.textContent.match(/Заявка #(\d+)/);
                if (idMatch) ticketId = idMatch[1];
                const dateSpan = idElement.querySelector('app-datetime-property span');
                if (dateSpan) dateTime = dateSpan.textContent.trim();
            }
            const agentsCol = columns.find(col => col.querySelector('.property-name')?.textContent.includes('Агенти'));
            if (agentsCol && ticketId) {
                const contentDiv = agentsCol.querySelector('.request-column-content');
                if (contentDiv) {
                    const agentsListEl = contentDiv.querySelector('app-string-list-property');
                    let agentsText = agentsListEl ? agentsListEl.textContent.trim() : '';
                    if (agentsText === '-') agentsText = '';
                    const tooltipText = agentsText ? `Агенти: ${agentsText}` : 'Агенти не призначені';
                    Array.from(contentDiv.children).forEach(child => child.style.display = 'none');
                    const customSpan = document.createElement('span');
                    customSpan.className = 'ovolya-custom-agents';
                    customSpan.style.cssText = 'white-space: nowrap; cursor: help;';
                    customSpan.title = tooltipText;
                    customSpan.textContent = `${ticketId} • ${dateTime}`;
                    contentDiv.appendChild(customSpan);
                }
            }
            const statusCol = columns.find(col => col.querySelector('.property-name')?.textContent.includes('Статус'));
            const queueCol = columns.find(col => col.querySelector('.property-name')?.textContent.includes('Черга'));
            if (statusCol) statusCol.style.flexBasis = '11%';
            if (queueCol) queueCol.style.flexBasis = '7%';

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

// ===================================ЗАМЕНА ТЕКСТА СТАТУСА=========================
    function replaceStatusText() {
        const target = 'Первинна обробка';
        const replacement = 'Потрогали';
        document.querySelectorAll('.status-badge, .p-badge, .request-column .property-value, .app-string-list-property').forEach(el => {
            if (el.textContent.includes(target)) {
                el.textContent = el.textContent.replace(target, replacement);
            }
        });
    }

// =========================НАСТРОЙКИ, ФИЛЬТРЫ И ЗВУК===================================
    const requestFilterTypeNames = {
        title: 'Название',
        department: 'Отдел',
        id: 'ID'
    };
    let muteRules = JSON.parse(localStorage.getItem('sd_mute_rules') || '[]');
    // Миграция старых строк в новый формат
    if (muteRules.length > 0 && typeof muteRules[0] === 'string') {
        muteRules = muteRules.map(text => ({ type: 'title', text }));
        saveMuteRules(); // сразу сохраняем обновлённый формат
    }
    let standardAudioData = localStorage.getItem('sd_snd_std') || null;
    let afkAudioData = localStorage.getItem('sd_snd_afk') || null;
    let isNightMode = localStorage.getItem('sd_night_mode') === 'true';
    let currentAudio = null;
    let isMenuOpen = false;
    let activeTab = null;
    let lastRenderedTab = null;
    const REQUEST_FILTERS_KEY = 'sd_request_filter_rules';
    let requestFilterRules = JSON.parse(localStorage.getItem(REQUEST_FILTERS_KEY) || '[]');
    function saveRequestFilterRules() {
        localStorage.setItem(REQUEST_FILTERS_KEY, JSON.stringify(requestFilterRules));
    }
    function saveMuteRules() { localStorage.setItem('sd_mute_rules', JSON.stringify(muteRules)); }
    function isTicketFiltered(ticket) {
        return muteRules.some(rule => {
            if (!rule || !rule.type || !rule.text) return false;
            const value = String(rule.text).trim().toLowerCase();
            if (!value) return false;
            switch (rule.type) {
                case 'title':
                    return String(ticket.title || '').toLowerCase().includes(value);
                case 'department':
                    return String(ticket.department || '').toLowerCase().includes(value);
                case 'id':
                    return String(ticket.id) === value; // точное совпадение ID
                default:
                    return false;
            }
        });
    }
    function stopCurrentAudio() { if (currentAudio) { currentAudio.pause(); currentAudio = null; } }

    // ГЛОБАЛЬНЫЙ СБРОС (Задача 1): Клик по любому месту (кроме панели) убирает нотифы и звук
    document.addEventListener('click', (e) => {
        if (e.target.closest('#ovolya-monitor-debug-container')) return; // Клик по нашему UI не сбрасывает нотиф

        if (e.isTrusted && currentAudio) stopCurrentAudio();

        if (monitorNotificationCount > 0) {
            const notif = document.querySelector('#ovolya-new-request-notification');
            if (notif) notif.remove();
            monitorPendingTickets.clear();
            monitorNotificationCount = 0;
            monitorStopTitleBlink();
            monitorUpdateDebug();
        }
    }, true);

    function playAlertSound(hasFirstCriticality = false, forceType = null) {
        stopCurrentAudio();
        const text = hasFirstCriticality ? 'заявки перша критичність' : 'заявки';
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'uk-UA'; utterance.rate = 0.8; utterance.volume = 1;

        utterance.onend = () => {
            let audioData = null;
            if (forceType === 'std') audioData = standardAudioData;
            else if (forceType === 'afk') audioData = afkAudioData;
            else audioData = isNightMode ? afkAudioData : standardAudioData;

            if (!audioData) return;
            currentAudio = new Audio(audioData);
            currentAudio.play().catch(e => console.log('Autoplay blocked:', e));
            currentAudio.onended = () => { currentAudio = null; };
        };
        speechSynthesis.speak(utterance);
    }

    //==================================МОНИТОРИНГ НОВЫХ ЗАЯВОК==========================
    const TARGET_URL = 'https://sd.bitech.com.ua/admin/requests?presetId=my-queues';
    const MONITOR_TARGET_PATH = '/admin/requests';
    const MONITOR_TARGET_PRESET = 'my-queues';
    const MONITOR_TIMER_MAX_SEC = 10 * 60;
    const MONITOR_ADD_TIME_ON_BLUR_SEC = 2 * 20;
    const MONITOR_LOCK_KEY = 'ovolya_sd_new_requests_monitor_lock';
    const MONITOR_KNOWN_IDS_KEY = 'ovolya_sd_new_requests_known_ids';
    const MONITOR_LOCK_TTL = 8000;
    const MONITOR_HEARTBEAT_INTERVAL = 2500;
    const MONITOR_MAX_KNOWN_IDS = 1000;
    const monitorToken = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
    let monitorIsOwner = false;
    let monitorTimer = null;
    let monitorHeartbeat = null;
    let monitorLockCheck = null;
    let monitorDomCheck = null;
    let monitorTimeLeft = MONITOR_TIMER_MAX_SEC;
    let monitorIsPaused = false;
    let monitorIdleTimeout = null;
    let monitorLastTick = Date.now();
    let monitorHadClicks = false;
    let monitorNotificationCount = 0;
    let monitorTitleBlinking = false;
    let monitorOriginalTitle = document.title;
    let monitorDebugDiv = null;
    let monitorInitialized = false;

    function isMonitorTargetPage() {
        return (
            window.location.pathname === '/admin/requests' &&
            new URLSearchParams(window.location.search).get('presetId') === 'my-queues'
        );
    }

    function monitorReadJSON(key, fallback) {
        try {
            const value = localStorage.getItem(key);
            if (!value) return fallback;
            return JSON.parse(value);
        } catch (e) {
            return fallback;
        }
    }
    function monitorWriteJSON(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (e) { }
    }

    function monitorReadLock() {
        try {
            const raw = localStorage.getItem(MONITOR_LOCK_KEY);
            if (!raw) return null;
            const lock = JSON.parse(raw);
            if (!lock || !lock.token || !lock.expiresAt) return null;
            return lock;
        } catch (e) {
            return null;
        }
    }
    function monitorWriteLock() {
        try {
            localStorage.setItem(MONITOR_LOCK_KEY, JSON.stringify({ token: monitorToken, expiresAt: Date.now() + MONITOR_LOCK_TTL }));
            return true;
        } catch (e) {
            return false;
        }
    }
    function monitorAcquireLock() {
        const existing = monitorReadLock();
        const now = Date.now();
        if (existing && existing.token !== monitorToken && existing.expiresAt > now) {
            monitorIsOwner = false;
            return false;
        }
        monitorWriteLock();
        const verification = monitorReadLock();
        if (verification && verification.token === monitorToken) {
            monitorIsOwner = true;
            return true;
        }
        monitorIsOwner = false;
        return false;
    }
    function monitorRenewLock() {
        if (!monitorIsOwner) return;
        const lock = monitorReadLock();
        if (!lock || lock.token !== monitorToken) {
            monitorIsOwner = false;
            return;
        }
        monitorWriteLock();
    }
    function monitorReleaseLock() {
        try {
            const lock = monitorReadLock();
            if (lock && lock.token === monitorToken) {
                localStorage.removeItem(MONITOR_LOCK_KEY);
            }
        } catch (e) { }
        monitorIsOwner = false;
    }

    function monitorGetKnownIds() {
        const ids = monitorReadJSON(MONITOR_KNOWN_IDS_KEY, []);
        if (!Array.isArray(ids)) return [];
        return ids.map(String);
    }
    function monitorSaveKnownIds(ids) {
        const unique = [...new Set(ids.map(String))];
        const limited = unique.slice(Math.max(0, unique.length - MONITOR_MAX_KNOWN_IDS));
        monitorWriteJSON(MONITOR_KNOWN_IDS_KEY, limited);
    }

// ======================ПОЛУЧЕНИЕ ЗАЯВОК (ИД + Название) для работы Фильтров===================================
    function getCurrentTickets() {
        const tickets = new Map();
        document.querySelectorAll('.request-column-content a[href^="/admin/requests/"]').forEach(link => {
            const href = link.getAttribute('href');
            const match = href.match(/\/admin\/requests\/(\d+)/);
            if (!match) return;
            const id = match[1];
            const title = link.getAttribute('title') || link.textContent.trim() || '';
            const row = link.closest('tr');
            let criticality = '';
            let department = '';
            if (row) {
                row.querySelectorAll('.col-6.md\\:col-12').forEach(col => {
                    const propertyName = col.querySelector('.property-name');
                    const value = col.querySelector('app-string-property span');
                    if (!propertyName || !value) return;
                    const name = propertyName.textContent.trim();
                    const text = value.textContent.trim();
                    if (name === 'Критичність') criticality = text;
                    if (name === 'Відділ') department = text;
                });
            }
            if (!tickets.has(id)) {
                tickets.set(id, { id, title, department, criticality });
            }
        });
        return Array.from(tickets.values());
    }

    // ============================================================
    // ПРОВЕРКА НОВЫХ ЗАЯВОК (С ФИЛЬТРАЦИЕЙ)
    // ============================================================
    function monitorCheckForNewTickets() {
        if (!isMonitorTargetPage()) return;
        if (!monitorIsOwner) return;

        const currentTickets = getCurrentTickets();
        if (currentTickets.length === 0) return;

        const knownIds = monitorGetKnownIds();
        if (knownIds.length === 0) {
            monitorSaveKnownIds(currentTickets.map(t => t.id));
            return;
        }

        const knownSet = new Set(knownIds);
        const newTickets = currentTickets.filter(t => !knownSet.has(t.id));

        if (newTickets.length === 0) return;

        // Применяем Чёрный список (muteRules)
        const unmutedTickets = newTickets.filter(t => {
            const lowerTitle = t.title.toLowerCase();
            for (const rule of muteRules) {
                if (rule && lowerTitle.includes(rule.toLowerCase())) {
                    console.log(`[sd.bitech] Заявка #${t.id} проигнорирована фильтром: "${rule}"`);
                    return false;
                }
            }
            return true;
        });

        // Сохраняем все новые ID, чтобы они не триггерили систему в следующий раз
        monitorSaveKnownIds([...knownIds, ...newTickets.map(t => t.id)]);

        if (unmutedTickets.length > 0) {
            monitorNotifyNewTickets(unmutedTickets.map(t => t.id));
            playAlertSound(); // Запуск звука
        }
    }

    // ==============================УВЕДОМЛЕНИЕ==============================
    function monitorNotifyNewTickets(newIds) {
        monitorNotificationCount += newIds.length;
        monitorShowNotification(newIds);
        monitorStartTitleBlink();

        if ('Notification' in window && Notification.permission === 'granted') {
            try {
                const text = newIds.length === 1 ? `Нова заявка #${newIds[0]}` : `Нових заявок: ${newIds.length}`;
                const notification = new Notification('sd.bitech', {
                    body: text,
                    icon: 'https://www.google.com/s2/favicons?sz=64&domain=bitech.com.ua',
                    requireInteraction: true
                });
                notification.onclick = () => {
                    window.focus();
                    notification.close();
                };
            } catch (e) { }
        }
    }

    function monitorShowNotification(newIds) {
        const old = document.querySelector('#ovolya-new-request-notification');
        if (old) old.remove();

        const notification = document.createElement('div');
        notification.id = 'ovolya-new-request-notification';
        notification.style.cssText = `
            position: fixed;
            top: 15px;
            right: 15px;
            z-index: 1000000;
            background: #26282f;
            color: #e8e8e8;
            border: 1px solid #ffaa00;
            border-radius: 6px;
            padding: 12px 16px;
            min-width: 230px;
            max-width: 360px;
            box-shadow: 0 4px 18px rgba(0,0,0,.45);
            font-family: Arial, sans-serif;
            font-size: 14px;
            cursor: pointer;
        `;
        const title = document.createElement('div');
        title.style.cssText = `font-weight: 600; margin-bottom: 7px; color: #ffaa00;`;
        title.textContent = newIds.length === 1 ? '🟠 Нова заявка' : `🟠 Нових заявок: ${newIds.length}`;

        const ids = document.createElement('div');
        ids.style.cssText = `line-height: 1.5; word-break: break-word;`;
        ids.textContent = newIds.map(id => `#${id}`).join(', ');

        notification.appendChild(title);
        notification.appendChild(ids);
        notification.addEventListener('click', () => {
            notification.remove();
            monitorNotificationCount = 0;
            monitorStopTitleBlink();
            monitorUpdateDebug();
        });
        document.body.appendChild(notification);
        setTimeout(() => { if (notification.isConnected) notification.remove(); }, 15000);
    }

    // ============================================================
    // TITLE / FAVICON
    // ============================================================
    function monitorStartTitleBlink() {
        monitorTitleBlinking = true;
    }
    function monitorStopTitleBlink() {
        monitorTitleBlinking = false;
        document.title = monitorOriginalTitle;
        monitorSetFavicon(false);
    }
    function monitorSetFavicon(active) {
        let favicon = document.querySelector('link[rel="icon"]');
        if (!favicon) {
            favicon = document.createElement('link');
            favicon.rel = 'icon';
            document.head.appendChild(favicon);
        }
        if (!active) {
            favicon.href = 'https://www.google.com/s2/favicons?sz=64&domain=bitech.com.ua';
            return;
        }
        const svg = `
            <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64">
                <rect width="64" height="64" rx="10" fill="#ffaa00"/>
                <text x="32" y="45" text-anchor="middle" font-size="42" font-family="Arial" font-weight="bold" fill="#222">!</text>
            </svg>
        `;
        favicon.href = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    }

    // =====================DEBUG / НАСТРОЙКИ UI=======================================
    function monitorCreateDebug() {
        if (monitorDebugDiv) return;

        // Создаем общий контейнер
        monitorDebugDiv = document.createElement('div');
        monitorDebugDiv.id = 'ovolya-monitor-debug-container';
        monitorDebugDiv.style.cssText = `
            position: fixed; bottom: 10px; left: 3px;
            display: flex; gap: 5px; z-index: 9998; user-select: none;
        `;

        // Кнопка с таймером (открывает настройки)
        const timerBtn = document.createElement('div');
        timerBtn.id = 'ovolya-monitor-timer-btn';
        timerBtn.style.cssText = `
            background: #222; color: #0f0; padding: 5px 10px;
            font-family: monospace; font-size: 12px; cursor: pointer; border: 1px solid #444;
        `;
        timerBtn.title = 'Нажмите, чтобы открыть Настройки и Фильтры';
        timerBtn.addEventListener('click', () => {
            monitorNotificationCount = 0;
            const notification = document.querySelector('#ovolya-new-request-notification');
            if (notification) notification.remove();
            monitorStopTitleBlink();
            monitorUpdateDebug();
            openSettingsModal();
        });

        // Кнопка принудительного перехвата мастера (Скрепка)
        const pinBtn = document.createElement('div');
        pinBtn.id = 'ovolya-monitor-pin-btn';
        pinBtn.style.cssText = `
            background: #222; color: #fff; padding: 5px 8px;
            font-family: monospace; font-size: 12px; 
             cursor: pointer; border: 1px solid #444;
        `;
        pinBtn.title = 'Сделать эту вкладку ГЛАВНОЙ (перехватить таймер)';
        pinBtn.textContent = '📌';
        pinBtn.addEventListener('click', () => {
            monitorWriteLock(); // Форсированно записываем свой токен
            monitorCheckOwnership(); // Проверяем и забираем права
        });

        monitorDebugDiv.appendChild(timerBtn);
        monitorDebugDiv.appendChild(pinBtn);
        document.body.appendChild(monitorDebugDiv);
    }

    function monitorUpdateDebug() {
        const container = document.querySelector('#ovolya-monitor-debug-container');
        const timerBtn = document.querySelector('#ovolya-monitor-timer-btn');
        const pinBtn = document.querySelector('#ovolya-monitor-pin-btn');

        if (!container || !timerBtn) return;

        // ИЗМЕНЕНИЕ: Если мы не на целевой странице мониторинга — полностью прячем виджет
        if (!isMonitorTargetPage()) {
            container.style.display = 'none';
            return; // Дальше код не выполняем
        } else {
            container.style.display = 'flex'; // Возвращаем видимость на нужной странице
        }

        const m = Math.floor(Math.max(0, monitorTimeLeft) / 60);
        const s = Math.floor(Math.max(0, monitorTimeLeft) % 60);
        let status = monitorIsOwner ? 'моніторинг' : 'очікування';
        let text = `🔄 ${m}:${String(s).padStart(2, '0')} | ${status}`;

        if (monitorNotificationCount > 0) {
            text += ` | 🟠 нових: ${monitorNotificationCount}`;
            timerBtn.style.color = '#ffaa00';
            timerBtn.style.border = '1px solid #ffaa00';
        } else {
            timerBtn.style.color = '#0f0';
            timerBtn.style.border = '1px solid #444';
        }
        timerBtn.textContent = text;

        if (pinBtn) {
            if (monitorIsOwner) {
                pinBtn.style.display = 'none';
            } else {
                pinBtn.style.display = 'block';
            }
        }
    }

    // =======================АКТИВНОСТЬ ПОЛЬЗОВАТЕЛЯ=====================================
    function monitorSetWorking() {
        if (!monitorIsOwner) return;
        if (!isMonitorTargetPage()) return;
        monitorIsPaused = true;
        clearTimeout(monitorIdleTimeout);
        monitorIdleTimeout = setTimeout(() => {
            if (!monitorIsOwner) return;
            if (!isMonitorTargetPage()) return;
            monitorIsPaused = false;
            monitorLastTick = Date.now();
            if (monitorHadClicks) {
                monitorTimeLeft = Math.min(monitorTimeLeft + MONITOR_ADD_TIME_ON_BLUR_SEC, MONITOR_TIMER_MAX_SEC);
                monitorHadClicks = false;
            }
            monitorUpdateDebug();
        }, 10000);
        monitorUpdateDebug();
    }

    function monitorHandleLeave() {
        clearTimeout(monitorIdleTimeout);
        monitorIsPaused = false;
        monitorLastTick = Date.now();
        monitorTimeLeft = Math.min(monitorTimeLeft + MONITOR_ADD_TIME_ON_BLUR_SEC, MONITOR_TIMER_MAX_SEC);
        monitorHadClicks = false;
        monitorUpdateDebug();
    }

    function monitorReload() {
        if (!monitorIsOwner) return;
        if (isMonitorTargetPage()) {
            monitorIsPaused = true;
            monitorRenewLock();
            location.reload();
        } else {
            monitorIsPaused = true;
            monitorRenewLock();
            location.href = TARGET_URL;
        }
    }

    setInterval(() => {
        if (!monitorIsOwner) return;
        const now = Date.now();
        const delta = (now - monitorLastTick) / 1000;
        monitorLastTick = now;
        if (!monitorIsPaused) {
            monitorTimeLeft -= delta;
            if (monitorTimeLeft <= 0) {
                monitorTimeLeft = 0;
                monitorIsPaused = true;
                monitorRenewLock();
                if (isMonitorTargetPage()) {
                    location.reload();
                } else {
                    // ИЗМЕНЕНИЕ: Никаких редиректов на других страницах. 
                    // Если скрипт как-то стал мастером не там, просто отдаем права.
                    monitorReleaseLock();
                }
                return;
            }
        }
        monitorUpdateDebug();
    }, 1000);

    function monitorCheckOwnership() {
        const lock = monitorReadLock();
        const now = Date.now();
        if (lock && lock.token !== monitorToken && lock.expiresAt > now) {
            if (monitorIsOwner) {
                monitorIsOwner = false;
                clearTimeout(monitorIdleTimeout);
            }
            monitorUpdateDebug();
            return;
        }
        // ИЗМЕНЕНИЕ: Только вкладка с очередями может пытаться стать мастером
        if (!monitorIsOwner && isMonitorTargetPage()) {
            monitorAcquireLock();
            if (monitorIsOwner) {
                monitorLastTick = Date.now();
                monitorTimeLeft = MONITOR_TIMER_MAX_SEC;
                monitorCheckForNewTickets();
            }
        }
        monitorUpdateDebug();
    }

    // ==========================ИНИЦИАЛИЗАЦИЯ==================================
    function initNewRequestsMonitor() {
        if (monitorInitialized) return;
        monitorInitialized = true;
        monitorCreateDebug();
        monitorAcquireLock();
        monitorLastTick = Date.now();
        monitorUpdateDebug();
        setTimeout(() => {
            if (monitorIsOwner && isMonitorTargetPage()) {
                monitorCheckForNewTickets();
            }
        }, 2000);
        monitorDomCheck = setInterval(() => {
            if (monitorIsOwner && isMonitorTargetPage()) {
                monitorCheckForNewTickets();
            }
        }, 5000);
        monitorHeartbeat = setInterval(() => {
            if (monitorIsOwner) {
                monitorRenewLock();
            }
        }, MONITOR_HEARTBEAT_INTERVAL);
        monitorLockCheck = setInterval(monitorCheckOwnership, 3000);
    }

    ['mousemove', 'keydown', 'click', 'wheel'].forEach(evt => {
        window.addEventListener(evt, () => {
            monitorSetWorking();
            if (evt === 'click') {
                monitorHadClicks = true;
            }
        });
    });
    window.addEventListener('blur', monitorHandleLeave);
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            monitorHandleLeave();
        }
    });

    setInterval(() => {
        if (monitorNotificationCount > 0) {
            monitorTitleBlinking = !monitorTitleBlinking;
            if (monitorTitleBlinking) {
                document.title = '🟠 НОВЫЕ ЗАЯВКИ';
                monitorSetFavicon(true);
            } else {
                document.title = monitorOriginalTitle;
                monitorSetFavicon(false);
            }
        } else {
            if (document.title !== monitorOriginalTitle) {
                document.title = monitorOriginalTitle;
            }
            monitorSetFavicon(false);
            monitorTitleBlinking = false;
        }
    }, 1000);

    window.addEventListener('storage', (event) => {
        if (event.key === MONITOR_LOCK_KEY) {
            monitorCheckOwnership();
        }
    });

    window.addEventListener('beforeunload', () => {
        if (monitorHeartbeat) clearInterval(monitorHeartbeat);
        if (monitorLockCheck) clearInterval(monitorLockCheck);
        if (monitorDomCheck) clearInterval(monitorDomCheck);
        clearTimeout(monitorIdleTimeout);
        monitorReleaseLock();
    });

    initNewRequestsMonitor();

    // =====================OBSERVER СТАТУСОВ=======================================
    const statusObserver = new MutationObserver(replaceStatusText);
    statusObserver.observe(document.body, { childList: true, subtree: true });
    replaceStatusText();

    // ===================ВИЗУАЛЬНОЕ СКРЫТИЕ ЗАЯВОК ПО ЧЁРНОМУ СПИСКУ====================================
    function hideBlacklistedTickets() {
        document.querySelectorAll('.request-column-content a[href^="/admin/requests/"]').forEach(link => {
            const title = link.getAttribute('title') || link.textContent.trim() || '';
            const lowerTitle = title.toLowerCase();

            let isBlacklisted = false;
            for (const rule of muteRules) {
                if (rule && lowerTitle.includes(rule.toLowerCase())) {
                    isBlacklisted = true;
                    break;
                }
            }

            // Ищем главный контейнер всей заявки (на сайте это обычно блок .p-panel)
            const ticketContainer = link.closest('.p-panel');

            if (ticketContainer) {
                if (isBlacklisted) {
                    ticketContainer.style.display = 'none'; // Прячем заявку
                } else {
                    // Если вы убрали слово из фильтра, заявка снова появится
                    if (ticketContainer.style.display === 'none') {
                        ticketContainer.style.display = '';
                    }
                }
            }
        });
    }

    // ==================================ОБЩАЯ ФУНКЦИЯ ВЫПОЛНЕНИЯ ЗАДАЧ==========================
    function runAllTasks() {
        observer.disconnect();
        try {
            manageLogoutButton();
            const isRequestsListPage =
                window.location.pathname === '/admin/requests' ||
                window.location.pathname === '/admin/requests/';

            if (isRequestsListPage) {
                relocateControlsAndQueues();
                enhanceListPage();
                hideBlacklistedTickets();
            } else {
                const customContainer = document.getElementById('ovolya-custom-sidebar-container');
                if (customContainer) {
                    customContainer.remove();
                }
                lastShortcutsSnapshot = '';
            }
        } finally {
            observer.observe(document.body, { childList: true, subtree: true });
        }
    }

    const observer = new MutationObserver(() => { runAllTasks(); });
    observer.observe(document.body, { childList: true, subtree: true });
    runAllTasks();
})();
