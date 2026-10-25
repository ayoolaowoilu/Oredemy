import {
    createAdminResource,
    deleteAdminResource,
    listAdminResource,
    updateAdminResource,
} from "./admin.services.js";

export function listResource(req, res) {
    return listAdminResource(req.params.resource).then((data) => res.json(data));
}

export function createResource(req, res) {
    return createAdminResource(req.params.resource, req.body).then((data) => res.status(201).json(data));
}

export function updateResource(req, res) {
    return updateAdminResource(req.params.resource, req.params.id, req.body)
        .then((data) => res.json(data));
}

export function deleteResource(req, res) {
    return deleteAdminResource(req.params.resource, req.params.id)
        .then((data) => res.json(data));
}
