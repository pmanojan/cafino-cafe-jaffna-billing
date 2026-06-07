/* ============================================================
   CAFINO CAFE JAFFNA — BILLING LOGIC (vanilla JS)
   - Items added ONLY via Quick Menu (name & price locked)
   - No discount/service/tax
   - Amount Paid auto (read-only) driven by Paid/Pending status
   - Sri Lankan phone validation
   - Thermal e-receipt print
   ============================================================ */

/* ---- Product catalogue (name, price in Rs.) — prices are fixed ---- */
const PRODUCTS = [
  ["Brownie", 170], ["Nanakothan", 25], ["Roll", 60], ["Chinna Patties", 40],
  ["Periya Patties", 60], ["Kilangu Rotti", 60], ["Rotti", 70], ["Samsa", 60],
  ["Mithivedi", 70], ["Vaappaan", 60], ["Kadalai Vadai", 50], ["Meentin Samsa", 70],
  ["Meentin Mithivedi", 80], ["Poli", 100], ["Ulunthu Vadai", 60], ["Sandwich", 60],
  ["Suchiyam", 60], ["Chicken Roll", 120], ["Pepsi 1.5L", 420], ["Pepsi 250ml", 120],
  ["Mirinda 250ml", 120], ["Ole 250ml", 120], ["String 250ml", 120], ["7up 250ml", 120],
  ["Water Bottle 250ml", 70], ["Water Bottle 1500ml", 130], ["Stix", 40], ["Rollo Cake", 80],
  ["Tip Tip", 100], ["Go Choc Cake", 80], ["Cardamom Tea", 120], ["Nescoffee", 120],
  ["Milo Small", 100], ["Milo Medium", 130]
];

/* ---- In-memory order: { name, price, qty } ---- */
let ORDER = [];

/* ---- Helpers ---- */
function num(value) {
  const n = parseFloat(value);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}
function rs(amount) {
  const n = Number.isFinite(amount) ? amount : 0;
  return "Rs. " + n.toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function pad(n) { return String(n).padStart(2, "0"); }
function esc(str) {
  return String(str).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

/* ---- Bill number + date/time ---- */
function generateBillNumber() {
  const d = new Date();
  const ymd = d.getFullYear() + pad(d.getMonth()+1) + pad(d.getDate());
  let seq = 1;
  try {
    const key = "cafino_seq_" + ymd;
    seq = parseInt(localStorage.getItem(key) || "0", 10) + 1;
    localStorage.setItem(key, String(seq));
  } catch (e) { seq = 1; }
  return "CAF-" + ymd + "-" + String(seq).padStart(3, "0");
}
function setDateTime() {
  const d = new Date();
  document.getElementById("pvDate").textContent =
    d.toLocaleDateString("en-GB", { day:"2-digit", month:"short", year:"numeric" });
  document.getElementById("pvTime").textContent =
    d.toLocaleTimeString("en-GB", { hour:"2-digit", minute:"2-digit" });
}

/* ---- Sri Lankan phone validation ----
   Accepts: 0XXXXXXXXX (10 digits, starts 07/0xx) OR +94XXXXXXXXX / 94XXXXXXXXX
   Mobile (07x) and landline (0xx) both allowed. */
function validateLKPhone(raw) {
  const v = (raw || "").replace(/[\s-]/g, "");
  if (v === "") return { ok: true, empty: true };            // empty allowed (walk-in)
  // +94 or 94 followed by 9 digits, first of those not 0
  const intl = /^\+?94[1-9]\d{8}$/;
  // local 0 followed by 9 digits
  const local = /^0\d{9}$/;
  const ok = intl.test(v) || local.test(v);
  return { ok, empty: false };
}
function onPhoneInput() {
  const input = document.getElementById("custPhone");
  const errEl = document.getElementById("phoneErr");
  const res = validateLKPhone(input.value);
  if (res.empty || res.ok) {
    input.classList.remove("invalid");
    errEl.textContent = "";
  } else {
    input.classList.add("invalid");
    errEl.textContent = "Enter a valid Sri Lankan number (e.g. 0771234567 or +94771234567).";
  }
  syncPreview();
}

/* ---- Quick product menu ---- */
function renderMenu() {
  const q = (document.getElementById("menuSearch").value || "").trim().toLowerCase();
  const grid = document.getElementById("menuGrid");
  const list = PRODUCTS.filter(p => p[0].toLowerCase().includes(q));
  if (!list.length) { grid.innerHTML = '<div class="menu-empty">No products match your search.</div>'; return; }
  grid.innerHTML = list.map((p, i) => {
    const realIndex = PRODUCTS.indexOf(p);
    return `
      <button class="menu-btn" type="button" onclick="addProduct(${realIndex})">
        <span class="mb-name">${esc(p[0])}</span>
        <span class="mb-price">Rs. ${p[1]}</span>
      </button>`;
  }).join("");
}

/* Add a product to the order (qty +1 if already present). Price is fixed. */
function addProduct(index) {
  const [name, price] = PRODUCTS[index];
  const existing = ORDER.find(it => it.name === name && it.price === price);
  if (existing) existing.qty += 1;
  else ORDER.push({ name, price, qty: 1 });
  renderOrder();
  calculate();
}

function changeQty(i, delta) {
  if (!ORDER[i]) return;
  ORDER[i].qty += delta;
  if (ORDER[i].qty <= 0) ORDER.splice(i, 1);
  renderOrder();
  calculate();
}
function removeOrderItem(i) {
  ORDER.splice(i, 1);
  renderOrder();
  calculate();
}

/* Render editable order rows (qty +/- + remove; name & price locked) */
function renderOrder() {
  const box = document.getElementById("itemsEditor");
  const hint = document.getElementById("emptyOrderHint");
  if (!ORDER.length) {
    box.innerHTML = "";
    hint.style.display = "";
    return;
  }
  hint.style.display = "none";
  box.innerHTML = ORDER.map((it, i) => `
    <div class="order-row">
      <div class="or-info">
        <span class="or-name">${esc(it.name)}</span>
        <span class="or-price">Rs. ${it.price.toFixed(2)} each</span>
      </div>
      <div class="qty-ctrl">
        <button type="button" class="qbtn" onclick="changeQty(${i}, -1)" aria-label="decrease">−</button>
        <span class="qval">${it.qty}</span>
        <button type="button" class="qbtn" onclick="changeQty(${i}, 1)" aria-label="increase">+</button>
      </div>
      <span class="or-total">${rs(it.qty * it.price)}</span>
      <button type="button" class="btn-remove" title="Remove" onclick="removeOrderItem(${i})">✕</button>
    </div>
  `).join("");
}

/* ---- Core calculation + preview sync ---- */
function calculate() {
  let subtotal = 0, itemCount = 0;
  const previewRows = ORDER.map(it => {
    const line = it.qty * it.price;
    subtotal += line;
    itemCount += it.qty;
    return `
      <tr>
        <td class="item-name">${esc(it.name)}</td>
        <td class="ctr">${it.qty}</td>
        <td class="num">${it.price.toFixed(2)}</td>
        <td class="num">${line.toFixed(2)}</td>
      </tr>`;
  });

  const grand = subtotal; // no discount/service/tax

  // Payment status drives Amount Paid (read-only)
  const status = document.getElementById("payStatus").value; // Paid | Pending
  const paid = status === "Paid" ? grand : 0;
  const balance = grand - paid; // amount still due (0 when paid)

  // --- write order preview table ---
  const pvItems = document.getElementById("pvItems");
  pvItems.innerHTML = previewRows.length
    ? previewRows.join("")
    : `<tr class="empty-row"><td colspan="4">No items added yet.</td></tr>`;

  // --- totals ---
  document.getElementById("pvCount").textContent = itemCount;
  document.getElementById("pvGrand").textContent = rs(grand);
  document.getElementById("pvPaid").textContent  = rs(paid);

  // balance label changes with status
  document.getElementById("pvBalLab").textContent = status === "Pending" ? "Balance Due" : "Balance";
  document.getElementById("pvBalance").textContent = rs(balance);

  // --- amount paid field (read-only console input) ---
  document.getElementById("paid").value = rs(paid);

  // --- status stamp ---
  const stampEl = document.getElementById("pvStatus");
  stampEl.textContent = status.toUpperCase();
  stampEl.className = "status-stamp " + (status === "Paid" ? "is-paid" : "is-pending");

  syncPreview();
}

/* ---- Payment method UI ---- */
function onPayMethodChange() {
  const method = document.getElementById("payMethod").value;
  const showRef = (method === "Online Payment" || method === "Card");
  document.getElementById("refField").style.display = showRef ? "" : "none";
  syncPreview();
}

/* ---- Sync customer + payment text into preview ---- */
function syncPreview() {
  const t = id => document.getElementById(id).value.trim();
  document.getElementById("pvCust").textContent    = t("custName")  || "Walk-in Customer";
  document.getElementById("pvPhone").textContent   = t("custPhone") || "—";
  document.getElementById("pvCashier").textContent = t("cashier")   || "—";

  const method = document.getElementById("payMethod").value;
  document.getElementById("pvMethod").textContent = method;

  const ref = t("payRef");
  const showRef = (method === "Online Payment" || method === "Card") && ref !== "";
  document.getElementById("pvRefRow").style.display = showRef ? "" : "none";
  document.getElementById("pvRef").textContent = ref || "—";
}

/* ---- Clear / reset ---- */
function clearBill() {
  if (!confirm("Clear all bill details and start a new bill?")) return;
  ORDER = [];
  ["custName","custPhone","payRef"].forEach(id => document.getElementById(id).value = "");
  document.getElementById("cashier").value = "";
  document.getElementById("payMethod").value = "Cash";
  document.getElementById("payStatus").value = "Paid";
  document.getElementById("menuSearch").value = "";
  document.getElementById("custPhone").classList.remove("invalid");
  document.getElementById("phoneErr").textContent = "";
  onPayMethodChange();
  renderMenu();
  renderOrder();
  document.getElementById("pvBillNo").textContent = generateBillNumber();
  setDateTime();
  calculate();
}

/* ---- Print (thermal e-bill) ---- */
function printBill() {
  // Validate before printing
  if (!ORDER.length) { alert("Add at least one item before exporting the e-bill."); return; }
  const phone = document.getElementById("custPhone").value;
  if (!validateLKPhone(phone).ok) {
    alert("Please enter a valid Sri Lankan phone number, or leave it blank.");
    document.getElementById("custPhone").focus();
    return;
  }
  calculate();
  window.print(); // user saves as PDF / prints the thermal e-bill
}

/* ---- Init ---- */
window.addEventListener("DOMContentLoaded", () => {
  document.getElementById("pvBillNo").textContent = generateBillNumber();
  setDateTime();
  renderMenu();
  renderOrder();
  onPayMethodChange();
  calculate();
});
