import { supabase } from '../../Infrastructure/Api/supabaseClient'

export class LoginUseCase {
  async execute(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      throw new Error(error.message)
    }

    return data
  }

  async logout() {
    const { error } = await supabase.auth.signOut()
    if (error) {
      throw new Error(error.message)
    }
  }

  async getCurrentUser() {
    const { data } = await supabase.auth.getUser()
    return data.user
  }
}

export const loginUseCase = new LoginUseCase()
