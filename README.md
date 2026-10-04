<div align="center">

<img src="cafino-logo.png" alt="Cafino Cafe Jaffna" width="160" />

# ☕ Cafino Cafe Jaffna — Bill / Invoice Generator

**A modern, premium, fully client-side POS billing & e-receipt generator built with plain HTML, CSS, and JavaScript.**

No backend · No frameworks · No build step · Just open and bill.

![HTML5](https://img.shields.io/badge/HTML5-E34F26?logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?logo=javascript&logoColor=black)
![No Backend](https://img.shields.io/badge/Backend-None-success)
![License](https://img.shields.io/badge/License-MIT-blue)

</div>

---

## 📖 Overview

**Cafino Cafe Jaffna Bill Generator** is a lightweight, professional point-of-sale (POS) billing tool for a real cafe. A cashier picks items from a tap-to-add menu, the total is calculated automatically, and a clean **thermal e-receipt** can be printed or saved as PDF straight from the browser — all without any server, database, or internet connection.

It runs entirely in the browser and works great on **mobile phones, tablets, and desktops**.

---

## ✨ Features

- 🧾 **Professional e-receipt layout** for Cafino Cafe Jaffna with branded logo, tagline & contact details.
- 🔢 **Auto-generated bill numbers** in `CAF-YYYYMMDD-001` format (daily sequence persists via `localStorage`).
- 🕒 **Auto-filled date & time** on every new bill.
- 👤 **Customer details** — name + phone, with **Sri Lankan phone-number validation** (`0771234567`, `+94771234567`, etc.).
- 🍽️️ **Tap-to-add Quick Menu** of all cafe products with **fixed, non-editable prices** (search included).
- ➕➖ **Editable quantities** per item with instant **automatic total calculation**.
- 💳 **Payment methods** — Cash, Card, Online Payment (with reference / transaction ID field).
- ✅ **Paid / Pending status** with a clear colour-coded stamp on the receipt.
- 🔒 **Auto, read-only "Amount Paid"** that mirrors the grand total (no manual editing).
- 🖨️ **One-click export** → opens the print dialog to print or **Save as PDF** a compact **80 mm thermal e-bill**.
- 👨‍🍳 **Cashier selector** (Cafino Cafe, P.Manojan, Y.Vithushan, N.Vimal).
- 📱 **Fully responsive**, mobile-first UI with a premium cafe colour palette (dark brown, cream, gold, deep red).
- 🛡️ **Input validation** so empty/invalid values never break the calculations.

---

## 🗂️ Project Structure

```text
cafino-app/
├── index.html              # Markup / page structure
├── style.css               # All styling + thermal print rules
├── script.js               # Billing logic + product catalogue
└── assets/
    └── cafino-logo.png      # Brand logo
