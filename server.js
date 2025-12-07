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

// dynamic route for pages
app.get("/:page", (req, res) => {
  const page = req.params.page;
  const filePath = path.join(__dirname, "public", `${page}.html`);
  res.sendFile(filePath);
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
