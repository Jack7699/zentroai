// ZENTROAI CONFIGURATION
const API_URL = "YOUR_CLOUDFLARE_WORKER_URL";

// DOM ELEMENTS
const form = document.getElementById("chatForm");
const input = document.getElementById("messageInput");
const messagesBox = document.getElementById("messages");
const welcome = document.getElementById("welcome");
const sendButton = document.getElementById("sendButton");
const chatHistory = document.getElementById("chatHistory");
const sidebar = document.getElementById("sidebar");
const overlay = document.getElementById("mobileOverlay");

let chats = JSON.parse(localStorage.getItem("zentro_chats") || "[]");
let activeChatId = null;
let isLoading = false;

// STORAGE

function saveChats() {
  localStorage.setItem("zentro_chats", JSON.stringify(chats));
}

function getActiveChat() {
  return chats.find(chat => chat.id === activeChatId);
}

// CREATE CHAT

function createChat() {
  const chat = {
    id: crypto.randomUUID(),
    title: "New conversation",
    messages: [],
    updated: Date.now()
  };

  chats.unshift(chat);
  activeChatId = chat.id;

  saveChats();
  render();
  closeSidebar();
}

// HISTORY

function renderHistory() {
  chatHistory.innerHTML = "";

  chats.forEach(chat => {
    const item = document.createElement("div");
    item.className =
      "history-item" + (chat.id === activeChatId ? " active" : "");

    const title = document.createElement("span");
    title.className = "history-title";
    title.textContent = chat.title;

    const deleteButton = document.createElement("button");
    deleteButton.className = "delete-chat";
    deleteButton.textContent = "×";
    deleteButton.title = "Delete conversation";

    deleteButton.addEventListener("click", event => {
      event.stopPropagation();

      chats = chats.filter(c => c.id !== chat.id);

      if (activeChatId === chat.id) {
        activeChatId = chats[0]?.id || null;
      }

      saveChats();
      render();
    });

    item.append(title, deleteButton);

    item.addEventListener("click", () => {
      activeChatId = chat.id;
      render();
      closeSidebar();
    });

    chatHistory.appendChild(item);
  });
}

// SAFE TEXT FORMATTING

function escapeHTML(text) {
  return text.replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function formatMessage(text) {
  let safe = escapeHTML(text);

  const blocks = [];

  safe = safe.replace(/```(\w*)\n?([\s\S]*?)```/g,
    (_, language, code) => {
      const id = blocks.length;
      blocks.push(`<pre><code>${code.trim()}</code></pre>`);
      return `%%CODE${id}%%`;
    }
  );

  safe = safe.replace(/`([^`]+)`/g, "<code>$1</code>");
  safe = safe.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  safe = safe.replace(/\*(.*?)\*/g, "<em>$1</em>");

  safe = safe.replace(/^[-*] (.+)$/gm, "<li>$1</li>");
  safe = safe.replace(/\n/g, "<br>");

  safe = safe.replace(
    /(?:<li>.*?<\/li>)(?:<br>?)?/g,
    match => match
  );

  safe = safe.replace(/%%CODE(\d+)%%/g,
    (_, id) => blocks[Number(id)]
  );

  return safe;
}

// DISPLAY MESSAGES

function addMessage(message) {
  const row = document.createElement("div");
  row.className = `message ${message.role}`;

  if (message.role === "assistant") {
    const icon = document.createElement("div");
    icon.className = "message-icon";
    icon.textContent = "Z";

    const content = document.createElement("div");
    content.className = "message-content";
    content.innerHTML = formatMessage(message.text);

    const copy = document.createElement("button");
    copy.className = "copy-button";
    copy.textContent = "Copy response";

    copy.addEventListener("click", async () => {
      await navigator.clipboard.writeText(message.text);
      copy.textContent = "Copied!";
      setTimeout(() => copy.textContent = "Copy response", 1500);
    });

    content.appendChild(copy);
    row.append(icon, content);
  } else {
    const content = document.createElement("div");
    content.className = "message-content";
    content.textContent = message.text;
    row.appendChild(content);
  }

  messagesBox.appendChild(row);
}

function render() {
  renderHistory();

  messagesBox.innerHTML = "";

  const chat = getActiveChat();
  const hasMessages = chat && chat.messages.length > 0;

  welcome.style.display = hasMessages ? "none" : "block";

  if (chat) {
    chat.messages.forEach(addMessage);
  }

  scrollToBottom();
}

function scrollToBottom() {
  const area = document.getElementById("chatArea");
  area.scrollTop = area.scrollHeight;
}

// TYPING INDICATOR

function showTyping() {
  const row = document.createElement("div");
  row.className = "message assistant";
  row.id = "typingIndicator";

  row.innerHTML = `
    <div class="message-icon">Z</div>
    <div class="message-content typing">
      Zentro is thinking<span>...</span>
    </div>
  `;

  messagesBox.appendChild(row);
  scrollToBottom();
}

function removeTyping() {
  document.getElementById("typingIndicator")?.remove();
}

// SEND MESSAGE

async function sendMessage(text) {
  if (!text.trim() || isLoading) return;

  if (!activeChatId) {
    createChat();
  }

  const chat = getActiveChat();

  const userMessage = {
    role: "user",
    text: text.trim()
  };

  chat.messages.push(userMessage);

  if (chat.messages.length === 1) {
    chat.title = text.trim().slice(0, 35);
  }

  chat.updated = Date.now();

  saveChats();
  render();

  input.value = "";
  input.style.height = "auto";

  isLoading = true;
  sendButton.disabled = true;

  showTyping();

  try {
    if (!API_URL.startsWith("https://")) {
      throw new Error("Please configure your Cloudflare Worker URL in script.js.");
    }

    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        messages: chat.messages.map(message => ({
          role: message.role,
          text: message.text
        }))
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "The AI service returned an error.");
    }

    if (!data.reply) {
      throw new Error("Zentro received an empty response.");
    }

    chat.messages.push({
      role: "assistant",
      text: data.reply
    });

    chat.updated = Date.now();

  } catch (error) {
    chat.messages.push({
      role: "assistant",
      text: "Sorry! I couldn't connect to my AI service.\n\n" + error.message
    });
  }

  removeTyping();

  isLoading = false;
  sendButton.disabled = false;

  saveChats();
  render();
  input.focus();
}

// FORM

form.addEventListener("submit", event => {
  event.preventDefault();
  sendMessage(input.value);
});

input.addEventListener("input", () => {
  input.style.height = "auto";
  input.style.height = Math.min(input.scrollHeight, 160) + "px";
});

input.addEventListener("keydown", event => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    form.requestSubmit();
  }
});

// NEW CHAT

document.getElementById("newChat").addEventListener("click", () => {
  createChat();
});

document.getElementById("clearChat").addEventListener("click", () => {
  const chat = getActiveChat();
  if (!chat || !chat.messages.length) return;

  if (confirm("Clear this conversation?")) {
    chat.messages = [];
    chat.title = "New conversation";
    saveChats();
    render();
  }
});

// SUGGESTIONS

document.querySelectorAll(".suggestion").forEach(button => {
  button.addEventListener("click", () => {
    sendMessage(button.dataset.prompt);
  });
});

// MOBILE SIDEBAR

function closeSidebar() {
  sidebar.classList.remove("open");
  overlay.classList.remove("active");
}

document.getElementById("menuButton").addEventListener("click", () => {
  sidebar.classList.add("open");
  overlay.classList.add("active");
});

document.getElementById("closeSidebar").addEventListener("click", closeSidebar);
overlay.addEventListener("click", closeSidebar);

// KEYBOARD SHORTCUT

document.addEventListener("keydown", event => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
    event.preventDefault();
    createChat();
  }
});

// INITIALIZE

if (chats.length > 0) {
  activeChatId = chats[0].id;
}

render();
