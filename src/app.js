import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";

import {
  getFirestore,
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  addDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  increment
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-storage.js";

import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

const $ = id => document.getElementById(id);

let user = null;
let profile = null;
let registerMode = false;
let lang = localStorage.getItem("lang") || "uz";

/* =========================
   TRANSLATIONS
========================= */

const LANG = {
  uz: {
    login: "Kirish",
    register: "Ro‘yxatdan o‘tish",
    logout: "Chiqish",
    forgot: "Parolni unutdingizmi?",
    authSub: "PUBG Mobile UC uchun xavfsiz magazin",
    welcome: "Xush kelibsiz",
    hero: "UC xarid qiling, balansni boshqaring va buyurtmalaringizni kuzating.",
    balance: "Balans",
    shop: "UC Magazin",
    deposit: "Balans to‘ldirish",
    orders: "Buyurtmalar",
    support: "Yordam",
    packages: "UC paketlari",
    depositTitle: "Balans to‘ldirish",
    depositHelp: "To‘lov qiling va chek rasmini yuklang.",
    sendReceipt: "Chekni yuborish",
    myOrders: "Mening buyurtmalarim",
    supportTitle: "Yordam",
    send: "Yuborish"
  },

  ru: {
    login: "Войти",
    register: "Регистрация",
    logout: "Выйти",
    forgot: "Забыли пароль?",
    authSub: "Безопасный магазин PUBG Mobile UC",
    welcome: "Добро пожаловать",
    hero: "Покупайте UC и отслеживайте заказы.",
    balance: "Баланс",
    shop: "Магазин UC",
    deposit: "Пополнить баланс",
    orders: "Заказы",
    support: "Поддержка",
    packages: "Пакеты UC",
    depositTitle: "Пополнение баланса",
    depositHelp: "Оплатите и загрузите чек.",
    sendReceipt: "Отправить чек",
    myOrders: "Мои заказы",
    supportTitle: "Поддержка",
    send: "Отправить"
  }
};

function tr(key) {
  return LANG[lang]?.[key] || key;
}

function applyLanguage() {
  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.dataset.i18n;
    if (LANG[lang]?.[key]) el.textContent = LANG[lang][key];
  });

  if ($("langBtn")) {
    $("langBtn").textContent = lang === "uz" ? "RU" : "UZ";
  }

  if ($("authSubmit")) {
    $("authSubmit").textContent =
      registerMode ? tr("register") : tr("login");
  }

  localStorage.setItem("lang", lang);
}

/* =========================
   LANGUAGE
========================= */

$("langBtn")?.addEventListener("click", () => {
  lang = lang === "uz" ? "ru" : "uz";
  applyLanguage();
});

/* =========================
   AUTH TABS
========================= */

$("loginTab")?.addEventListener("click", () => {
  registerMode = false;

  $("loginTab")?.classList.add("active");
  $("registerTab")?.classList.remove("active");

  applyLanguage();
});

$("registerTab")?.addEventListener("click", () => {
  registerMode = true;

  $("registerTab")?.classList.add("active");
  $("loginTab")?.classList.remove("active");

  applyLanguage();
});

/* =========================
   AUTH
========================= */

$("authForm")?.addEventListener("submit", async e => {
  e.preventDefault();

  const email = $("email")?.value.trim();
  const password = $("password")?.value;

  $("authMsg").textContent = "";

  if (!email || !password) {
    $("authMsg").textContent =
      "Email va parolni kiriting.";
    return;
  }

  try {
    if (registerMode) {
      await registerUser(email, password);
    } else {
      await loginUser(email, password);
    }
  } catch (error) {
    console.error(error);
    $("authMsg").textContent = firebaseError(error);
  }
});

async function registerUser(email, password) {
  const result =
    await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );

  await setDoc(
    doc(db, "users", result.user.uid),
    {
      email,
      role: "user",
      balance: 0,
      createdAt: serverTimestamp()
    }
  );

  await sendEmailVerification(result.user);
  await signOut(auth);

  $("authMsg").textContent =
    "Emailingizga tasdiqlash xati yuborildi. Emailni tasdiqlab qayta kiring.";
}

async function loginUser(email, password) {
  const result =
    await signInWithEmailAndPassword(
      auth,
      email,
      password
    );

  if (!result.user.emailVerified) {
    await signOut(auth);

    $("authMsg").textContent =
      "Email tasdiqlanmagan. Avval emailingizni tasdiqlang.";
  }
}

/* =========================
   FIREBASE ERRORS
========================= */

function firebaseError(error) {
  const errors = {
    "auth/invalid-credential":
      "Email yoki parol noto‘g‘ri.",

    "auth/user-not-found":
      "Bunday foydalanuvchi topilmadi.",

    "auth/wrong-password":
      "Parol noto‘g‘ri.",

    "auth/email-already-in-use":
      "Bu email allaqachon ro‘yxatdan o‘tgan.",

    "auth/weak-password":
      "Parol kamida 6 ta belgidan iborat bo‘lsin.",

    "auth/invalid-email":
      "Email noto‘g‘ri.",

    "auth/too-many-requests":
      "Juda ko‘p urinish. Biroz kutib qayta urinib ko‘ring.",

    "auth/network-request-failed":
      "Internet aloqasini tekshiring."
  };

  return errors[error.code] ||
    error.message ||
    "Noma’lum xatolik.";
}

/* =========================
   PASSWORD RESET
========================= */

$("forgotBtn")?.addEventListener("click", async () => {
  const email = $("email")?.value.trim();

  if (!email) {
    $("authMsg").textContent =
      "Avval emailingizni kiriting.";
    return;
  }

  try {
    await sendPasswordResetEmail(auth, email);

    $("authMsg").textContent =
      "Parolni tiklash xati yuborildi.";
  } catch (error) {
    $("authMsg").textContent =
      firebaseError(error);
  }
});

/* =========================
   LOGOUT
========================= */

$("logoutBtn")?.addEventListener("click", () => {
  signOut(auth);
});

/* =========================
   AUTH STATE
========================= */

onAuthStateChanged(auth, async currentUser => {
  user = currentUser;

  if (!user) {
    $("authView")?.classList.remove("hidden");
    $("appView")?.classList.add("hidden");
    $("logoutBtn")?.classList.add("hidden");
    return;
  }

  if (!user.emailVerified) {
    await signOut(auth);
    return;
  }

  const userRef = doc(db, "users", user.uid);
  const snap = await getDoc(userRef);

  if (!snap.exists()) {
    await setDoc(userRef, {
      email: user.email,
      role: "user",
      balance: 0,
      createdAt: serverTimestamp()
    });
  }

  profile = (await getDoc(userRef)).data();

  $("authView")?.classList.add("hidden");
  $("appView")?.classList.remove("hidden");
  $("logoutBtn")?.classList.remove("hidden");

  $("adminNav")?.classList.toggle(
    "hidden",
    profile?.role !== "admin"
  );

  loadUserData();
});

/* =========================
   NAVIGATION
========================= */

document.querySelectorAll(".navBtn").forEach(button => {
  button.addEventListener("click", () => {

    document.querySelectorAll(".navBtn")
      .forEach(b => b.classList.remove("active"));

    document.querySelectorAll(".page")
      .forEach(p => p.classList.add("hidden"));

    button.classList.add("active");

    const page =
      $(button.dataset.page + "Page");

    page?.classList.remove("hidden");

    if (button.dataset.page === "admin") {
      loadAdmin();
    }
  });
});

/* =========================
   USER DATA
========================= */

function loadUserData() {
  applyLanguage();
  listenBalance();
  loadPackages();
  loadOrders();
  loadTickets();
}

function listenBalance() {
  onSnapshot(
    doc(db, "users", user.uid),
    snap => {
      profile = snap.data() || {};

      const balance =
        Number(profile.balance || 0);

      if ($("balance")) {
        $("balance").textContent =
          balance.toLocaleString() + " so‘m";
      }
    }
  );
}

/* =========================
   UC PACKAGES
========================= */

function loadPackages() {
  const q = query(
    collection(db, "packages"),
    orderBy("uc")
  );

  onSnapshot(q, snap => {
    if (!$("packages")) return;

    $("packages").innerHTML = "";

    snap.forEach(item => {
      const p = item.data();

      $("packages").innerHTML += `
        <div class="card glass">
          <div class="uc">
            🎮 ${p.uc} UC
          </div>

          <div class="price">
            ${Number(p.price).toLocaleString()} so‘m
          </div>

          <button
            class="primary buy"
            data-id="${item.id}">
            Sotib olish
          </button>
        </div>
      `;
    });

    document.querySelectorAll(".buy")
      .forEach(button => {
        button.onclick = () =>
          buyPackage(button.dataset.id);
      });
  });
}

/* =========================
   BUY UC
========================= */

async function buyPackage(id) {
  try {
    const snap =
      await getDoc(doc(db, "packages", id));

    if (!snap.exists()) {
      alert("UC paketi topilmadi.");
      return;
    }

    const packageData = snap.data();
    const balance = Number(profile?.balance || 0);

    if (balance < Number(packageData.price)) {
      alert("Balans yetarli emas.");
      return;
    }

    const pubgId =
      prompt("PUBG Player ID kiriting:");

    if (!pubgId?.trim()) return;

    await updateDoc(
      doc(db, "users", user.uid),
      {
        balance:
          increment(-Number(packageData.price))
      }
    );

    await addDoc(
      collection(db, "orders"),
      {
        uid: user.uid,
        email: user.email,
        pubgId: pubgId.trim(),
        uc: Number(packageData.uc),
        price: Number(packageData.price),
        status: "pending",
        createdAt: serverTimestamp()
      }
    );

    alert("Buyurtma qabul qilindi!");
  } catch (error) {
    console.error(error);
    alert("Xatolik: " + error.message);
  }
}

/* =========================
   DEPOSIT
========================= */

$("depositBtn")?.addEventListener(
  "click",
  async () => {

    try {
      const amount =
        Number($("depositAmount")?.value);

      const file =
        $("depositReceipt")?.files?.[0];

      if (!amount || amount < 1000 || !file) {
        $("depositMsg").textContent =
          "Summa va chekni kiriting.";
        return;
      }

      const path =
        `receipts/${user.uid}/${Date.now()}_${file.name}`;

      const storageRef =
        ref(storage, path);

      await uploadBytes(
        storageRef,
        file
      );

      const receiptUrl =
        await getDownloadURL(storageRef);

      await addDoc(
        collection(db, "deposits"),
        {
          uid: user.uid,
          email: user.email,
          amount,
          receiptUrl,
          status: "pending",
          createdAt: serverTimestamp()
        }
      );

      $("depositMsg").textContent =
        "Chek yuborildi. Admin tekshiradi.";

      $("depositAmount").value = "";
      $("depositReceipt").value = "";

    } catch (error) {
      console.error(error);

      $("depositMsg").textContent =
        "Xatolik: " + error.message;
    }
  }
);

/* =========================
   ORDERS
========================= */

function loadOrders() {
  const q = query(
    collection(db, "orders"),
    where("uid", "==", user.uid),
    orderBy("createdAt", "desc")
  );

  onSnapshot(q, snap => {

    if (!$("orders")) return;

    if (snap.empty) {
      $("orders").innerHTML =
        "Buyurtma yo‘q.";
      return;
    }

    $("orders").innerHTML =
      snap.docs.map(d => {

        const x = d.data();

        return `
          <div class="order">
            🎮 ${x.uc} UC —
            ${Number(x.price).toLocaleString()} so‘m
            <br>
            PUBG ID: ${x.pubgId}
            <br>
            Status:
            <b>${x.status}</b>
          </div>
        `;
      }).join("");
  });
}

/* =========================
   SUPPORT
========================= */

$("supportBtn")?.addEventListener(
  "click",
  async () => {

    const text =
      $("supportText")?.value.trim();

    if (!text) return;

    await addDoc(
      collection(db, "tickets"),
      {
        uid: user.uid,
        email: user.email,
        messages: [
          {
            from: "user",
            text,
            at: new Date().toISOString()
          }
        ],
        status: "open",
        createdAt: serverTimestamp()
      }
    );

    $("supportText").value = "";

    $("supportMsg").textContent =
      "Xabar yuborildi.";
  }
);

function loadTickets() {
  const q = query(
    collection(db, "tickets"),
    where("uid", "==", user.uid),
    orderBy("createdAt", "desc")
  );

  onSnapshot(q, snap => {

    if (!$("tickets")) return;

    $("tickets").innerHTML =
      snap.docs.map(d => {

        const x = d.data();

        return `
          <div class="ticket">
            <b>${x.status}</b>

            ${(x.messages || []).map(m => `
              <p>
                <b>${m.from}:</b>
                ${m.text}
              </p>
            `).join("")}
          </div>
        `;
      }).join("");
  });
}

/* =========================
   ADMIN
========================= */

function loadAdmin() {
  if (profile?.role !== "admin") return;

  adminPackages();
  adminDeposits();
  adminOrders();
  adminTickets();
}

/* ADMIN PACKAGES */

function adminPackages() {
  const q = query(
    collection(db, "packages"),
    orderBy("uc")
  );

  onSnapshot(q, snap => {

    if (!$("adminPackages")) return;

    $("adminPackages").innerHTML =
      snap.docs.map(d => {

        const x = d.data();

        return `
          <div class="admin-item">
            ${x.uc} UC —
            ${Number(x.price).toLocaleString()} so‘m

            <button
              class="smallBtn delPackage"
              data-id="${d.id}">
              O‘chirish
            </button>
          </div>
        `;
      }).join("");

    document
      .querySelectorAll(".delPackage")
      .forEach(button => {

        button.onclick = () =>
          deleteDoc(
            doc(
              db,
              "packages",
              button.dataset.id
            )
          );
      });
  });
}

/* ADMIN DEPOSITS */

function adminDeposits() {
  const q = query(
    collection(db, "deposits"),
    where("status", "==", "pending"),
    orderBy("createdAt", "desc")
  );

  onSnapshot(q, snap => {

    if (!$("adminDeposits")) return;

    $("adminDeposits").innerHTML =
      snap.docs.map(d => {

        const x = d.data();

        return `
          <div class="admin-item">
            ${x.email}
            <br>

            ${Number(x.amount).toLocaleString()} so‘m
            <br>

            <a
              href="${x.receiptUrl}"
              target="_blank">
              Chekni ko‘rish
            </a>
            <br>

            <button
              class="smallBtn approveDeposit"
              data-id="${d.id}">
              Tasdiqlash
            </button>

            <button
              class="smallBtn rejectDeposit"
              data-id="${d.id}">
              Rad etish
            </button>
          </div>
        `;
      }).join("");

    document
      .querySelectorAll(".approveDeposit")
      .forEach(button => {

        button.onclick = () =>
          approveDeposit(button.dataset.id);
      });

    document
      .querySelectorAll(".rejectDeposit")
      .forEach(button => {

        button.onclick = () =>
          updateDoc(
            doc(
              db,
              "deposits",
              button.dataset.id
            ),
            { status: "rejected" }
          );
      });
  });
}

/* APPROVE DEPOSIT */

async function approveDeposit(id) {
  const snap =
    await getDoc(doc(db, "deposits", id));

  if (!snap.exists()) return;

  const deposit = snap.data();

  await updateDoc(
    doc(db, "users", deposit.uid),
    {
      balance:
        increment(Number(deposit.amount))
    }
  );

  await updateDoc(
    doc(db, "deposits", id),
    {
      status: "approved"
    }
  );
}

/* ADMIN ORDERS */

function adminOrders() {
  const q = query(
    collection(db, "orders"),
    where("status", "==", "pending"),
    orderBy("createdAt", "desc")
  );

  onSnapshot(q, snap => {

    if (!$("adminOrders")) return;

    $("adminOrders").innerHTML =
      snap.docs.map(d => {

        const x = d.data();

        return `
          <div class="admin-item">
            ${x.email}
            <br>
            🎮 ${x.uc} UC
            <br>
            PUBG ID: ${x.pubgId}
            <br>

            <button
              class="smallBtn completeOrder"
              data-id="${d.id}">
              UC berildi
            </button>
          </div>
        `;
      }).join("");

    document
      .querySelectorAll(".completeOrder")
      .forEach(button => {

        button.onclick = () =>
          updateDoc(
            doc(
              db,
              "orders",
              button.dataset.id
            ),
            {
              status: "completed"
            }
          );
      });
  });
}

/* ADMIN TICKETS */

function adminTickets() {
  const q = query(
    collection(db, "tickets"),
    where("status", "==", "open"),
    orderBy("createdAt", "desc")
  );

  onSnapshot(q, snap => {

    if (!$("adminTickets")) return;

    $("adminTickets").innerHTML =
      snap.docs.map(d => {

        const x = d.data();

        return `
          <div class="admin-item">

            ${x.email}

            ${(x.messages || []).map(m => `
              <p>
                <b>${m.from}:</b>
                ${m.text}
              </p>
            `).join("")}

            <input
              id="reply-${d.id}"
              placeholder="Javob">

            <button
              class="smallBtn replyTicket"
              data-id="${d.id}">
              Javob berish
            </button>

          </div>
        `;
      }).join("");

    document
      .querySelectorAll(".replyTicket")
      .forEach(button => {

        button.onclick = () =>
          replyTicket(button.dataset.id);
      });
  });
}

/* REPLY */

async function replyTicket(id) {
  const input =
    $("reply-" + id);

  const text =
    input?.value.trim();

  if (!text) return;

  const snap =
    await getDoc(
      doc(db, "tickets", id)
    );

  if (!snap.exists()) return;

  const ticket = snap.data();

  await updateDoc(
    doc(db, "tickets", id),
    {
      messages: [
        ...(ticket.messages || []),
        {
          from: "admin",
          text,
          at: new Date().toISOString()
        }
      ],
      status: "answered"
    }
  );

  input.value = "";
}

/* =========================
   ADD UC PACKAGE
========================= */

$("addPackageBtn")?.addEventListener(
  "click",
  async () => {

    const uc =
      Number($("ucAmount")?.value);

    const price =
      Number($("ucPrice")?.value);

    if (!uc || !price) return;

    await addDoc(
      collection(db, "packages"),
      {
        uc,
        price,
        createdAt: serverTimestamp()
      }
    );

    $("ucAmount").value = "";
    $("ucPrice").value = "";
  }
);

/* =========================
   START
========================= */

applyLanguage();
