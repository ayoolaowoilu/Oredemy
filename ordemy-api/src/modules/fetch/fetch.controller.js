import { FetchAcademicStructure, FetchLecturerQuestions } from "./fetch.services.js";

export async function fetchAcademicStructure(req, res) {
    const data = await FetchAcademicStructure();
    res.set("Cache-Control", "no-store");
    return res.status(200).json(data);
}

export async function fetchLecturerQuestions(req, res) {
    const data = await FetchLecturerQuestions(req.query, req.authUser.id);
    return res.status(200).json(data);
}
