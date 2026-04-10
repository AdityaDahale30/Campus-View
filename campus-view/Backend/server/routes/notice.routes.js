import express from "express";
import { addNotice, getNotices, deleteNotice } from "../routes/notice.model.js";

const router = express.Router();

/* ================= ADD NOTICE ================= */
router.post("/notices", addNotice);

/* ================= GET NOTICES ================= */
router.get("/notices", getNotices);

/* ================= DELETE NOTICE ================= */
router.delete("/notices/:id", deleteNotice);

export default router;