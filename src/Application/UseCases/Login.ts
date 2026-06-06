import { IAuthRepository } from '../../Domain/Repositories/IAuthRepository'
import { SupabaseAuthRepository } from '../../Infrastructure/Repositories/SupabaseAuthRepository'

export class LoginUseCase {
  constructor(private authRepository: IAuthRepository) {}

  async execute(email: string, password: string) {
    return this.authRepository.signIn(email, password)
  }

  async logout() {
    await this.authRepository.signOut()
  }

  async getCurrentUser() {
    return this.authRepository.getCurrentUser()
  }
}

const authRepo = new SupabaseAuthRepository()
export const loginUseCase = new LoginUseCase(authRepo)

