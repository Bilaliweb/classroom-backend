/**
 * Subjects API Routes
 * 
 * This file contains the Express router for handling `/api/subjects` endpoints.
 * Get a list of subjects with optional search, department filter, and pagination.
 * 
 * ---
 * 
 * ## Usage
 * 
 * Register the router in your Express app:
 * 
 * ```ts
 * import subjectsRoute from "./routes/subjects";
 * app.use("/api/subjects", subjectsRoute);
 * ```
 * 
 * ## Endpoints
 * 
 * ### GET `/api/subjects`
 * 
 * Returns a paginated list of subjects, optionally filtered by search query and department.
 * 
 * **Query Parameters:**
 * - `search` (string): Search term for subject name or code. Example: `?search=math`
 * - `department` (string): Filter by department name. Example: `?department=science`
 * - `page` (number): Results page, defaults to 1. Example: `?page=2`
 * - `limit` (number): Page size, defaults to 10, max 100. Example: `?limit=5`
 * 
 * **Example Request:**
 * ```
 * GET /api/subjects?search=calculus&department=math&page=1&limit=2
 * ```
 * 
 * **Example Response:**
 * ```json
 * {
 *   "data": [
 *     {
 *       "id": 1,
 *       "departmentId": 3,
 *       "name": "Calculus I",
 *       "code": "MATH101",
 *       "description": "Intro to Calculus",
 *       "createdAt": "...",
 *       "updatedAt": "...",
 *       "departments": {
 *         "id": 3,
 *         "code": "MATH",
 *         "name": "Mathematics",
 *         "description": "Department of Mathematics",
 *         "createdAt": "...",
 *         "updatedAt": "..."
 *       }
 *     }
 *   ],
 *   "pagination": {
 *     "page": 1,
 *     "limit": 2,
 *     "total": 4,
 *     "totalPages": 2
 *   }
 * }
 * ```
 */

import { and, desc, eq, getTableColumns, ilike, or, sql } from 'drizzle-orm';
import express from 'express'
import { departments, subjects } from '../db/schema/index.js';
import { db } from '../db/index.js';

const router = express.Router();

/**
 * GET /api/subjects
 * 
 * Retrieves a paginated list of subjects, with optional search and department filters.
 */
router.get('/', async (req, res) => {
    try {
        const { search, department, page, limit } = req.query;

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
            const rawValue = Array.isArray(value) ? value[0] : value
            const parsed = Number.parseInt(String(rawValue), 10)
            return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
        }

        const currentPage = parsePositiveInt(page, 1);
        const limitPerPage = Math.min(parsePositiveInt(limit, 10), 100);
        const offset = (currentPage - 1) * limitPerPage;

        const filterConditions = [];

        // Add search filter for subject name or code
        if (search) {
            filterConditions.push(
                or(
                    ilike(subjects.name, `%${search}%`),
                    ilike(subjects.code, `%${search}%`)
                )
            );
        }

        // Add search filter for department name
        if (department) {
            filterConditions.push(ilike(departments.name, `%${department}%`));
        }

        // Join filter conditions (if any)
        const whereClause = filterConditions.length > 0 ? and(...filterConditions) : undefined;

        // Get total count for pagination
        const countResult = await db
            .select({ count: sql<number>`count(*)` })
            .from(subjects)
            .leftJoin(departments, eq(subjects.departmentId, departments.id))
            .where(whereClause);

        const totalCount = countResult[0]?.count ?? 0;

        // Get subjects list with joined department
        const subjectsList = await db.select({
            ...getTableColumns(subjects),
            departments: {
                ...getTableColumns(departments)
            }
        })
            .from(subjects)
            .leftJoin(departments, eq(subjects.departmentId, departments.id))
            .where(whereClause)
            .orderBy(desc(subjects.createdAt))
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
            data: subjectsList,
            pagination: {
                page: currentPage,
                limit: limitPerPage,
                total: totalCount,
                totalPages: Math.ceil(totalCount / limitPerPage)
            }
        });

    } catch (error) {
        console.error('GET /subjects error: ', error);
        res.status(500).json({ error: "Failed to get subjects" });
    }
});

export default router;