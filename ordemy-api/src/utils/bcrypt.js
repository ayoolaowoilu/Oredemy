import bcrypt from "bcryptjs"

const saltRounds = 20;

export function HashPassword(password){
   return  bcrypt.hash(password,saltRounds);
}

export function VerifyPassword(password, hashedPassword){
    return bcrypt.compare(password, hashedPassword);
}