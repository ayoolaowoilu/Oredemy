import {
    AssignAdviserDepartment,
    GetUserData,
    LoginUser,
    RegisterUser,
} from "./auth.services.js";

export async function login(req, res) {
    const data = await LoginUser(req.body?.userData);
    return res.status(200).json(data);
}

export async function Register(req, res) {
    const data = await RegisterUser(req.body?.userData);
    return res.status(201).json(data);
}

export async function UserData(req, res) {
    const data = await GetUserData(req.authUser.id);
    return res.status(200).json(data);
}

export async function AdviserOnboarding(req, res) {
    const data = await AssignAdviserDepartment(
        req.authUser.id,
        req.body?.department_id,
        req.body?.session
    );
    return res.status(200).json(data);
}
