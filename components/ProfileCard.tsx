interface ProfileData {
  username: string
  displayName: string
  avatar: string
  followers: string
  likes: string
  bio: string
  verified: boolean
  url?: string
  email?: string
  password?: string
  name?: string
  sequence?: number
}

interface ProfileCardProps {
  profileData: ProfileData
  onCheckSequence?: () => void
  accountGoals?: { [key: string]: number }
  onSetGoal?: (identifier: string) => void
}

// Função para limpar o nome, removendo " (@username) on Kwai"
const cleanDisplayName = (name: string): string => {
  if (!name) return ''
  // Remove padrões como " (@username) on Kwai"
  return name.replace(/\s*\(@[^)]+\)\s*on\s+Kwai\s*$/i, '').trim()
}

// Função para converter seguidores em número
const parseFollowers = (followersStr: string): number => {
  if (!followersStr || followersStr === 'N/A' || followersStr === '0') return 0
  
  // Remover caracteres não numéricos exceto ponto e vírgula
  const cleaned = followersStr.replace(/[^\d.,KkMmBb]/g, '')
  
  // Se contém K, M ou B
  if (cleaned.toLowerCase().includes('k')) {
    const num = parseFloat(cleaned.replace(/[kK]/g, '').replace(',', '.'))
    return Math.floor(num * 1000)
  }
  if (cleaned.toLowerCase().includes('m')) {
    const num = parseFloat(cleaned.replace(/[mM]/g, '').replace(',', '.'))
    return Math.floor(num * 1000000)
  }
  if (cleaned.toLowerCase().includes('b')) {
    const num = parseFloat(cleaned.replace(/[bB]/g, '').replace(',', '.'))
    return Math.floor(num * 1000000000)
  }
  
  // Apenas números
  return parseInt(cleaned.replace(/[^\d]/g, '')) || 0
}

// Função para calcular e formatar dias restantes para completar a meta
// Cada 1K de seguidores faltantes = 3 dias
const calculateDaysRemaining = (currentFollowers: number, goal: number): string => {
  if (currentFollowers >= goal) {
    return 'Meta atingida! 🎉'
  }
  
  const followersRemaining = goal - currentFollowers
  const followersRemainingInK = followersRemaining / 1000
  const totalDays = Math.ceil(followersRemainingInK * 3) // Cada 1K = 3 dias
  
  if (totalDays <= 30) {
    return `Faltam ${totalDays} ${totalDays === 1 ? 'dia' : 'dias'}`
  }
  
  // Se passar de 30 dias, converter para meses
  const months = Math.floor(totalDays / 30)
  const remainingDays = totalDays % 30
  
  if (remainingDays === 0) {
    return `Faltam ${months} ${months === 1 ? 'mês' : 'meses'}`
  } else {
    return `Faltam ${months} ${months === 1 ? 'mês' : 'meses'} e ${remainingDays} ${remainingDays === 1 ? 'dia' : 'dias'}`
  }
}

export default function ProfileCard({ profileData, onCheckSequence, accountGoals = {}, onSetGoal }: ProfileCardProps) {
  const today = typeof window !== 'undefined' ? new Date().toISOString().split('T')[0] : ''
  const lastCheck = typeof window !== 'undefined' ? localStorage.getItem(`check_${profileData.url}`) : null
  const isCheckedToday = lastCheck === today

  const displayName = cleanDisplayName(profileData.displayName || profileData.name || profileData.username || 'N/A')
  
  // Obter identificador único (email, URL ou username)
  const getIdentifier = (): string => {
    if (profileData.email) return profileData.email.toLowerCase()
    if (profileData.url) {
      const urlNormalized = profileData.url.split('?')[0].toLowerCase()
      return `url:${urlNormalized}`
    }
    if (profileData.username) return `username:${profileData.username.toLowerCase()}`
    return `name:${displayName.toLowerCase()}`
  }
  
  const identifier = getIdentifier()
  const goal = accountGoals[identifier]
  const currentFollowers = parseFollowers(profileData.followers || '0')
  const percentage = goal > 0 ? Math.min((currentFollowers / goal) * 100, 100) : 0
  const isComplete = goal > 0 && currentFollowers >= goal
  // Formatar porcentagem: mostrar 1 casa decimal se não for 100%, senão mostrar inteiro
  const percentageDisplay = isComplete ? '100' : percentage.toFixed(1)

  return (
    <div className="bg-white rounded-xl border border-gray-200 hover:border-purple-300 hover:shadow-lg transition-all overflow-hidden">
      <div className="p-5 space-y-4">
        {/* Avatar e Nome */}
        <div className="flex items-center gap-4">
          {profileData.avatar ? (
            <img
              src={profileData.avatar}
              alt={displayName}
              className="w-16 h-16 rounded-xl border-2 border-purple-400 object-cover flex-shrink-0 shadow-sm"
              onError={(e) => {
                e.currentTarget.style.display = 'none'
              }}
            />
          ) : (
            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-purple-400 to-pink-400 border-2 border-purple-400 flex items-center justify-center flex-shrink-0 shadow-sm">
              <span className="text-2xl text-white font-bold">
                {displayName[0]?.toUpperCase() || '?'}
              </span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="font-bold text-gray-800 truncate text-base mb-1">
              {displayName}
            </div>
            {profileData.username && (
              <div className="text-xs text-gray-500 truncate">
                @{profileData.username}
              </div>
            )}
          </div>
        </div>

        {/* Estatísticas */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
            <div className="text-xs text-blue-600 font-medium mb-1">Seguidores</div>
            <div className="text-base font-bold text-gray-800">{profileData.followers || 'N/A'}</div>
          </div>
          <div className="bg-pink-50 rounded-lg p-3 border border-pink-100">
            <div className="text-xs text-pink-600 font-medium mb-1">Curtidas</div>
            <div className="text-base font-bold text-gray-800">{profileData.likes || 'N/A'}</div>
          </div>
        </div>

        {/* Meta e Progress Bar */}
        <div className="pt-2 border-t border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <button
                onClick={() => onSetGoal && onSetGoal(identifier)}
                className="p-1.5 rounded-lg bg-purple-100 hover:bg-purple-200 transition-colors"
                title="Definir meta de seguidores"
              >
                <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </button>
              <span className="text-xs text-gray-600 font-medium">
                {goal 
                  ? `Meta: ${goal >= 1000 ? `${goal / 1000}K` : goal}`
                  : 'Sem meta'}
              </span>
            </div>
          </div>
          {goal && (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600">
                  {currentFollowers >= 1000 ? `${(currentFollowers / 1000).toFixed(1)}K` : currentFollowers} / {goal >= 1000 ? `${goal / 1000}K` : goal}
                </span>
                <span className={`font-semibold ${isComplete ? 'text-green-600' : 'text-purple-600'}`}>
                  {percentageDisplay}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                <div
                  className={`h-2.5 rounded-full transition-all duration-300 ${
                    isComplete
                      ? 'bg-gradient-to-r from-green-500 to-green-600'
                      : 'bg-gradient-to-r from-purple-500 to-pink-500'
                  }`}
                  style={{ width: `${percentage}%` }}
                ></div>
              </div>
              {!isComplete && (
                <div className="text-xs text-gray-500 mt-1 text-center">
                  {calculateDaysRemaining(currentFollowers, goal)}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Ações */}
        {profileData.url && (
          <div className="pt-2 border-t border-gray-100">
            <a
              href={profileData.url}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full px-4 py-2 bg-gray-100 text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              Ver Perfil
            </a>
          </div>
        )}
      </div>
    </div>
  )
}