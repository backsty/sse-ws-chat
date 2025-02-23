export class CookieManager {
  static set(name, value, days = 7) {
    try {
      const expires = new Date();
      expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);

      // Используем более безопасные параметры для куки
      document.cookie = `${name}=${encodeURIComponent(value)};expires=${expires.toUTCString()};path=/;SameSite=Strict`;
    } catch (error) {
      console.error('❌ Ошибка сохранения куки:', error);
    }
  }

  static get(name) {
    try {
      const nameEQ = `${name}=`;
      const cookies = document.cookie.split(';');

      for (let cookie of cookies) {
        cookie = cookie.trim();
        if (cookie.indexOf(nameEQ) === 0) {
          return decodeURIComponent(cookie.substring(nameEQ.length));
        }
      }
    } catch (error) {
      console.error('❌ Ошибка чтения куки:', error);
    }
    return null;
  }

  static delete(name) {
    this.set(name, '', -1);
  }
}
