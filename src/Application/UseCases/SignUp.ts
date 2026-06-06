import { IAuthRepository, SignUpPayload } from '../../Domain/Repositories/IAuthRepository'
import { SupabaseAuthRepository } from '../../Infrastructure/Repositories/SupabaseAuthRepository'

export class SignUpUseCase {
  constructor(private authRepository: IAuthRepository) {}

  async execute(payload: SignUpPayload): Promise<void> {
    await this.authRepository.signUp(payload)
  }
}

const authRepo = new SupabaseAuthRepository()
export const signUpUseCase = new SignUpUseCase(authRepo)
