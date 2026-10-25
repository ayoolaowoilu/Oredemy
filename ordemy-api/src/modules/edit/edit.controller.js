import { EditQueryData, EditUserData } from "./edit.services.js";


export async function EditUser(req,res){
    const { editData } = req.body ?? {};
    await EditUserData(editData, req.authUser.id);
    return res.status(200).json({ message: `Made changes to: ${editData.change}` });
}

export async function EditQuery(req,res){
    const { editData } = req.body ?? {};
    await EditQueryData(editData, req.authUser.id);
    return res.status(200).json({ message: `Made changes to: ${editData.change}` });
}