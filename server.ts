import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from 'url';
import cors from "cors";
import dotenv from "dotenv";
import { dbQuery, getClient, isSqlite } from "./db.ts";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import fs from "fs";
import PDFDocument from "pdfkit";
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const PORT = 3000;

// Ensure uploads directory exists safely
const uploadDir = path.join(process.cwd(), "uploads", "invoices");
try {
  if (!fs.existsSync(uploadDir)) {
    console.log(`Creating upload directory at: ${uploadDir}`);
    fs.mkdirSync(uploadDir, { recursive: true });
  }
} catch (e) {
  console.warn("Could not create uploads directory (may be read-only environment like Vercel):", e);
}

// Middleware
app.use(cors());
app.use(express.json());
app.use("/invoices", express.static(path.join(__dirname, "uploads", "invoices")));

// Auto-Init DB for API requests
let dbInitPromise: Promise<void> | null = null;
app.use("/api", async (req, res, next) => {
  if (!dbInitPromise) {
    dbInitPromise = initDb().catch((err: any) => {
      console.error("Database initialization error:", err);
      dbInitPromise = null;
    });
  }
  try {
    await dbInitPromise;
  } catch (err) {
    console.error("Error waiting for DB initialization:", err);
  }
  next();
});

// Database Initialization
const initDb = async () => {
  const client = await getClient();
  try {
    await client.begin();
    console.log(`Initializing ${isSqlite ? 'SQLite' : 'PostgreSQL'} database schema...`);
    
    const schema = isSqlite ? `
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        access_id TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT CHECK(role IN ('Admin', 'Manager', 'Staff')) NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS inventory (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        model TEXT NOT NULL,
        config TEXT NOT NULL,
        serial_number TEXT UNIQUE NOT NULL,
        buy_price REAL NOT NULL,
        sell_price REAL NOT NULL,
        supplier_name TEXT,
        purchase_date DATE,
        status TEXT CHECK(status IN ('Available', 'Sold')) DEFAULT 'Available',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        supplier_id INTEGER
      );

      CREATE TABLE IF NOT EXISTS sales (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        invoice_number TEXT UNIQUE NOT NULL,
        inventory_id INTEGER,
        customer_name TEXT NOT NULL,
        customer_phone TEXT NOT NULL,
        customer_address TEXT,
        sell_price REAL NOT NULL,
        profit REAL NOT NULL,
        payment_type TEXT NOT NULL,
        due_estimate_date DATE,
        due_reference_name TEXT,
        due_reference_phone TEXT,
        due_terms TEXT,
        staff_id INTEGER,
        sale_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        invoice_pdf_path TEXT,
        invoice_public_token TEXT UNIQUE,
        FOREIGN KEY(inventory_id) REFERENCES inventory(id),
        FOREIGN KEY(staff_id) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS emi (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sale_id INTEGER,
        total_amount REAL NOT NULL,
        down_payment REAL NOT NULL,
        remaining_amount REAL NOT NULL,
        duration_months INTEGER NOT NULL,
        monthly_installment REAL NOT NULL,
        paid_amount REAL DEFAULT 0,
        next_due_date DATE,
        status TEXT CHECK(status IN ('Paid', 'Pending', 'Overdue')) DEFAULT 'Pending',
        FOREIGN KEY(sale_id) REFERENCES sales(id)
      );

      CREATE TABLE IF NOT EXISTS installments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sale_id INTEGER,
        installment_number INTEGER NOT NULL,
        due_date DATE NOT NULL,
        amount REAL NOT NULL,
        paid_amount REAL DEFAULT 0,
        payment_date DATETIME,
        status TEXT CHECK(status IN ('Paid', 'Pending', 'Overdue')) DEFAULT 'Pending',
        remaining_balance REAL,
        FOREIGN KEY(sale_id) REFERENCES sales(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS sale_payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sale_id INTEGER,
        installment_id INTEGER,
        amount REAL NOT NULL,
        payment_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        payment_type TEXT,
        note TEXT,
        FOREIGN KEY(sale_id) REFERENCES sales(id) ON DELETE CASCADE,
        FOREIGN KEY(installment_id) REFERENCES installments(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS backup_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        backup_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        file_name TEXT NOT NULL,
        user_id INTEGER,
        FOREIGN KEY(user_id) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS suppliers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        mobile TEXT,
        address TEXT,
        opening_balance REAL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS supplier_purchases (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        supplier_id INTEGER NOT NULL,
        inventory_id INTEGER NOT NULL,
        purchase_amount REAL NOT NULL,
        purchase_date DATE NOT NULL,
        FOREIGN KEY(supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE,
        FOREIGN KEY(inventory_id) REFERENCES inventory(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS supplier_payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        supplier_id INTEGER NOT NULL,
        payment_date DATE NOT NULL,
        payment_amount REAL NOT NULL,
        payment_type TEXT NOT NULL,
        note TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS login_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        login_time DATETIME DEFAULT CURRENT_TIMESTAMP,
        ip_address TEXT,
        FOREIGN KEY(user_id) REFERENCES users(id)
      );
    ` : `
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        access_id TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT CHECK(role IN ('Admin', 'Manager', 'Staff')) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS inventory (
        id SERIAL PRIMARY KEY,
        model TEXT NOT NULL,
        config TEXT NOT NULL,
        serial_number TEXT UNIQUE NOT NULL,
        buy_price DECIMAL(15,2) NOT NULL,
        sell_price DECIMAL(15,2) NOT NULL,
        supplier_name TEXT,
        purchase_date DATE,
        status TEXT CHECK(status IN ('Available', 'Sold')) DEFAULT 'Available',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        supplier_id INTEGER
      );

      CREATE TABLE IF NOT EXISTS sales (
        id SERIAL PRIMARY KEY,
        invoice_number TEXT UNIQUE NOT NULL,
        inventory_id INTEGER,
        customer_name TEXT NOT NULL,
        customer_phone TEXT NOT NULL,
        customer_address TEXT,
        sell_price DECIMAL(15,2) NOT NULL,
        profit DECIMAL(15,2) NOT NULL,
        payment_type TEXT NOT NULL,
        due_estimate_date DATE,
        due_reference_name TEXT,
        due_reference_phone TEXT,
        due_terms TEXT,
        staff_id INTEGER,
        sale_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        invoice_pdf_path TEXT,
        invoice_public_token TEXT UNIQUE,
        FOREIGN KEY(inventory_id) REFERENCES inventory(id),
        FOREIGN KEY(staff_id) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS emi (
        id SERIAL PRIMARY KEY,
        sale_id INTEGER,
        total_amount DECIMAL(15,2) NOT NULL,
        down_payment DECIMAL(15,2) NOT NULL,
        remaining_amount DECIMAL(15,2) NOT NULL,
        duration_months INTEGER NOT NULL,
        monthly_installment DECIMAL(15,2) NOT NULL,
        paid_amount DECIMAL(15,2) DEFAULT 0,
        next_due_date DATE,
        status TEXT CHECK(status IN ('Paid', 'Pending', 'Overdue')) DEFAULT 'Pending',
        FOREIGN KEY(sale_id) REFERENCES sales(id)
      );

      CREATE TABLE IF NOT EXISTS installments (
        id SERIAL PRIMARY KEY,
        sale_id INTEGER,
        installment_number INTEGER NOT NULL,
        due_date DATE NOT NULL,
        amount DECIMAL(15,2) NOT NULL,
        paid_amount DECIMAL(15,2) DEFAULT 0,
        payment_date TIMESTAMP,
        status TEXT CHECK(status IN ('Paid', 'Pending', 'Overdue')) DEFAULT 'Pending',
        remaining_balance DECIMAL(15,2),
        FOREIGN KEY(sale_id) REFERENCES sales(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS sale_payments (
        id SERIAL PRIMARY KEY,
        sale_id INTEGER,
        installment_id INTEGER,
        amount DECIMAL(15,2) NOT NULL,
        payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        payment_type TEXT,
        note TEXT,
        FOREIGN KEY(sale_id) REFERENCES sales(id) ON DELETE CASCADE,
        FOREIGN KEY(installment_id) REFERENCES installments(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS backup_logs (
        id SERIAL PRIMARY KEY,
        backup_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        file_name TEXT NOT NULL,
        user_id INTEGER,
        FOREIGN KEY(user_id) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS suppliers (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        mobile TEXT,
        address TEXT,
        opening_balance DECIMAL(15,2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS supplier_purchases (
        id SERIAL PRIMARY KEY,
        supplier_id INTEGER NOT NULL,
        inventory_id INTEGER NOT NULL,
        purchase_amount DECIMAL(15,2) NOT NULL,
        purchase_date DATE NOT NULL,
        FOREIGN KEY(supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE,
        FOREIGN KEY(inventory_id) REFERENCES inventory(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS supplier_payments (
        id SERIAL PRIMARY KEY,
        supplier_id INTEGER NOT NULL,
        payment_date DATE NOT NULL,
        payment_amount DECIMAL(15,2) NOT NULL,
        payment_type TEXT NOT NULL,
        note TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS login_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER,
        login_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        ip_address TEXT,
        FOREIGN KEY(user_id) REFERENCES users(id)
      );
    `;

    if (isSqlite) {
      // SQLite doesn't support multiple statements in one run easily with better-sqlite3
      // but we can split them
      const statements = schema.split(';').filter(s => s.trim());
      for (const s of statements) {
        await client.query(s);
      }
      
      // Check if access_id column exists, if not, rename email to access_id or add it
      try {
        const tableInfo = await client.query("PRAGMA table_info(users)");
        const hasAccessId = tableInfo.rows.some((col: any) => col.name === 'access_id');
        const hasEmail = tableInfo.rows.some((col: any) => col.name === 'email');
        
        if (!hasAccessId && hasEmail) {
          console.log("Renaming email column to access_id...");
          await client.query("ALTER TABLE users RENAME COLUMN email TO access_id");
        } else if (!hasAccessId) {
          console.log("Adding access_id column to users table...");
          await client.query("ALTER TABLE users ADD COLUMN access_id TEXT UNIQUE");
        }
      } catch (e) {
        console.error("Migration check failed:", e);
      }
    } else {
      await client.query(schema);
    }

    // Seed Admin if not exists with requested credentials: jhfboss@jhf.com / J@#f693071
    const adminAccessId = (process.env.ADMIN_ACCESS_ID || "jhfboss@jhf.com").toLowerCase().trim();
    const adminPassword = process.env.ADMIN_PASSWORD || "J@#f693071";
    console.log(`Ensuring admin user exists: ${adminAccessId}`);
    const hashedPassword = bcrypt.hashSync(adminPassword, 10);
    const adminRes = await client.query("SELECT * FROM users WHERE access_id = $1", [adminAccessId]);
    
    if (adminRes.rowCount === 0) {
      // Check if old admin (e.g. jhfadmin) exists to migrate
      const oldAdminRes = await client.query("SELECT * FROM users WHERE access_id = 'jhfadmin' OR role = 'Admin'");
      if (oldAdminRes.rowCount > 0) {
        const oldId = oldAdminRes.rows[0].id;
        await client.query("UPDATE users SET access_id = $1, password = $2, role = 'Admin' WHERE id = $3", [
          adminAccessId,
          hashedPassword,
          oldId
        ]);
        console.log(`Migrated existing admin (ID ${oldId}) to ${adminAccessId}`);
      } else {
        await client.query("INSERT INTO users (name, access_id, password, role) VALUES ($1, $2, $3, $4)", [
          "System Admin",
          adminAccessId,
          hashedPassword,
          "Admin"
        ]);
        console.log(`Created admin user: ${adminAccessId}`);
      }
    } else {
      // Update password to ensure it matches the default/env
      await client.query("UPDATE users SET password = $1, role = 'Admin' WHERE access_id = $2", [hashedPassword, adminAccessId]);
      console.log(`Updated admin password for ${adminAccessId}`);
    }

    // Also ensure jhfboss@jhf.com exists as an admin if a different custom access_id is set
    if (adminAccessId !== "jhfboss@jhf.com") {
      const bossRes = await client.query("SELECT * FROM users WHERE access_id = 'jhfboss@jhf.com'");
      if (bossRes.rowCount === 0) {
        await client.query("INSERT INTO users (name, access_id, password, role) VALUES ($1, $2, $3, $4)", [
          "JHF Boss",
          "jhfboss@jhf.com",
          bcrypt.hashSync("J@#f693071", 10),
          "Admin"
        ]);
        console.log("Created companion admin user: jhfboss@jhf.com");
      }
    }

    // Seed Dummy Inventory
    const inventoryCountRes = await client.query("SELECT COUNT(*) as count FROM inventory");
    if (parseInt(inventoryCountRes.rows[0].count) === 0) {
      const laptops = [
        ['HP Victus 15', 'i5-12th, 16GB, 512GB, RTX 3050', 'SN-HP-001', 75000, 85000, 'HP Bangladesh', '2024-01-15'],
        ['Asus ROG Strix G16', 'i7-13th, 16GB, 1TB, RTX 4060', 'SN-AS-002', 145000, 165000, 'Asus Global', '2024-02-10'],
        ['MacBook Air M2', '8GB, 256GB, Midnight', 'SN-AP-003', 110000, 125000, 'Apple Store', '2024-02-20'],
        ['Dell Inspiron 15', 'i3-11th, 8GB, 256GB', 'SN-DE-004', 45000, 52000, 'Dell BD', '2024-03-01']
      ];
      for (const l of laptops) {
        await client.query("INSERT INTO inventory (model, config, serial_number, buy_price, sell_price, supplier_name, purchase_date) VALUES ($1, $2, $3, $4, $5, $6, $7)", l);
      }
    }
    await client.commit();
    console.log('Database initialization complete.');
  } catch (err: any) {
    await client.rollback();
    console.error('Error initializing database:', err);
    if (!isSqlite && (err.code === 'EAI_AGAIN' || err.message.includes('getaddrinfo'))) {
      console.error('HINT: This looks like a DNS resolution error. If you are using Render, make sure to use the EXTERNAL Database URL instead of the internal one.');
    }
  } finally {
    client.release();
  }
};

// Auth Middleware
const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: "Token missing" });

  jwt.verify(token, process.env.JWT_SECRET || "secret", (err: any, user: any) => {
    if (err) return res.status(401).json({ message: "Invalid token" });
    req.user = user;
    next();
  });
};

const numberToWords = (num: any): string => {
  const n = typeof num === 'string' ? parseFloat(num) : num;
  if (isNaN(n)) return '';
  
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const convert = (numValue: number): string => {
    if (numValue < 20) return ones[numValue];
    if (numValue < 100) return tens[Math.floor(numValue / 10)] + (numValue % 10 !== 0 ? ' ' + ones[numValue % 10] : '');
    if (numValue < 1000) return ones[Math.floor(numValue / 100)] + ' Hundred' + (numValue % 100 !== 0 ? ' ' + convert(numValue % 100) : '');
    if (numValue < 100000) return convert(Math.floor(numValue / 1000)) + ' Thousand' + (numValue % 1000 !== 0 ? ' ' + convert(numValue % 1000) : '');
    if (numValue < 10000000) return convert(Math.floor(numValue / 100000)) + ' Lakh' + (numValue % 100000 !== 0 ? ' ' + convert(numValue % 100000) : '');
    return convert(Math.floor(numValue / 10000000)) + ' Crore' + (numValue % 10000000 !== 0 ? ' ' + convert(numValue % 10000000) : '');
  };

  if (n === 0) return 'Zero';
  return convert(Math.floor(n));
};

// PDF Generation Helper
const generateInvoicePDF = (sale: any, item: any, installments: any[] = []) => {
  const doc = new PDFDocument({ margin: 30, size: 'A4' });
  const fileName = `Invoice_${sale.invoice_number}.pdf`;
  const filePath = path.join(__dirname, "uploads", "invoices", fileName);
  const stream = fs.createWriteStream(filePath);
  doc.pipe(stream);

  const pageWidth = doc.page.width;
  const margin = 30;
  const contentWidth = pageWidth - (margin * 2);

  // Header
  doc.font("Helvetica-Bold").fontSize(24).text("JHF Laptop Zone", { align: "center" });
  doc.font("Helvetica").fontSize(9);
  doc.text("Best Laptop Buy, Sell & Accessories Importer, Traders & Suppliers", { align: "center" });
  doc.text("Branch Office : Baroipara Bazar, Chandra, Gazipur", { align: "center" });
  doc.text("Main Office : Sonali Trade, Shop No : 1001 & 1040", { align: "center" });
  doc.text("ECS Computer City Centre, Multiplan, New Elephant Road, Dhaka", { align: "center" });
  doc.text("Mobile : 01935-693071 , 01731-693071", { align: "center" });
  doc.text("Email : jhflaptopzone@gmail.com", { align: "center" });
  doc.text("Facebook : www.facebook.com/jhflaptopzone", { align: "center" });
  doc.text("Web : www.jhflaptopzone.com", { align: "center" });
  
  doc.moveDown(0.3);
  doc.lineWidth(1).moveTo(margin, doc.y).lineTo(pageWidth - margin, doc.y).stroke();
  doc.moveDown(0.5);

  doc.font("Helvetica-Bold").fontSize(18).text("SALES INVOICE", { align: "center" });
  doc.moveDown(0.5);

  // Info Section
  const infoY = doc.y;
  doc.font("Helvetica").fontSize(10);
  
  // Left side
  doc.text(`Customer : ${sale.customer_name}`, margin, infoY);
  doc.text(`Mobile : ${sale.customer_phone}`, margin, infoY + 13);
  doc.text(`Address : ${sale.customer_address || "N/A"}`, margin, infoY + 26);

  // Right side
  doc.text(`Invoice No : ${sale.invoice_number}`, margin, infoY, { align: 'right' });
  doc.text(`Date : ${new Date(sale.sale_date).toISOString().split('T')[0]}`, margin, infoY + 13, { align: 'right' });
  doc.text(`Sales By : ${sale.staff_name || "Jahid Hasan"}`, margin, infoY + 26, { align: 'right' });

  doc.moveDown(1.5);

  // Table Header
  const tableTop = doc.y;
  const colWidths = [30, 250, 50, 90, 95];
  const colPositions = [margin];
  for (let i = 0; i < colWidths.length; i++) {
    colPositions.push(colPositions[i] + colWidths[i]);
  }

  doc.font("Helvetica-Bold").fontSize(10);
  doc.rect(margin, tableTop, contentWidth, 20).stroke();
  
  const headers = ["SL", "Item Name", "Qty", "Unit Price", "Amount"];
  headers.forEach((h, i) => {
    doc.text(h, colPositions[i], tableTop + 5, { width: colWidths[i], align: 'center' });
  });

  // Table Content
  doc.font("Helvetica").fontSize(10);
  let currentY = tableTop + 20;
  
  // Item Row
  const itemText = `${item.model}\n${item.config}\nSerial No : ${item.serial_number || "Not Applicable"}`;
  const itemHeight = doc.heightOfString(itemText, { width: colWidths[1] }) + 8;
  const rowHeight = Math.max(itemHeight, 35);

  doc.rect(margin, currentY, contentWidth, rowHeight).stroke();
  
  // Vertical Lines
  for (let i = 1; i < colPositions.length - 1; i++) {
    doc.moveTo(colPositions[i], tableTop).lineTo(colPositions[i], currentY + rowHeight).stroke();
  }

  doc.text("1", colPositions[0], currentY + 8, { width: colWidths[0], align: 'center' });
  doc.text(itemText, colPositions[1] + 5, currentY + 8, { width: colWidths[1] - 10 });
  doc.text("1", colPositions[2], currentY + 8, { width: colWidths[2], align: 'center' });
  doc.text((sale.sell_price ?? 0).toLocaleString(), colPositions[3], currentY + 8, { width: colWidths[3], align: 'center' });
  doc.text((sale.sell_price ?? 0).toLocaleString(), colPositions[4] - 5, currentY + 8, { width: colWidths[4], align: 'right' });

  currentY += rowHeight;
  doc.y = currentY;

  // Total Box
  doc.moveDown(0.3);
  const totalBoxY = doc.y;
  const totalBoxWidth = 120;
  const totalBoxX = pageWidth - margin - totalBoxWidth;
  const totalBoxHeight = 20;
  
  doc.rect(totalBoxX, totalBoxY, totalBoxWidth, totalBoxHeight).stroke();
  doc.moveTo(totalBoxX + 50, totalBoxY).lineTo(totalBoxX + 50, totalBoxY + totalBoxHeight).stroke();
  
  doc.font("Helvetica-Bold").fontSize(11);
  doc.text("Total", totalBoxX, totalBoxY + 5, { width: 50, align: 'center' });
  doc.text(`${(sale.sell_price ?? 0).toLocaleString()} TK`, totalBoxX + 55, totalBoxY + 5, { width: 60, align: 'right' });
  
  doc.y = totalBoxY + totalBoxHeight + 8;
  doc.font("Helvetica-Bold").fontSize(10);
  doc.text("In Words : ", margin, doc.y, { continued: true });
  doc.font("Helvetica-Bold").text(`${numberToWords(sale.sell_price)} Taka Only`);
  
  doc.moveDown(0.8);
  doc.font("Helvetica-Bold").fontSize(11).text("Warranty Policy", margin);
  doc.font("Helvetica").fontSize(10);
  doc.text("  • Full Laptop & Spare Parts : 1 Month", margin);
  doc.text("  • Service : 5 Years", margin);

  // Installments Section (If any)
  if (installments && installments.length > 0) {
    doc.moveDown(0.8);
    doc.font("Helvetica-Bold").fontSize(11).text("Payment / Installment Details", margin);
    doc.moveDown(0.1);
    
    const instTableTop = doc.y;
    const instColWidths = [30, 100, 100, 100];
    const instColPositions = [margin];
    for (let i = 0; i < instColWidths.length; i++) {
      instColPositions.push(instColPositions[i] + instColWidths[i]);
    }

    doc.font("Helvetica-Bold").fontSize(9);
    doc.rect(margin, instTableTop, 330, 14).stroke();
    const instHeaders = ["No", "Due Date", "Amount", "Status"];
    instHeaders.forEach((h, i) => {
      doc.text(h, instColPositions[i], instTableTop + 3, { width: instColWidths[i], align: 'center' });
    });

    doc.font("Helvetica").fontSize(9);
    let instY = instTableTop + 14;
    installments.forEach((inst, idx) => {
      if (instY > doc.page.height - 110) return; 

      doc.rect(margin, instY, 330, 14).stroke();
      doc.text((idx + 1).toString(), instColPositions[0], instY + 3, { width: instColWidths[0], align: 'center' });
      doc.text(inst.due_date, instColPositions[1], instY + 3, { width: instColWidths[1], align: 'center' });
      doc.text((inst.amount ?? 0).toLocaleString(), instColPositions[2], instY + 3, { width: instColWidths[2], align: 'center' });
      doc.text(inst.status, instColPositions[3], instY + 3, { width: instColWidths[3], align: 'center' });
      instY += 14;
    });
    doc.y = instY;
  }

  // Signatures
  const footerY = doc.page.height - 140;
  doc.lineWidth(1).moveTo(margin, footerY).lineTo(margin + 150, footerY).stroke();
  doc.font("Helvetica").fontSize(10).text("Customer Signature", margin, footerY + 5, { width: 150, align: 'center' });

  doc.moveTo(pageWidth - margin - 150, footerY).lineTo(pageWidth - margin, footerY).stroke();
  doc.text("Authorized Signature", pageWidth - margin - 150, footerY + 5, { width: 150, align: 'center' });

  // Thank You Message
  doc.font("Helvetica-Bold").fontSize(12).text("Thank You For Your Purchase", margin, footerY + 30, { width: contentWidth, align: "center" });
  
  // Footer
  doc.font("Helvetica").fontSize(8).text("Software Developed By Jahid Hasan | JHF Laptop Zone", margin, doc.page.height - 40, { width: contentWidth, align: "center" });

  doc.end();
  return fileName;
};

const generateInventoryReportPDF = (items: any[], summary: any, supplierDues: any[], userRole: string) => {
  const doc = new PDFDocument({ margin: 30, size: 'A4', layout: 'landscape' });
  const fileName = `Inventory_Report_${new Date().getTime()}.pdf`;
  const filePath = path.join(__dirname, "uploads", "invoices", fileName);
  const stream = fs.createWriteStream(filePath);
  doc.pipe(stream);

  const pageWidth = doc.page.width;
  const margin = 30;
  const contentWidth = pageWidth - (margin * 2);
  const isAdmin = userRole === 'Admin' || userRole === 'Manager';

  // Header
  doc.font("Helvetica-Bold").fontSize(20).text("JHF Laptop Zone", { align: "center" });
  doc.font("Helvetica").fontSize(10).text("Inventory Stock Report", { align: "center" });
  doc.text(`Generated on: ${new Date().toLocaleString()}`, { align: "center" });
  doc.moveDown(1);
  doc.lineWidth(1).moveTo(margin, doc.y).lineTo(pageWidth - margin, doc.y).stroke();
  doc.moveDown(1);

  if (isAdmin) {
    // Summary Section
    doc.font("Helvetica-Bold").fontSize(14).text("Stock Summary");
    doc.moveDown(0.5);
    doc.font("Helvetica").fontSize(10);
    doc.text(`Total Items in Stock: ${items.length}`);
    doc.text(`Total Buy Price: TK ${summary.totalBuy.toLocaleString()}`);
    doc.text(`Total Sell Price: TK ${summary.totalSell.toLocaleString()}`);
    doc.text(`Estimated Total Profit: TK ${summary.totalProfit.toLocaleString()}`);
    doc.moveDown(1);
  }

  // Grid drawing helper to ensure straight, unbroken, perfectly aligned column borders
  const drawGridRow = (
    startX: number,
    y: number,
    widths: number[],
    height: number,
    fillColor?: string
  ) => {
    const totalW = widths.reduce((a, b) => a + b, 0);
    doc.save();
    if (fillColor) {
      doc.rect(startX, y, totalW, height).fill(fillColor);
    }
    doc.lineWidth(0.5).strokeColor("#000000").rect(startX, y, totalW, height).stroke();
    let curX = startX;
    for (let i = 0; i < widths.length - 1; i++) {
      curX += widths[i];
      doc.moveTo(curX, y).lineTo(curX, y + height).stroke();
    }
    doc.restore();
  };

  // Inventory Table
  doc.font("Helvetica-Bold").fontSize(14).text("Current Inventory Details");
  doc.moveDown(0.5);

  // Exact 8 columns for Admin: SL | Model & Config | Serial Number | Buy Price | Sell Price | Profit | Supplier | Date
  const colWidths = isAdmin 
    ? [28, 185, 100, 75, 75, 75, 137, 75] 
    : [35, 275, 130, 120, 160];
  const tableWidth = colWidths.reduce((a, b) => a + b, 0);
  const tableStartX = (pageWidth - tableWidth) / 2;

  const headers = isAdmin 
    ? ["SL", "Model & Config", "Serial Number", "Buy Price", "Sell Price", "Profit", "Supplier", "Date"]
    : ["SL", "Model & Config", "Serial Number", "Sell Price", "Source"];

  let currentY = doc.y;

  const drawHeader = (y: number) => {
    drawGridRow(tableStartX, y, colWidths, 22, "#f3f4f6");
    doc.font("Helvetica-Bold").fontSize(8.5).fillColor("#000000");
    let curX = tableStartX;
    headers.forEach((h, i) => {
      doc.text(h, curX + 2, y + 6, { width: colWidths[i] - 4, align: 'center' });
      curX += colWidths[i];
    });
  };

  // Draw initial header
  drawHeader(currentY);
  currentY += 22;

  items.forEach((item, idx) => {
    const rowHeight = 26;
    // Check for page break
    if (currentY + rowHeight > doc.page.height - 45) {
      doc.addPage({ layout: 'landscape' });
      currentY = margin;
      drawHeader(currentY);
      currentY += 22;
    }

    drawGridRow(tableStartX, currentY, colWidths, rowHeight);
    doc.font("Helvetica").fontSize(7.5).fillColor("#000000");

    let rowX = tableStartX;
    // SL
    doc.text((idx + 1).toString(), rowX + 2, currentY + 7, { width: colWidths[0] - 4, align: 'center' });
    rowX += colWidths[0];

    // Model & Config
    doc.text(`${item.model} (${item.config})`, rowX + 4, currentY + 4, { width: colWidths[1] - 8, lineGap: 1 });
    rowX += colWidths[1];

    // Serial
    doc.text(item.serial_number || "N/A", rowX + 2, currentY + 7, { width: colWidths[2] - 4, align: 'center' });
    rowX += colWidths[2];

    if (isAdmin) {
      // Buy Price
      doc.text(`TK ${(item.buy_price || 0).toLocaleString()}`, rowX + 2, currentY + 7, { width: colWidths[3] - 4, align: 'center' });
      rowX += colWidths[3];

      // Sell Price
      doc.text(`TK ${(item.sell_price || 0).toLocaleString()}`, rowX + 2, currentY + 7, { width: colWidths[4] - 4, align: 'center' });
      rowX += colWidths[4];

      // Profit (NO Margin column)
      const profit = (item.sell_price || 0) - (item.buy_price || 0);
      doc.text(`TK ${profit.toLocaleString()}`, rowX + 2, currentY + 7, { width: colWidths[5] - 4, align: 'center' });
      rowX += colWidths[5];

      // Supplier
      doc.text(item.supplier_name || "N/A", rowX + 4, currentY + 4, { width: colWidths[6] - 8, align: 'center', lineGap: 1 });
      rowX += colWidths[6];

      // Date
      doc.text(item.purchase_date || "N/A", rowX + 2, currentY + 7, { width: colWidths[7] - 4, align: 'center' });
    } else {
      // Sell Price
      doc.text(`TK ${(item.sell_price || 0).toLocaleString()}`, rowX + 2, currentY + 7, { width: colWidths[3] - 4, align: 'center' });
      rowX += colWidths[3];

      // Source
      doc.text(item.supplier_name || "N/A", rowX + 4, currentY + 4, { width: colWidths[4] - 8, align: 'center', lineGap: 1 });
    }

    currentY += rowHeight;
  });

  // Summary Row for Inventory
  if (isAdmin) {
    if (currentY + 22 > doc.page.height - 45) {
      doc.addPage({ layout: 'landscape' });
      currentY = margin;
    }
    const totalRowHeight = 22;
    drawGridRow(tableStartX, currentY, colWidths, totalRowHeight, "#f3f4f6");
    doc.font("Helvetica-Bold").fontSize(8.5).fillColor("#000000");

    // Span SL, Model & Config, Serial Number for TOTAL label
    const prefixWidth = colWidths[0] + colWidths[1] + colWidths[2];
    doc.text("TOTAL", tableStartX, currentY + 6, { width: prefixWidth - 8, align: 'right' });

    let cellX = tableStartX + prefixWidth;
    // Buy Price Total
    doc.text(`TK ${summary.totalBuy.toLocaleString()}`, cellX + 2, currentY + 6, { width: colWidths[3] - 4, align: 'center' });
    cellX += colWidths[3];

    // Sell Price Total
    doc.text(`TK ${summary.totalSell.toLocaleString()}`, cellX + 2, currentY + 6, { width: colWidths[4] - 4, align: 'center' });
    cellX += colWidths[4];

    // Profit Total
    doc.text(`TK ${summary.totalProfit.toLocaleString()}`, cellX + 2, currentY + 6, { width: colWidths[5] - 4, align: 'center' });

    currentY += totalRowHeight;
  }

  // 2nd Page: Supplier Due Details (Centered on page, clean grid table)
  const activeDues = (supplierDues || []).map((sup: any) => {
    const totalPurchase = (Number(sup.total_purchase) || 0) + (Number(sup.opening_balance) || 0);
    const totalPaid = Number(sup.total_paid) || 0;
    const currentDue = totalPurchase - totalPaid;
    return {
      name: sup.name,
      totalPurchase,
      totalPaid,
      currentDue
    };
  }).filter((sup: any) => sup.currentDue > 0);

  if (isAdmin && activeDues.length > 0) {
    doc.addPage({ layout: 'landscape' });

    // Page 2 Header
    doc.font("Helvetica-Bold").fontSize(18).text("JHF Laptop Zone", { align: "center" });
    doc.font("Helvetica").fontSize(10).text("Supplier Due Details Report", { align: "center" });
    doc.text(`Generated on: ${new Date().toLocaleString()}`, { align: "center" });
    doc.moveDown(0.6);
    doc.lineWidth(0.5).strokeColor("#000000").moveTo(margin, doc.y).lineTo(pageWidth - margin, doc.y).stroke();
    doc.moveDown(0.8);

    doc.font("Helvetica-Bold").fontSize(13).text("Active Supplier Dues");
    doc.moveDown(0.4);

    const sHeaders = ["SL", "Supplier Name", "Total Purchase", "Total Paid", "Current Due"];
    const sColWidths = [40, 250, 150, 150, 150];
    const sTableWidth = sColWidths.reduce((a, b) => a + b, 0); // 740 pt
    const sStartX = (pageWidth - sTableWidth) / 2; // Perfectly centered on page

    let sY = doc.y;

    const drawSupplierHeader = (y: number) => {
      drawGridRow(sStartX, y, sColWidths, 22, "#f3f4f6");
      doc.font("Helvetica-Bold").fontSize(9).fillColor("#000000");
      let curX = sStartX;
      sHeaders.forEach((h, i) => {
        doc.text(h, curX + 2, y + 6, { width: sColWidths[i] - 4, align: 'center' });
        curX += sColWidths[i];
      });
    };

    drawSupplierHeader(sY);
    sY += 22;

    let totalAllPurchase = 0;
    let totalAllPaid = 0;
    let totalAllDue = 0;

    activeDues.forEach((sup: any, idx: number) => {
      totalAllPurchase += sup.totalPurchase;
      totalAllPaid += sup.totalPaid;
      totalAllDue += sup.currentDue;

      const sRowHeight = 24;
      if (sY + sRowHeight > doc.page.height - 45) {
        doc.addPage({ layout: 'landscape' });
        sY = margin;
        drawSupplierHeader(sY);
        sY += 22;
      }

      drawGridRow(sStartX, sY, sColWidths, sRowHeight);
      doc.font("Helvetica").fontSize(8.5).fillColor("#000000");

      let rowX = sStartX;
      // SL
      doc.text((idx + 1).toString(), rowX + 2, sY + 7, { width: sColWidths[0] - 4, align: 'center' });
      rowX += sColWidths[0];

      // Supplier Name
      doc.text(sup.name, rowX + 6, sY + 7, { width: sColWidths[1] - 12, align: 'left' });
      rowX += sColWidths[1];

      // Total Purchase
      doc.text(`TK ${sup.totalPurchase.toLocaleString()}`, rowX + 2, sY + 7, { width: sColWidths[2] - 4, align: 'center' });
      rowX += sColWidths[2];

      // Total Paid
      doc.text(`TK ${sup.totalPaid.toLocaleString()}`, rowX + 2, sY + 7, { width: sColWidths[3] - 4, align: 'center' });
      rowX += sColWidths[3];

      // Current Due
      doc.text(`TK ${sup.currentDue.toLocaleString()}`, rowX + 2, sY + 7, { width: sColWidths[4] - 4, align: 'center' });

      sY += sRowHeight;
    });

    // Supplier Due Summary TOTAL Row
    if (sY + 22 > doc.page.height - 45) {
      doc.addPage({ layout: 'landscape' });
      sY = margin;
    }
    drawGridRow(sStartX, sY, sColWidths, 22, "#f3f4f6");
    doc.font("Helvetica-Bold").fontSize(9).fillColor("#000000");

    const sPrefixWidth = sColWidths[0] + sColWidths[1];
    doc.text("TOTAL", sStartX, sY + 6, { width: sPrefixWidth - 8, align: 'right' });

    let sTotX = sStartX + sPrefixWidth;
    doc.text(`TK ${totalAllPurchase.toLocaleString()}`, sTotX + 2, sY + 6, { width: sColWidths[2] - 4, align: 'center' });
    sTotX += sColWidths[2];

    doc.text(`TK ${totalAllPaid.toLocaleString()}`, sTotX + 2, sY + 6, { width: sColWidths[3] - 4, align: 'center' });
    sTotX += sColWidths[3];

    doc.text(`TK ${totalAllDue.toLocaleString()}`, sTotX + 2, sY + 6, { width: sColWidths[4] - 4, align: 'center' });
  }

  doc.end();
  return fileName;
};

// API Routes
app.get("/api/health", async (req, res) => {
  try {
    const dbRes = await dbQuery(isSqlite ? 'SELECT 1' : 'SELECT NOW()');
    res.json({ status: "ok", database: isSqlite ? 'SQLite' : 'PostgreSQL' });
  } catch (err: any) {
    console.error('Health check database error:', err);
    let hint = null;
    if (!isSqlite && (err.code === 'EAI_AGAIN' || err.message.includes('getaddrinfo'))) {
      hint = "DNS Resolution Error: It looks like you're using an internal Render URL. Please use the EXTERNAL Database URL in your secrets.";
    }
    res.status(500).json({ 
      status: "error", 
      message: "Database connection failed", 
      details: err.message,
      hint 
    });
  }
});

app.get("/api/health/db-status", async (req, res) => {
  try {
    if (!isSqlite && !process.env.DATABASE_URL) {
      return res.json({ connected: false, error: "DATABASE_URL not set" });
    }
    const client = await getClient();
    await client.query(isSqlite ? 'SELECT 1' : 'SELECT 1');
    client.release();
    res.json({ connected: true, type: isSqlite ? 'SQLite' : 'PostgreSQL' });
  } catch (err: any) {
    let hint = null;
    if (!isSqlite && (err.code === 'EAI_AGAIN' || err.message.includes('getaddrinfo'))) {
      hint = "Render Internal URL detected. Please switch to the External Database URL.";
    }
    res.json({ connected: false, error: err.message, code: err.code, hint });
  }
});

app.post("/api/auth/login", async (req, res) => {
  const { access_id, password } = req.body;
  if (!access_id || !password) {
    return res.status(400).json({ message: "Access ID and password are required" });
  }
  
  const normalizedAccessId = access_id.toLowerCase().trim();
  try {
    const userRes = await dbQuery("SELECT * FROM users WHERE access_id = $1", [normalizedAccessId]);
    const user = userRes.rows[0];
    
    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: user.id, access_id: user.access_id, role: user.role, name: user.name },
      process.env.JWT_SECRET || "secret",
      { expiresIn: "24h" }
    );

    await dbQuery("INSERT INTO login_logs (user_id) VALUES ($1)", [user.id]);

    res.json({ token, user: { id: user.id, access_id: user.access_id, role: user.role, name: user.name } });
  } catch (err: any) {
    console.error('Login error:', err);
    let errorMessage = err.message;
    if (!isSqlite && (err.code === 'EAI_AGAIN' || err.message.includes('getaddrinfo'))) {
      errorMessage = "Database connection error: Could not resolve the database host. If you are using Render, please ensure you are using the EXTERNAL Database URL in your secrets.";
    }
    res.status(500).json({ message: errorMessage });
  }
});

// User Management Routes
app.get("/api/users", authenticateToken, async (req, res) => {
  const user = (req as any).user;
  // Allow Admin, Manager, and Staff to see the user list
  if (!['Admin', 'Manager', 'Staff'].includes(user.role)) return res.sendStatus(403);
  try {
    const usersRes = await dbQuery("SELECT id, name, access_id, role FROM users");
    res.json(usersRes.rows);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

app.post("/api/users", authenticateToken, async (req, res) => {
  const user = (req as any).user;
  // Allow Admin, Manager, and Staff to create users
  if (!['Admin', 'Manager', 'Staff'].includes(user.role)) return res.sendStatus(403);
  
  const { name, access_id, password, role } = req.body;
  
  try {
    const hashedPassword = bcrypt.hashSync(password, 10);
    await dbQuery("INSERT INTO users (name, access_id, password, role) VALUES ($1, $2, $3, $4)", [name, access_id, hashedPassword, role]);
    res.status(201).json({ message: "User created" });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

app.put("/api/users/:id", authenticateToken, async (req, res) => {
  if ((req as any).user.role !== 'Admin') return res.sendStatus(403);
  const { name, access_id, password, role } = req.body;
  try {
    let query = "UPDATE users SET name = $1, access_id = $2, role = $3";
    const params = [name, access_id, role, req.params.id];
    
    if (password) {
      const hashedPassword = bcrypt.hashSync(password, 10);
      query += ", password = $4 WHERE id = $5";
      params[3] = hashedPassword;
      params[4] = req.params.id;
    } else {
      query += " WHERE id = $4";
    }
    
    await dbQuery(query, params);
    res.json({ message: "User updated" });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

app.delete("/api/users/:id", authenticateToken, async (req, res) => {
  if ((req as any).user.role !== 'Admin') return res.sendStatus(403);
  try {
    // Prevent deleting self
    if (parseInt(req.params.id) === (req as any).user.id) {
      return res.status(400).json({ message: "You cannot delete your own account" });
    }
    await dbQuery("DELETE FROM users WHERE id = $1", [req.params.id]);
    res.json({ message: "User deleted" });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

// Dashboard Stats
app.get("/api/dashboard/stats", authenticateToken, async (req, res) => {
  const user = (req as any).user;
  const isAdmin = user.role === 'Admin';
  
  const staffFilter = isAdmin ? "" : `WHERE staff_id = ${user.id}`;
  const staffFilterAnd = isAdmin ? "" : `AND staff_id = ${user.id}`;

  try {
    const totalSalesRes = await dbQuery(`SELECT COUNT(*) as count, SUM(sell_price) as total, SUM(profit) as profit FROM sales ${staffFilter}`);
    const totalSales = totalSalesRes.rows[0];

    const emiOutstandingRes = await dbQuery(`
      SELECT SUM(i.amount - i.paid_amount) as outstanding 
      FROM installments i
      JOIN sales s ON i.sale_id = s.id
      WHERE i.status != 'Paid' ${staffFilterAnd}
    `);
    const emiOutstanding = emiOutstandingRes.rows[0];

    const lowStockRes = await dbQuery("SELECT COUNT(*) as count FROM (SELECT model, COUNT(*) as qty FROM inventory WHERE status = 'Available' GROUP BY model HAVING COUNT(*) < 2) as low_stock");
    const lowStock = lowStockRes.rows[0];
    
    const monthlySalesQuery = isSqlite ?
      `SELECT strftime('%Y-%m', sale_date) as month, SUM(sell_price) as total FROM sales ${staffFilter} GROUP BY month ORDER BY month DESC LIMIT 6` :
      `SELECT TO_CHAR(sale_date, 'YYYY-MM') as month, SUM(sell_price) as total FROM sales ${staffFilter} GROUP BY month ORDER BY month DESC LIMIT 6`;
    
    const monthlySalesRes = await dbQuery(monthlySalesQuery);
    const monthlySales = monthlySalesRes.rows;

    const paymentMethodsRes = await dbQuery(`SELECT payment_type, COUNT(*) as count FROM sales ${staffFilter} GROUP BY payment_type`);
    const paymentMethods = paymentMethodsRes.rows;

    const lastBackupRes = await dbQuery("SELECT backup_date FROM backup_logs ORDER BY backup_date DESC LIMIT 1");
    const lastBackup = lastBackupRes.rows[0];

    // Supplier Stats (Only for Admin)
    let supplierStats = { totalDue: 0, topDues: [], monthlyPurchase: 0, monthlyPayment: 0 };
    if (isAdmin) {
      const totalSupplierDueRes = await dbQuery(`
        SELECT 
          (SELECT COALESCE(SUM(purchase_amount), 0) FROM supplier_purchases) + 
          (SELECT COALESCE(SUM(opening_balance), 0) FROM suppliers) - 
          (SELECT COALESCE(SUM(payment_amount), 0) FROM supplier_payments) as due
      `);
      const totalSupplierDue = totalSupplierDueRes.rows[0];

      const topSupplierDuesRes = await dbQuery(`
        SELECT s.id, s.name, 
          (SELECT COALESCE(SUM(purchase_amount), 0) FROM supplier_purchases WHERE supplier_id = s.id) + 
          s.opening_balance - 
          (SELECT COALESCE(SUM(payment_amount), 0) FROM supplier_payments WHERE supplier_id = s.id) as due
        FROM suppliers s
        ORDER BY due DESC
        LIMIT 5
      `);
      const topSupplierDues = topSupplierDuesRes.rows;

      const currentMonth = new Date().toISOString().slice(0, 7);
      
      const monthlyPurchaseQuery = isSqlite ?
        `SELECT COALESCE(SUM(purchase_amount), 0) as total FROM supplier_purchases WHERE strftime('%Y-%m', purchase_date) = $1` :
        `SELECT COALESCE(SUM(purchase_amount), 0) as total FROM supplier_purchases WHERE TO_CHAR(purchase_date, 'YYYY-MM') = $1`;
        
      const monthlyPurchaseRes = await dbQuery(monthlyPurchaseQuery, [currentMonth]);
      const monthlyPurchase = monthlyPurchaseRes.rows[0];

      const monthlySupplierPaymentQuery = isSqlite ?
        `SELECT COALESCE(SUM(payment_amount), 0) as total FROM supplier_payments WHERE strftime('%Y-%m', payment_date) = $1` :
        `SELECT COALESCE(SUM(payment_amount), 0) as total FROM supplier_payments WHERE TO_CHAR(payment_date, 'YYYY-MM') = $1`;

      const monthlySupplierPaymentRes = await dbQuery(monthlySupplierPaymentQuery, [currentMonth]);
      const monthlySupplierPayment = monthlySupplierPaymentRes.rows[0];

      supplierStats = {
        totalDue: parseFloat(totalSupplierDue.due || 0),
        topDues: topSupplierDues,
        monthlyPurchase: parseFloat(monthlyPurchase.total || 0),
        monthlyPayment: parseFloat(monthlySupplierPayment.total || 0)
      };
    }

    res.json({
      totalSalesCount: parseInt(totalSales.count || 0),
      totalSalesAmount: parseFloat(totalSales.total || 0),
      totalProfit: isAdmin ? parseFloat(totalSales.profit || 0) : 0,
      emiOutstanding: parseFloat(emiOutstanding.outstanding || 0),
      lowStockCount: parseInt(lowStock.count || 0),
      monthlySales,
      paymentMethods,
      lastBackupDate: isAdmin ? (lastBackup ? lastBackup.backup_date : null) : null,
      supplierStats
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// Inventory Routes
app.get("/api/inventory", authenticateToken, async (req, res) => {
  const isAdmin = (req as any).user.role === 'Admin';
  const query = isAdmin 
    ? "SELECT * FROM inventory ORDER BY created_at DESC"
    : "SELECT id, model, config, serial_number, sell_price, supplier_name, purchase_date, status, created_at FROM inventory ORDER BY created_at DESC";
  try {
    const itemsRes = await dbQuery(query);
    res.json(itemsRes.rows);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

app.post("/api/inventory", authenticateToken, async (req, res) => {
  const { model, config, serial_number, buy_price, sell_price, supplier_name, supplier_id, purchase_date } = req.body;
  const client = await getClient();
  try {
    await client.begin();
    const result = await client.query(`
      INSERT INTO inventory (model, config, serial_number, buy_price, sell_price, supplier_name, supplier_id, purchase_date)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ${isSqlite ? '' : 'RETURNING id'}
    `, [model, config, serial_number, parseFloat(buy_price), parseFloat(sell_price), supplier_name, supplier_id || null, purchase_date]);
    
    const inventoryId = isSqlite ? result.lastInsertRowid : result.rows[0].id;

    if (supplier_id) {
      await client.query(`
        INSERT INTO supplier_purchases (supplier_id, inventory_id, purchase_amount, purchase_date)
        VALUES ($1, $2, $3, $4)
      `, [supplier_id, inventoryId, parseFloat(buy_price), purchase_date]);
    }
    await client.commit();
    res.status(201).json({ message: "Item added to inventory" });
  } catch (error: any) {
    await client.rollback();
    res.status(400).json({ message: error.message });
  } finally {
    client.release();
  }
});

app.put("/api/inventory/:id", authenticateToken, async (req, res) => {
  const { model, config, serial_number, buy_price, sell_price, supplier_name, purchase_date, status } = req.body;
  try {
    await dbQuery(`
      UPDATE inventory 
      SET model = $1, config = $2, serial_number = $3, buy_price = $4, sell_price = $5, supplier_name = $6, purchase_date = $7, status = $8
      WHERE id = $9
    `, [model, config, serial_number, parseFloat(buy_price), parseFloat(sell_price), supplier_name, purchase_date, status, req.params.id]);
    res.json({ message: "Item updated" });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

app.delete("/api/inventory/:id", authenticateToken, async (req, res) => {
  try {
    await dbQuery("DELETE FROM inventory WHERE id = $1", [req.params.id]);
    res.json({ message: "Item deleted" });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

// Sales Routes
app.get("/api/sales", authenticateToken, async (req, res) => {
  try {
    const salesRes = await dbQuery(`
      SELECT s.*, i.model, i.config, i.serial_number, u.name as staff_name
      FROM sales s 
      JOIN inventory i ON s.inventory_id = i.id 
      LEFT JOIN users u ON s.staff_id = u.id
      ORDER BY s.sale_date DESC
    `);
    res.json(salesRes.rows);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

app.post("/api/sales", authenticateToken, async (req, res) => {
  const { 
    inventory_id, 
    customer_name, 
    customer_phone, 
    customer_address, 
    payment_type, 
    emi_data,
    due_data,
    sale_date
  } = req.body;
  
  const client = await getClient();
  try {
    const itemRes = await client.query("SELECT * FROM inventory WHERE id = $1 AND status = 'Available'", [inventory_id]);
    const item = itemRes.rows[0];
    if (!item) return res.status(400).json({ message: "Item not available" });

    const date = sale_date ? new Date(sale_date) : new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, "");
    
    const countRes = await client.query(
      isSqlite ? "SELECT COUNT(*) as count FROM sales WHERE date(sale_date) = $1" : "SELECT COUNT(*) as count FROM sales WHERE DATE(sale_date) = $1", 
      [date.toISOString().slice(0, 10)]
    );
    const count = parseInt(countRes.rows[0].count);
    const invoiceNumber = `JHF-${dateStr}-${(count + 1).toString().padStart(4, "0")}`;

    const profit = parseFloat(item.sell_price) - parseFloat(item.buy_price);

    await client.begin();
    
    let saleResult;
    const isInstallmentSale = payment_type === 'EMI' || payment_type === 'Due';
    const installmentData = payment_type === 'EMI' ? emi_data : due_data;

    if (isInstallmentSale && installmentData) {
      saleResult = await client.query(`
        INSERT INTO sales (
          invoice_number, inventory_id, customer_name, customer_phone, customer_address, 
          sell_price, profit, payment_type, staff_id,
          due_estimate_date, due_reference_name, due_reference_phone, due_terms, sale_date
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        ${isSqlite ? '' : 'RETURNING id'}
      `, [
        invoiceNumber, inventory_id, customer_name, customer_phone, customer_address, 
        item.sell_price, profit, payment_type, (req as any).user.id,
        installmentData.estimate_date || null, installmentData.reference_name || null, installmentData.reference_phone || null, installmentData.duration_months || installmentData.installment_plan || null,
        date.toISOString()
      ]);
    } else {
      saleResult = await client.query(`
        INSERT INTO sales (invoice_number, inventory_id, customer_name, customer_phone, customer_address, sell_price, profit, payment_type, staff_id, sale_date)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ${isSqlite ? '' : 'RETURNING id'}
      `, [invoiceNumber, inventory_id, customer_name, customer_phone, customer_address, item.sell_price, profit, payment_type, (req as any).user.id, date.toISOString()]);
    }

    const saleId = isSqlite ? saleResult.lastInsertRowid : saleResult.rows[0].id;
    await client.query("UPDATE inventory SET status = 'Sold' WHERE id = $1", [inventory_id]);

    const publicToken = uuidv4();
    const installments_list: any[] = [];

    if (isInstallmentSale && installmentData) {
      const downPayment = parseFloat(installmentData.down_payment || 0);
      const durationMonths = parseInt(installmentData.duration_months || installmentData.installment_plan || 1);
      const remaining = parseFloat(item.sell_price) - downPayment;
      const monthlyInstallment = durationMonths > 1 ? remaining / (durationMonths - 1) : 0;

      // 1st Installment (Instant / Down Payment)
      const inst1Res = await client.query(`
        INSERT INTO installments (sale_id, installment_number, due_date, amount, paid_amount, payment_date, status, remaining_balance)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ${isSqlite ? '' : 'RETURNING id'}
      `, [saleId, 1, date.toISOString().slice(0, 10), downPayment, downPayment, date.toISOString(), 'Paid', parseFloat(item.sell_price) - downPayment]);

      const inst1Id = isSqlite ? inst1Res.lastInsertRowid : inst1Res.rows[0].id;

      installments_list.push({
        installment_number: 1,
        due_date: date.toISOString().slice(0, 10),
        amount: downPayment,
        status: 'Paid'
      });

      // Record 1st payment in history
      if (downPayment > 0) {
        await client.query(`
          INSERT INTO sale_payments (sale_id, installment_id, amount, payment_type, note)
          VALUES ($1, $2, $3, $4, $5)
        `, [saleId, inst1Id, downPayment, payment_type, 'Down Payment / 1st Installment']);
      }

      // Future Installments
      for (let i = 2; i <= durationMonths; i++) {
        const dueDate = new Date(date);
        dueDate.setMonth(dueDate.getMonth() + (i - 1));
        const dueDateStr = dueDate.toISOString().slice(0, 10);
        await client.query(`
          INSERT INTO installments (sale_id, installment_number, due_date, amount, status, remaining_balance)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [saleId, i, dueDateStr, monthlyInstallment, 'Pending', parseFloat(item.sell_price) - downPayment - (monthlyInstallment * (i-1))]);
        
        installments_list.push({
          installment_number: i,
          due_date: dueDateStr,
          amount: monthlyInstallment,
          status: 'Pending'
        });
      }
    }

    // Generate PDF
    const pdfFileName = generateInvoicePDF({
      invoice_number: invoiceNumber,
      customer_name,
      customer_phone,
      customer_address,
      payment_type,
      sell_price: item.sell_price,
      sale_date: new Date().toISOString(),
      staff_name: (req as any).user.name
    }, item, installments_list);

    await client.query("UPDATE sales SET invoice_pdf_path = $1, invoice_public_token = $2 WHERE id = $3", [pdfFileName, publicToken, saleId]);

    await client.commit();
    res.status(201).json({ 
      message: "Sale completed", 
      invoice_number: invoiceNumber, 
      public_token: publicToken,
      installments: installments_list
    });
  } catch (error: any) {
    await client.rollback();
    res.status(400).json({ message: error.message });
  } finally {
    client.release();
  }
});

app.delete("/api/sales/:id", authenticateToken, async (req, res) => {
  const saleId = req.params.id;
  const client = await getClient();
  try {
    await client.begin();
    const saleRes = await client.query("SELECT * FROM sales WHERE id = $1", [saleId]);
    const sale = saleRes.rows[0];
    if (!sale) throw new Error("Sale not found");

    // Revert inventory status
    await client.query("UPDATE inventory SET status = 'Available' WHERE id = $1", [sale.inventory_id]);

    // Delete associated EMI/Installments if any
    await client.query("DELETE FROM emi WHERE sale_id = $1", [saleId]);
    await client.query("DELETE FROM installments WHERE sale_id = $1", [saleId]);
    await client.query("DELETE FROM sale_payments WHERE sale_id = $1", [saleId]);
    await client.query("DELETE FROM sales WHERE id = $1", [saleId]);

    await client.commit();
    res.json({ message: "Sale returned/deleted successfully" });
  } catch (error: any) {
    await client.rollback();
    res.status(400).json({ message: error.message });
  } finally {
    client.release();
  }
});

// Installment Routes
app.get("/api/installments/:sale_id", authenticateToken, async (req, res) => {
  try {
    const installmentsRes = await dbQuery("SELECT * FROM installments WHERE sale_id = $1 ORDER BY installment_number ASC", [req.params.sale_id]);
    const paymentsRes = await dbQuery("SELECT * FROM sale_payments WHERE sale_id = $1 ORDER BY payment_date DESC", [req.params.sale_id]);
    res.json({ installments: installmentsRes.rows, payments: paymentsRes.rows });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

app.post("/api/installments/payment/:id", authenticateToken, async (req, res) => {
  const { amount, payment_type, note } = req.body;
  const client = await getClient();
  try {
    const installmentRes = await client.query("SELECT * FROM installments WHERE id = $1", [req.params.id]);
    const installment = installmentRes.rows[0];
    if (!installment) return res.status(404).json({ message: "Installment not found" });

    await client.begin();
    const newPaid = parseFloat(installment.paid_amount) + parseFloat(amount);
    const status = newPaid >= parseFloat(installment.amount) ? 'Paid' : 'Pending';
    
    await client.query(`
      UPDATE installments 
      SET paid_amount = $1, status = $2, payment_date = CURRENT_TIMESTAMP 
      WHERE id = $3
    `, [newPaid, status, req.params.id]);

    await client.query(`
      INSERT INTO sale_payments (sale_id, installment_id, amount, payment_type, note)
      VALUES ($1, $2, $3, $4, $5)
    `, [installment.sale_id, req.params.id, amount, payment_type || 'Cash', note || null]);

    await client.commit();
    res.json({ message: "Payment recorded" });
  } catch (error: any) {
    await client.rollback();
    res.status(400).json({ message: error.message });
  } finally {
    client.release();
  }
});

// Backup & Restore Routes
app.get("/api/backup", authenticateToken, async (req, res) => {
  if ((req as any).user.role !== 'Admin') return res.sendStatus(403);
  
  try {
    const data = {
      users: (await dbQuery("SELECT * FROM users")).rows,
      inventory: (await dbQuery("SELECT * FROM inventory")).rows,
      sales: (await dbQuery("SELECT * FROM sales")).rows,
      installments: (await dbQuery("SELECT * FROM installments")).rows,
      sale_payments: (await dbQuery("SELECT * FROM sale_payments")).rows,
      suppliers: (await dbQuery("SELECT * FROM suppliers")).rows,
      supplier_purchases: (await dbQuery("SELECT * FROM supplier_purchases")).rows,
      supplier_payments: (await dbQuery("SELECT * FROM supplier_payments")).rows,
      emi: (await dbQuery("SELECT * FROM emi")).rows,
      login_logs: (await dbQuery("SELECT * FROM login_logs")).rows,
      backup_logs: (await dbQuery("SELECT * FROM backup_logs")).rows
    };
    
    const fileName = `JHF_Backup_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    await dbQuery("INSERT INTO backup_logs (file_name, user_id) VALUES ($1, $2)", [fileName, (req as any).user.id]);
    
    res.json({ fileName, data });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

app.post("/api/restore", authenticateToken, async (req, res) => {
  const { data } = req.body;
  if (!data) return res.status(400).json({ message: "No data provided" });

  const client = await getClient();
  try {
    await client.begin();
    // Clear current data
    const tables = ["backup_logs", "login_logs", "sale_payments", "installments", "emi", "sales", "supplier_purchases", "supplier_payments", "inventory", "suppliers", "users"];
    if (isSqlite) {
      for (const table of tables) {
        await client.query(`DELETE FROM ${table}`);
        await client.query(`DELETE FROM sqlite_sequence WHERE name='${table}'`);
      }
    } else {
      await client.query(`TRUNCATE TABLE ${tables.join(', ')} RESTART IDENTITY CASCADE`);
    }

    // Restore users
    if (data.users) {
      for (const u of data.users) {
        const accessId = u.access_id || u.email;
        await client.query("INSERT INTO users (id, name, access_id, password, role, created_at) VALUES ($1, $2, $3, $4, $5, $6)", [u.id, u.name, accessId, u.password, u.role, u.created_at]);
      }
    }

    // Restore suppliers
    if (data.suppliers) {
      for (const s of data.suppliers) {
        await client.query("INSERT INTO suppliers (id, name, mobile, address, opening_balance, created_at) VALUES ($1, $2, $3, $4, $5, $6)", [s.id, s.name, s.mobile, s.address, s.opening_balance, s.created_at]);
      }
    }

    // Restore inventory
    if (data.inventory) {
      for (const i of data.inventory) {
        await client.query("INSERT INTO inventory (id, model, config, serial_number, buy_price, sell_price, supplier_name, supplier_id, purchase_date, status, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)", [i.id, i.model, i.config, i.serial_number, i.buy_price, i.sell_price, i.supplier_name, i.supplier_id, i.purchase_date, i.status, i.created_at]);
      }
    }

    // Restore sales
    if (data.sales) {
      for (const s of data.sales) {
        await client.query("INSERT INTO sales (id, invoice_number, inventory_id, customer_name, customer_phone, customer_address, sell_price, profit, payment_type, due_estimate_date, due_reference_name, due_reference_phone, due_terms, staff_id, sale_date) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)", [s.id, s.invoice_number, s.inventory_id, s.customer_name, s.customer_phone, s.customer_address, s.sell_price, s.profit, s.payment_type, s.due_estimate_date, s.due_reference_name, s.due_reference_phone, s.due_terms, s.staff_id, s.sale_date]);
      }
    }

    // Restore installments
    if (data.installments) {
      for (const i of data.installments) {
        await client.query("INSERT INTO installments (id, sale_id, installment_number, due_date, amount, paid_amount, payment_date, status, remaining_balance) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)", [i.id, i.sale_id, i.installment_number, i.due_date, i.amount, i.paid_amount, i.payment_date, i.status, i.remaining_balance]);
      }
    }

    // Restore sale_payments
    if (data.sale_payments) {
      for (const p of data.sale_payments) {
        await client.query("INSERT INTO sale_payments (id, sale_id, installment_id, amount, payment_date, payment_type, note) VALUES ($1, $2, $3, $4, $5, $6, $7)", [p.id, p.sale_id, p.installment_id, p.amount, p.payment_date, p.payment_type, p.note]);
      }
    }

    // Restore supplier_purchases
    if (data.supplier_purchases) {
      for (const p of data.supplier_purchases) {
        await client.query("INSERT INTO supplier_purchases (id, supplier_id, inventory_id, purchase_amount, purchase_date) VALUES ($1, $2, $3, $4, $5)", [p.id, p.supplier_id, p.inventory_id, p.purchase_amount, p.purchase_date]);
      }
    }

    // Restore supplier_payments
    if (data.supplier_payments) {
      for (const p of data.supplier_payments) {
        await client.query("INSERT INTO supplier_payments (id, supplier_id, payment_date, payment_amount, payment_type, note, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7)", [p.id, p.supplier_id, p.payment_date, p.payment_amount, p.payment_type, p.note, p.created_at]);
      }
    }

    // Restore EMI (Legacy)
    if (data.emi) {
      for (const e of data.emi) {
        await client.query("INSERT INTO emi (id, sale_id, total_amount, down_payment, remaining_amount, duration_months, monthly_installment, paid_amount, next_due_date, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)", [e.id, e.sale_id, e.total_amount, e.down_payment, e.remaining_amount, e.duration_months, e.monthly_installment, e.paid_amount, e.next_due_date, e.status]);
      }
    }

    // Restore login_logs
    if (data.login_logs) {
      for (const l of data.login_logs) {
        await client.query("INSERT INTO login_logs (id, user_id, login_time, ip_address) VALUES ($1, $2, $3, $4)", [l.id, l.user_id, l.login_time, l.ip_address]);
      }
    }

    // Restore backup_logs
    if (data.backup_logs) {
      for (const l of data.backup_logs) {
        await client.query("INSERT INTO backup_logs (id, backup_date, file_name, user_id) VALUES ($1, $2, $3, $4)", [l.id, l.backup_date, l.file_name, l.user_id]);
      }
    }

    await client.commit();
    res.json({ message: "Database restored successfully" });
  } catch (error: any) {
    await client.rollback();
    console.error("Restore error:", error);
    res.status(400).json({ message: "Restore failed: " + error.message });
  } finally {
    client.release();
  }
});

app.get("/api/backup/logs", authenticateToken, async (req, res) => {
  try {
    const logsRes = await dbQuery(`
      SELECT b.*, u.name as user_name 
      FROM backup_logs b 
      LEFT JOIN users u ON b.user_id = u.id 
      ORDER BY b.backup_date DESC
    `);
    res.json(logsRes.rows);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// Report Routes
app.get("/api/reports/due", authenticateToken, async (req, res) => {
  try {
    const dueReportRes = await dbQuery(`
      SELECT 
        s.*, 
        i.model, i.config, i.serial_number, i.buy_price, i.supplier_name,
        u.name as staff_name,
        (SELECT SUM(amount) FROM installments WHERE sale_id = s.id) as total_sell_price,
        (SELECT SUM(paid_amount) FROM installments WHERE sale_id = s.id) as total_paid,
        (SELECT MAX(due_date) FROM installments WHERE sale_id = s.id AND status != 'Paid') as final_due_date
      FROM sales s
      JOIN inventory i ON s.inventory_id = i.id
      JOIN users u ON s.staff_id = u.id
      WHERE (SELECT SUM(amount) - SUM(paid_amount) FROM installments WHERE sale_id = s.id) > 0
      OR s.payment_type = 'Due'
    `);
    res.json(dueReportRes.rows);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

app.get("/api/reports/inventory", authenticateToken, async (req, res) => {
  try {
    const userRole = (req as any).user.role;
    const isAdmin = userRole === 'Admin' || userRole === 'Manager';

    const inventoryRes = await dbQuery("SELECT * FROM inventory WHERE status = 'Available' ORDER BY purchase_date DESC");
    const items = inventoryRes.rows;

    let summary = { totalBuy: 0, totalSell: 0, totalProfit: 0 };
    let supplierDues: any[] = [];

    if (isAdmin) {
      summary.totalBuy = items.reduce((acc, item) => acc + (item.buy_price || 0), 0);
      summary.totalSell = items.reduce((acc, item) => acc + (item.sell_price || 0), 0);
      summary.totalProfit = summary.totalSell - summary.totalBuy;

      const suppliersRes = await dbQuery(`
        SELECT s.*, 
          (SELECT COALESCE(SUM(purchase_amount), 0) FROM supplier_purchases WHERE supplier_id = s.id) as total_purchase,
          (SELECT COALESCE(SUM(payment_amount), 0) FROM supplier_payments WHERE supplier_id = s.id) as total_paid
        FROM suppliers s
      `);
      supplierDues = suppliersRes.rows;
    }

    const pdfFileName = generateInventoryReportPDF(items, summary, supplierDues, userRole);
    res.json({ pdfUrl: `/invoices/${pdfFileName}` });
  } catch (err: any) {
    console.error("Inventory report error:", err);
    res.status(500).json({ message: err.message });
  }
});

// EMI Routes
app.get("/api/emi", authenticateToken, async (req, res) => {
  try {
    const emisRes = await dbQuery(`
      SELECT e.*, s.customer_name, s.customer_phone, s.invoice_number 
      FROM emi e 
      JOIN sales s ON e.sale_id = s.id 
      ORDER BY e.next_due_date ASC
    `);
    res.json(emisRes.rows);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// Supplier Routes
app.get("/api/suppliers", authenticateToken, async (req, res) => {
  try {
    const suppliersRes = await dbQuery(`
      SELECT s.*, 
        (SELECT COALESCE(SUM(purchase_amount), 0) FROM supplier_purchases WHERE supplier_id = s.id) as total_purchase,
        (SELECT COALESCE(SUM(payment_amount), 0) FROM supplier_payments WHERE supplier_id = s.id) as total_paid
      FROM suppliers s
      ORDER BY s.name ASC
    `);
    res.json(suppliersRes.rows);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

app.post("/api/suppliers", authenticateToken, async (req, res) => {
  const { name, mobile, address, opening_balance } = req.body;
  try {
    await dbQuery("INSERT INTO suppliers (name, mobile, address, opening_balance) VALUES ($1, $2, $3, $4)", [name, mobile, address, parseFloat(opening_balance) || 0]);
    res.status(201).json({ message: "Supplier added" });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

app.put("/api/suppliers/:id", authenticateToken, async (req, res) => {
  const { name, mobile, address, opening_balance } = req.body;
  try {
    await dbQuery("UPDATE suppliers SET name = $1, mobile = $2, address = $3, opening_balance = $4 WHERE id = $5", [name, mobile, address, parseFloat(opening_balance) || 0, req.params.id]);
    res.json({ message: "Supplier updated" });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

app.delete("/api/suppliers/:id", authenticateToken, async (req, res) => {
  try {
    await dbQuery("DELETE FROM suppliers WHERE id = $1", [req.params.id]);
    res.json({ message: "Supplier deleted" });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

app.get("/api/suppliers/ledger/:id", authenticateToken, async (req, res) => {
  try {
    const purchasesRes = await dbQuery(`
      SELECT sp.*, i.model, i.serial_number, i.config
      FROM supplier_purchases sp
      JOIN inventory i ON sp.inventory_id = i.id
      WHERE sp.supplier_id = $1
      ORDER BY sp.purchase_date DESC
    `, [req.params.id]);

    const paymentsRes = await dbQuery(`
      SELECT * FROM supplier_payments WHERE supplier_id = $1 ORDER BY payment_date DESC
    `, [req.params.id]);

    const supplierRes = await dbQuery("SELECT * FROM suppliers WHERE id = $1", [req.params.id]);

    res.json({ purchases: purchasesRes.rows, payments: paymentsRes.rows, supplier: supplierRes.rows[0] });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

app.post("/api/suppliers/payments", authenticateToken, async (req, res) => {
  const { supplier_id, payment_date, payment_amount, payment_type, note } = req.body;
  try {
    await dbQuery(`
      INSERT INTO supplier_payments (supplier_id, payment_date, payment_amount, payment_type, note)
      VALUES ($1, $2, $3, $4, $5)
    `, [supplier_id, payment_date, parseFloat(payment_amount), payment_type, note]);
    res.status(201).json({ message: "Payment recorded" });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

app.get("/api/reports/supplier", authenticateToken, async (req, res) => {
  const { supplier_id, start_date, end_date } = req.query;
  let query = `
    SELECT s.*, 
      (SELECT COALESCE(SUM(purchase_amount), 0) FROM supplier_purchases WHERE supplier_id = s.id) as total_purchase,
      (SELECT COALESCE(SUM(payment_amount), 0) FROM supplier_payments WHERE supplier_id = s.id) as total_paid
    FROM suppliers s
  `;
  const params: any[] = [];
  if (supplier_id) {
    query += " WHERE s.id = $1";
    params.push(supplier_id);
  }
  
  try {
    const suppliersRes = await dbQuery(query, params);
    const suppliers = suppliersRes.rows;
    
    const reportData = [];
    for (const sup of suppliers) {
      let purchaseQuery = "SELECT sp.*, i.model, i.serial_number FROM supplier_purchases sp JOIN inventory i ON sp.inventory_id = i.id WHERE sp.supplier_id = $1";
      let paymentQuery = "SELECT * FROM supplier_payments WHERE supplier_id = $1";
      const pParams = [sup.id];
      const payParams = [sup.id];

      if (start_date) {
        purchaseQuery += ` AND sp.purchase_date >= $${pParams.length + 1}`;
        paymentQuery += ` AND payment_date >= $${payParams.length + 1}`;
        pParams.push(start_date);
        payParams.push(start_date);
      }
      if (end_date) {
        purchaseQuery += ` AND sp.purchase_date <= $${pParams.length + 1}`;
        paymentQuery += ` AND payment_date <= $${payParams.length + 1}`;
        pParams.push(end_date);
        payParams.push(end_date);
      }

      const purchasesRes = await dbQuery(purchaseQuery, pParams);
      const paymentsRes = await dbQuery(paymentQuery, payParams);

      reportData.push({
        ...sup,
        purchases: purchasesRes.rows,
        payments: paymentsRes.rows
      });
    }

    res.json(reportData);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

app.post("/api/emi/payment/:id", authenticateToken, async (req, res) => {
  const { amount } = req.body;
  try {
    const emiRes = await dbQuery("SELECT * FROM emi WHERE id = $1", [req.params.id]);
    const emi = emiRes.rows[0];
    if (!emi) return res.status(404).json({ message: "EMI record not found" });

    const newPaid = parseFloat(emi.paid_amount) + parseFloat(amount);
    const newStatus = newPaid >= parseFloat(emi.remaining_amount) ? 'Paid' : 'Pending';
    const nextDue = new Date(emi.next_due_date);
    nextDue.setMonth(nextDue.getMonth() + 1);

    await dbQuery("UPDATE emi SET paid_amount = $1, status = $2, next_due_date = $3 WHERE id = $4", [newPaid, newStatus, nextDue.toISOString().slice(0, 10), req.params.id]);

    res.json({ message: "Payment recorded" });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// Public Invoice Route
app.get("/api/public/invoice/:invoiceNumber", async (req, res) => {
  const { invoiceNumber } = req.params;
  const { token } = req.query;

  if (!token) return res.status(400).json({ message: "Token required" });

  try {
    const saleRes = await dbQuery(`
      SELECT s.*, i.model, i.config, i.serial_number 
      FROM sales s 
      JOIN inventory i ON s.inventory_id = i.id 
      WHERE s.invoice_number = $1 AND s.invoice_public_token = $2
    `, [invoiceNumber, token]);
    const sale = saleRes.rows[0];

    if (!sale) return res.status(404).json({ message: "Invoice not found or invalid token" });

    const installmentsRes = await dbQuery("SELECT * FROM installments WHERE sale_id = $1 ORDER BY installment_number ASC", [sale.id]);
    
    res.json({ sale, installments: installmentsRes.rows });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// Vite Middleware for SPA
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  // Initialize database before starting server
  await initDb();

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

// Only start the standalone HTTP server when not in a serverless function environment (e.g. Vercel)
if (!process.env.VERCEL) {
  startServer();
}

export default app;
export { initDb, app };
