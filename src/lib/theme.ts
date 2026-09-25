// Общее для темы оформления: ключ в localStorage и скрипт для <head>.
//
// Отдельный модуль, а не components/ThemeToggle: константы из файла с
// 'use client' серверный layout получил бы клиентской ссылкой, а не строкой.

export const THEME_STORAGE_KEY = 'pulse-theme';

/**
 * Выполняется в <head> до отрисовки: явный выбор темы ставится на <html>
 * сразу, и страница не мигает светлой. Только простой JS и try —
 * localStorage бывает недоступен (приватный режим, запрет cookie).
 */
export const THEME_SCRIPT = `try{var t=localStorage.getItem('${THEME_STORAGE_KEY}');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t}catch(e){}`;
