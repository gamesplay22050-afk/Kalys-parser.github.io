console.log("script.js loaded (robust)");

// DOM 
const loginBtn = document.getElementById("loginBtn");
const usernameInput = document.getElementById("username");
const passwordInput = document.getElementById("password");
const allContainer = document.getElementById("all");
const solvedContainer = document.getElementById("solved");

let ALL_TASKS = [];

// Утилиты
function extractFromHtml(html) {
  try {
    const tmp = document.createElement("div");
    tmp.innerHTML = html;
    const a = tmp.querySelector("a");
    if (a) {
      return {
        title: a.textContent.trim() || null,
        url: a.getAttribute("href") || ""
      };
    }
    // вернуть текст без тэгов
    const text = tmp.textContent.trim();
    return { title: text || null, url: "" };
  } catch (e) {
    return { title: null, url: "" };
  }
}




function normalizeItem(t) {
  // строковый title
  if (typeof t.title === "string") {
    return { title: t.title, url: t.url || "", solved: !!t.solved, html: t.html || null };
  }

  // JSON
  try {
    return { title: JSON.stringify(t).slice(0, 200), url: t.url || "", solved: !!t.solved, html: null };
  } catch (e) {
    return { title: "Без названия", url: "", solved: !!t.solved, html: null };
  }
}





// Загрузка с сервера
async function loadTasksFromServer(username, password) {
  console.log("➡ Отправка POST /api/tasks", { username });
  try {
    const resp = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });

    console.log("⬅ Ответ сервера:", resp.status);
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err.error || `HTTP ${resp.status}`);
    }

    const data = await resp.json().catch(() => null);
    // Поддерживаем форму
    const raw = Array.isArray(data) ? data : (data && Array.isArray(data.tasks) ? data.tasks : []);
    console.log("raw tasks length:", raw.length);

    // Нормализация
    const normalized = [];
    for (let i = 0; i < raw.length; i++) {
      const item = raw[i];
      try {
        const n = normalizeItem(item);
        // валидация
        if (!n.title) n.title = "Без названия";
        normalized.push(n);
      } catch (e) {
        console.warn("Ошибка нормализации элемента index", i, e);
        // пропускаем элемент
      }
    }

    console.log(" Нормализовано задач:", normalized.length);
    return normalized;
  } catch (err) {
    console.error("Ошибка при запросе /api/tasks:", err);
    throw err;
  }
}



// Обработчик кнопки
if (loginBtn) {
  loginBtn.addEventListener("click", async () => {
    const username = usernameInput ? usernameInput.value.trim() : "";
    const password = passwordInput ? passwordInput.value : "";

    if (!username || !password) {
      alert("Введите логин и пароль");
      return;
    }

    loginBtn.disabled = true;
    loginBtn.textContent = "Загрузка";

    try {
      const tasks = await loadTasksFromServer(username, password);
      ALL_TASKS = tasks;
      console.log("ALL_TASKS установлен:", ALL_TASKS.length);
      alert(`Загружено заданий: ${ALL_TASKS.length}`);
    } catch (err) {
      alert("Ошибка при загрузке заданий: " + (err.message || err));
    } finally {
      loginBtn.disabled = false;
      loginBtn.textContent = "Показать задания";
    }
  });
} else {
  console.error("loginBtn не найден");
}



// Рендер
function renderAll() {
  if (!allContainer) return;
  allContainer.innerHTML = "";
  if (!ALL_TASKS || ALL_TASKS.length === 0) {
    allContainer.innerHTML = "<div>Нет загруженных заданий. Сначала нажмите 'Показать задания'.</div>";
    return;
  }

  ALL_TASKS.forEach(t => {
    const div = document.createElement("div");
    div.className = "task";
    if (t.html) {
      // ставим ссылку из хтмл
      const tmp = document.createElement("div");
      tmp.innerHTML = t.html;
      const a = tmp.querySelector("a");
      if (a) {
        const a2 = a.cloneNode(true);
        a2.target = "_blank";
        div.appendChild(a2);
      } else {
        div.textContent = t.title;
      }
    } else if (t.url) {
      const a = document.createElement("a");
      a.href = t.url;
      a.target = "_blank";
      a.textContent = t.title;
      div.appendChild(a);
    } else {
      div.textContent = t.title;
    }
    allContainer.appendChild(div);
  });
}

function renderSolved() {
  if (!solvedContainer) return;
  solvedContainer.innerHTML = "";
  if (!ALL_TASKS || ALL_TASKS.length === 0) {
    solvedContainer.innerHTML = "<div>Нет решённых заданий.</div>";
    return;
  }

  const solved = ALL_TASKS.filter(t => !!t.solved);
  if (!solved.length) {
    solvedContainer.innerHTML = "<div>Нет решённых заданий.</div>";
    return;
  }

  solved.forEach(t => {
    const div = document.createElement("div");
    div.className = "task solved";
    if (t.html) {
      const tmp = document.createElement("div");
      tmp.innerHTML = t.html;
      const a = tmp.querySelector("a");
      if (a) {
        const a2 = a.cloneNode(true);
        a2.target = "_blank";
        div.appendChild(a2);
      } else {
        div.textContent = t.title;
      }
    } else if (t.url) {
      const a = document.createElement("a");
      a.href = t.url;
      a.target = "_blank";
      a.textContent = t.title;
      div.appendChild(a);
    } else {
      div.textContent = t.title;
    }
    solvedContainer.appendChild(div);
  });
}

const blockAll = document.getElementById("block-all");
const blockSolved = document.getElementById("block-solved");

function hideBlocks() {
  blockAll.classList.remove("active");
  blockSolved.classList.remove("active");
}

window.showAll = function () {
  hideBlocks();
  blockAll.classList.add("active");
  renderAll();
};

window.showSolved = function () {
  hideBlocks();
  blockSolved.classList.add("active");
  renderSolved();
};


// ===== ТЕМА =====
const themeToggle = document.getElementById("themeToggle");

if (localStorage.getItem("theme") === "light") {
  document.body.classList.add("light");
  themeToggle.checked = true;
}

themeToggle.addEventListener("change", () => {
  document.body.classList.toggle("light");
  localStorage.setItem(
    "theme",
    document.body.classList.contains("light") ? "light" : "dark"
  );
});

// ===== ПЕРЕКЛЮЧЕНИЕ БЛОКОВ =====
const allBlock = document.querySelector(".block:nth-child(1)");
const solvedBlock = document.querySelector(".block:nth-child(2)");

window.showAll = () => {
  allBlock.classList.add("active");
  solvedBlock.classList.remove("active");
};

window.showSolved = () => {
  solvedBlock.classList.add("active");
  allBlock.classList.remove("active");
};