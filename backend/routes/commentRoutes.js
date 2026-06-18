import express from "express";
import { addComment, getTaskComment } from "../controllers/commentController.js";

const commentRouter = express.Router();

projectRouter.post('/', addComment);
projectRouter.get('/:taskId', getTaskComment);

export default commentRouter;