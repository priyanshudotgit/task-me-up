// Get all workspaces for user
import { prisma } from "../db.js";

export const getUserWorkspaces = async (req, res) => {
    try {
        const {userId} = await req.auth();
        const workspaces = await prisma.workspace.findMany({
            where: {
                members: {some: {userId: userId}}
            },
            include: {
                members: {include: {user: true}},
                projects: {
                    include: {
                        tasks: {include: {assignee: true, comments: {include: {user: true}}}},
                        members: {include: {user:true}}
                    }
                },
                owner: true
            }
        });

        res.json({workspaces});
    } catch (error) {
        console.log(error);
        res.status(500).json({message: error.code || error.message});
    }
}

// Add member to workspace
export const addMember = async (req, res) => {
    try {
        const {userId} = await req.auth();
        const {email, role, workspaceId, message} = req.body;

        // check if user exist
        const user = await prisma.user.findUnique({where: {email}});
        if(!user){
            return res.status(404).json({message: "User not found!"});
        }

        if(!workspaceId || !role){
            return res.status(400).json({message: "Missing workspace or role parameters!"});
        }

        if(!["ADMIN", "MEMBER"].includes(role)){
            return res.status(400).json({message: "Invalid member role!"});
        }

        // fetch workspace
        const workspace = await prisma.workspace.findUnique({
            where: {
                id: workspaceId
            },
            include: {
                members: true,
            }
        });

        if(!workspace){
            return res.status(404).json({message: "Workspace not found!"});
        }

        // check creator is admin or not
        if(!workspace.members.find((member)=>member.userId === userId && member.role === "ADMIN")){
            return res.status(401).json({message: "Only admin authorized!"});
        }

        // check if user already is a member
        const existingMember = workspace.members.find((member)=>member.userId === userId)
        if(existingMember){
            return res.status(400).json({message: "User already a member!"});
        }

        const member = await prisma.workspaceMember.create({
            data: {
                userId: user.id,
                workspaceId,
                role, 
                message
            }
        });

        return res.json({member, message: "User added as a member!"});

    } catch (error) {
        console.log(error);
        res.status(500).json({message: error.code || error.message});
    }
}