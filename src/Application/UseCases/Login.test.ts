import { describe, it, expect, vi, beforeEach } from 'vitest'
import { LoginUseCase } from './Login'
import { IAuthRepository } from '../../Domain/Repositories/IAuthRepository'
import { User } from '../../Domain/Entities/Usuarios'

describe('LoginUseCase', () => {
  let loginUseCase: LoginUseCase
  let mockAuthRepository: IAuthRepository

  const mockUser: User = {
    id: '123',
    email: 'test@example.com',
    cedula: '1234567890',
    nombres: 'John',
    apellidos: 'Doe',
    rol: 'Administrador',
    activo: true,
    cooperativaId: null
  }

  beforeEach(() => {
    mockAuthRepository = {
      signIn: vi.fn(),
      signOut: vi.fn(),
      getCurrentUser: vi.fn(),
      signUp: vi.fn()
    } as unknown as IAuthRepository

    loginUseCase = new LoginUseCase(mockAuthRepository)
  })

  it('should call authRepository.signIn and return the user', async () => {
    vi.mocked(mockAuthRepository.signIn).mockResolvedValue(mockUser)

    const result = await loginUseCase.execute('test@example.com', 'password123')

    expect(mockAuthRepository.signIn).toHaveBeenCalledWith('test@example.com', 'password123')
    expect(result).toEqual(mockUser)
  })

  it('should call authRepository.signOut', async () => {
    await loginUseCase.logout()
    expect(mockAuthRepository.signOut).toHaveBeenCalled()
  })

  it('should call authRepository.getCurrentUser and return the user', async () => {
    vi.mocked(mockAuthRepository.getCurrentUser).mockResolvedValue(mockUser)

    const result = await loginUseCase.getCurrentUser()

    expect(mockAuthRepository.getCurrentUser).toHaveBeenCalled()
    expect(result).toEqual(mockUser)
  })

  it('should return null if no current user', async () => {
    vi.mocked(mockAuthRepository.getCurrentUser).mockResolvedValue(null)

    const result = await loginUseCase.getCurrentUser()

    expect(result).toBeNull()
  })
})
