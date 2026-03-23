const askBtn = document.getElementById('ask-btn');
const chatWidget = document.getElementById('chat-widget');
const closeChat = document.getElementById('close-chat');
const sendBtn = document.getElementById('send-chat');
const chatInput = document.getElementById('chat-input');
const chatMessages = document.getElementById('chat-messages');

// Toggle Chat Window
askBtn.addEventListener('click', () => chatWidget.classList.toggle('chat-hidden'));
closeChat.addEventListener('click', () => chatWidget.classList.add('chat-hidden'));

async function sendMessage() {
    const text = chatInput.value.trim();
    if (!text) return;

    // Append User Message to UI
    appendMessage(text, 'user-msg');
    chatInput.value = '';

    try {
        const response = await fetch('/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: text })
        });
        const data = await response.json();
        appendMessage(data.reply, 'ai-msg');
    } catch (error) {
        appendMessage("Error connecting to AI.", 'ai-msg');
    }
}

function appendMessage(text, className) {
    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${className}`;
    msgDiv.innerText = text;
    chatMessages.appendChild(msgDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

sendBtn.addEventListener('click', sendMessage);
chatInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendMessage(); });

const dragHeader = document.querySelector('.chat-header');
const widget = document.getElementById('chat-widget');

let isDragging = false;
let currentX;
let currentY;
let initialX;
let initialY;
let xOffset = 0;
let yOffset = 0;

dragHeader.addEventListener("mousedown", dragStart);
document.addEventListener("mousemove", drag);
document.addEventListener("mouseup", dragEnd);

function dragStart(e) {
    initialX = e.clientX - xOffset;
    initialY = e.clientY - yOffset;
    if (e.target === dragHeader || dragHeader.contains(e.target)) {
        isDragging = true;
    }
}

function drag(e) {
    if (isDragging) {
        e.preventDefault();
        currentX = e.clientX - initialX;
        currentY = e.clientY - initialY;
        xOffset = currentX;
        yOffset = currentY;

        setTranslate(currentX, currentY, widget);
    }
}

function setTranslate(xPos, yPos, el) {
    el.style.transform = `translate3d(${xPos}px, ${yPos}px, 0)`;
}

function dragEnd() {
    initialX = currentX;
    initialY = currentY;
    isDragging = false;
}
