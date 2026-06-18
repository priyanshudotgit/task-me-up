import express from "express";
import { createTask, updateTask, deleteTask } from "../controllers/taskController.js";

const taskRouter = express.Router();

projectRouter.post('/', createTask);
projectRouter.put('/:id', updateTask);
projectRouter.post('/delete', deleteTask);

export default taskRouter;