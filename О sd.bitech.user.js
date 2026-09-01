// ==UserScript==
// @name         О sd.bitech.com.ua
// @namespace    http://tampermonkey.net/
// @version      20260901
// @description  Видалення кнопки виходу скрізь, крім сторінки профілю. В стовпець агентів додається номер заявки, дата та час створення. М'яке налаштування ширини колонок. Обрізка довгих назв заявок.
// @author       Ovolya
// @match        *://sd.bitech.com.ua/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=bitech.com.ua
// @updateURL    https://github.com/Ovolsan/o-sd.bitech.com.ua/raw/refs/heads/main/%D0%9E%20sd.bitech.user.js
// @downloadURL  https://github.com/Ovolsan/o-sd.bitech.com.ua/raw/refs/heads/main/%D0%9E%20sd.bitech.user.js
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

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

    // Список заявок
    function enhanceListPage() {
        document.querySelectorAll('.p-panel-header').forEach(header => {
            if (header.dataset.enhanced) return;

            const columns = Array.from(header.querySelectorAll('.request-column'));
            if (columns.length === 0) return;

            let ticketId = '';
            let dateTime = '';

            // 1. Ищем ID заявки и дату
            const idElement = header.querySelector('.property-name');
            if (idElement && idElement.textContent.includes('Заявка #')) {
                const idMatch = idElement.textContent.match(/Заявка #(\d+)/);
                if (idMatch) ticketId = idMatch[1];

                const dateSpan = idElement.querySelector('app-datetime-property span');
                if (dateSpan) dateTime = dateSpan.textContent.trim();
            }

            // 2. Ищем колонку "Агенти"
            const agentsCol = columns.find(col => {
                const propName = col.querySelector('.property-name');
                return propName && propName.textContent.includes('Агенти');
            });

            if (agentsCol && ticketId) {
                const contentDiv = agentsCol.querySelector('.request-column-content');
                if (contentDiv) {
                    // Вытягиваем текст агентов
                    const agentsListEl = contentDiv.querySelector('app-string-list-property');
                    let agentsText = agentsListEl ? agentsListEl.textContent.trim() : '';
                    if (agentsText === '-') agentsText = '';

                    const tooltipText = agentsText ? `Агенти: ${agentsText}` : 'Агенти не призначені';

                    // Мягко скрываем старое содержимое (не удаляем, чтобы не ломать фреймворк)
                    Array.from(contentDiv.children).forEach(child => {
                        child.style.display = 'none';
                    });

                    // Создаем и аккуратно вставляем наш новый элемент с датой и номером
                    const customSpan = document.createElement('span');
                    customSpan.className = 'ovolya-custom-agents';
                    customSpan.style.whiteSpace = 'nowrap';
                    customSpan.style.cursor = 'help';
                    customSpan.title = tooltipText;
                    customSpan.textContent = `${ticketId} • ${dateTime}`;

                    contentDiv.appendChild(customSpan);
                }
            }

            // 3. Мягкая настройка ширины колонок (задаем стартовый размер, но не блокируем ресайз)
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

            // 4. Обрезка длинного названия заявки
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

    // Инициализация
    const observer = new MutationObserver(() => {
        manageLogoutButton();

        if (window.location.pathname === '/admin/requests') enhanceListPage();
    });

    observer.observe(document.body, { childList: true, subtree: true });

    // Первичный запуск
    manageLogoutButton();
    if (window.location.pathname === '/admin/requests') enhanceListPage();
})();
