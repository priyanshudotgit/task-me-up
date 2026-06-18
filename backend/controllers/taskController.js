import { prisma } from "../db.js";
import { inngest } from "../inngest/index.js";

// Create task
export const createTask = async(req, res) => {
    try {
        const {userId} = await req.auth();
        const {projectId, title, description, type, status, priority, assigneeId, due_date} = req.body;
        const origin = req.get('origin');

        // check admin role
        const project = await prisma.project.findUnique({
            where: {id: projectId},
            include: {members: {include: {user: true}}}
        })

        if(!project){
            return res.status(404).json({message: "Project not found!"});
        }
        else if(project.team_lead !== userId){
            return res.status(403).json({message: "Only admin authorized!"});
        }
        else if(assigneeId && !project.members.find((member) => member.user.id == assigneeId)){
            return res.status(403).json({message: "Assignee is not the member of the project/organization!"});
        }

        const task = await prisma.task.create({
            data: {
                projectId,
                title,
                description,
                type,
                priority, 
                assigneeId,
                status, 
                due_date: new Date(due_date)
            }
        })

        const taskWithAssignee = await prisma.task.findUnique({
            where: {id: task.id},
            include: {assignee: true}
        })

        await inngest.send({
            name: "app/task.assigned",
            data: {
                taskId: task.id,
                origin
            }
        })
        
        res.json({task: taskWithAssignee, message: "Task Created Successfully!"});

    } catch (error) {
        console.log(error);
        res.status(500).json({message: error.code || error.message});
    }
}

// Update task
export const updateTask = async(req, res) => {
    try {
        const task = await prisma.task.findUnique({
            where: {id: req.params.id}
        })

        if(!task){
            return res.status(404).json({message: "Task not found!"});
        }

        const {userId} = await req.auth();

        // check project
        const project = await prisma.project.findUnique({
            where: {id: task.projectId},
            include: {members: {include: {user: true}}}
        })

        if(!project){
            return res.status(404).json({message: "Project not found!"});
        }
        else if(project.team_lead !== userId){
            return res.status(403).json({message: "Only admin authorized!"});
        }

        const updatedTask = await prisma.task.update({
            where: {id: req.params.id},
            data: req.body
        })

        res.json({task: updateTask, message: "Task Updated Successfully!"});
        
    } catch (error) {
        console.log(error);
        res.status(500).json({message: error.code || error.message});
    }
}

// Delete task
export const deleteTask = async(req, res) => {
    try {
        const {userId} = await req.auth();
        const {taskIds} = req.body;

        const task = await prisma.task.findMany({
            where: {id: {in: taskIds}}
        })

        const project = await prisma.project.findUnique({
            where: {id: task[0].projectId},
            include: {members: {include: {user: true}}}
        })

        // check task
        if(task.length === 0){
            return res.status(404).json({message: "Task not found!"});
        }
        else if(project.team_lead !== userId){
            return res.status(403).json({message: "Only admin authorized!"});
        }

        if(!project){
            return res.status(404).json({message: "Project not found!"});
        }
        else if(project.team_lead !== userId){
            return res.status(403).json({message: "Only admin authorized!"});
        }

        await prisma.task.deleteMany({
            where: {id: {in: taskIds}}
        })

        res.json({message: "Task Deleted Successfully!"});
        
    } catch (error) {
        console.log(error);
        res.status(500).json({message: error.code || error.message});
    }
}