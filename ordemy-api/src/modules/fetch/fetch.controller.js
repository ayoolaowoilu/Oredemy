import { FetchLecturerQuestions } from "./fetch.services.js";

export async function fetchLecturerQuestions(req, res) {
    const data = await FetchLecturerQuestions(req.query, req.authUser.id);
    return res.status(200).json(data);
}
