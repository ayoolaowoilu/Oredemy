import {
    ListClassRepRequests,
    ListClassRepresentatives,
    ListMyClassRepRequests,
    RevokeClassRepAuthority,
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

export async function listRepresentatives(req, res) {
    const data = await ListClassRepresentatives(req.authUser.id);
    return res.status(200).json(data);
}

export async function listMyRequests(req, res) {
    const data = await ListMyClassRepRequests(req.authUser.id);
    return res.status(200).json(data);
}

export async function revokeRepresentative(req, res) {
    const data = await RevokeClassRepAuthority(req.authUser.id, req.params.id);
    return res.status(200).json(data);
}

export async function reviewRequest(req, res) {
    const data = await ReviewClassRepRequest(req.authUser.id, req.params.id, req.body);
    return res.status(200).json(data);
}
