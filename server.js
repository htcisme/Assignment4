const express = require("express");
const fs = require("fs");
const path = require("path");
const bodyParser = require("body-parser");
const multer = require("multer");

const app = express();
const PORT = 3500;

// Cấu hình lưu trữ cho multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Đảm bảo thư mục Products tồn tại
    const uploadDir = path.join(__dirname, "Products");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Tạo tên file độc nhất với timestamp
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, "image-" + uniqueSuffix + ext);
  },
});

const upload = multer({ storage: storage });

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname)); // Serve current directory
app.use("/Products", express.static(path.join(__dirname, "Products")));

// API để tải dữ liệu sản phẩm
app.get("/api/products", (req, res) => {
  try {
    const data = fs.readFileSync(path.join(__dirname, "Products.txt"), "utf8");
    const lines = data
      .split("\n")
      .filter((line) => line.trim() && !line.startsWith("//"));

    const products = lines.map((line) => {
      const parts = line.split("|");
      let product = {
        id: parts[0],
        name: parts[1],
        price: parseInt(parts[2]),
        brand: parts[3],
        quantity: parseInt(parts[4]),
        description: parts[5],
        image: parts[6],
      };

      // Kiểm tra nếu quantity không phải là số (có thể là brand)
      if (isNaN(product.quantity)) {
        // Hoán đổi brand và quantity
        const temp = product.brand;
        product.brand = product.quantity;
        product.quantity = parseInt(temp);
      }

      return product;
    });

    res.json(products);
  } catch (error) {
    console.error("Lỗi khi đọc file:", error);
    res.status(500).json({ success: false, message: "Lỗi khi đọc dữ liệu." });
  }
});

// API lấy thông tin sản phẩm theo ID
app.get("/api/products/:id", (req, res) => {
  try {
    const productId = req.params.id;
    const data = fs.readFileSync(path.join(__dirname, "Products.txt"), "utf8");
    const lines = data
      .split("\n")
      .filter((line) => line.trim() && !line.startsWith("//"));

    for (const line of lines) {
      const parts = line.split("|");
      if (parts[0] === productId) {
        let product = {
          id: parts[0],
          name: parts[1],
          price: parseInt(parts[2]),
          brand: parts[3],
          quantity: parseInt(parts[4]),
          description: parts[5],
          image: parts[6],
        };

        // Kiểm tra nếu quantity không phải là số (có thể là brand)
        if (isNaN(product.quantity)) {
          // Hoán đổi brand và quantity
          const temp = product.brand;
          product.brand = product.quantity;
          product.quantity = parseInt(temp);
        }

        return res.json(product);
      }
    }

    res
      .status(404)
      .json({ success: false, message: "Không tìm thấy sản phẩm." });
  } catch (error) {
    console.error("Lỗi khi đọc file:", error);
    res.status(500).json({ success: false, message: "Lỗi khi đọc dữ liệu." });
  }
});

// API upload ảnh
app.post("/api/upload", upload.single("productImage"), (req, res) => {
  if (req.file) {
    const imagePath = "/Products/" + req.file.filename;
    res.json({
      success: true,
      imagePath: imagePath,
      message: "Upload ảnh thành công!",
    });
  } else {
    res
      .status(400)
      .json({ success: false, message: "Không có file được upload." });
  }
});

// API endpoint để lưu products
app.post("/api/saveProducts", (req, res) => {
  try {
    const products = req.body;

    // Format dữ liệu
    const fileContent = products
      .map(
        (p) =>
          `${p.id}|${p.name}|${p.price}|${p.brand}|${p.quantity}|${p.description}|${p.image}`
      )
      .join("\n");

    // Thêm header
    const fullContent = `// filepath: ${path.join(
      __dirname,
      "Products.txt"
    )}\n${fileContent}`;

    // Ghi vào file
    fs.writeFileSync(path.join(__dirname, "Products.txt"), fullContent);

    res.json({ success: true, message: "Lưu file thành công!" });
  } catch (error) {
    console.error("Lỗi khi lưu file:", error);
    res.status(500).json({ success: false, message: "Lỗi khi lưu file." });
  }
});

// API endpoint để lưu một sản phẩm
app.post("/api/products", (req, res) => {
  try {
    const newProduct = req.body;

    // Đọc dữ liệu hiện tại
    const data = fs.readFileSync(path.join(__dirname, "Products.txt"), "utf8");
    const lines = data
      .split("\n")
      .filter((line) => line.trim() && !line.startsWith("//"));

    const products = lines.map((line) => {
      const parts = line.split("|");
      let product = {
        id: parts[0],
        name: parts[1],
        price: parseInt(parts[2]),
        brand: parts[3],
        quantity: parseInt(parts[4]),
        description: parts[5],
        image: parts[6],
      };

      // Kiểm tra nếu quantity không phải là số (có thể là brand)
      if (isNaN(product.quantity)) {
        // Hoán đổi brand và quantity
        const temp = product.brand;
        product.brand = product.quantity;
        product.quantity = parseInt(temp);
      }

      return product;
    });

    // Tạo ID mới nếu là thêm mới
    if (!newProduct.id) {
      const maxId = Math.max(...products.map((p) => parseInt(p.id)), 0);
      newProduct.id = (maxId + 1).toString();
    } else {
      // Xóa sản phẩm cũ nếu là cập nhật
      const index = products.findIndex((p) => p.id === newProduct.id);
      if (index !== -1) {
        products.splice(index, 1);
      }
    }

    // Thêm sản phẩm mới/cập nhật vào danh sách
    products.push(newProduct);

    // Format dữ liệu
    const fileContent = products
      .map(
        (p) =>
          `${p.id}|${p.name}|${p.price}|${p.brand}|${p.quantity}|${p.description}|${p.image}`
      )
      .join("\n");

    // Thêm header
    const fullContent = `// filepath: ${path.join(
      __dirname,
      "Products.txt"
    )}\n${fileContent}`;

    // Ghi vào file
    fs.writeFileSync(path.join(__dirname, "Products.txt"), fullContent);

    res.json({
      success: true,
      product: newProduct,
      message: "Lưu sản phẩm thành công!",
    });
  } catch (error) {
    console.error("Lỗi khi lưu sản phẩm:", error);
    res.status(500).json({ success: false, message: "Lỗi khi lưu sản phẩm." });
  }
});

// API endpoint để xóa một sản phẩm
app.delete("/api/products/:id", (req, res) => {
  try {
    const productId = req.params.id;

    // Đọc dữ liệu hiện tại
    const data = fs.readFileSync(path.join(__dirname, "Products.txt"), "utf8");
    const lines = data
      .split("\n")
      .filter((line) => line.trim() && !line.startsWith("//"));

    const products = lines
      .map((line) => {
        const parts = line.split("|");
        let product = {
          id: parts[0],
          name: parts[1],
          price: parseInt(parts[2]),
          brand: parts[3],
          quantity: parseInt(parts[4]),
          description: parts[5],
          image: parts[6],
        };

        // Kiểm tra nếu quantity không phải là số (có thể là brand)
        if (isNaN(product.quantity)) {
          // Hoán đổi brand và quantity
          const temp = product.brand;
          product.brand = product.quantity;
          product.quantity = parseInt(temp);
        }

        return product;
      })
      .filter((p) => p.id !== productId);

    // Format dữ liệu
    const fileContent = products
      .map(
        (p) =>
          `${p.id}|${p.name}|${p.price}|${p.brand}|${p.quantity}|${p.description}|${p.image}`
      )
      .join("\n");

    // Thêm header
    const fullContent = `// filepath: ${path.join(
      __dirname,
      "Products.txt"
    )}\n${fileContent}`;

    // Ghi vào file
    fs.writeFileSync(path.join(__dirname, "Products.txt"), fullContent);

    res.json({
      success: true,
      message: "Xóa sản phẩm thành công!",
    });
  } catch (error) {
    console.error("Lỗi khi xóa sản phẩm:", error);
    res.status(500).json({ success: false, message: "Lỗi khi xóa sản phẩm." });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server đang chạy tại http://localhost:${PORT}`);
});
