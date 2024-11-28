const express = require("express");
const nodemailer = require("nodemailer");
const dotenv = require("dotenv");
const multer = require("multer");
const fs = require("fs");

dotenv.config();

const app = express();
const PORT = 3000;

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.set("view engine", "ejs");

// Multer setup for file uploads
const upload = multer({ dest: "uploads/" });

// Route: Render form
app.get("/", (req, res) => {
  const showEmailSettings = true; // Change to false to hide email settings section
  res.render("index", { showEmailSettings });
});

// Route: Handle form submission and file upload
app.post("/send-email", upload.fields([{ name: "emailFile" }, { name: "bodyFile" }]), async (req, res) => {
  const { smtpHost, smtpPort, smtpUser, smtpPass, fromEmail, subject } = req.body;
  let recipientList = [];
  let emailBody = "";

  // Process recipient file
  if (req.files["emailFile"]) {
    const filePath = req.files["emailFile"][0].path;
    try {
      const fileContent = fs.readFileSync(filePath, "utf-8");
      recipientList = fileContent.split("\n").map((email) => email.trim()).filter(Boolean);
      fs.unlinkSync(filePath); // Remove file after reading
    } catch (err) {
      console.error("Error reading recipient file:", err.message);
      return res.render("success", { message: `Error reading recipient file: ${err.message}` });
    }
  } else {
    recipientList = req.body.recipients.split(",").map((email) => email.trim());
  }

  // Process body file
  if (req.files["bodyFile"]) {
    const filePath = req.files["bodyFile"][0].path;
    try {
      emailBody = fs.readFileSync(filePath, "utf-8");
      fs.unlinkSync(filePath); // Remove file after reading
    } catch (err) {
      console.error("Error reading body file:", err.message);
      return res.render("success", { message: `Error reading body file: ${err.message}` });
    }
  } else {
    emailBody = req.body.body; // Use the textarea body as fallback
  }

  // Create transporter
  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: parseInt(smtpPort),
    secure: true,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });

  try {
    // Send email to each recipient
    for (let recipient of recipientList) {
      if (recipient) {
        await transporter.sendMail({
          from: `${fromEmail} <${smtpUser}>`,
          to: recipient,
          subject: subject,
          html: emailBody, // Send the body as HTML
        });
      }
    }

    res.render("success", { message: "Bulk emails sent successfully!" });
  } catch (error) {
    console.error("Error sending emails:", error.message);
    res.render("success", { message: `Error sending emails: ${error.message}` });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
