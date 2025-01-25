export function setCookie(name, value, days = 7) {
    const date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    const encodedValue = encodeURIComponent(value);
    document.cookie = `${name}=${encodedValue};expires=${date.toUTCString()};path=/;SameSite=Strict;Secure`;
}

export function getCookie(name) {
    try {
        const matches = document.cookie.match(new RegExp(
            "(?:^|; )" + name.replace(/([.$?*|{}()[\]\\/+^])/g, '\\$1') + "=([^;]*)"
        ));
        return matches ? decodeURIComponent(matches[1]) : null;
    } catch (error) {
        console.error('Ошибка чтения cookie:', error);
        return null;
    }
}

export function deleteCookie(name) {
    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;SameSite=Strict;Secure`;
}

export function hasCookie(name) {
    return getCookie(name) !== null;
}