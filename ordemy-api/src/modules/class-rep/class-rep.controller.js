import {
    ListClassRepRequests,
    ListMyClassRepRequests,
    ReviewClassRepRequest,
    SubmitClassRepRequest,
} from "./class-rep.services.js";

export async function submitRequest(req, res) {
    const data = await SubmitClassRepRequest(req.authUser.id, req.body);
    return res.status(201).json(data);
}

export async function listRequests(req, res) {
    const data = await ListClassRepRequests(req.authUser.id);
    return res.status(200).json(data);
}

export async function listMyRequests(req, res) {
    const data = await ListMyClassRepRequests(req.authUser.id);
    return res.status(200).json(data);
}

export async function reviewRequest(req, res) {
    const data = await ReviewClassRepRequest(req.authUser.id, req.params.id, req.body);
    return res.status(200).json(data);
}
