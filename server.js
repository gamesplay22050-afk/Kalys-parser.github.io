const express = require("express");
const puppeteer = require("puppeteer");
const app = express();
const PORT = 3000;


const CHROME_PATH =
  "C:\\Users\\User\\.cache\\puppeteer\\chrome\\win64-143.0.7499.42\\chrome-win64\\chrome.exe";

app.use(express.json());
app.use(express.static("public"));

console.log("сервер запущен");

async function parseTasksWithLogin(username, password) {
  console.log("parseTasksWithLogin — старт");

  const browser = await puppeteer.launch({
    headless: false,
    executablePath: CHROME_PATH,
    defaultViewport: null,
  });

  const page = await browser.newPage();

  try {
    console.log(" Переход на сайт");

    await page.goto("https://kalys.bolotbekov.kg/accounts/login/", {
      waitUntil: "networkidle2",
      timeout: 60000,
    });

    console.log(" Ожидание формы логина");

    await page.waitForFunction(() => {
      return (
        document.querySelector('input[name="username"]') &&
        document.querySelector('input[type="password"]')
      );
    }, { timeout: 60000 });

    console.log(" Ввод логина и пароля");

    await page.type('input[name="username"]', username, { delay: 50 });
    await page.type('input[type="password"]', password, { delay: 50 });

    console.log(" Нажатие Войти");

    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForNavigation({ waitUntil: "networkidle2", timeout: 60000 }),
    ]);

    console.log(" Вход выполнен");

    console.log(" Переход на страницу заданий");

    await page.goto("https://kalys.bolotbekov.kg/tasks/", {
      waitUntil: "networkidle2",
      timeout: 60000,
    });

    await page.waitForSelector(".table-responsive tr", { timeout: 60000 });

    console.log(" Парсинг");

    const tasks = await page.evaluate(() => {
      const rows = document.querySelectorAll(".table-responsive tr");
      const result = [];

      rows.forEach(row => {
        const cols = row.querySelectorAll("td");
        if (cols.length >= 2) {
          const link = cols[1].querySelector("a");
          if (link) {
            result.push({
              title: link.innerText.trim(),
              url: link.href,
              solved: link.style.color === "green",
            });
          }
        }
      });

      return result;
    });

    console.log(` Найдено заданий ${tasks.length}`);

    await browser.close();
    return tasks;

  } catch (err) {
    console.log(" ОШИБКА:", err.message);
    await browser.close();
    throw err;
  }
}

app.post("/api/tasks", async (req, res) => {
  console.log(" POST /api/tasks вызван");

  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: "Нет логина или пароля" });
  }

  console.log(" Пользователь", username);

  try {
    const tasks = await parseTasksWithLogin(username, password);
    res.json(tasks);
  } catch {
    res.status(500).json({ error: "Ошибка парсинга" });
  }
});

app.listen(PORT, () => {
  console.log(`http://localhost:${PORT}`);
});