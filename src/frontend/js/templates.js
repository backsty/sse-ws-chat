export function createMessageElement(from, text, timestamp, isOwn) {
    const time = new Date(timestamp).toLocaleTimeString();
    return `
        <div class="message ${isOwn ? 'own' : 'other'}">
            <div class="message-header">${isOwn ? 'You' : from}</div>
            <div class="message-text">${escapeHtml(text)}</div>
            <div class="message-time">${time}</div>
        </div>
    `;
}

export function createUserElement(user, isCurrentUser) {
    return `<li class="user ${isCurrentUser ? 'current' : ''}">${isCurrentUser ? 'You' : escapeHtml(user)}</li>`;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}