'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface HistoryFile {
  filename: string
  date: string
  fullPath: string
}

interface ProfileHistory {
  url: string
  email: string
  name: string
  username: string
  avatar: string
  followers: string
  likes: string
  verified: boolean
  displayName?: string
}

interface HistoryData {
  filename: string
  date: string
  profiles: ProfileHistory[]
  totalFollowers: number
  totalLikes: number
}

interface FollowersGainData {
  gains: { [url: string]: { before: number, after: number, gain: number, name: string, avatar: string } }
  order: string[]
  totalGain: number
  totalBefore: number
  totalAfter: number
}

const cleanDisplayNameInHistory = (name: string): string => {
  if (!name) return ''
  return name.replace(/\s*\(@[^)]+\)\s*on\s+Kwai\s*$/i, '').trim()
}

export default function HistoryPage() {
  const [files, setFiles] = useState<HistoryFile[]>([])
  const [selectedFile1, setSelectedFile1] = useState<string>('')
  const [selectedFile1Date, setSelectedFile1Date] = useState<string>('')
  const [selectedFile2, setSelectedFile2] = useState<string>('')
  const [selectedFile2Date, setSelectedFile2Date] = useState<string>('')
  const [history1, setHistory1] = useState<HistoryData | null>(null)
  const [history2, setHistory2] = useState<HistoryData | null>(null)
  const [loading, setLoading] = useState(false)
  const [viewMode, setViewMode] = useState<'single' | 'compare'>('single')
  const [singleFile, setSingleFile] = useState<string>('')

  useEffect(() => {
    loadHistoryFiles()
  }, [])

  const loadHistoryFiles = async () => {
    try {
      const response = await fetch('/api/history/list')
      if (response.ok) {
        const data = await response.json()
        setFiles(data.files || [])
      }
    } catch (e) {
      console.error('Erro ao carregar arquivos:', e)
    }
  }

  const loadHistoryData = async (filename: string): Promise<HistoryData | null> => {
    try {
      const response = await fetch(`/api/history/load?filename=${encodeURIComponent(filename)}`)
      if (response.ok) {
        const data = await response.json()
        return data
      }
    } catch (e) {
      console.error('Erro ao carregar histórico:', e)
    }
    return null
  }

  const handleLoadSingle = async () => {
    if (!singleFile) return
    setLoading(true)
    const data = await loadHistoryData(singleFile)
    if (data) {
      setHistory1(data)
      setHistory2(null)
    }
    setLoading(false)
  }

  const handleCompare = async () => {
    if (!selectedFile1 || !selectedFile2) {
      alert('Selecione dois arquivos para comparar')
      return
    }
    setLoading(true)
    const [data1, data2] = await Promise.all([
      loadHistoryData(selectedFile1),
      loadHistoryData(selectedFile2)
    ])
    setHistory1(data1)
    setHistory2(data2)
    setLoading(false)
  }

  const calculateFollowersGain = (): FollowersGainData | null => {
    if (!history1 || !history2) return null

    const gains: { [url: string]: { before: number, after: number, gain: number, name: string, avatar: string } } = {}
    const order: string[] = []
    
    history1.profiles.forEach(profile => {
      const followersNum = parseInt(profile.followers?.replace(/[^\d]/g, '') || '0')
      if (!gains[profile.url]) {
        order.push(profile.url)
      }
      gains[profile.url] = {
        before: followersNum,
        after: 0,
        gain: 0,
        name: cleanDisplayNameInHistory(profile.name || profile.displayName || profile.username || ''),
        avatar: profile.avatar
      }
    })

    history2.profiles.forEach(profile => {
      const followersNum = parseInt(profile.followers?.replace(/[^\d]/g, '') || '0')
      if (gains[profile.url]) {
        gains[profile.url].after = followersNum
        gains[profile.url].gain = followersNum - gains[profile.url].before
        gains[profile.url].name = cleanDisplayNameInHistory(profile.name || profile.displayName || profile.username || '')
        gains[profile.url].avatar = profile.avatar
      } else {
        if (!order.includes(profile.url)) {
          order.push(profile.url)
        }
        gains[profile.url] = {
          before: 0,
          after: followersNum,
          gain: followersNum,
          name: cleanDisplayNameInHistory(profile.name || profile.displayName || profile.username || ''),
          avatar: profile.avatar
        }
      }
    })

    const totalGain = Object.values(gains).reduce((sum, g) => sum + g.gain, 0)
    const totalBefore = Object.values(gains).reduce((sum, g) => sum + g.before, 0)
    const totalAfter = Object.values(gains).reduce((sum, g) => sum + g.after, 0)

    return { gains, order, totalGain, totalBefore, totalAfter }
  }

  const comparison = (history1 && history2) ? calculateFollowersGain() : null

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-zinc-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-5">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-1">📊 Histórico de Análises</h1>
              <p className="text-sm text-gray-600">Visualize e compare seus dados históricos</p>
            </div>
            <Link
              href="/"
              className="px-5 py-2.5 bg-gray-900 text-white font-medium rounded-lg hover:bg-gray-800 transition-colors"
            >
              ← Voltar
            </Link>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Modo de Visualização */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex gap-3 mb-6">
            <button
              onClick={() => {
                setViewMode('single')
                setHistory1(null)
                setHistory2(null)
              }}
              className={`px-5 py-2.5 rounded-lg font-medium transition-colors ${
                viewMode === 'single'
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              📄 Visualizar Arquivo
            </button>
            <button
              onClick={() => {
                setViewMode('compare')
                setHistory1(null)
                setHistory2(null)
              }}
              className={`px-5 py-2.5 rounded-lg font-medium transition-colors ${
                viewMode === 'compare'
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              ⚖️ Comparar Arquivos
            </button>
          </div>

          {viewMode === 'single' ? (
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Selecionar Arquivo
                </label>
                <select
                  value={singleFile}
                  onChange={(e) => setSingleFile(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
                >
                  <option value="">Escolha um arquivo...</option>
                  {files.map((file) => (
                    <option key={file.filename} value={file.filename}>
                      {file.date}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <button
                  onClick={handleLoadSingle}
                  disabled={!singleFile || loading}
                  className="px-6 py-2.5 bg-gray-900 text-white font-medium rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Carregando...' : 'Visualizar'}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Arquivo 1 (Antes)
                  </label>
                  <select
                    value={selectedFile1}
                    onChange={(e) => {
                      setSelectedFile1(e.target.value)
                      const file = files.find(f => f.filename === e.target.value)
                      setSelectedFile1Date(file?.date || '')
                    }}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
                  >
                    <option value="">Escolha um arquivo...</option>
                    {files.map((file) => (
                      <option key={file.filename} value={file.filename}>
                        {file.date}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Arquivo 2 (Depois)
                  </label>
                  <select
                    value={selectedFile2}
                    onChange={(e) => {
                      setSelectedFile2(e.target.value)
                      const file = files.find(f => f.filename === e.target.value)
                      setSelectedFile2Date(file?.date || '')
                    }}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
                  >
                    <option value="">Escolha um arquivo...</option>
                    {files.map((file) => (
                      <option key={file.filename} value={file.filename}>
                        {file.date}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <button
                  onClick={handleCompare}
                  disabled={!selectedFile1 || !selectedFile2 || loading}
                  className="w-full px-6 py-2.5 bg-gray-900 text-white font-medium rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Comparando...' : '⚖️ Comparar Arquivos'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Resultado da Comparação - LISTA */}
        {comparison && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">📈 Comparação de Seguidores</h2>
              
              {/* Cards de Resumo */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                  <div className="text-xs font-semibold text-blue-700 mb-1">ANTES</div>
                  <div className="text-2xl font-bold text-blue-600 mb-1">{comparison.totalBefore.toLocaleString()}</div>
                  <div className="text-xs text-blue-600">{selectedFile1Date || files.find(f => f.filename === selectedFile1)?.date}</div>
                </div>
                <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
                  <div className="text-xs font-semibold text-green-700 mb-1">DEPOIS</div>
                  <div className="text-2xl font-bold text-green-600 mb-1">{comparison.totalAfter.toLocaleString()}</div>
                  <div className="text-xs text-green-600">{selectedFile2Date || files.find(f => f.filename === selectedFile2)?.date}</div>
                </div>
                <div className={`border-2 rounded-lg p-4 ${
                  comparison.totalGain >= 0 
                    ? 'bg-emerald-50 border-emerald-200' 
                    : 'bg-red-50 border-red-200'
                }`}>
                  <div className={`text-xs font-semibold mb-1 ${
                    comparison.totalGain >= 0 ? 'text-emerald-700' : 'text-red-700'
                  }`}>
                    GANHO TOTAL
                  </div>
                  <div className={`text-2xl font-bold mb-1 ${
                    comparison.totalGain >= 0 ? 'text-emerald-600' : 'text-red-600'
                  }`}>
                    {comparison.totalGain >= 0 ? '+' : ''}{comparison.totalGain.toLocaleString()}
                  </div>
                  <div className={`text-xs ${
                    comparison.totalGain >= 0 ? 'text-emerald-600' : 'text-red-600'
                  }`}>
                    Seguidores
                  </div>
                </div>
              </div>
            </div>

            {/* Lista de Contas */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b-2 border-gray-200">
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Foto</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Nome</th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-blue-700 uppercase tracking-wider bg-blue-50">ANTES</th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-green-700 uppercase tracking-wider bg-green-50">DEPOIS</th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">Ganho</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const order = comparison.order || Object.keys(comparison.gains)
                    return order
                      .map((url) => {
                        const data = comparison.gains[url]
                        if (!data) return null
                        return [url, data] as const
                      })
                      .filter((item): item is [string, typeof comparison.gains[string]] => item !== null)
                      .map(([url, data]) => (
                        <tr key={url} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3">
                            {data.avatar ? (
                              <img
                                src={data.avatar}
                                alt={data.name}
                                className="w-10 h-10 rounded-full border-2 border-gray-300 object-cover"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none'
                                }}
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-gray-200 border-2 border-gray-300 flex items-center justify-center">
                                <span className="text-sm text-gray-600 font-bold">
                                  {data.name[0]?.toUpperCase() || '?'}
                                </span>
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-semibold text-gray-900">{data.name}</div>
                          </td>
                          <td className="px-4 py-3 text-center bg-blue-50">
                            <span className="font-bold text-blue-700">{data.before.toLocaleString()}</span>
                          </td>
                          <td className="px-4 py-3 text-center bg-green-50">
                            <span className="font-bold text-green-700">{data.after.toLocaleString()}</span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`font-bold text-sm ${
                              data.gain >= 0 ? 'text-emerald-600' : 'text-red-600'
                            }`}>
                              {data.gain >= 0 ? '+' : ''}{data.gain.toLocaleString()}
                            </span>
                          </td>
                        </tr>
                      ))
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Visualização de Arquivo Único - LISTA */}
        {history1 && !history2 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-1">📄 {history1.date}</h2>
                <p className="text-sm text-gray-600">
                  <span className="font-semibold">{history1.profiles.length}</span> perfis • 
                  <span className="font-semibold text-purple-600 ml-2">{history1.totalFollowers.toLocaleString()}</span> seguidores • 
                  <span className="font-semibold text-blue-600 ml-2">{history1.totalLikes.toLocaleString()}</span> curtidas
                </p>
              </div>
            </div>

            {/* Lista de Contas */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b-2 border-gray-200">
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Foto</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Nome</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Username</th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-purple-700 uppercase tracking-wider">Seguidores</th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-blue-700 uppercase tracking-wider">Curtidas</th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">Verificado</th>
                  </tr>
                </thead>
                <tbody>
                  {history1.profiles.map((profile, index) => {
                    const cleanName = cleanDisplayNameInHistory(profile.name || profile.displayName || profile.username || '')
                    
                    return (
                      <tr key={index} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          {profile.avatar ? (
                            <img
                              src={profile.avatar}
                              alt={cleanName}
                              className="w-10 h-10 rounded-full border-2 border-gray-300 object-cover"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none'
                              }}
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-gray-200 border-2 border-gray-300 flex items-center justify-center">
                              <span className="text-sm text-gray-600 font-bold">
                                {(cleanName || '?')[0]?.toUpperCase()}
                              </span>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-gray-900">{cleanName}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm text-gray-600">@{profile.username || 'N/A'}</div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="font-bold text-purple-600">{profile.followers}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="font-bold text-blue-600">{profile.likes}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {profile.verified ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-semibold">
                              ✓ Verificado
                            </span>
                          ) : (
                            <span className="text-gray-400 text-xs">—</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}












