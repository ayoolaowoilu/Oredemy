import {
    GetAdviserDashboard,
    ListAiRuns,
    ListSchedulerLogs,
    ReviewAiGroup,
    SendAiGroup,
} from "./adviser.services.js";
import { RunAdviserAiNow } from "./adviser-batch.scheduler.js";

export async function getDashboard(req, res) {
    return res.status(200).json(await GetAdviserDashboard(req.authUser.id));
}

export async function listAiRuns(req, res) {
    return res.status(200).json(await ListAiRuns(req.authUser.id));
}

export async function listSchedulerLogs(req, res) {
    return res.status(200).json(await ListSchedulerLogs(req.authUser.id));
}

export async function runAiNow(req, res) {
    const data = await RunAdviserAiNow(req.authUser.id);
    return res.status(data.data.status === "running" ? 202 : 200).json(data);
}

export async function reviewAiGroup(req, res) {
    return res.status(200).json(
        await ReviewAiGroup(req.authUser.id, req.params.runId, req.params.groupId, req.body)
    );
}

export async function sendAiGroup(req, res) {
    return res.status(200).json(
        await SendAiGroup(req.authUser.id, req.params.runId, req.params.groupId)
    );
}
