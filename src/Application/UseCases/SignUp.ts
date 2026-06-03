import { IAuthRepository, SignUpPayload } from '../../Domain/Repositories/IAuthRepository'

export class SignUpUseCase {
  constructor(private authRepository: IAuthRepository) {}

  async execute(payload: SignUpPayload): Promise<void> {
    await this.authRepository.signUp(payload)
  }
}
