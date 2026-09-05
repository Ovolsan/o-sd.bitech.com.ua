// ==UserScript==
// @name         О sd.bitech
// @namespace    http://tampermonkey.net/
// @version      20260905
// @description  Видалення кнопки виходу. Компактні списки заявок. Ярлики. Моніторинг нових заявок + Звук и Фильтры
// @author       Ovolya
// @match        *://sd.bitech.com.ua/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=bitech.com.ua
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
            .find(b =>
                b.querySelector('.fa-sign-out-alt') ||
                b.textContent.trim() === "Вийти"
            );
        if (!logoutBtn) return;
        const isProfilePage =
            window.location.pathname.includes('/admin/profile');
        if (!isProfilePage) {
            logoutBtn.remove();
        }
    }

    // =================================ПОИСК НИЖНЕГО КОНТЕЙНЕРА С КНОПКАМИ===========================
    function findBottomActionContainer() {
        const containers = [
            ...document.querySelectorAll(
                'div.flex.flex-wrap.gap-2.mb-3, div.flex.gap-2'
            )
        ].filter(container => {
            if (container.querySelector('app-badge-link')) {
                return false;
            }
            const buttons = container.querySelectorAll(
                'button, a[pbutton]'
            );
            return [...buttons].some(btn => {
                const text = btn.textContent.trim();
                return text.includes('Фільтр') ||
                    text.includes('Фільтрувати') ||
                    text.includes('Додати') ||
                    text.includes('Редагувати') ||
                    btn.getAttribute('aria-label') === 'Інші дії' ||
                    btn.classList.contains('p-splitbutton-dropdown');
            });
        });
        return containers.length > 0
            ? containers[containers.length - 1]
            : null;
    }

    // ====================================ЯРЛЫКИ КНОПОК====================================
    function createActionShortcuts(customContainer) {
        customContainer
            .querySelectorAll('.ovolya-shortcut-btn')
            .forEach(el => el.remove());
        const container = findBottomActionContainer();
        if (!container) return;
        container.querySelectorAll('button, a[pbutton]').forEach(btn => {
            const text = btn.textContent.trim();
            let iconClass = '';
            let title = '';
            if (
                text.includes('Фільтр') ||
                text.includes('Фільтрувати')
            ) {
                iconClass = 'ovolya-btn-filter';
                title = 'Фільтрувати';
            } else if (text.includes('Додати')) {
                iconClass = 'ovolya-btn-add';
                title = 'Додати';
            } else if (text.includes('Редагувати')) {
                iconClass = 'ovolya-btn-edit';
                title = 'Редагувати';
            } else if (
                btn.getAttribute('aria-label') === 'Інші дії' ||
                btn.classList.contains('p-splitbutton-dropdown')
            ) {
                iconClass = 'ovolya-btn-more';
                title = 'Інші дії';
            } else {
                return;
            }
            const shortcut = document.createElement('button');
            shortcut.className =
                `ovolya-shortcut-btn ovolya-btn-icon-mode ${iconClass}`;
            shortcut.title = title;
            shortcut.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                btn.click();
            });
            customContainer.appendChild(shortcut);
        });
    }

    // =================================ЯРЛЫКИ ОЧЕРЕДЕЙ===========================
    function createQueueShortcuts(customContainer) {
        customContainer
            .querySelectorAll('.ovolya-queue-shortcut')
            .forEach(el => el.remove());
        const badgeLinks =
            document.querySelectorAll('app-badge-link');
        if (badgeLinks.length === 0) return;
        badgeLinks.forEach(badgeLink => {
            const anchor = badgeLink.querySelector('a');
            if (!anchor) return;
            let fullName = anchor.title || '';
            if (!fullName) {
                fullName = Array.from(anchor.childNodes)
                    .filter(node => node.nodeType === Node.TEXT_NODE)
                    .map(node => node.textContent.trim())
                    .join('')
                    .trim();
            }
            if (fullName === 'Мої заявки') {
                return;
            }
            let shortName = QUEUE_MAP[fullName];
            if (!shortName) {
                shortName =
                    fullName.length > 10
                        ? fullName.substring(0, 10)
                        : fullName;
            }
            const shortcut = document.createElement('a');
            shortcut.className = 'ovolya-queue-shortcut';
            shortcut.textContent = shortName;
            shortcut.title = fullName;
            shortcut.href =
                anchor.getAttribute('href') || '#';
            shortcut.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                anchor.click();
                lastShortcutsSnapshot = '';
            });
            if (
                anchor.classList.contains('p-button-contrast')
            ) {
                shortcut.classList.add('active');
            }
            customContainer.appendChild(shortcut);
        });
    }

    // ==================================ПЕРЕНОС КНОПОК И ОЧЕРЕДЕЙ==========================
    function relocateControlsAndQueues() {
        const sidebar =
            document.querySelector(
                'aside, .sidebar, app-sidebar, .layout-sidebar'
            );
        if (!sidebar) return;
        let customContainer =
            sidebar.querySelector(
                '#ovolya-custom-sidebar-container'
            );
        if (!customContainer) {
            customContainer = document.createElement('div');
            customContainer.id =
                'ovolya-custom-sidebar-container';
            sidebar.appendChild(customContainer);
        }
        const queuesBlock =
            document.querySelector(
                'div.flex.flex-wrap.gap-2.mb-3:has(app-badge-link)'
            );
        if (queuesBlock) {
            queuesBlock.style.display = 'none';
        }
        const currentSnapshot =
            Array.from(
                customContainer.querySelectorAll(
                    '.ovolya-queue-shortcut, .ovolya-shortcut-btn'
                )
            )
                .map(el =>
                    `${el.className}:${el.textContent.trim()}:${el.title}`
                )
                .join('|');
        if (
            currentSnapshot === lastShortcutsSnapshot &&
            currentSnapshot !== ''
        ) {
            return;
        }
        createQueueShortcuts(customContainer);
        createActionShortcuts(customContainer);
        lastShortcutsSnapshot =
            Array.from(
                customContainer.querySelectorAll(
                    '.ovolya-queue-shortcut, .ovolya-shortcut-btn'
                )
            )
                .map(el =>
                    `${el.className}:${el.textContent.trim()}:${el.title}`
                )
                .join('|');
    }

    //=====================================ОПТИМИЗАЦИЯ СПИСКА ЗАЯВОК=======================
    function enhanceListPage() {
        document.querySelectorAll('.p-panel-header').forEach(header => {
            if (header.dataset.enhanced) return;
            const columns =
                Array.from(
                    header.querySelectorAll('.request-column')
                );
            if (columns.length === 0) return;
            let ticketId = '';
            let dateTime = '';
            const idElement =
                header.querySelector('.property-name');
            if (
                idElement &&
                idElement.textContent.includes('Заявка #')
            ) {
                const idMatch =
                    idElement.textContent.match(
                        /Заявка #(\d+)/
                    );
                if (idMatch) {
                    ticketId = idMatch[1];
                }
                const dateSpan =
                    idElement.querySelector(
                        'app-datetime-property span'
                    );
                if (dateSpan) {
                    dateTime =
                        dateSpan.textContent.trim();
                }
            }
            const agentsCol =
                columns.find(col => {
                    const propName =
                        col.querySelector('.property-name');
                    return propName &&
                        propName.textContent.includes('Агенти');
                });
            if (agentsCol && ticketId) {
                const contentDiv =
                    agentsCol.querySelector(
                        '.request-column-content'
                    );
                if (contentDiv) {
                    const agentsListEl =
                        contentDiv.querySelector(
                            'app-string-list-property'
                        );
                    let agentsText =
                        agentsListEl
                            ? agentsListEl.textContent.trim()
                            : '';
                    if (agentsText === '-') {
                        agentsText = '';
                    }
                    const tooltipText =
                        agentsText
                            ? `Агенти: ${agentsText}`
                            : 'Агенти не призначені';
                    Array.from(contentDiv.children)
                        .forEach(child => {
                            child.style.display = 'none';
                        });
                    const customSpan =
                        document.createElement('span');
                    customSpan.className =
                        'ovolya-custom-agents';
                    customSpan.style.whiteSpace =
                        'nowrap';
                    customSpan.style.cursor =
                        'help';
                    customSpan.title =
                        tooltipText;
                    customSpan.textContent =
                        `${ticketId} • ${dateTime}`;
                    contentDiv.appendChild(customSpan);
                }
            }
            const statusCol =
                columns.find(col => {
                    const propName =
                        col.querySelector('.property-name');
                    return propName &&
                        propName.textContent.includes('Статус');
                });
            const queueCol =
                columns.find(col => {
                    const propName =
                        col.querySelector('.property-name');
                    return propName &&
                        propName.textContent.includes('Черга');
                });
            if (statusCol) {
                statusCol.style.flexBasis = '11%';
            }
            if (queueCol) {
                queueCol.style.flexBasis = '7%';
            }
            const titleLink =
                header.querySelector(
                    'a[href^="/admin/requests/"]'
                );
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
        document
            .querySelectorAll(
                '.status-badge, .p-badge, .request-column .property-value, .app-string-list-property'
            )
            .forEach(el => {
                if (el.textContent.includes(target)) {
                    el.textContent =
                        el.textContent.replace(
                            target,
                            replacement
                        );
                }
            });
    }

    // ============================================================
    // НАСТРОЙКИ, ФИЛЬТРЫ И ЗВУК (PORTED FROM O APC 205)
    // ============================================================
    let muteRules = JSON.parse(localStorage.getItem('sd_mute_rules') || '[]');
    let standardAudioData = localStorage.getItem('sd_snd_std') || null;
    let afkAudioData = localStorage.getItem('sd_snd_afk') || null;
    let isNightMode = localStorage.getItem('sd_night_mode') === 'true';
    let currentAudio = null;
    let isModalOpen = false;
    let activeTab = 'rules';

    function saveMuteRules() {
        localStorage.setItem('sd_mute_rules', JSON.stringify(muteRules));
    }

    function stopCurrentAudio() {
        if (currentAudio) {
            currentAudio.pause();
            currentAudio = null;
        }
    }

    // Остановка звука по любому клику на странице
    document.addEventListener('click', (e) => {
        if (e.isTrusted && currentAudio) {
            stopCurrentAudio();
        }
    }, true);

    function playAlertSound() {
        stopCurrentAudio();
        // Вместо "метро" говорим "заявки"
        const utterance = new SpeechSynthesisUtterance("заявки");
        utterance.lang = "uk-UA";
        utterance.rate = 0.8;
        utterance.volume = 1;
        utterance.onend = () => {
            const audioData = isNightMode ? afkAudioData : standardAudioData;
            if (audioData) {
                currentAudio = new Audio(audioData);
                currentAudio.play().catch(e => console.log('Autoplay blocked:', e));
                currentAudio.onended = () => { currentAudio = null; };
            }
        };
        speechSynthesis.speak(utterance);
    }

    const modal = document.createElement('div');
    modal.style.cssText = 'display:none; position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,0.8); z-index:9999; justify-content:center; align-items:center; font-family:sans-serif;';

    const modalContainer = document.createElement('div');
    modalContainer.style.cssText = 'background:#1a1a1a; width: 600px; max-width: 90%; max-height: 90vh; border: 1px solid #444; border-radius: 6px; display:flex; flex-direction:column; color:#ccc; box-shadow: 0 4px 20px rgba(0,0,0,0.7);';

    const modalHeader = document.createElement('div');
    modalHeader.style.cssText = 'background:#222; padding:10px 15px; border-bottom:1px solid #444; display:flex; justify-content:space-between; align-items:center; border-radius: 6px 6px 0 0;';

    const tabsDiv = document.createElement('div');
    const btnRules = document.createElement('button');
    btnRules.textContent = 'Чёрный список';
    const btnSettings = document.createElement('button');
    btnSettings.textContent = 'Настройки звука';

    const btnClose = document.createElement('button');
    btnClose.textContent = 'Закрыть [X]';
    btnClose.style.cssText = 'background:#522; color:#fff; border:1px solid #a44; padding:6px 12px; cursor:pointer; border-radius: 4px;';
    btnClose.onclick = () => { modal.style.display = 'none'; isModalOpen = false; };

    tabsDiv.appendChild(btnRules);
    tabsDiv.appendChild(btnSettings);
    modalHeader.appendChild(tabsDiv);
    modalHeader.appendChild(btnClose);

    const modalContent = document.createElement('div');
    modalContent.style.cssText = 'padding: 20px; overflow-y: auto;';

    modalContainer.appendChild(modalHeader);
    modalContainer.appendChild(modalContent);
    modal.appendChild(modalContainer);
    document.body.appendChild(modal);

    const btnStyleActive = 'background:#333; color:#fff; border:1px solid #555; padding:6px 16px; margin-right:8px; cursor:pointer; font-weight:bold; border-radius: 4px;';
    const btnStyleInactive = 'background:#222; color:#aaa; border:1px solid #444; padding:6px 16px; margin-right:8px; cursor:pointer; border-radius: 4px;';
    const btnActionStyle = 'background:#444; color:#fff; border:none; padding:6px 12px; cursor:pointer; border-radius:3px;';

    function renderModal() {
        btnRules.style.cssText = activeTab === 'rules' ? btnStyleActive : btnStyleInactive;
        btnSettings.style.cssText = activeTab === 'settings' ? btnStyleActive : btnStyleInactive;
        modalContent.innerHTML = '';

        if (activeTab === 'rules') {
            const addContainer = document.createElement('div');
            addContainer.style.cssText = 'display:flex; gap:10px; margin-bottom: 20px;';
            const inputRule = document.createElement('input');
            inputRule.placeholder = 'Слово или фраза в названии заявки...';
            inputRule.style.cssText = 'flex-grow:1; padding:8px; background:#222; color:#fff; border:1px solid #555; border-radius:3px;';
            const btnAdd = document.createElement('button');
            btnAdd.textContent = 'Добавить';
            btnAdd.style.cssText = btnActionStyle + 'background:#1e3a5f;';

            btnAdd.onclick = () => {
                const val = inputRule.value.trim();
                if (val && !muteRules.includes(val)) {
                    muteRules.push(val);
                    saveMuteRules();
                    renderModal();
                }
            };
            addContainer.appendChild(inputRule);
            addContainer.appendChild(btnAdd);
            modalContent.appendChild(addContainer);

            const table = document.createElement('table');
            table.style.cssText = 'width:100%; border-collapse:collapse; text-align:left;';
            table.innerHTML = `<tr><th style="border:1px solid #444; padding:8px; background:#2a2a2a;">Фраза (Игнор заявки)</th><th style="border:1px solid #444; padding:8px; background:#2a2a2a; width:80px;">Действие</th></tr>`;

            if (muteRules.length === 0) {
                table.innerHTML += `<tr><td colspan="2" style="border:1px solid #444; padding:8px; text-align:center; color:#888;">Список пуст</td></tr>`;
            }

            muteRules.forEach((rule, idx) => {
                const tr = document.createElement('tr');
                tr.innerHTML = `<td style="border:1px solid #444; padding:8px;">${rule}</td>
                                <td style="border:1px solid #444; padding:8px; text-align:center;">
                                    <button class="del-btn" data-idx="${idx}" style="${btnActionStyle} background:#522;">Удалить</button>
                                </td>`;
                table.appendChild(tr);
            });

            table.querySelectorAll('.del-btn').forEach(btn => {
                btn.onclick = () => {
                    muteRules.splice(parseInt(btn.dataset.idx), 1);
                    saveMuteRules();
                    renderModal();
                };
            });
            modalContent.appendChild(table);

        } else if (activeTab === 'settings') {
            const settingsDiv = document.createElement('div');

            const createSoundBlock = (title, desc, storageKey, varName, currentData) => {
                const block = document.createElement('div');
                block.style.cssText = 'margin-bottom:20px; padding:15px; border:1px solid #444; background:#222; border-radius:4px;';
                block.innerHTML = `
                    <h3 style="margin-top:0; border-bottom:1px solid #333; padding-bottom:8px;">${title}</h3>
                    <p style="color:#888; font-size: 13px;">${desc}</p>
                    <div style="display:flex; align-items:center; gap:10px; margin-top:10px;">
                        <input type="file" id="file_${varName}" accept="audio/*" style="display:none;">
                        <button id="btn_${varName}" style="${btnActionStyle} background:#333; border:1px solid #555;">Выбрать файл</button>
                        <span id="name_${varName}" style="color:#888; font-size:12px;">${currentData ? 'Аудио загружено' : 'Файл не выбран'}</span>
                        <button id="test_${varName}" style="${btnActionStyle} margin-left:auto;">Тест</button>
                        ${currentData ? '<span style="color:#0f0;">✓</span>' : '<span style="color:#f00;">❌</span>'}
                    </div>
                `;
                return block;
            };

            settingsDiv.appendChild(createSoundBlock('Стандартная мелодия (☀️ День)', 'TTS "Заявки" + эта мелодия.', 'sd_snd_std', 'std', standardAudioData));
            settingsDiv.appendChild(createSoundBlock('AFK Мелодия (🌙 Ночь)', 'TTS "Заявки" + эта мелодия (если включён Ночной режим).', 'sd_snd_afk', 'afk', afkAudioData));

            const nightBlock = document.createElement('div');
            nightBlock.style.cssText = 'padding:15px; border:1px solid #444; background:#222; border-radius:4px; display:flex; justify-content:space-between; align-items:center;';
            nightBlock.innerHTML = `
                <span style="font-weight:bold;">Режим работы:</span>
                <button id="toggleNight" style="${btnActionStyle} background:${isNightMode ? '#1e3a5f' : '#333'};">
                    ${isNightMode ? '🌙 Ночь (AFK)' : '☀️ День (Стандарт)'}
                </button>
            `;
            settingsDiv.appendChild(nightBlock);
            settingsDiv.innerHTML += `<p style="color:#ffaa00; font-size:12px; margin-top: 15px;">Файлы до 2 МБ. Звук останавливается кликом по странице.</p>`;

            modalContent.appendChild(settingsDiv);

            modalContent.querySelector('#toggleNight').onclick = (e) => {
                isNightMode = !isNightMode;
                localStorage.setItem('sd_night_mode', isNightMode);
                renderModal();
            };

            const handleFile = (inputObj, storageKey, varName) => {
                if (inputObj.files.length === 0) return;
                const file = inputObj.files[0];
                if (file.size > 2.5 * 1024 * 1024) { alert('Файл >2 МБ!'); return; }
                const reader = new FileReader();
                reader.onload = (e) => {
                    localStorage.setItem(storageKey, e.target.result);
                    if (varName === 'std') standardAudioData = e.target.result;
                    if (varName === 'afk') afkAudioData = e.target.result;
                    renderModal();
                };
                reader.readAsDataURL(file);
            };

            modalContent.querySelector(`#btn_std`).onclick = () => modalContent.querySelector(`#file_std`).click();
            modalContent.querySelector(`#file_std`).onchange = (e) => handleFile(e.target, 'sd_snd_std', 'std');
            modalContent.querySelector(`#test_std`).onclick = () => {
                stopCurrentAudio();
                const utt = new SpeechSynthesisUtterance("заявки");
                utt.lang = "uk-UA"; utt.rate = 0.8; utt.volume = 1;
                utt.onend = () => { if (standardAudioData) { currentAudio = new Audio(standardAudioData); currentAudio.play(); currentAudio.onended = () => { currentAudio = null; }; } };
                speechSynthesis.speak(utt);
            };

            modalContent.querySelector(`#btn_afk`).onclick = () => modalContent.querySelector(`#file_afk`).click();
            modalContent.querySelector(`#file_afk`).onchange = (e) => handleFile(e.target, 'sd_snd_afk', 'afk');
            modalContent.querySelector(`#test_afk`).onclick = () => {
                stopCurrentAudio();
                const utt = new SpeechSynthesisUtterance("заявки");
                utt.lang = "uk-UA"; utt.rate = 0.8; utt.volume = 1;
                utt.onend = () => { if (afkAudioData) { currentAudio = new Audio(afkAudioData); currentAudio.play(); currentAudio.onended = () => { currentAudio = null; }; } };
                speechSynthesis.speak(utt);
            };
        }
    }

    btnRules.onclick = () => { activeTab = 'rules'; renderModal(); };
    btnSettings.onclick = () => { activeTab = 'settings'; renderModal(); };

    function openSettingsModal() {
        isModalOpen = true;
        modal.style.display = 'flex';
        renderModal();
    }

    // ==================================МОНИТОРИНГ НОВЫХ ЗАЯВОК==========================
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

        // Ищем ссылки на заявки непосредственно внутри колонок
        document.querySelectorAll('.request-column-content a[href^="/admin/requests/"]').forEach(link => {
            const href = link.getAttribute('href');
            // Извлекаем ID из ссылки (например, /admin/requests/100613)
            const match = href.match(/\/admin\/requests\/(\d+)/);

            if (match) {
                const id = match[1];
                // Берем название из атрибута title (самый точный вариант) или из текста
                const title = link.getAttribute('title') || link.textContent.trim() || '';

                if (id && !tickets.has(id)) {
                    tickets.set(id, { id, title });
                }
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

    // ============================================================
    // DEBUG / НАСТРОЙКИ UI
    // ============================================================
    function monitorCreateDebug() {
        if (monitorDebugDiv) return;
        monitorDebugDiv = document.createElement('div');
        monitorDebugDiv.id = 'ovolya-monitor-debug';
        monitorDebugDiv.style.cssText = `
            position: fixed;
            bottom: 10px;
            right: 10px;
            background: #222;
            color: #0f0;
            padding: 5px 10px;
            font-family: monospace;
            z-index: 9998;
            font-size: 12px;
            border-radius: 4px;
            opacity: .9;
            cursor: pointer;
            border: 1px solid #444;
            user-select: none;
        `;
        monitorDebugDiv.title = 'Нажмите, чтобы открыть Настройки и Фильтры';

        // Открытие настроек при клике по таймеру
        monitorDebugDiv.addEventListener('click', () => {
            monitorNotificationCount = 0;
            const notification = document.querySelector('#ovolya-new-request-notification');
            if (notification) notification.remove();
            monitorStopTitleBlink();
            monitorUpdateDebug();

            // Открываем перенесенное модальное окно
            openSettingsModal();
        });
        document.body.appendChild(monitorDebugDiv);
    }

    function monitorUpdateDebug() {
        if (!monitorDebugDiv) return;
        const m = Math.floor(Math.max(0, monitorTimeLeft) / 60);
        const s = Math.floor(Math.max(0, monitorTimeLeft) % 60);
        let status = monitorIsOwner ? 'моніторинг' : 'очікування';
        let text = `🔄 ${m}:${String(s).padStart(2, '0')} | ${status}`;

        if (monitorNotificationCount > 0) {
            text += ` | 🟠 нових: ${monitorNotificationCount}`;
            monitorDebugDiv.style.color = '#ffaa00';
            monitorDebugDiv.style.border = '1px solid #ffaa00';
        } else {
            monitorDebugDiv.style.color = '#0f0';
            monitorDebugDiv.style.border = '1px solid #444';
        }
        monitorDebugDiv.textContent = text;
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
                    location.href = TARGET_URL;
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
        if (!monitorIsOwner) {
            monitorAcquireLock();
            if (monitorIsOwner) {
                monitorLastTick = Date.now();
                monitorTimeLeft = MONITOR_TIMER_MAX_SEC;
                if (isMonitorTargetPage()) {
                    monitorCheckForNewTickets();
                }
            }
        }
        monitorUpdateDebug();
    }

    // ============================================================
    // ИНИЦИАЛИЗАЦИЯ
    // ============================================================
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
