import express from "express";
import { db } from "../db/index.js";
import { classes, departments, subjects, user } from "../db/schema/index.js";
import { and, desc, eq, getTableColumns, ilike, or, sql } from "drizzle-orm";

const router = express.Router();

// Create a class
router.post("/", async (req, res) => {
  try {
    const [createdClass] = await db
      .insert(classes)
      .values({
        ...req.body,
        inviteCode: Math.random().toString(36).substring(2, 9),
        schedules: [],
      })
      .returning({ id: classes.id });

    if (!createdClass) {
      throw new Error("Failed to create class");
    }

    res.status(201).json({ data: createdClass });
  } catch (error) {
    console.error("POST /classes error: ", error);
    res.status(500).json({ error: "Failed to create class" });
  }
});

// Get classes
router.get("/", async (req, res) => {
  try {
    const { search, subject, teacher, page, limit } = req.query;

    /**
     * Helper to ensure positive integer parsing from query.
     *
     * @example
     * parsePositiveInt("5", 1) // 5
     * parsePositiveInt(undefined, 1) // 1
     * parsePositiveInt("-1", 10) // 10
     * parsePositiveInt("abc", 2) // 2
     * parsePositiveInt(null, 42) // 42
     * parsePositiveInt(["7"], 3) // 7
     */

    const parsePositiveInt = (value: unknown, fallback: number) => {
      const rawValue = Array.isArray(value) ? value[0] : value;
      const parsed = Number.parseInt(String(rawValue), 10);
      return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
    };

    const currentPage = parsePositiveInt(page, 1);
    const limitPerPage = Math.min(parsePositiveInt(limit, 10), 100);
    const offset = (currentPage - 1) * limitPerPage;

    const filterConditions = [];

    // Add search filter for subject name or code
    if (search) {
      filterConditions.push(
        or(
          ilike(classes.name, `%${search}%`),
          ilike(classes.description, `%${search}%`),
        ),
      );
    }

    // Add search filter for department name
    if (subject) {
      filterConditions.push(ilike(subjects.name, `%${subject}%`));
    }
    if (teacher) {
      filterConditions.push(ilike(user.name, `%${teacher}%`));
    }

    // Join filter conditions (if any)
    const whereClause =
      filterConditions.length > 0 ? and(...filterConditions) : undefined;

    // Get total count for pagination
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(classes)
      .leftJoin(subjects, eq(classes.subjectId, subjects.id))
      .leftJoin(user, eq(classes.teacherId, user.id))
      .where(whereClause);

    console.log("Classes count: ", countResult);

    const totalCount = countResult[0]?.count ?? 0;

    // Get subjects list with joined department
    const classesList = await db
      .select({
        ...getTableColumns(classes),
        subjects: {
          ...getTableColumns(subjects),
        },
        user: {
          ...getTableColumns(user),
        },
      })
      .from(classes)
      .leftJoin(subjects, eq(classes.subjectId, subjects.id))
      .leftJoin(user, eq(classes.teacherId, user.id))
      .where(whereClause)
      .orderBy(desc(classes.createdAt))
      .limit(limitPerPage)
      .offset(offset);

    /**
     * Short Example:
     * ```
     * GET /api/subjects?search=bio&page=1
     * // => { data: [...], pagination: {...} }
     * ```
     */
    return res.status(200).json({
      data: classesList,
      pagination: {
        page: currentPage,
        limit: limitPerPage,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limitPerPage),
      },
    });
  } catch (error) {
    console.error("GET /classes error: ", error);
    res.status(500).json({ error: "Failed to get classes" });
  }
});

// Get class details including student, teacher and department
router.get('/:id', async (req, res) => {
    const classId = Number(req.params.id)

    if(!Number.isFinite(classId)) {
        return res.status(400).json({error: 'No Class Found'})
    }

    const [classDetails] = await db
    .select({
        ...getTableColumns(classes),
        subject: {
            ...getTableColumns(subjects)
        },
        teacher: {
            ...getTableColumns(user)
        },
        department: {
            ...getTableColumns(departments)
        }
    })
    .from(classes)
    .leftJoin(subjects, eq(classes.subjectId, subjects.id))
    .leftJoin(user, eq(classes.teacherId, user.id))
    .leftJoin(departments, eq(subjects.departmentId, departments.id))
    .where(eq(classes.id, classId))

    if (!classDetails) {
        return res.status(400).json({error: 'No Class Data Found.'})
    }

    return res.status(200).json({data: classDetails})
})

export default router;
