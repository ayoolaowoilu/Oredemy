import { DeleteQuery, GetMyDashboard, GetMyQueries, SubmitQuery } from "./queries.services.js";


export async function AddQuery(req, res) {
    const data = await SubmitQuery(req.body?.queryData, req.authUser.id);
    return res.status(201).json(data);
}

export async function deleteQuery(req, res) {
    const data = await DeleteQuery(req.authUser.id, req.body?.query_id);
    return res.status(200).json(data);
}

export async function getMyDashboard(req, res) {
    const data = await GetMyDashboard(req.authUser.id, req.authUser.role);
    return res.status(200).json(data);
}

export async function getMyQueries(req, res) {
    const data = await GetMyQueries(req.authUser.id, req.authUser.role);
    return res.status(200).json(data);
}