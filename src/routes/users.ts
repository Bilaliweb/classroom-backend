import { and, desc, eq, getTableColumns, ilike, or, sql } from 'drizzle-orm';
import express from 'express';
import { departments, user } from '../db/schema/index.js';
import { db } from '../db/index.js';

const router = express.Router();

/**
 * GET /api/user
 *
 * Retrieves a paginated list of users with optional search, role filter, and pagination.
 *
 * **Query Parameters:**
 * - `search` (string): Search term for user name or email. Example: `?search=john`
 * - `role` (string): Filter by role (student, teacher, admin). Example: `?role=teacher`
 * - `page` (number): Results page, defaults to 1. Example: `?page=2`
 * - `limit` (number): Page size, defaults to 10, max 100. Example: `?limit=5`
 *
 * **Example Request:**
 * ```
 * GET /api/users?search=teacher&page=1&limit=10
 * ```
 *
 * **Example Response:**
 * ```json
 * {
 *   "data": [
 *     {
 *       "id": 1,
 *       "name": "John Doe",
 *       "email": "john@example.com",
 *       "role": "teacher",
 *       "createdAt": "2024-01-15T10:30:00Z",
 *       "updatedAt": "2024-01-15T10:30:00Z",
 *       "imageCldPubId": "img_pub_123"
 *     }
 *   ],
 *   "pagination": {
 *     "page": 1,
 *     "limit": 10,
 *     "total": 4,
 *     "totalPages": 1
 *   }
 * }
 * ```
 */

router.get('/', async (req, res) => {
    try {
        const { search, role, page, limit } = req.query;

        const parsePositiveInt = (value: unknown, fallback: number) => {
            const rawValue = Array.isArray(value) ? value[0] : value;
            const parsed = Number.parseInt(String(rawValue), 10);
            return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
        };

        const currentPage = parsePositiveInt(page, 1);
        const limitPerPage = Math.min(parsePositiveInt(limit, 10), 100);
        const offset = (currentPage - 1) * limitPerPage;

        const filterConditions = [];

        // Add search filter for user name or email
        if (search) {
            filterConditions.push(
                or(
                    ilike(user.name, `%${search}%`),
                    ilike(user.email, `%${search}%`)
                )
            );
        }

        // Add role filter (exact match)
        if (role) {
            filterConditions.push(eq(user.role, role as UserRoles));
        }

        // Join filter conditions (if any)
        const whereClause = filterConditions.length > 0 ? and(...filterConditions) : undefined;

        // Get total count for pagination
        const countResult = await db
            .select({ count: sql<number>`count(*)` })
            .from(user)
            .where(whereClause);

        const totalCount = countResult[0]?.count ?? 0;

        // Get user list
        const usersList = await db.select({
            ...getTableColumns(user),
        })
            .from(user)
            .where(whereClause)
            .orderBy(desc(user.createdAt))
            .limit(limitPerPage)
            .offset(offset);

        return res.status(200).json({
            data: usersList,
            pagination: {
                page: currentPage,
                limit: limitPerPage,
                total: totalCount,
                totalPages: Math.ceil(totalCount / limitPerPage)
            }
        });

    } catch (error) {
        console.error('GET /user error: ', error);
        res.status(500).json({ error: "Failed to get user" });
    }
});

export default router;
