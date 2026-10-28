import {
    GetAdviserDashboard,
    GetAiSettings,
    ListAiRuns,
    ReviewAiGroup,
    SaveAiSettings,
    SendAiGroup,
} from "./adviser.services.js";

export async function getDashboard(req, res) {
    return res.status(200).json(await GetAdviserDashboard(req.authUser.id));
}

export async function getAiSettings(req, res) {
    return res.status(200).json(await GetAiSettings(req.authUser.id));
}

export async function saveAiSettings(req, res) {
    return res.status(200).json(await SaveAiSettings(req.authUser.id, req.body));
}

export async function listAiRuns(req, res) {
    return res.status(200).json(await ListAiRuns(req.authUser.id));
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
