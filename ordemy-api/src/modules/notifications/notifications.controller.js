import {
    GetPushConfiguration,
    RemovePushSubscription,
    SavePushSubscription,
} from "./notifications.services.js";

export async function getPushConfiguration(req, res) {
    return res.status(200).json(await GetPushConfiguration());
}

export async function savePushSubscription(req, res) {
    return res.status(200).json(
        await SavePushSubscription(req.authUser.id, req.body)
    );
}

export async function removePushSubscription(req, res) {
    return res.status(200).json(
        await RemovePushSubscription(req.authUser.id, req.body?.endpoint)
    );
}
