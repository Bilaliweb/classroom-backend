import { relations } from "drizzle-orm";
import { integer, pgTable, timestamp, varchar } from "drizzle-orm/pg-core";

// Timestamps reusable object
const timestamps = {
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
};

// Departments table
export const departments = pgTable("departments", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  description: varchar("description", { length: 255 }).notNull(),
  ...timestamps,
});

// Subjects table
export const subjects = pgTable("subjects", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  departmentId: integer("department_id")
    .notNull()
    .references(() => departments.id, { onDelete: "restrict" }),
  name: varchar("name", { length: 255 }).notNull(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  description: varchar("description", { length: 255 }).notNull(),
  ...timestamps,
});

/**
 * Relations: 
 * - Departments relation
 * - Subjects relation
 */
export const departmentsRelation = relations(departments, ({ many }) => ({
  subjects: many(subjects),
}));

export const subjectsRelation = relations(subjects, ({one, many}) => ({
    department: one(departments, {
        fields: [subjects.departmentId],
        references: [departments.id]
    }) 
}))

/**
 * Types for schemas of following tables:
 * - Departments
 * - Subjects
 */
export const Department = typeof departments.$inferSelect;
export const NewDepartment = typeof departments.$inferInsert;

export const Subject = typeof subjects.$inferSelect;
export const NewSubject = typeof subjects.$inferInsert;