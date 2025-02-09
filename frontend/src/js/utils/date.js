/**
 * Форматы отображения дат
 */
const DATE_FORMATS = {
  date: { 
    day: '2-digit',
    month: '2-digit',
    year: 'numeric' 
  },
  time: { 
    hour: '2-digit',
    minute: '2-digit'
  }
};

/**
 * Форматирование даты в локальный формат
 * @param {number} timestamp - Unix timestamp
 * @returns {string} Отформатированная дата
 */
export const formatDate = (timestamp) => {
  if (!timestamp || isNaN(timestamp)) {
    console.warn('❌ Некорректный timestamp:', timestamp);
    return '';
  }
  
  const date = new Date(timestamp);
  return new Intl.DateTimeFormat('ru-RU', DATE_FORMATS.date).format(date);
};

/**
 * Форматирование времени в формат ЧЧ:ММ
 * @param {number} timestamp - Unix timestamp
 * @returns {string} Отформатированное время
 */
export const formatTime = (timestamp) => {
  if (!timestamp || isNaN(timestamp)) {
    console.warn('❌ Некорректный timestamp:', timestamp);
    return '';
  }
  
  const date = new Date(timestamp);
  return new Intl.DateTimeFormat('ru-RU', DATE_FORMATS.time).format(date);
};

/**
 * Форматирование даты последней активности
 */
export const formatLastSeen = (timestamp) => {
  const now = Date.now();
  const diff = now - timestamp;
  
  // Меньше минуты
  if (diff < 60000) {
    return 'только что';
  }
  
  // Меньше часа
  if (diff < 3600000) {
    const minutes = Math.floor(diff / 60000);
    return `${minutes} ${getPluralForm(minutes, ['минуту', 'минуты', 'минут'])} назад`;
  }
  
  // Меньше суток
  if (diff < 86400000) {
    return formatTime(timestamp);
  }
  
  // Меньше недели
  if (diff < 604800000) {
    const days = Math.floor(diff / 86400000);
    return `${days} ${getPluralForm(days, ['день', 'дня', 'дней'])} назад`;
  }
  
  return formatDate(timestamp);
};

/**
 * Вспомогательная функция для правильных окончаний
 */
const getPluralForm = (number, forms) => {
  const cases = [2, 0, 1, 1, 1, 2];
  return forms[
    (number % 100 > 4 && number % 100 < 20) 
      ? 2 
      : cases[(number % 10 < 5) ? number % 10 : 5]
  ];
};