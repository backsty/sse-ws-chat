export class EventEmitter {
  constructor() {
    this.events = new Map();
    this._handleError = this._handleError.bind(this);
  }

  /**
   * Подписка на событие
   * @param {string} event - Название события
   * @param {Function} callback - Функция-обработчик
   * @returns {Function} - Функция для отписки
   * @throws {Error} При некорректных параметрах
   */
  on(event, callback) {
    if (!event || typeof event !== 'string') {
      throw new Error('Некорректное название события');
    }

    if (typeof callback !== 'function') {
      throw new Error('Callback должен быть функцией');
    }

    if (!this.events.has(event)) {
      this.events.set(event, new Set());
    }
    this.events.get(event).add(callback);

    return () => this.off(event, callback);
  }

  /**
   * Обработка ошибок в колбэках
   */
  _handleError(event, error, callback) {
    console.error(`Ошибка в обработчике события ${event}:`, {
      error: error.message,
      callback: callback.name || 'anonymous',
      stack: error.stack,
    });
  }

  /**
   * Одноразовая подписка на событие
   */
  once(event, callback) {
    const wrapper = (...args) => {
      this.off(event, wrapper);
      callback(...args);
    };
    return this.on(event, wrapper);
  }

  /**
   * Отписка от события
   */
  off(event, callback) {
    if (!this.events.has(event)) return;
    if (!callback) {
      this.events.delete(event);
      return;
    }
    this.events.get(event).delete(callback);
  }

  /**
   * Генерация события
   * @param {string} event - Название события
   * @param {*} data - Данные события
   */
  emit(event, data) {
    if (!this.events.has(event)) return;

    this.events.get(event).forEach((callback) => {
      try {
        callback(data);
      } catch (error) {
        this._handleError(event, error, callback);
      }
    });
  }

  /**
   * Очистка всех обработчиков
   */
  clear() {
    this.events.clear();
  }
}
