const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 5000;

// serve public folder
app.use(express.static(path.join(__dirname, "public")));

// default route
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ONLY serve html files, ignore API + assets
app.get("/:page", (req, res, next) => {
  const page = req.params.page;

  // إذا الصفحة ما فيها .html → نزوده
  const filePath = path.join(__dirname, "public", `${page}.html`);

  // إذا الملف موجود → نبعتو، إذا مش موجود → كمل طبيعي
  if (require("fs").existsSync(filePath)) {
    return res.sendFile(filePath);
  }

  // إذا مو HTML → روح للـ static أو routes الأخرى
  next();
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
