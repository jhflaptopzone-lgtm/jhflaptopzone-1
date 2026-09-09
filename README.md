🚀 JHF Laptop Zone ERP System

Full Stack Sales, Inventory, EMI & Supplier Management Web Application
Developed by Md. Jahid Hasan

🏢 Business Information

Business Name: JHF Laptop Zone
Location: Baroipara Bazar, Chandara, Kaliakair, Gazipur, Bangladesh
Developer: Md. Jahid Hasan
Role: System Architect & Full Stack Developer

📌 Project Overview

JHF Laptop Zone ERP is a complete business management system designed for laptop sales businesses.

It includes:

Sales Management

Inventory Control

EMI / Installment Tracking

Customer Due Report

Supplier Ledger System

Advanced Dashboard Analytics

Backup & Restore System

Professional PDF Reporting

This system is designed to be scalable, secure, and production-ready.

🧩 Core Modules
🔐 Authentication System

Role Based Login (Admin / Manager / Staff)

JWT Authentication

Secure Password Hashing

Activity Log

💰 Sales Management

Auto Invoice Number (JHF-YYYYMMDD-XXXX)

Auto Profit Calculation

Payment Type Support

Installment Option

Printable Invoice (PDF)

Barcode Generation

📦 Inventory Management

Add / Edit Stock

Serial Number Tracking

Supplier Linked Stock

Low Stock Alert

Stock Status (Available / Sold)

📅 EMI / Installment System

1st Installment = Instant Payment

Remaining Amount auto-calculated

Flexible Installment Plan (2,3,4,6,9,12 months)

Overdue Detection

Installment Timeline History

Partial Payment Support

📊 Dashboard Analytics

Total Sales

Total Profit

Monthly Sales Chart

Target vs Actual KPI

Payment Method Distribution

EMI Outstanding

Supplier Due Summary

🧾 Due Report

Displays customers with remaining balance:

Model

Serial Number

Configuration

Sale Date

Buy Price

Sell Price

Paid Amount

Remaining Due

Estimated Final Pay Date

Customer Details

Supplier Name

Sales Person

PDF Export Available (A4 Landscape)

🏢 Supplier Management

Add Supplier

Supplier Ledger

Supplier Purchase Tracking

Supplier Payment Entry

Multiple Payment Methods:

Bank Account

Bkash

Nagad

Rocket

Cash

POS

Auto Calculation:

Supplier Due = Total Purchase - Total Paid

Supplier Dashboard Summary Included.

💾 Backup & Restore System

One Click Backup

Full Database Export (JSON)

Timestamped Backup File

Full Restore Capability

Backup Log History

🛠 Tech Stack
Frontend

React.js

Tailwind CSS

Chart.js

Axios

React Router

Backend

Node.js

Express.js

JWT Authentication

Database

MySQL

📂 Project Structure
backend/
  ├── controllers/
  ├── routes/
  ├── models/
  ├── middleware/
  ├── config/
  └── server.js

frontend/
  ├── components/
  ├── pages/
  ├── services/
  └── App.jsx
📄 Reports

System supports:

Monthly Sales Report (PDF)

Yearly Sales Report (PDF)

Due Report (PDF)

Supplier Report (PDF)

CSV Export

All reports are generated in A4 Landscape format.

⚙ Installation Guide
1️⃣ Clone Repository
git clone https://github.com/your-username/jhf-erp.git
2️⃣ Backend Setup
cd backend
npm install

Create .env file:

PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASS=yourpassword
DB_NAME=jhf_erp
JWT_SECRET=your_secret_key

Run server:

npm start
3️⃣ Frontend Setup
cd frontend
npm install
npm run dev
🔐 Security Features

JWT Protected Routes

Role Based Access Control

Input Validation

SQL Injection Prevention

Password Hashing

Data Integrity via Foreign Keys

📈 Future Roadmap

Multi Branch System

SMS Reminder Integration

Cloud SaaS Version

Full Accounting Module

Mobile App Version

👨‍💻 Developer

Jundul Kafa
Admin & Trainner of Team_BCT (Ethical Hacking)
Full Stack System Designer
Bangladesh

⭐ License

This project is developed for business use.
All rights reserved © JHF Laptop Zone.
