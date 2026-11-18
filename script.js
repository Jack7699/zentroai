
// ==========================================
// ZENTROAI — AUTHENTICATION + AI SYSTEM
// ==========================================

// SUPABASE CONFIGURATION
const SUPABASE_URL = "https://puzgeihczwyaszdbirdj.supabase.co";
const SUPABASE_KEY = "sb_publishable_QBxQx0QIJPnr23GRNv1uYA_3QvKFUxL";

// AI CONFIGURATION
const API_URL = "https://zentro.hvth53873.workers.dev";

// SUPABASE CLIENT
const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

// AUTH ELEMENTS
const authScreen = document.getElementById("authScreen");
const app = document.getElementById("app");
const authForm = document.getElementById("authForm");
const authEmail = document.getElementById("authEmail");
const authPassword = document.getElementById("authPassword");
const authTitle = document.getElementById("authTitle");
const authSubtitle = document.getElementById("authSubtitle");
const authSubmit = document.getElementById("authSubmit");
const authToggle = document.getElementById("authToggle");
const authError = document.getElementById("authError");

let isSignUp = false;
let currentSession = null;

// CHAT ELEMENTS
const form = document.getElementById("chatForm");
const input = document.getElementById("messageInput");
const messagesBox = document.getElementById("messages");
const welcome = document.getElementById("welcome");
const sendButton = document.getElementById("sendButton");
const chatHistory = document.getElementById("chatHistory");
const sidebar = document.getElementById("sidebar");
const overlay = document.getElementById("mobileOverlay");

// CHAT STORAGE
let chats = JSON.parse(localStorage.getItem("zentro_chats") || "[]");
let activeChatId = null;
let isLoading = false;

// ==========================================
// AUTHENTICATION
// ==========================================

// SIGN IN / SIGN UP SWITCH
authToggle.addEventListener("click", () => {
  isSignUp = !isSignUp;

  authTitle.textContent = isSignUp
    ? "Create your account"
    : "Welcome to ZentroAI";

  authSubtitle.textContent = isSignUp
    ? "Join ZentroAI and explore beyond"
    : "Sign in to continue";

  authSubmit.textContent = isSignUp
    ? "Create account"
    : "Sign in";

  authToggle.textContent = isSignUp
    ? "Already have an account? Sign in"
    : "Don't have an account? Sign up";

  authError.textContent = "";
});


// EMAIL OTP VERIFICATION
let pendingVerificationEmail = "";

let otpScreen = null;

function showOtpScreen() {
  authForm.style.display = "none";
  authToggle.style.display = "none";

  if (!otpScreen) {
    otpScreen = document.createElement("div");
    otpScreen.id = "otpScreen";

    otpScreen.innerHTML = `
      <h2 style="color:white;margin-bottom:10px;">Verify your email</h2>
      <p style="color:#aaa;margin-bottom:20px;">
        Enter the 6-digit code sent to your email.
      </p>

      <input
        id="otpInput"
        type="text"
        inputmode="numeric"
        maxlength="8"
        placeholder="000000"
        style="width:100%;padding:15px;margin-bottom:15px;
        border-radius:10px;border:1px solid #554477;
        background:#171326;color:white;font-size:22px;
        text-align:center;letter-spacing:8px;"
      >

      <button id="verifyOtpButton" type="button"
        style="width:100%;padding:14px;border:0;
        border-radius:10px;background:#9b6bff;
        color:white;cursor:pointer;">
        Verify code
      </button>

      <button id="resendOtpButton" type="button"
        style="width:100%;padding:12px;margin-top:10px;
        background:transparent;border:0;color:#b99aff;
        cursor:pointer;">
        Resend code
      </button>

      <button id="backOtpButton" type="button"
        style="width:100%;padding:10px;background:transparent;
        border:0;color:#aaa;cursor:pointer;">
        Back to sign up
      </button>
    `;

    authForm.parentElement.appendChild(otpScreen);

    document.getElementById("verifyOtpButton").addEventListener("click", verifyEmailOtp);
    document.getElementById("resendOtpButton").addEventListener("click", resendEmailOtp);

    document.getElementById("backOtpButton").addEventListener("click", () => {
      otpScreen.style.display = "none";
      authForm.style.display = "flex";
      authToggle.style.display = "";
      authError.textContent = "";
    });
  }

  otpScreen.style.display = "block";
}

async function verifyEmailOtp() {
  const token = document.getElementById("otpInput").value.trim();
  const verifyButton = document.getElementById("verifyOtpButton");

  if (!/^\d{8}$/.test(token)) {
    authError.textContent = "Enter a valid 6-digit code.";
    return;
  }

  verifyButton.disabled = true;
  authError.textContent = "";

  try {
    const { data, error } = await supabaseClient.auth.verifyOtp({
      email: pendingVerificationEmail,
      token,
      type: "signup"
    });

    if (error) throw error;

    if (data.session) {
      updateAuthUI(data.session);
    }
  } catch (error) {
    authError.textContent = error.message;
  } finally {
    verifyButton.disabled = false;
  }
}

async function resendEmailOtp() {
  const resendButton = document.getElementById("resendOtpButton");

  resendButton.disabled = true;
  resendButton.textContent = "Sending...";

  try {
    const { error } = await supabaseClient.auth.resend({
      type: "signup",
      email: pendingVerificationEmail
    });

    if (error) throw error;

    authError.style.color = "#70e2b5";
    authError.textContent = "A new verification code has been sent!";
  } catch (error) {
    authError.style.color = "#ff7181";
    authError.textContent = error.message;
  } finally {
    resendButton.disabled = false;
    resendButton.textContent = "Resend code";
  }
}

// AUTH FORM
authForm.addEventListener("submit", async event => {
  event.preventDefault();

  const email = authEmail.value.trim();
  const password = authPassword.value;

  authSubmit.disabled = true;
  authSubmit.textContent = "Please wait...";
  authError.textContent = "";

  try {
    if (isSignUp) {
      const { data, error } = await supabaseClient.auth.signUp({
        email,
        password
      });

      if (error) throw error;

      if (!data.session) {
        pendingVerificationEmail = email;
        authError.textContent = "";
        showOtpScreen();
      } else {
        updateAuthUI(data.session);
      }

    } else {
      const { data, error } =
        await supabaseClient.auth.signInWithPassword({
          email,
          password
        });

      if (error) throw error;

      updateAuthUI(data.session);
    }

  } catch (error) {
    authError.style.color = "#ff7181";
    authError.textContent = error.message;
  } finally {
    authSubmit.disabled = false;
    authSubmit.textContent = isSignUp
      ? "Create account"
      : "Sign in";
  }
});


// UPDATE AUTH SCREEN
function updateAuthUI(session) {
  currentSession = session;

  if (session) {
    authScreen.hidden = true;
    app.hidden = false;

    const profileName = document.querySelector(".profile-info strong");
    const profileDescription =
      document.querySelector(".profile-info span");

    if (profileName) {
      profileName.textContent =
        session.user.email.split("@")[0];
    }

    if (profileDescription) {
      profileDescription.textContent = session.user.email;
    }

    render();

  } else {
    app.hidden = true;
    authScreen.hidden = false;
  }
}

// LOGOUT BUTTON
const profile = document.querySelector(".profile");

const logoutButton = document.createElement("button");
logoutButton.textContent = "↪";
logoutButton.title = "Sign out";

logoutButton.style.marginLeft = "auto";
logoutButton.style.background = "transparent";
logoutButton.style.border = "1px solid #ffffff20";
logoutButton.style.borderRadius = "8px";
logoutButton.style.color = "#c4a1ff";
logoutButton.style.padding = "7px 10px";
logoutButton.style.cursor = "pointer";

profile.appendChild(logoutButton);

logoutButton.addEventListener("click", async () => {
  const confirmed = confirm("Are you sure you want to sign out?");

  if (!confirmed) return;

  const { error } = await supabaseClient.auth.signOut();

  if (error) {
    alert(error.message);
  }
});

// SESSION LISTENER
supabaseClient.auth.onAuthStateChange((_event, session) => {
  updateAuthUI(session);
});


// CHECK EXISTING SESSION
async function initializeAuth() {
  const { data, error } = await supabaseClient.auth.getSession();

  if (error) {
    authError.textContent = error.message;
    return;
  }

  updateAuthUI(data.session);
}

initializeAuth();

// ==========================================
// IMAGE REQUEST DETECTION
// ==========================================

function isImageRequest(text) {
  return /\b(?:create|generate|make|draw|design)\b[\s\S]{0,45}\b(?:image|picture|illustration|artwork|wallpaper|logo)\b|\b(?:image|picture)\s+of\b/i.test(text);
}

// ==========================================
// STORAGE
// ==========================================

function saveChats() {
  try {
    localStorage.setItem("zentro_chats", JSON.stringify(chats));
  } catch (error) {
    console.warn("Could not save chats:", error);
  }
}

function getActiveChat() {
  return chats.find(chat => chat.id === activeChatId);
}

// ==========================================
// CREATE CHAT
// ==========================================

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

// ==========================================
// CHAT HISTORY
// ==========================================

function renderHistory() {
  chatHistory.innerHTML = "";

  chats.forEach(chat => {
    const item = document.createElement("div");

    item.className =
      "history-item" +
      (chat.id === activeChatId ? " active" : "");

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

// ==========================================
// SAFE TEXT FORMATTING
// ==========================================

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

  safe = safe.replace(/%%CODE(\d+)%%/g,
    (_, id) => blocks[Number(id)]
  );

  return safe;
}

// ==========================================
// DISPLAY MESSAGES
// ==========================================

function addMessage(message) {
  const row = document.createElement("div");
  row.className = `message ${message.role}`;

  if (message.role === "assistant") {
    const icon = document.createElement("div");
    icon.className = "message-icon";
    icon.textContent = "Z";

    const content = document.createElement("div");
    content.className = "message-content";

    if (message.text) {
      content.innerHTML = formatMessage(message.text);
    }

    if (message.image) {
      const image = document.createElement("img");

      image.src = message.image;
      image.alt = "Image generated by ZentroAI";
      image.className = "generated-image";

      image.style.display = "block";
      image.style.width = "100%";
      image.style.maxWidth = "520px";
      image.style.height = "auto";
      image.style.marginTop = "12px";
      image.style.borderRadius = "15px";
      image.style.border =
        "1px solid rgba(177,133,255,.2)";

      const download = document.createElement("a");

      download.href = message.image;
      download.download = "zentro-generated-image.png";
      download.textContent = "↓ Download image";

      download.style.display = "inline-block";
      download.style.marginTop = "12px";
      download.style.padding = "9px 14px";
      download.style.borderRadius = "9px";
      download.style.background = "#a855f722";
      download.style.color = "#c4a1ff";
      download.style.textDecoration = "none";
      download.style.fontSize = "12px";

      content.append(image, download);
    }

    row.append(icon, content);

  } else {
    const content = document.createElement("div");
    content.className = "message-content";
    content.textContent = message.text;

    row.appendChild(content);
  }

  messagesBox.appendChild(row);
}

// ==========================================
// RENDER
// ==========================================

function render() {
  if (!currentSession) return;

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

  requestAnimationFrame(() => {
    area.scrollTo({
      top: area.scrollHeight,
      behavior: "smooth"
    });
  });
}

// ==========================================
// TYPING INDICATOR
// ==========================================

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

// ==========================================
// SEND MESSAGE
// ==========================================

async function sendMessage(text) {
  if (!currentSession || !text.trim() || isLoading) return;

  if (!activeChatId) {
    createChat();
  }

  const chat = getActiveChat();
  const trimmedText = text.trim();

  const userMessage = {
    role: "user",
    text: trimmedText
  };

  chat.messages.push(userMessage);

  if (chat.messages.length === 1) {
    chat.title = trimmedText.slice(0, 35);
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
      throw new Error("Please configure your Cloudflare Worker URL.");
    }

    let requestBody;

    // IMAGE GENERATION
    if (isImageRequest(trimmedText)) {
      requestBody = {
        mode: "image",
        prompt: trimmedText
      };

    } else {
      // NORMAL CHAT
      requestBody = {
        messages: chat.messages.map(message => ({
          role: message.role,
          text: message.text
        }))
      };
    }

    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(requestBody)
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.error || "The AI service returned an error."
      );
    }

    if (requestBody.mode === "image") {
      if (!data.image) {
        throw new Error("Zentro couldn't generate an image.");
      }

      chat.messages.push({
        role: "assistant",
        text: "Here's your generated image!",
        image: data.image
      });

    } else {
      if (!data.reply) {
        throw new Error("Zentro received an empty response.");
      }

      chat.messages.push({
        role: "assistant",
        text: data.reply
      });
    }

    chat.updated = Date.now();

  } catch (error) {
    chat.messages.push({
      role: "assistant",
      text: "Sorry! Something went wrong.\n\n" + error.message
    });
  }

  removeTyping();

  isLoading = false;
  sendButton.disabled = false;

  saveChats();
  render();
  input.focus();
}

// ==========================================
// CHAT FORM
// ==========================================

form.addEventListener("submit", event => {
  event.preventDefault();
  sendMessage(input.value);
});

input.addEventListener("input", () => {
  input.style.height = "auto";
  input.style.height =
    Math.min(input.scrollHeight, 160) + "px";
});

input.addEventListener("keydown", event => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    form.requestSubmit();
  }
});

// ==========================================
// NEW CHAT + CLEAR CHAT
// ==========================================

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

// ==========================================
// SUGGESTIONS
// ==========================================

document.querySelectorAll(".suggestion").forEach(button => {
  button.addEventListener("click", () => {
    sendMessage(button.dataset.prompt);
  });
});

// ==========================================
// MOBILE SIDEBAR
// ==========================================

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

// ==========================================
// KEYBOARD SHORTCUT
// ==========================================

document.addEventListener("keydown", event => {
  if (
    (event.ctrlKey || event.metaKey) &&
    event.key.toLowerCase() === "k"
  ) {
    if (!currentSession) return;

    event.preventDefault();
    createChat();
  }
});

// ==========================================
// INITIALIZE CHAT
// ==========================================

if (chats.length > 0) {
  activeChatId = chats[0].id;
}
