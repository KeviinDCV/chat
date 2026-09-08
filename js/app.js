/* ============================================================
   Chat — cliente
   Habla con /api/sync y /api/send. No hay dependencias externas.

   El sondeo se frena solo: rápido mientras hay conversación,
   lento cuando está tranquilo y detenido si la pestaña no se ve.
   Así el plan gratuito de Upstash rinde mucho más.
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
    typingRow: document.getElementById("typingRow"),
    configWarning: document.getElementById("configWarning"),
    phone: document.getElementById("phone"),
  };

  // ---------- Ajustes ----------
  const POLL_ACTIVE = 2500;    // hay conversación
  const POLL_QUIET = 6000;     // más de 1 min sin nada
  const POLL_IDLE = 15000;     // más de 5 min sin nada
  const QUIET_AFTER = 60000;
  const IDLE_AFTER = 300000;
  const TYPING_HOLD = 4000;    // cuánto sigo "escribiendo" tras la última tecla
  const IMAGE_MAX_SIDE = 800;
  const IMAGE_QUALITY = 0.55;
  const MAX_IMAGE_CHARS = 700000;

  // ---------- Estado ----------
  let myName = "";
  let myId = "";
  let lastId = 0;
  let lastActivity = Date.now();
  let typingUntil = 0;
  let pollTimer = null;
  let syncing = false;
  let connected = false;
  let lastSenderId = null;
  let started = false;

  // ---------- Utilidades ----------
  function getMyId() {
    let id = localStorage.getItem("chat_uid");
    // El servidor exige el formato u_<alfanumérico>
    if (!id || !/^u_[a-z0-9]{6,40}$/i.test(id)) {
      id =
        "u_" +
        Math.random().toString(36).slice(2, 10) +
        Date.now().toString(36);
      localStorage.setItem("chat_uid", id);
    }
    return id;
  }

  function formatTime(ts) {
    if (!ts) return "";
    return new Date(ts).toLocaleTimeString("es", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function scrollToBottom(smooth) {
    requestAnimationFrame(function () {
      el.messages.scrollTo({
        top: el.messages.scrollHeight,
        behavior: smooth ? "smooth" : "auto",
      });
    });
  }

  /** ¿Está el usuario mirando el final del chat? */
  function isNearBottom() {
    const gap =
      el.messages.scrollHeight - el.messages.scrollTop - el.messages.clientHeight;
    return gap < 120;
  }

  function bumpActivity() {
    lastActivity = Date.now();
  }

  /** Envía un formulario disparando su evento submit. */
  function submitForm(form) {
    if (typeof form.requestSubmit === "function") form.requestSubmit();
    else form.dispatchEvent(new Event("submit", { cancelable: true }));
  }

  // ---------- Arranque ----------
  function init() {
    myId = getMyId();
    buildEmojiPanel();
    bindEvents();

    const saved = localStorage.getItem("chat_name");
    if (saved) {
      enterChat(saved);
    } else {
      setTimeout(function () { el.nameInput.focus(); }, 300);
    }
  }

  function enterChat(name) {
    myName = String(name || "").trim().slice(0, 24);
    if (!myName) return;

    localStorage.setItem("chat_name", myName);
    el.loginScreen.classList.add("hidden");
    el.chatScreen.classList.remove("hidden");

    started = true;
    bumpActivity();
    sync(); // primera carga: trae todo el historial

    setTimeout(function () { el.messageInput.focus(); }, 200);
  }

  // ---------- Sondeo ----------
  function pollDelay() {
    const quiet = Date.now() - lastActivity;
    if (quiet > IDLE_AFTER) return POLL_IDLE;
    if (quiet > QUIET_AFTER) return POLL_QUIET;
    return POLL_ACTIVE;
  }

  function schedule() {
    clearTimeout(pollTimer);
    // Con la pestaña oculta no se consulta nada: ahorra cuota
    // y es coherente con "en línea = está mirando".
    if (document.hidden || !started) return;
    pollTimer = setTimeout(sync, pollDelay());
  }

  async function sync() {
    if (syncing || !started) return;
    syncing = true;

    const amTyping = Date.now() < typingUntil && el.messageInput.value.trim() !== "";

    try {
      const res = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uid: myId,
          name: myName,
          since: lastId,
          typing: amTyping,
        }),
      });

      if (res.status === 503) {
        showDbWarning();
        return;
      }
      if (!res.ok) throw new Error("HTTP " + res.status);

      const data = await res.json();
      setConnected(true);

      if (Array.isArray(data.messages) && data.messages.length) {
        const stick = isNearBottom();
        data.messages.forEach(function (m) { renderMessage(m); });
        lastId = data.messages[data.messages.length - 1].id;
        bumpActivity();
        if (stick) scrollToBottom(true);
      }

      renderUsers(data.online || []);
      renderTyping(data.typing || []);
    } catch (err) {
      setConnected(false);
    } finally {
      syncing = false;
      schedule();
    }
  }

  /** Fuerza una consulta inmediata (tras enviar, o al volver a la pestaña). */
  function syncNow() {
    clearTimeout(pollTimer);
    sync();
  }

  /**
   * Avisa que me voy, para desaparecer de la lista al instante en
   * vez de esperar a que caduque la presencia.
   *
   * sendBeacon es lo único fiable aquí: al cerrar la pestaña el
   * navegador cancela las peticiones normales, pero un beacon se
   * entrega igual. keepalive es el plan B.
   */
  function leave() {
    if (!myId || !myName) return;
    const payload = JSON.stringify({ uid: myId, name: myName });

    try {
      if (navigator.sendBeacon) {
        const blob = new Blob([payload], { type: "application/json" });
        if (navigator.sendBeacon("/api/leave", blob)) return;
      }
    } catch (err) {
      // cae al plan B
    }

    try {
      fetch("/api/leave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
        keepalive: true,
      }).catch(function () {});
    } catch (err) {
      // nada más que hacer: caducará sola en 30 s
    }
  }

  function setConnected(ok) {
    connected = ok;
    el.statusLine.classList.toggle("live", ok);
    if (!ok) {
      el.statusLine.textContent = "sin conexión";
      el.statusLine.classList.remove("typing");
    }
  }

  function showDbWarning() {
    started = false;
    clearTimeout(pollTimer);
    el.configWarning.classList.remove("hidden");
  }

  // ---------- Mensajes ----------
  function renderMessage(msg) {
    if (!msg || typeof msg.id !== "number") return;
    if (document.getElementById("m_" + msg.id)) return; // ya está

    const mine = msg.uid === myId;
    const grouped = msg.uid === lastSenderId;
    lastSenderId = msg.uid;

    const bubble = document.createElement("div");
    bubble.id = "m_" + msg.id;
    bubble.className =
      "msg " + (mine ? "me" : "other") + (grouped ? " grouped" : "");

    if (!mine && !grouped) {
      const sender = document.createElement("span");
      sender.className = "sender";
      sender.textContent = msg.name || "Anónimo"; // textContent: nada de HTML
      bubble.appendChild(sender);
    }

    if (msg.image) {
      const img = document.createElement("img");
      img.className = "photo";
      img.src = msg.image;
      img.alt = "Imagen";
      img.loading = "lazy";
      img.addEventListener("click", function () { openLightbox(msg.image); });
      img.addEventListener("load", function () {
        if (isNearBottom()) scrollToBottom(false);
      });
      bubble.appendChild(img);
    }

    if (msg.text) {
      const text = document.createElement("span");
      text.className = "text";
      text.textContent = msg.text;
      bubble.appendChild(text);
    }

    const time = document.createElement("span");
    time.className = "time";
    time.textContent = formatTime(msg.ts);
    bubble.appendChild(time);

    // Siempre antes de la fila de "escribiendo…"
    el.messages.insertBefore(bubble, el.typingRow);
  }

  async function send(payload) {
    typingUntil = 0;
    bumpActivity();

    try {
      const res = await fetch("/api/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          Object.assign({ uid: myId, name: myName }, payload)
        ),
      });

      if (res.status === 503) { showDbWarning(); return; }
      if (res.status === 413) { alert("La imagen es muy pesada."); return; }
      if (!res.ok) throw new Error("HTTP " + res.status);

      syncNow(); // el mensaje propio vuelve en la siguiente consulta
    } catch (err) {
      setConnected(false);
      alert("No se pudo enviar. Revisa tu conexión.");
    }
  }

  // ---------- Presencia ----------
  function renderUsers(list) {
    const others = [];
    let meOnline = false;

    list.forEach(function (u) {
      if (!u || !u.name) return;
      if (u.uid === myId) meOnline = true;
      else others.push(u.name);
    });
    others.sort(function (a, b) { return a.localeCompare(b, "es"); });

    const names = others.slice();
    if (meOnline) names.push("Tú");

    el.peopleLine.textContent = names.length
      ? names.join(", ")
      : "Nadie conectado";
    el.peopleLine.classList.toggle("empty", names.length === 0);

    // Panel desplegable
    el.usersList.innerHTML = "";
    if (!list.length) {
      const li = document.createElement("li");
      li.textContent = "Nadie conectado";
      li.style.color = "#8a8a8a";
      el.usersList.appendChild(li);
    } else {
      list.forEach(function (u) {
        const li = document.createElement("li");
        const dot = document.createElement("span");
        dot.className = "dot";
        li.appendChild(dot);
        const label = document.createElement("span");
        label.textContent = u.name + (u.uid === myId ? " (tú)" : "");
        li.appendChild(label);
        el.usersList.appendChild(li);
      });
    }

    // El recuento solo se muestra si no hay nadie escribiendo
    if (connected && !el.statusLine.classList.contains("typing")) {
      const n = list.length;
      el.statusLine.textContent = n === 1 ? "1 en línea" : n + " en línea";
    }
  }

  // ---------- "Escribiendo…" ----------
  function renderTyping(list) {
    const names = list
      .map(function (t) { return t.name; })
      .filter(Boolean);

    const active = names.length > 0;
    el.typingRow.classList.toggle("hidden", !active);
    el.statusLine.classList.toggle("typing", active);

    if (!active) {
      // renderUsers vuelve a poner el recuento en la próxima vuelta
      return;
    }

    let label;
    if (names.length === 1) label = names[0] + " está escribiendo…";
    else if (names.length === 2) label = names[0] + " y " + names[1] + " están escribiendo…";
    else label = "Varias personas están escribiendo…";

    el.statusLine.textContent = label;
    if (isNearBottom()) scrollToBottom(true);
  }

  // ---------- Imágenes ----------
  function handleImage(file) {
    if (!file || !file.type.startsWith("image/")) return;

    const reader = new FileReader();
    reader.onload = function (e) {
      const img = new Image();
      img.onload = function () {
        let width = img.width;
        let height = img.height;

        if (width > IMAGE_MAX_SIDE || height > IMAGE_MAX_SIDE) {
          const scale = IMAGE_MAX_SIDE / Math.max(width, height);
          width = Math.round(width * scale);
          height = Math.round(height * scale);
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d").drawImage(img, 0, 0, width, height);

        let dataUrl = canvas.toDataURL("image/jpeg", IMAGE_QUALITY);

        // Segundo intento con más compresión si aún pesa demasiado
        if (dataUrl.length > MAX_IMAGE_CHARS) {
          dataUrl = canvas.toDataURL("image/jpeg", 0.4);
        }
        if (dataUrl.length > MAX_IMAGE_CHARS) {
          alert("La imagen es muy pesada. Prueba con una más pequeña.");
          return;
        }

        send({ image: dataUrl });
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
        markTyping();
      });
      el.emojiPanel.appendChild(b);
    });
  }

  function markTyping() {
    typingUntil = Date.now() + TYPING_HOLD;
    bumpActivity();
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
      send({ text: text });
    });

    // Cada tecla renueva el aviso de "escribiendo…".
    // No genera peticiones: viaja dentro del sondeo que ya ocurre.
    el.messageInput.addEventListener("input", function () {
      if (el.messageInput.value.trim()) markTyping();
      else typingUntil = 0;
    });

    // Enter para enviar. El navegador ya lo hace solo, pero algunos
    // teclados móviles no disparan el envío implícito del formulario.
    el.messageInput.addEventListener("keydown", function (ev) {
      if (ev.key === "Enter" && !ev.shiftKey) {
        ev.preventDefault();
        submitForm(el.composer);
      }
    });
    el.nameInput.addEventListener("keydown", function (ev) {
      if (ev.key === "Enter") {
        ev.preventDefault();
        submitForm(el.loginForm);
      }
    });

    el.emojiBtn.addEventListener("click", function () {
      el.emojiPanel.classList.toggle("hidden");
      el.usersPanel.classList.add("hidden");
      if (isNearBottom()) scrollToBottom(false);
    });

    el.imageBtn.addEventListener("click", function () {
      el.fileInput.click();
    });

    el.fileInput.addEventListener("change", function (ev) {
      handleImage(ev.target.files[0]);
      ev.target.value = "";
    });

    el.usersBtn.addEventListener("click", function () {
      el.usersPanel.classList.toggle("hidden");
      el.emojiPanel.classList.add("hidden");
    });

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
      leave(); // antes de apagar nada: leave() necesita el nombre
      started = false;
      clearTimeout(pollTimer);
      localStorage.removeItem("chat_name");
      location.reload();
    });

    // Pegar una imagen desde el portapapeles
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

    // Al volver a la pestaña: reanudar y consultar ya
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) {
        clearTimeout(pollTimer);
      } else if (started) {
        bumpActivity();
        syncNow();
      }
    });

    // Cerrar la pestaña, recargar o irse a otra página.
    // pagehide es el evento fiable (funciona también en móviles).
    window.addEventListener("pagehide", function () {
      if (started) leave();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
