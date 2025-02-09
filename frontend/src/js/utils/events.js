export class EventEmitter {
  constructor() {
    this.events = new Map();
  }

  /**
   * Подписка на событие
   * @param {string} event - Название события
   * @param {Function} callback - Функция-обработчик
   * @returns {Function} - Функция для отписки
   */
  on(event, callback) {
    if (!this.events.has(event)) {
      this.events.set(event, new Set());
    }
    this.events.get(event).add(callback);
    
    // Возвращаем функцию для удобного удаления слушателя
    return () => this.off(event, callback);
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
   */
  emit(event, data) {
    if (!this.events.has(event)) return;
    this.events.get(event).forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Ошибка в обработчике события ${event}:`, error);
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