/* ============================================================
   Chat en tiempo real — Firebase Realtime Database
   Mensajes, imágenes, emojis y presencia (quién está en línea).
   ============================================================ */

(function () {
  "use strict";

  // ---------- Elementos ----------
  const el = {
    loginScreen: document.getElementById("loginScreen"),
    chatScreen: document.getElementById("chatScreen"),
    loginForm: document.getElementById("loginForm"),
    nameInput: document.getElementById("nameInput"),
    messages: document.getElementById("messages"),
    composer: document.getElementById("composer"),
    messageInput: document.getElementById("messageInput"),
    sendBtn: document.getElementById("sendBtn"),
    emojiBtn: document.getElementById("emojiBtn"),
    emojiPanel: document.getElementById("emojiPanel"),
    imageBtn: document.getElementById("imageBtn"),
    fileInput: document.getElementById("fileInput"),
    statusLine: document.getElementById("statusLine"),
    peopleLine: document.getElementById("peopleLine"),
    usersBtn: document.getElementById("usersBtn"),
    usersPanel: document.getElementById("usersPanel"),
    usersList: document.getElementById("usersList"),
    logoutBtn: document.getElementById("logoutBtn"),
    configWarning: document.getElementById("configWarning"),
    phone: document.getElementById("phone"),
  };

  // ---------- Estado ----------
  let db = null;
  let myName = "";
  let myId = "";
  let presenceRef = null;
  let lastSenderId = null;
  const MAX_MESSAGES = 200;   // historial que se carga
  const IMAGE_MAX_SIDE = 900; // px, se comprime antes de enviar
  const IMAGE_QUALITY = 0.6;

  // ---------- Utilidades ----------
  function isConfigured() {
    return (
      typeof firebaseConfig === "object" &&
      firebaseConfig.apiKey &&
      !String(firebaseConfig.apiKey).startsWith("PEGA_") &&
      firebaseConfig.databaseURL &&
      !String(firebaseConfig.databaseURL).includes("TU-PROYECTO")
    );
  }

  function getMyId() {
    let id = localStorage.getItem("chat_uid");
    if (!id) {
      id = "u_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem("chat_uid", id);
    }
    return id;
  }

  function formatTime(ts) {
    if (!ts) return "";
    const d = new Date(ts);
    return d.toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" });
  }

  function scrollToBottom(smooth) {
    requestAnimationFrame(function () {
      el.messages.scrollTo({
        top: el.messages.scrollHeight,
        behavior: smooth ? "smooth" : "auto",
      });
    });
  }

  // ---------- Arranque ----------
  function init() {
    if (!isConfigured()) {
      el.configWarning.classList.remove("hidden");
      return;
    }

    firebase.initializeApp(firebaseConfig);
    db = firebase.database();
    myId = getMyId();

    buildEmojiPanel();
    bindEvents();

    // Si ya había un nombre guardado, entra directo
    const saved = localStorage.getItem("chat_name");
    if (saved) {
      enterChat(saved);
    } else {
      setTimeout(function () { el.nameInput.focus(); }, 300);
    }
  }

  // ---------- Entrar al chat ----------
  function enterChat(name) {
    myName = name.trim().slice(0, 24);
    if (!myName) return;

    localStorage.setItem("chat_name", myName);
    el.loginScreen.classList.add("hidden");
    el.chatScreen.classList.remove("hidden");

    listenMessages();
    setupPresence();

    setTimeout(function () { el.messageInput.focus(); }, 200);
  }

  // ---------- Mensajes ----------
  function messagesRef() {
    return db.ref("rooms/" + ROOM_ID + "/messages");
  }

  function listenMessages() {
    messagesRef()
      .limitToLast(MAX_MESSAGES)
      .on("child_added", function (snap) {
        renderMessage(snap.key, snap.val());
      });
  }

  function renderMessage(key, msg) {
    if (!msg) return;
    if (document.getElementById("m_" + key)) return; // evita duplicados

    const mine = msg.uid === myId;
    const grouped = msg.uid === lastSenderId;
    lastSenderId = msg.uid;

    const bubble = document.createElement("div");
    bubble.id = "m_" + key;
    bubble.className = "msg " + (mine ? "me" : "other") + (grouped ? " grouped" : "");

    // Nombre de quien escribe (solo en mensajes ajenos y no agrupados)
    if (!mine && !grouped) {
      const sender = document.createElement("span");
      sender.className = "sender";
      sender.textContent = msg.name || "Anónimo"; // textContent = seguro contra HTML
      bubble.appendChild(sender);
    }

    // Imagen
    if (msg.image) {
      const img = document.createElement("img");
      img.className = "photo";
      img.src = msg.image;
      img.alt = "Imagen";
      img.loading = "lazy";
      img.addEventListener("click", function () { openLightbox(msg.image); });
      img.addEventListener("load", function () { scrollToBottom(false); });
      bubble.appendChild(img);
    }

    // Texto
    if (msg.text) {
      const text = document.createElement("span");
      text.className = "text";
      text.textContent = msg.text;
      bubble.appendChild(text);
    }

    // Hora
    const time = document.createElement("span");
    time.className = "time";
    time.textContent = formatTime(msg.ts);
    bubble.appendChild(time);

    el.messages.appendChild(bubble);
    scrollToBottom(true);
  }

  function sendMessage(payload) {
    const data = Object.assign(
      { uid: myId, name: myName, ts: firebase.database.ServerValue.TIMESTAMP },
      payload
    );
    return messagesRef().push(data);
  }

  // ---------- Presencia (quién está conectado) ----------
  function setupPresence() {
    const roomPresence = db.ref("rooms/" + ROOM_ID + "/presence");
    const connectedRef = db.ref(".info/connected");

    // Una entrada por pestaña abierta
    presenceRef = roomPresence.push();

    connectedRef.on("value", function (snap) {
      if (snap.val() === true) {
        // Al desconectarse (cerrar pestaña, perder red) se borra solo
        presenceRef.onDisconnect().remove();
        presenceRef.set({
          uid: myId,
          name: myName,
          since: firebase.database.ServerValue.TIMESTAMP,
        });
        el.statusLine.classList.add("live");
      } else {
        el.statusLine.classList.remove("live");
        el.statusLine.textContent = "sin conexión";
      }
    });

    // Escucha la lista de conectados
    roomPresence.on("value", function (snap) {
      const val = snap.val() || {};
      const seen = new Map(); // dedupe: mismo usuario en varias pestañas = uno solo

      Object.keys(val).forEach(function (k) {
        const u = val[k];
        if (u && u.uid) seen.set(u.uid, u.name || "Anónimo");
      });

      renderUsers(seen);
    });

    // Limpieza al cerrar
    window.addEventListener("beforeunload", function () {
      if (presenceRef) presenceRef.remove();
    });
  }

  function renderUsers(map) {
    const count = map.size;

    // Separa a los demás de mí, para poner "Tú" al final
    const others = [];
    let meOnline = false;
    map.forEach(function (name, uid) {
      if (uid === myId) meOnline = true;
      else others.push(name);
    });
    others.sort(function (a, b) { return a.localeCompare(b, "es"); });

    const names = others.slice();
    if (meOnline) names.push("Tú");

    // Encabezado: solo las personas conectadas
    el.peopleLine.textContent = names.length ? names.join(", ") : "Nadie conectado";
    el.peopleLine.classList.toggle("empty", names.length === 0);

    if (el.statusLine.classList.contains("live")) {
      el.statusLine.textContent =
        count === 1 ? "1 en línea" : count + " en línea";
    }

    // Panel desplegable con la lista completa
    el.usersList.innerHTML = "";
    map.forEach(function (name, uid) {
      const li = document.createElement("li");

      const dot = document.createElement("span");
      dot.className = "dot";
      li.appendChild(dot);

      const label = document.createElement("span");
      label.textContent = name + (uid === myId ? " (tú)" : "");
      li.appendChild(label);

      el.usersList.appendChild(li);
    });

    if (count === 0) {
      const li = document.createElement("li");
      li.textContent = "Nadie conectado";
      li.style.color = "#8a8a8a";
      el.usersList.appendChild(li);
    }
  }

  // ---------- Imágenes ----------
  function handleImage(file) {
    if (!file || !file.type.startsWith("image/")) return;

    const reader = new FileReader();
    reader.onload = function (e) {
      const img = new Image();
      img.onload = function () {
        // Redimensiona y comprime para no llenar la base de datos
        let { width, height } = img;
        if (width > IMAGE_MAX_SIDE || height > IMAGE_MAX_SIDE) {
          const scale = IMAGE_MAX_SIDE / Math.max(width, height);
          width = Math.round(width * scale);
          height = Math.round(height * scale);
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d").drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL("image/jpeg", IMAGE_QUALITY);

        // Límite de seguridad (~1.5 MB en base64)
        if (dataUrl.length > 1_500_000) {
          alert("La imagen es muy pesada. Prueba con una más pequeña.");
          return;
        }

        sendMessage({ image: dataUrl });
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  function openLightbox(src) {
    const box = document.createElement("div");
    box.className = "lightbox";
    const img = document.createElement("img");
    img.src = src;
    box.appendChild(img);
    box.addEventListener("click", function () { box.remove(); });
    el.phone.appendChild(box);
  }

  // ---------- Emojis ----------
  const EMOJIS = [
    "😀","😁","😂","🤣","😊","😇","🙂","😉",
    "😍","🥰","😘","😜","🤪","🤗","🤔","🤨",
    "😐","😴","😪","😢","😭","😤","😡","🥺",
    "😱","🤯","🥳","😎","🤓","🫡","🙃","😬",
    "👍","👎","👌","🙏","👏","🙌","💪","🤝",
    "❤️","🧡","💛","💚","💙","💜","🖤","💔",
    "🔥","✨","⭐","🎉","🎊","💯","✅","❌",
    "☕","🍕","🍺","🎵","⚽","🚗","🌙","☀️",
  ];

  function buildEmojiPanel() {
    EMOJIS.forEach(function (e) {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = e;
      b.addEventListener("click", function () {
        el.messageInput.value += e;
        el.messageInput.focus();
      });
      el.emojiPanel.appendChild(b);
    });
  }

  // ---------- Eventos ----------
  function bindEvents() {
    el.loginForm.addEventListener("submit", function (ev) {
      ev.preventDefault();
      enterChat(el.nameInput.value);
    });

    el.composer.addEventListener("submit", function (ev) {
      ev.preventDefault();
      const text = el.messageInput.value.trim();
      if (!text) return;
      el.messageInput.value = "";
      el.emojiPanel.classList.add("hidden");
      sendMessage({ text: text });
    });

    el.emojiBtn.addEventListener("click", function () {
      el.emojiPanel.classList.toggle("hidden");
      el.usersPanel.classList.add("hidden");
      scrollToBottom(false);
    });

    el.imageBtn.addEventListener("click", function () {
      el.fileInput.click();
    });

    el.fileInput.addEventListener("change", function (ev) {
      handleImage(ev.target.files[0]);
      ev.target.value = ""; // permite reenviar la misma imagen
    });

    el.usersBtn.addEventListener("click", function () {
      el.usersPanel.classList.toggle("hidden");
      el.emojiPanel.classList.add("hidden");
    });

    // Cerrar el panel de usuarios al tocar fuera
    document.addEventListener("click", function (ev) {
      if (
        !el.usersPanel.classList.contains("hidden") &&
        !el.usersPanel.contains(ev.target) &&
        !el.usersBtn.contains(ev.target)
      ) {
        el.usersPanel.classList.add("hidden");
      }
    });

    el.logoutBtn.addEventListener("click", function () {
      if (!confirm("¿Salir del chat?")) return;
      if (presenceRef) presenceRef.remove();
      localStorage.removeItem("chat_name");
      location.reload();
    });

    // Pegar imagen desde el portapapeles
    el.messageInput.addEventListener("paste", function (ev) {
      const items = (ev.clipboardData || {}).items || [];
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf("image") !== -1) {
          handleImage(items[i].getAsFile());
          ev.preventDefault();
          return;
        }
      }
    });
  }

  // Arranca cuando el DOM está listo
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
