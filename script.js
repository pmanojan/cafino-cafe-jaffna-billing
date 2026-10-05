/* ============================================================
   CAFINO CAFE JAFFNA — BILLING LOGIC (vanilla JS)
   - Items added via Quick Menu or manually added
   - Names & prices are fully editable in the order list
   - No discount/service/tax
   - Amount Paid auto (read-only) driven by Paid/Pending status
   - Sri Lankan phone validation
   - Thermal e-receipt print
   ============================================================ */

/* ---- Product catalogue (name, price in Rs.) ---- */
const PRODUCTS = [
  ["Brownie", 170], ["Nanakothan", 25], ["Roll", 60], ["Chinna Patties", 40],
  ["Periya Patties", 60], ["Kilangu Rotti", 60], ["Rotti", 70], ["Samsa", 60],
  ["Mithivedi", 70], ["Vaappaan", 60], ["Kadalai Vadai", 50], ["Meentin Samsa", 70],
  ["Meentin Mithivedi", 80], ["Poli", 100], ["Ulunthu Vadai", 60], ["Sandwich", 80],
  ["Suchiyam", 60], ["Chicken Roll", 120], ["Pepsi 1.5L", 420], ["Pepsi 250ml", 120],
  ["Mirinda 250ml", 120], ["Ole 250ml", 120], ["String 250ml", 120], ["7up 250ml", 120],
  ["Water Bottle 250ml", 70], ["Water Bottle 1500ml", 130], ["Stix", 40], ["Rollo Cake", 80],
  ["Tip Tip", 100], ["Go Choc Cake", 80], ["Cardamom Tea", 120], ["Nescoffee", 120],
  ["Milo Small", 100], ["Milo Medium", 130], ["Veg cake", 1500], 
  ["Roll+Cake+Sunquick with Bundle Pack", 200], ["Sunquick", 80],
  ["Boondi laddu", 80], ["Butter Non veg Cake", 1500]
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

/* ---- Sri Lankan phone validation ---- */
function validateLKPhone(raw) {
  const v = (raw || "").replace(/[\s-]/g, "");
  if (v === "") return { ok: true, empty: true };
  const intl = /^\+?94[1-9]\d{8}$/;
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

/* Add predefined product from catalogue */
function addProduct(index) {
  const [name, price] = PRODUCTS[index];
  const existing = ORDER.find(it => it.name === name && it.price === price);
  if (existing) existing.qty += 1;
  else ORDER.push({ name, price, qty: 1 });
  renderOrder();
  calculate();
}

/* Add custom manual product */
function addCustomItem() {
  ORDER.push({ name: "Custom Item", price: 0, qty: 1 });
  renderOrder();
  calculate();
}

/* ---- Edit Order Handlers ---- */
function updateItemName(i, newName) {
  if (ORDER[i]) {
    ORDER[i].name = newName;
    calculate(); // update preview instantly
  }
}
function updateItemPrice(i, newPrice) {
  if (ORDER[i]) {
    ORDER[i].price = num(newPrice);
    renderOrder(); // re-render to update the row's total amount
    calculate();
  }
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

/* Render editable order rows */
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
      <div class="or-info" style="display:flex; flex-direction:column; gap:4px; flex:1;">
        <input type="text" class="or-name-input" value="${esc(it.name)}" onchange="updateItemName(${i}, this.value)" placeholder="Item Name" style="font-weight:bold; border:1px solid #ccc; padding:4px; border-radius:4px;" />
        <div style="display:flex; align-items:center; font-size:0.9em; color:#555;">
          Rs. <input type="number" min="0" step="0.01" class="or-price-input" value="${it.price}" onchange="updateItemPrice(${i}, this.value)" placeholder="Price" style="width:70px; border:1px solid #ccc; padding:2px; margin:0 4px; border-radius:4px;" /> each
        </div>
      </div>
      <div class="qty-ctrl">
        <button type="button" class="qbtn" onclick="changeQty(${i}, -1)" aria-label="decrease">−</button>
        <span class="qval">${it.qty}</span>
        <button type="button" class="qbtn" onclick="changeQty(${i}, 1)" aria-label="increase">+</button>
      </div>
      <span class="or-total" style="min-width:70px; text-align:right;">${rs(it.qty * it.price)}</span>
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

  const grand = subtotal;

  const status = document.getElementById("payStatus")?.value || "Paid";
  const paid = status === "Paid" ? grand : 0;
  const balance = grand - paid;

  const pvItems = document.getElementById("pvItems");
  if(pvItems) {
    pvItems.innerHTML = previewRows.length
      ? previewRows.join("")
      : `<tr class="empty-row"><td colspan="4">No items added yet.</td></tr>`;
  }

  const setTxt = (id, txt) => { if(document.getElementById(id)) document.getElementById(id).textContent = txt; };
  setTxt("pvCount", itemCount);
  setTxt("pvGrand", rs(grand));
  setTxt("pvPaid", rs(paid));
  setTxt("pvBalLab", status === "Pending" ? "Balance Due" : "Balance");
  setTxt("pvBalance", rs(balance));

  const paidInput = document.getElementById("paid");
  if(paidInput) paidInput.value = rs(paid);

  const stampEl = document.getElementById("pvStatus");
  if(stampEl) {
    stampEl.textContent = status.toUpperCase();
    stampEl.className = "status-stamp " + (status === "Paid" ? "is-paid" : "is-pending");
  }
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
  const t = id => document.getElementById(id) ? document.getElementById(id).value.trim() : "";
  
  const setTxt = (id, txt) => { if(document.getElementById(id)) document.getElementById(id).textContent = txt; };
  setTxt("pvCust", t("custName") || "Walk-in Customer");
  setTxt("pvPhone", t("custPhone") || "—");
  setTxt("pvCashier", t("cashier") || "—");

  const methodEl = document.getElementById("payMethod");
  const method = methodEl ? methodEl.value : "Cash";
  setTxt("pvMethod", method);

  const ref = t("payRef");
  const showRef = (method === "Online Payment" || method === "Card") && ref !== "";
  const refRow = document.getElementById("pvRefRow");
  if(refRow) refRow.style.display = showRef ? "" : "none";
  setTxt("pvRef", ref || "—");
}

/* ---- Clear / reset ---- */
function clearBill() {
  if (!confirm("Clear all bill details and start a new bill?")) return;
  ORDER = [];
  ["custName","custPhone","payRef"].forEach(id => {
      if(document.getElementById(id)) document.getElementById(id).value = "";
  });
  if(document.getElementById("cashier")) document.getElementById("cashier").value = "Cafino Cafe";
  if(document.getElementById("payMethod")) document.getElementById("payMethod").value = "Cash";
  if(document.getElementById("payStatus")) document.getElementById("payStatus").value = "Paid";
  if(document.getElementById("menuSearch")) document.getElementById("menuSearch").value = "";
  
  if(document.getElementById("custPhone")) document.getElementById("custPhone").classList.remove("invalid");
  if(document.getElementById("phoneErr")) document.getElementById("phoneErr").textContent = "";
  
  if(document.getElementById("payMethod")) onPayMethodChange();
  renderMenu();
  renderOrder();
  if(document.getElementById("pvBillNo")) document.getElementById("pvBillNo").textContent = generateBillNumber();
  setDateTime();
  calculate();
}

/* ---- Print (thermal e-bill) ---- */
function printBill() {
  if (!ORDER.length) { alert("Add at least one item before exporting the e-bill."); return; }
  const phoneInput = document.getElementById("custPhone");
  if (phoneInput && !validateLKPhone(phoneInput.value).ok) {
    alert("Please enter a valid Sri Lankan phone number, or leave it blank.");
    phoneInput.focus();
    return;
  }
  calculate();
  window.print();
}

/* ---- Init ---- */
window.addEventListener("DOMContentLoaded", () => {
  if(document.getElementById("pvBillNo")) document.getElementById("pvBillNo").textContent = generateBillNumber();
  setDateTime();
  if(document.getElementById("menuGrid")) renderMenu();
  if(document.getElementById("itemsEditor")) renderOrder();
  if(document.getElementById("payMethod")) onPayMethodChange();
  calculate();
});
