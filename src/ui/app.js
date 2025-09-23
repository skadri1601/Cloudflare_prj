class TravelPlannerApp {
    constructor() {
        this.apiBase = window.location.origin;
        this.userId = this.generateUserId();
        this.sessionId = this.generateSessionId();
        this.isLoading = false;

        this.elements = {
            welcome: document.getElementById('welcome'),
            messages: document.getElementById('messages'),
            messageInput: document.getElementById('messageInput'),
            sendButton: document.getElementById('sendButton'),
            typingIndicator: document.getElementById('typingIndicator'),
            currentUserId: document.getElementById('currentUserId'),
            clearMemory: document.getElementById('clearMemory'),
            responseTime: document.getElementById('responseTime'),
            connectionStatus: document.getElementById('connectionStatus'),
            loadingOverlay: document.getElementById('loadingOverlay')
        };

        this.init();
    }

    init() {
        this.setupEventListeners();
        this.displayUserId();
        this.checkConnection();

        // Auto-resize textarea
        this.setupTextareaResize();

        // Focus input
        this.elements.messageInput.focus();
    }

    setupEventListeners() {
        // Send message on button click
        this.elements.sendButton.addEventListener('click', () => this.sendMessage());

        // Send message on Enter (but allow Shift+Enter for new lines)
        this.elements.messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        // Clear memory
        this.elements.clearMemory.addEventListener('click', () => this.clearMemory());

        // Handle input changes
        this.elements.messageInput.addEventListener('input', () => {
            this.updateSendButton();
        });
    }

    setupTextareaResize() {
        this.elements.messageInput.addEventListener('input', () => {
            this.elements.messageInput.style.height = 'auto';
            this.elements.messageInput.style.height = Math.min(this.elements.messageInput.scrollHeight, 120) + 'px';
        });
    }

    generateUserId() {
        let userId = localStorage.getItem('travelPlannerUserId');
        if (!userId) {
            userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('travelPlannerUserId', userId);
        }
        return userId;
    }

    generateSessionId() {
        return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    displayUserId() {
        this.elements.currentUserId.textContent = this.userId.slice(-12);
    }

    updateSendButton() {
        const hasText = this.elements.messageInput.value.trim().length > 0;
        this.elements.sendButton.disabled = !hasText || this.isLoading;
    }

    async sendMessage() {
        const message = this.elements.messageInput.value.trim();
        if (!message || this.isLoading) return;

        // Hide welcome section on first message
        if (this.elements.welcome.style.display !== 'none') {
            this.elements.welcome.style.display = 'none';
        }

        // Add user message to chat
        this.addMessage('user', message);

        // Clear input
        this.elements.messageInput.value = '';
        this.elements.messageInput.style.height = 'auto';
        this.updateSendButton();

        // Show typing indicator
        this.showTypingIndicator();

        // Send to API
        await this.callChatAPI(message);
    }

    async callChatAPI(message) {
        const startTime = Date.now();

        try {
            this.setLoading(true);

            const response = await fetch(`${this.apiBase}/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message,
                    userId: this.userId,
                    sessionId: this.sessionId
                })
            });

            const responseTime = Date.now() - startTime;
            this.updateResponseTime(responseTime);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            if (data.error) {
                throw new Error(data.error);
            }

            // Add assistant response
            this.addMessage('assistant', data.response, {
                externalDataUsed: data.externalDataUsed,
                preferences: data.preferences
            });

        } catch (error) {
            console.error('Chat API error:', error);
            this.addMessage('assistant',
                `Sorry, I encountered an error: ${error.message}. Please try again.`,
                { isError: true }
            );
        } finally {
            this.hideTypingIndicator();
            this.setLoading(false);
        }
    }

    addMessage(role, content, meta = {}) {
        const messageElement = document.createElement('div');
        messageElement.className = `message ${role}`;

        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        avatar.textContent = role === 'user' ? '👤' : '🤖';

        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';

        const messageText = document.createElement('div');
        messageText.className = 'message-text';

        // Format message content
        messageText.innerHTML = this.formatMessage(content);

        messageContent.appendChild(messageText);

        // Add metadata if available
        if (Object.keys(meta).length > 0) {
            const messageMeta = document.createElement('div');
            messageMeta.className = 'message-meta';

            let metaText = '';
            if (meta.externalDataUsed) {
                metaText += '📊 Real-time data used • ';
            }
            if (meta.isError) {
                metaText += '⚠️ Error • ';
            }
            metaText += new Date().toLocaleTimeString();

            messageMeta.textContent = metaText;
            messageContent.appendChild(messageMeta);
        }

        messageElement.appendChild(avatar);
        messageElement.appendChild(messageContent);

        this.elements.messages.appendChild(messageElement);
        this.scrollToBottom();
    }

    formatMessage(content) {
        // Simple formatting for travel content
        let formatted = content
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')  // Bold
            .replace(/\*(.*?)\*/g, '<em>$1</em>')              // Italic
            .replace(/\n/g, '<br>')                            // Line breaks
            .replace(/🌤️|🎭|🏨|🎯|📊/g, '<span class="highlight-emoji">$&</span>'); // Highlight emojis

        return formatted;
    }

    showTypingIndicator() {
        this.elements.typingIndicator.style.display = 'flex';
        this.scrollToBottom();
    }

    hideTypingIndicator() {
        this.elements.typingIndicator.style.display = 'none';
    }

    setLoading(loading) {
        this.isLoading = loading;
        this.updateSendButton();

        if (loading) {
            this.elements.loadingOverlay.style.display = 'flex';
        } else {
            this.elements.loadingOverlay.style.display = 'none';
        }
    }

    scrollToBottom() {
        this.elements.messages.parentElement.scrollTop = this.elements.messages.parentElement.scrollHeight;
    }

    updateResponseTime(time) {
        this.elements.responseTime.textContent = `Response time: ${time}ms`;
    }

    async clearMemory() {
        if (!confirm('Are you sure you want to clear your travel preferences and conversation history?')) {
            return;
        }

        try {
            const response = await fetch(`${this.apiBase}/memory/clear?userId=${this.userId}`, {
                method: 'POST'
            });

            if (response.ok) {
                // Clear chat UI
                this.elements.messages.innerHTML = '';
                this.elements.welcome.style.display = 'block';

                // Generate new session
                this.sessionId = this.generateSessionId();

                this.showNotification('Memory cleared successfully!', 'success');
            } else {
                throw new Error('Failed to clear memory');
            }
        } catch (error) {
            console.error('Clear memory error:', error);
            this.showNotification('Failed to clear memory', 'error');
        }
    }

    async checkConnection() {
        try {
            const response = await fetch(`${this.apiBase}/health`);
            const data = await response.json();

            if (data.status === 'healthy') {
                this.updateConnectionStatus(true);
            } else {
                this.updateConnectionStatus(false);
            }
        } catch (error) {
            console.error('Connection check failed:', error);
            this.updateConnectionStatus(false);
        }
    }

    updateConnectionStatus(connected) {
        const indicator = this.elements.connectionStatus.querySelector('.status-indicator');
        const text = this.elements.connectionStatus.querySelector('span:last-child') || this.elements.connectionStatus;

        if (connected) {
            indicator.classList.add('connected');
            if (text !== this.elements.connectionStatus) {
                text.textContent = 'Connected to Cloudflare Edge';
            }
        } else {
            indicator.classList.remove('connected');
            if (text !== this.elements.connectionStatus) {
                text.textContent = 'Connection issues';
            }
        }
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;

        // Style the notification
        Object.assign(notification.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            background: type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#4f46e5',
            color: 'white',
            padding: '1rem 1.5rem',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            zIndex: '1001',
            animation: 'slideInRight 0.3s ease-out'
        });

        document.body.appendChild(notification);

        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease-out';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }
}

// Global functions for prompt buttons
window.usePrompt = function(prompt) {
    const app = window.travelApp;
    if (app) {
        app.elements.messageInput.value = prompt;
        app.updateSendButton();
        app.elements.messageInput.focus();
    }
};

// Add CSS animations for notifications
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }

    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }

    .highlight-emoji {
        font-size: 1.1em;
        margin: 0 2px;
    }
`;
document.head.appendChild(style);

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.travelApp = new TravelPlannerApp();
});

// Service worker registration for offline support (optional)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('SW registered: ', registration);
            })
            .catch(registrationError => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}