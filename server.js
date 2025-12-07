const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const { Pool } = require("pg");

const app = express();
app.use(cors());
app.use(bodyParser.json());

// إعداد الاتصال بقاعدة البيانات
const pool = new Pool({
  user: "postgres",          // اسم المستخدم في pgAdmin
  host: "localhost",
  database: "university_db",   // غيّرها لاسم قاعدة البيانات
  password: "123456",   // غيّرها حسب إعدادك
  port: 5432,
});



// ✅ جلب تقدم الخطة الدراسية للطالب/*

app.get("/progress/:student_id", async (req, res) => {
  const { student_id } = req.params;

  try {
    const result = await pool.query(`
      SELECT 
        COUNT(CASE 
          WHEN pc.elective_group IN (
            'متطلبات الجامعة الاجبارية',
            'اختياري جامعة - العلوم الانسانية',
            'اختياري جامعة - العلوم الاجتماعية والاقتصاد',
            'اختياري جامعة - العلوم والتكنولوجيا والصحة'
          ) AND sc.status = 'completed' THEN 1 END
        ) AS university_completed,
        COUNT(CASE WHEN pc.elective_group = 'اجباري كلية' AND sc.status = 'completed' THEN 1 END) AS college_completed,
        COUNT(CASE WHEN pc.elective_group = 'اجباري قسم' AND sc.status = 'completed' THEN 1 END) AS major_completed,
        COUNT(CASE WHEN pc.elective_group = 'اختياري قسم' AND sc.status = 'completed' THEN 1 END) AS elective_completed,
        s.completed_credits
      FROM student_courses sc
      JOIN program_courses pc ON sc.course_code = pc.course_code
      JOIN students s ON s.student_id = sc.student_id
      WHERE s.student_id = $1
      AND pc.program_id = s.program_id
      GROUP BY s.completed_credits;
    `, [student_id]);

    if (result.rows.length > 0) {
        console.log("✅ بيانات الطالب:", result.rows[0]);
      res.json({ success: true, progress: result.rows[0] });
    } else {
      res.json({ success: false, message: "لا توجد بيانات للطالب" });
    }
  } catch (err) {
    console.error("❌ Database error:", err);
    res.status(500).json({ success: false, message: "خطأ في الخادم" });
  }
});



// ✅ تسجيل الدخول + جلب اسم التخصص
app.post("/login", async (req, res) => {
  const { student_id, password } = req.body;  
  try {
    const result = await pool.query(`
      SELECT 
        s.student_id, 
        s.first_name, 
        s.last_name, 
        s.completed_credits, 
        s.level, 
        s.status, 
        p.name AS program_name
      FROM students s
      JOIN programs p ON s.program_id = p.program_id
      WHERE s.student_id = $1 AND s.password = $2
    `, [student_id, password]);

    if (result.rows.length > 0) {
        console.log("✅ بيانات الطالب:", result.rows[0]);
      res.json({ success: true, student: result.rows[0] });
    } else {
      res.json({ success: false, message: "الرقم الجامعي أو كلمة المرور خاطئة" });
    }
  } catch (err) {
    console.error("❌ Database error:", err);
    res.status(500).json({ success: false, message: "حدث خطأ بالخادم" });
  }

  
});



// فحص الاتصال
pool.connect()
  .then(() => console.log("✅ Connected to PostgreSQL"))
  .catch(err => console.error("❌ Connection error", err.stack));

// مسار تجريبي للتأكد إن السيرفر شغال
app.get("/", (req, res) => {
  res.send("Server is running ✅");
});

// تشغيل السيرفر
const PORT = 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));






// ✅ إضافة تصويت جديد
app.post("/addVote", async (req, res) => {
  const { name, description, teacher, hours, time, room, prerequisite, student_id, namesubject, numbersub} = req.body;

  try {
    await pool.query(
      `INSERT INTO votes (name, description, teacher, hours, time, room, prerequisite, student_id, namesubject, numbersub)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [name, description, teacher, hours, time, room, prerequisite, student_id, namesubject, numbersub]
    );

    res.json({ success: true, message: "✅ تم حفظ التصويت في قاعدة البيانات!" });
  } catch (err) {
    console.error("❌ خطأ أثناء حفظ التصويت:", err);
    res.status(500).json({ success: false, message: "حدث خطأ أثناء الحفظ في قاعدة البيانات." });
  }
});


// 🗑️ حذف تصويت بناءً على الـ id
app.delete("/deleteVote/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query("DELETE FROM votes WHERE id = $1", [id]);
    res.json({ success: true, message: "🚮 تم حذف التصويت بنجاح" });
  } catch (err) {
    console.error("❌ خطأ أثناء حذف التصويت:", err);
    res.status(500).json({ success: false, message: "حدث خطأ أثناء الحذف" });
  }
});


// ✅ جلب جميع التصويتات
app.get("/getVotes", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM votes ORDER BY created_at DESC");
    res.json({ success: true, votes: result.rows });
  } catch (err) {
    console.error("❌ خطأ أثناء جلب التصويتات:", err);
    res.status(500).json({ success: false });
  }
});



// ✅ تعديل تصويت محدد
app.put("/updateVote/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, teacher, hours, room, prerequisite, time } = req.body;

    console.log("📩 القيم المستلمة من الواجهة:");
    console.log("id:", id);
    console.log({ name, description, teacher, hours, room, prerequisite, time });

    // تعديل البيانات في قاعدة البيانات
    const result = await pool.query(
      `UPDATE votes 
       SET name = $1, description = $2, teacher = $3, hours = $4, room = $5, prerequisite = $6, time = $7
       WHERE id = $8
       RETURNING *`,
      [name, description, teacher, hours, room, prerequisite, time, id]
    );

    if (result.rowCount === 0) {
      return res.json({ success: false, message: "❌ لم يتم العثور على التصويت" });
    }

    res.json({ success: true, vote: result.rows[0] });
  } catch (err) {
    console.error("❌ خطأ أثناء تعديل التصويت:", err);
    res.status(500).json({ success: false, message: "حدث خطأ في السيرفر" });
  }
});



// ✅ تبديل حالة الإخفاء (hidden)
app.put("/toggleHide/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // نحصل على الحالة الحالية أولاً
    const current = await pool.query("SELECT hidden FROM votes WHERE id = $1", [id]);

    if (current.rowCount === 0)
      return res.json({ success: false, message: "❌ التصويت غير موجود" });

    const newHidden = !current.rows[0].hidden;

    // نحدث الحالة الجديدة
    await pool.query("UPDATE votes SET hidden = $1 WHERE id = $2", [newHidden, id]);

    res.json({
      success: true,
      message: newHidden ? "🙈 تم إخفاء التصويت بنجاح" : "👁️ تم إظهار التصويت بنجاح",
    });
  } catch (err) {
    console.error("❌ خطأ أثناء تبديل حالة الإخفاء:", err);
    res.status(500).json({ success: false, message: "حدث خطأ في السيرفر" });
  }
});


// ======================== تصويت الطالب ========================
// ======================== تصويت الطالب ========================
app.post('/vote', async (req, res) => {
  const { student_id, course_code, namesubject, student_last_name, student_first_name } = req.body;

  try {
    // 1) افحص إذا الطالب مخلص المادة
    const completed = await pool.query(`
      SELECT 1 FROM student_courses
      WHERE student_id = $1
      AND course_code = $2
      AND status = 'completed'
    `, [student_id, course_code]);

    if (completed.rowCount > 0) {
      return res.json({ allowed: false, reason: "المادة منجزة سابقًا" });
    }

    // 2) المتطلبات السابقة
    const prereq = await pool.query(`
      SELECT prereq_codes 
      FROM program_courses 
      WHERE course_code = $1
    `, [course_code]);

    // *** المشكلة كانت هون ***
    if (prereq.rowCount === 0) {
      return res.json({
        allowed: false,
        reason: "المادة غير موجودة في الخطة الدراسية"
      });
    }

    let prereqs = prereq.rows[0].prereq_codes;

    if (prereqs && prereqs.trim() !== "") {
      const prereqList = prereqs.split(',').map(x => x.trim());
      const missing = [];

      for (let p of prereqList) {
        const done = await pool.query(`
          SELECT 1 FROM student_courses
          WHERE student_id = $1
          AND course_code = $2
          AND status = 'completed'
        `, [student_id, p]);

        if (done.rowCount === 0) missing.push(p);
      }

      if (missing.length > 0) {
        return res.json({ allowed: false, reason: "هناك متطلبات غير منجزة", missing });
      }
    }

    // 3) تخزين الاسم كامل
    const namestudentt = `${student_first_name} ${student_last_name}`;

    await pool.query(`
      INSERT INTO student_votes (student_id, course_code, namesubject, namestudent)
      VALUES ($1, $2, $3, $4)
    `, [student_id, course_code, namesubject, namestudentt]);

    return res.json({ allowed: true, message: "تم تسجيل التصويت" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server error" });
  }
});


app.get('/votes', async (req, res) => {
    const result = await pool.query('SELECT * FROM student_votes ORDER BY voted_at DESC');
    res.json(result.rows);
});


// ======================== حذف تصويت ========================
app.delete('/delvote/:id', async (req, res) => {
  const voteId = req.params.id;

  try {
    const del = await pool.query(`
      DELETE FROM student_votes
      WHERE id = $1
    `, [voteId]);

    if (del.rowCount === 0) {
      return res.json({ success: false, message: "لم يتم العثور على التصويت" });
    }

    res.json({ success: true, message: "تم حذف التصويت بنجاح" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server error" });
  }
});



