import { User } from '../Entities/Usuarios';


export interface SignUpPayload {
  email: string;
  password: string;
  nombres: string;
  apellidos: string;
  cedula: string;
}

export interface IAuthRepository {
  signUp(payload: SignUpPayload): Promise<void>;
  signIn(email: string, password: string): Promise<User>;
  signOut(): Promise<void>;
  getCurrentUser(): Promise<User | null>;
}