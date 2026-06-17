import express from "express";
import { addMember, getUserWorkspaces } from "../controllers/workspaceController.js";

const workspaceRoute = express.Router();

workspaceRoute.get('/', getUserWorkspaces);
workspaceRoute.post('/add-member', addMember);

export default workspaceRoute;