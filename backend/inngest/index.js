import { Inngest } from "inngest";
import { prisma } from "../db.js";
import sendEmail from "../nodemailer.js";

// Create a client to send and receive events
export const inngest = new Inngest({ id: "task-me-up" });

// Inngest Function to save user data to database
const syncUserCreation = inngest.createFunction(
    {
        id: 'sync-user-from-clerk',
        triggers: [{ event: 'clerk/user.created' }]
    },
    async ({ event })=> {
        const {data} = event
        await prisma.user.create({
            data: {
                id: data.id,
                email: data.email_addresses[0]?.email_address,
                name: data?.first_name + " " + data?.last_name,
                image: data?.image_url,
            }
        })
    }
)

// Inngest Function to delete user data to database
const syncUserDeletion = inngest.createFunction(
    {
        id: 'delete-user-from-clerk',
        triggers: [{ event: 'clerk/user.deleted' }]
    },
    async ({ event })=> {
        const {data} = event
        await prisma.user.delete({
            where: {
                id: data.id,
            }
        })
    }
)

// Inngest Function to update user data to database
const syncUserUpdation = inngest.createFunction(
    {
        id: 'update-user-from-clerk',
        triggers: [{ event: 'clerk/user.updated' }]
    },
    async ({ event })=> {
        const {data} = event
        await prisma.user.update({
            where: {
                id: data.id,
            },
            data: {
                email: data.email_addresses[0]?.email_address,
                name: data?.first_name + " " + data?.last_name,
                image: data?.image_url,
            }
        })
    }
)

// Inngest function to save workspace data to a database
const syncWorkspaceCreation = inngest.createFunction(
    {
        id: 'sync-workspace-from-clerk',
        triggers: [{event: 'clerk/organization.created'}]
    },
    async({ event }) => {
        const {data} = event;
        await prisma.workspace.create({
            data: {
                id: data.id,
                name:data.name,
                slug: data.slug,
                ownerId: data.created_by,
                image_url: data.image_url,
            },
        });

        // Add creator as admin
        await prisma.workspaceMember.create({
            data: {
                userId: data.created_by,
                workspaceId: data.id,
                role: "ADMIN",
            }
        });
    }
)

// Inngest function to update workspace data in database
const syncWorkspaceUpdation = inngest.createFunction(
    {
        id: 'update-workspace-from-clerk',
        triggers: [{event: 'clerk/organization.updated'}]
    },
    async({ event }) => {
        const {data} = event;
        await prisma.workspace.update({
            where: {
                id: data.id,
            },
            data: {
                name:data.name,
                slug: data.slug,
                image_url: data.image_url,
            }
        });
    }
)

// Inngest function to dekete workspace data in database
const syncWorkspaceDeletion = inngest.createFunction(
    {
        id: 'delete-workspace-from-clerk',
        triggers: [{event: 'clerk/organization.deleted'}]
    },
    async({ event }) => {
        const {data} = event;
        await prisma.workspace.delete({
            where: {
                id: data.id
            }
        })
    }
)

// Inngest function to save workspace member data in database
const syncWorkspaceMemberCreation = inngest.createFunction(
    {
        id: 'sync-workspace-member-from-clerk',
        triggers: [{event: 'clerk/organizationInvitation.accepted'}]
    },
    async({ event }) => {
        const {data} = event;
        await prisma.workspaceMember.create({
            data: {
                userId: data.user_id,
                workspaceId: data.organization_id,
                role: String(data.role_name).toUpperCase(),
            }
        })
    }
)

// Inngest function to send email on task creation
const sendTaskAssignmentEmail = inngest.createFunction(
    {
        id: "send-task-assignment-email",
        triggers: [{event: "app/task.assigned"}]
    },
    async({event, step}) => {
        const {taskId, origin} = event.data;
        const task = await prisma.task.findUnique({
            where: {id: taskId},
            include: {assignee: true, project: true}
        })

        await sendEmail({
            to: task.assignee.email,
            subject: `New Task Assigned in ${task.project.name}`,
            // body: `Hi ${task.assignee.name},` `${task.title}` `${new Date(task.due_date).toLocaleDateString()}` `<a href=${origin}>View Task</a>`
            body: `<div style="max-width:600px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;font-family:Arial,sans-serif;">
    
                <div style="background:#16a34a;padding:24px;text-align:center;">
                    <h1 style="margin:0;color:#ffffff;font-size:24px;">New Task Assigned</h1>
                </div>

                <div style="padding:32px;">
                    <p style="margin:0 0 16px;font-size:16px;color:#374151;">
                        Hi <strong>${task.assignee.name}</strong>,
                    </p>

                    <p style="margin:0 0 24px;font-size:15px;color:#6b7280;">
                        A new task has been assigned to you in <strong>${task.project.name}</strong>.
                    </p>

                    <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:20px;margin-bottom:24px;">
                        <p style="margin:0 0 12px;font-size:14px;color:#6b7280;">Task Title</p>

                        <h2 style="margin:0 0 20px;font-size:20px;color:#111827;">
                            ${task.title}
                        </h2>

                        <p style="margin:0;font-size:14px;color:#6b7280;">Due Date</p>

                        <p style="margin:8px 0 0;font-size:16px;font-weight:600;color:#dc2626;">
                            ${new Date(task.due_date).toLocaleDateString()}
                        </p>
                    </div>

                    <div style="text-align:center;">
                        <a href="${origin}"
                        style="display:inline-block;background:#16a34a;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;">
                            View Task
                        </a>
                    </div>
                </div>

                <div style="border-top:1px solid #e5e7eb;padding:20px;text-align:center;color:#9ca3af;font-size:13px;">
                    This is an automated notification from TaskMeUp.
                </div>

            </div>`
        })

        if(new Date(task.due_date).toLocaleDateString() !== new Date().toDateString()){
            await step.sleepUntil('wait-for-the-due-date', new Date(task.due_date));
            await step.run('check-if-task-completed', async() => {
                const task = await prisma.task.findUnique({
                    where: {id: taskId},
                    include: {assignee: true, project: true}
                })

                if(!task) return;

                if(task.status !== "DONE"){
                    await step.run('send-task-reminder-email', async() => {
                        await sendEmail({
                            to: task.assignee.email,
                            subject: `Reminder for ${task.project.name}`,
                            body: `<div style="max-width:600px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;font-family:Arial,sans-serif;">
    
                                <div style="background:#f59e0b;padding:24px;text-align:center;">
                                    <h1 style="margin:0;color:#ffffff;font-size:24px;">Task Reminder</h1>
                                </div>

                                <div style="padding:32px;">
                                    <p style="margin:0 0 16px;font-size:16px;color:#374151;">
                                        Hi <strong>${task.assignee.name}</strong>,
                                    </p>

                                    <p style="margin:0 0 24px;font-size:15px;color:#6b7280;">
                                        This is a reminder that the following task is still pending.
                                    </p>

                                    <div style="background:#fef3c7;border:1px solid #fcd34d;border-radius:8px;padding:20px;margin-bottom:24px;">
                                        <p style="margin:0 0 12px;font-size:14px;color:#6b7280;">Task Title</p>

                                        <h2 style="margin:0 0 20px;font-size:20px;color:#111827;">
                                            ${task.title}
                                        </h2>

                                        <p style="margin:0;font-size:14px;color:#6b7280;">Due Date</p>

                                        <p style="margin:8px 0 0;font-size:16px;font-weight:600;color:#dc2626;">
                                            ${new Date(task.due_date).toLocaleDateString()}
                                        </p>
                                    </div>

                                    <p style="font-size:14px;color:#6b7280;text-align:center;margin-bottom:24px;">
                                        Please update the task status once you've made progress.
                                    </p>

                                    <div style="text-align:center;">
                                        <a href="${origin}"
                                        style="display:inline-block;background:#f59e0b;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;">
                                            View Task
                                        </a>
                                    </div>
                                </div>

                                <div style="border-top:1px solid #e5e7eb;padding:20px;text-align:center;color:#9ca3af;font-size:13px;">
                                    This is an automated reminder from TaskMeUp.
                                </div>

                            </div>`
                        })
                    })
                }
            })
        }
    }
)

// Create an empty array where we'll export future Inngest functions
export const functions = [syncUserCreation, syncUserDeletion, syncUserUpdation, syncWorkspaceCreation, syncWorkspaceUpdation, syncWorkspaceDeletion, syncWorkspaceMemberCreation, sendTaskAssignmentEmail];